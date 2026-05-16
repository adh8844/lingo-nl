import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POINTS_PER_ROUND_WIN = 20;
const MATCH_WINNER_BONUS = 100;
const WINS_TO_WIN = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const matchId = typeof body?.match_id === "string" ? body.match_id : null;
    if (!matchId) {
      return new Response(JSON.stringify({ error: "match_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load match
    const { data: match, error: mErr } = await admin
      .from("online_matches")
      .select("id, player1_id, player2_id, player1_wins, player2_wins, status, winner_id, forfeited_by")
      .eq("id", matchId)
      .single();
    if (mErr || !match) {
      return new Response(JSON.stringify({ error: "match not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (match.status !== "finished") {
      return new Response(JSON.stringify({ error: "match not finished" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a participant
    const { data: callerPlayer } = await admin
      .from("players").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (!callerPlayer || (callerPlayer.id !== match.player1_id && callerPlayer.id !== match.player2_id)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: skip if any points already logged for this match
    const reasonTag = `match:${matchId}`;
    const { count: existing } = await admin
      .from("points_log")
      .select("id", { count: "exact", head: true })
      .ilike("reason", `%${reasonTag}%`);
    if ((existing ?? 0) > 0) {
      return new Response(JSON.stringify({ ok: true, alreadyAwarded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p1Wins = match.player1_wins ?? 0;
    const p2Wins = match.player2_wins ?? 0;
    const winnerId = match.winner_id ??
      (p1Wins >= WINS_TO_WIN ? match.player1_id :
       p2Wins >= WINS_TO_WIN ? match.player2_id : null);

    const inserts: Array<{ player_id: string; points: number; reason: string }> = [];
    if (p1Wins > 0) {
      inserts.push({
        player_id: match.player1_id,
        points: p1Wins * POINTS_PER_ROUND_WIN,
        reason: `Online ${reasonTag}: ${p1Wins} ronde(s) gewonnen`,
      });
    }
    if (p2Wins > 0) {
      inserts.push({
        player_id: match.player2_id,
        points: p2Wins * POINTS_PER_ROUND_WIN,
        reason: `Online ${reasonTag}: ${p2Wins} ronde(s) gewonnen`,
      });
    }
    if (winnerId) {
      inserts.push({
        player_id: winnerId,
        points: MATCH_WINNER_BONUS,
        reason: `Online ${reasonTag} gewonnen: bonus`,
      });
    }

    if (inserts.length > 0) {
      await admin.from("points_log").insert(inserts);
      // Sync totals for affected players
      const playerIds = Array.from(new Set(inserts.map((i) => i.player_id)));
      for (const pid of playerIds) {
        const { data: totalData } = await admin.rpc("get_player_total_points", { p_id: pid });
        if (totalData !== null && totalData !== undefined) {
          await admin.from("players").update({ points: Number(totalData) }).eq("id", pid);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("award-match-points error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
