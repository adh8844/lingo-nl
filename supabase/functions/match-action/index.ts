import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WINS_TO_WIN = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pickRandomWord(admin: any, length: number): Promise<string> {
  const { data, error } = await admin
    .from("dutch_words")
    .select("word")
    .eq("length", length)
    .eq("approved", true)
    .eq("rejected", false)
    .eq("appropriate", true);
  if (error || !data || data.length === 0) {
    throw new Error("No words available");
  }
  const w = data[Math.floor(Math.random() * data.length)].word as string;
  return w;
}

async function createNextRoundIfNeeded(admin: any, matchId: string) {
  const { data: match } = await admin
    .from("online_matches").select("*").eq("id", matchId).single();
  if (!match || match.status !== "active") return;

  const nextRoundNum = match.current_round + 1;
  const { data: existing } = await admin.from("match_rounds")
    .select("id").eq("match_id", matchId).eq("round_number", nextRoundNum).maybeSingle();
  if (existing) return;

  try {
    const word = await pickRandomWord(admin, match.word_length);
    await admin.from("match_rounds").insert({
      match_id: matchId, round_number: nextRoundNum, word, status: "active",
    });
    await admin.from("online_matches").update({
      current_round: nextRoundNum, current_word: word,
    }).eq("id", matchId);
  } catch (e) {
    console.error("createNextRoundIfNeeded failed", e);
  }
}

async function resolveAndAdvance(admin: any, matchId: string, roundId: string) {
  const { data: round } = await admin
    .from("match_rounds").select("*").eq("id", roundId).single();
  if (!round) return { error: "round not found" };

  const { data: match } = await admin
    .from("online_matches").select("*").eq("id", matchId).single();
  if (!match) return { error: "match not found" };

  if (round.status === "finished") {
    return { ok: true, alreadyResolved: true };
  }

  const p1 = round.player1_guess_time_ms;
  const p2 = round.player2_guess_time_ms;
  if (p1 === null || p2 === null) {
    return { ok: true, waiting: true };
  }

  let winnerId: string | null;
  if (p1 === -1 && p2 === -1) winnerId = null;
  else if (p1 === -1) winnerId = match.player2_id;
  else if (p2 === -1) winnerId = match.player1_id;
  else winnerId = p1 <= p2 ? match.player1_id : match.player2_id;

  await admin
    .from("match_rounds")
    .update({ winner_id: winnerId, status: "finished" })
    .eq("id", roundId)
    .eq("status", "active");

  const newP1 = match.player1_wins + (winnerId === match.player1_id ? 1 : 0);
  const newP2 = match.player2_wins + (winnerId === match.player2_id ? 1 : 0);

  if (newP1 >= WINS_TO_WIN || newP2 >= WINS_TO_WIN) {
    const winner = newP1 >= WINS_TO_WIN ? match.player1_id : match.player2_id;
    await admin.from("online_matches").update({
      player1_wins: newP1, player2_wins: newP2,
      status: "finished", winner_id: winner,
    }).eq("id", matchId);
    return { ok: true, finished: true, winner_id: winner };
  } else {
    await admin.from("online_matches").update({
      player1_wins: newP1, player2_wins: newP2,
    }).eq("id", matchId);
    await createNextRoundIfNeeded(admin, matchId);
    return { ok: true, roundResolved: true };
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);

    const { data: caller } = await admin
      .from("players").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (!caller) return json({ error: "No player profile" }, 403);
    const callerId = caller.id as string;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    async function assertParticipant(matchId: string) {
      const { data: m } = await admin
        .from("online_matches")
        .select("player1_id, player2_id")
        .eq("id", matchId).single();
      if (!m) return null;
      if (m.player1_id !== callerId && m.player2_id !== callerId) return null;
      return m;
    }

    switch (action) {
      case "accept_challenge": {
        const challengeId = String(body.challenge_id || "");
        if (!challengeId) return json({ error: "challenge_id required" }, 400);

        const { data: ch } = await admin
          .from("online_challenges").select("*").eq("id", challengeId).single();
        if (!ch) return json({ error: "challenge not found" }, 404);
        if (ch.challenged_id !== callerId) return json({ error: "Forbidden" }, 403);
        if (ch.status !== "pending") return json({ error: "Challenge not pending" }, 400);

        await admin.from("online_challenges")
          .update({ status: "accepted" }).eq("id", challengeId);

        const word = await pickRandomWord(admin, ch.word_length);
        const { data: match } = await admin.from("online_matches").insert({
          player1_id: ch.challenger_id,
          player2_id: callerId,
          timer_seconds: ch.timer_seconds,
          word_length: ch.word_length,
          language: ch.language,
          current_word: word,
          status: "active",
        }).select().single();
        if (!match) return json({ error: "Could not create match" }, 500);

        await admin.from("match_rounds").insert({
          match_id: match.id, round_number: 1, word, status: "active",
        });
        return json({ ok: true, match_id: match.id });
      }

      case "submit_guess": {
        const matchId = String(body.match_id || "");
        const roundId = String(body.round_id || "");
        const guessMs = Number(body.guess_time_ms);
        if (!matchId || !roundId || !Number.isFinite(guessMs) || guessMs < 0) {
          return json({ error: "invalid input" }, 400);
        }
        const m = await assertParticipant(matchId);
        if (!m) return json({ error: "Forbidden" }, 403);

        const isP1 = callerId === m.player1_id;
        const field = isP1 ? "player1_guess_time_ms" : "player2_guess_time_ms";

        const { data: round } = await admin.from("match_rounds").select("*").eq("id", roundId).single();
        if (!round || round.match_id !== matchId) return json({ error: "round mismatch" }, 400);
        if (round.status !== "active") return json({ ok: true, alreadyResolved: true });
        if (round[field] !== null) return json({ ok: true, alreadyRecorded: true });

        const otherField = isP1 ? "player2_guess_time_ms" : "player1_guess_time_ms";
        const other = round[otherField];

        let winnerId: string | null = null;
        let finishedNow = false;
        if (other === null) {
          winnerId = callerId;
          finishedNow = true;
          await admin.from("match_rounds").update({
            [field]: guessMs, winner_id: winnerId, status: "finished",
          }).eq("id", roundId).eq("status", "active");
        } else if (other === -1) {
          winnerId = callerId;
          finishedNow = true;
          await admin.from("match_rounds").update({
            [field]: guessMs, winner_id: winnerId, status: "finished",
          }).eq("id", roundId).eq("status", "active");
        } else {
          const myMs = guessMs;
          winnerId = myMs <= other ? callerId : (isP1 ? m.player2_id : m.player1_id);
          finishedNow = true;
          await admin.from("match_rounds").update({
            [field]: guessMs, winner_id: winnerId, status: "finished",
          }).eq("id", roundId).eq("status", "active");
        }

        if (finishedNow) {
          const { data: match } = await admin
            .from("online_matches").select("*").eq("id", matchId).single();
          const newP1 = match.player1_wins + (winnerId === match.player1_id ? 1 : 0);
          const newP2 = match.player2_wins + (winnerId === match.player2_id ? 1 : 0);
          if (newP1 >= WINS_TO_WIN || newP2 >= WINS_TO_WIN) {
            const winner = newP1 >= WINS_TO_WIN ? match.player1_id : match.player2_id;
            await admin.from("online_matches").update({
              player1_wins: newP1, player2_wins: newP2,
              status: "finished", winner_id: winner,
            }).eq("id", matchId);
          } else {
            await admin.from("online_matches").update({
              player1_wins: newP1, player2_wins: newP2,
            }).eq("id", matchId);
            await createNextRoundIfNeeded(admin, matchId);
          }
        }
        return json({ ok: true });
      }


      case "submit_failed": {
        const matchId = String(body.match_id || "");
        const roundId = String(body.round_id || "");
        if (!matchId || !roundId) return json({ error: "invalid input" }, 400);
        const m = await assertParticipant(matchId);
        if (!m) return json({ error: "Forbidden" }, 403);

        const isP1 = callerId === m.player1_id;
        const field = isP1 ? "player1_guess_time_ms" : "player2_guess_time_ms";

        const { data: round } = await admin.from("match_rounds").select("*").eq("id", roundId).single();
        if (!round || round.match_id !== matchId) return json({ error: "round mismatch" }, 400);
        if (round.status !== "active") return json({ ok: true, alreadyResolved: true });
        if (round[field] === null) {
          await admin.from("match_rounds").update({ [field]: -1 }).eq("id", roundId);
        }
        const result = await resolveAndAdvance(admin, matchId, roundId);
        return json(result);
      }

      case "next_round": {
        const matchId = String(body.match_id || "");
        if (!matchId) return json({ error: "match_id required" }, 400);
        const m = await assertParticipant(matchId);
        if (!m) return json({ error: "Forbidden" }, 403);

        const { data: match } = await admin
          .from("online_matches").select("*").eq("id", matchId).single();
        if (!match || match.status !== "active") return json({ ok: true, skipped: true });

        const nextRoundNum = match.current_round + 1;
        const { data: existing } = await admin.from("match_rounds")
          .select("id").eq("match_id", matchId).eq("round_number", nextRoundNum).maybeSingle();
        if (existing) return json({ ok: true, alreadyCreated: true });

        const word = await pickRandomWord(admin, match.word_length);
        await admin.from("match_rounds").insert({
          match_id: matchId, round_number: nextRoundNum, word, status: "active",
        });
        await admin.from("online_matches").update({
          current_round: nextRoundNum, current_word: word,
        }).eq("id", matchId);
        return json({ ok: true });
      }

      case "forfeit": {
        const matchId = String(body.match_id || "");
        if (!matchId) return json({ error: "match_id required" }, 400);
        const m = await assertParticipant(matchId);
        if (!m) return json({ error: "Forbidden" }, 403);
        const opponentId = callerId === m.player1_id ? m.player2_id : m.player1_id;
        await admin.from("online_matches").update({
          status: "finished", winner_id: opponentId, forfeited_by: callerId,
        }).eq("id", matchId).eq("status", "active");
        return json({ ok: true });
      }

      case "rematch_request":
      case "rematch_decline": {
        const matchId = String(body.match_id || "");
        if (!matchId) return json({ error: "match_id required" }, 400);
        const m = await assertParticipant(matchId);
        if (!m) return json({ error: "Forbidden" }, 403);
        const isP1 = callerId === m.player1_id;
        const field = isP1 ? "rematch_player1" : "rematch_player2";
        const val = action === "rematch_request";
        await admin.from("online_matches").update({ [field]: val }).eq("id", matchId);
        return json({ ok: true });
      }

      case "create_rematch": {
        const matchId = String(body.match_id || "");
        if (!matchId) return json({ error: "match_id required" }, 400);
        const { data: match } = await admin.from("online_matches").select("*").eq("id", matchId).single();
        if (!match) return json({ error: "not found" }, 404);
        if (match.player1_id !== callerId && match.player2_id !== callerId) return json({ error: "Forbidden" }, 403);
        if (match.status !== "finished" || !match.rematch_player1 || !match.rematch_player2) {
          return json({ error: "not eligible" }, 400);
        }
        if (callerId !== match.player1_id) return json({ ok: true, skipped: true });

        const { data: existingActive } = await admin
          .from("online_matches")
          .select("id, created_at")
          .eq("status", "active")
          .or(`and(player1_id.eq.${match.player1_id},player2_id.eq.${match.player2_id}),and(player1_id.eq.${match.player2_id},player2_id.eq.${match.player1_id})`)
          .gt("created_at", match.created_at)
          .limit(1);
        if (existingActive && existingActive.length > 0) {
          return json({ ok: true, match_id: existingActive[0].id });
        }

        const word = await pickRandomWord(admin, match.word_length);
        const { data: newMatch } = await admin.from("online_matches").insert({
          player1_id: match.player1_id,
          player2_id: match.player2_id,
          timer_seconds: match.timer_seconds,
          word_length: match.word_length,
          language: match.language,
          current_word: word,
          status: "active",
        }).select().single();
        if (!newMatch) return json({ error: "create failed" }, 500);
        await admin.from("match_rounds").insert({
          match_id: newMatch.id, round_number: 1, word, status: "active",
        });
        return json({ ok: true, match_id: newMatch.id });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("match-action error", e);
    return json({ error: "Internal error" }, 500);
  }
});
