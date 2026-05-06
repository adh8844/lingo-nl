import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRandomWordAsync, Language, WordLength } from "@/data/words";

const WINS_TO_WIN = 5;
const POINTS_PER_ROUND_WIN = 20;
const MATCH_WINNER_BONUS = 100;

async function awardMatchPoints(match: OnlineMatch, p1Wins: number, p2Wins: number, winnerId: string) {
  // Award round win points and sync total via RPC
  const awardPoints = async (playerId: string, pts: number, reason: string) => {
    await supabase.from("points_log").insert({ player_id: playerId, points: pts, reason });
    // Sync players.points from the single source of truth
    const { data: totalData } = await supabase.rpc("get_player_total_points", { p_id: playerId });
    if (totalData !== null) {
      await supabase.from("players").update({ points: Number(totalData) }).eq("id", playerId);
    }
  };

  if (p1Wins > 0) {
    await awardPoints(match.player1_id, p1Wins * POINTS_PER_ROUND_WIN, `Online match: ${p1Wins} ronde(s) gewonnen`);
  }
  if (p2Wins > 0) {
    await awardPoints(match.player2_id, p2Wins * POINTS_PER_ROUND_WIN, `Online match: ${p2Wins} ronde(s) gewonnen`);
  }
  // Bonus for match winner
  await awardPoints(winnerId, MATCH_WINNER_BONUS, "Online match gewonnen: bonus");
}

export interface OnlineChallenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  timer_seconds: number;
  word_length: number;
  language: string;
  status: string;
  created_at: string;
  challenger_name?: string;
}

export interface OnlineMatch {
  id: string;
  player1_id: string;
  player2_id: string;
  timer_seconds: number;
  word_length: number;
  language: string;
  current_round: number;
  player1_wins: number;
  player2_wins: number;
  current_word: string | null;
  status: string;
  winner_id: string | null;
  rematch_player1?: boolean | null;
  rematch_player2?: boolean | null;
  forfeited_by?: string | null;
}

export interface MatchRound {
  id: string;
  match_id: string;
  round_number: number;
  word: string;
  player1_guess_time_ms: number | null;
  player2_guess_time_ms: number | null;
  winner_id: string | null;
  status: string;
}

export function useOnlineMatch(playerId: string | undefined) {
  const [pendingChallenges, setPendingChallenges] = useState<OnlineChallenge[]>([]);
  const [activeMatch, setActiveMatch] = useState<OnlineMatch | null>(null);
  const [currentRound, setCurrentRound] = useState<MatchRound | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [opponentProgress, setOpponentProgress] = useState<Record<number, number>>({});
  const activeMatchRef = useRef<OnlineMatch | null>(null);

  useEffect(() => {
    activeMatchRef.current = activeMatch;
  }, [activeMatch]);

  const loadChallenges = useCallback(async () => {
    if (!playerId) return;
    const { data } = await supabase
      .from("online_challenges")
      .select("*")
      .eq("challenged_id", playerId)
      .eq("status", "pending");

    if (data && data.length > 0) {
      const challengerIds = data.map(c => c.challenger_id);
      const { data: players } = await supabase
        .from("players")
        .select("id, display_name")
        .in("id", challengerIds);
      const nameMap = new Map(players?.map(p => [p.id, p.display_name]) || []);

      setPendingChallenges(data.map(c => ({
        ...c,
        challenger_name: nameMap.get(c.challenger_id) || "Unknown",
      })));
    } else {
      setPendingChallenges([]);
    }
  }, [playerId]);

  const sendChallenge = useCallback(async (
    challengedId: string,
    timerSeconds: number,
    wordLength: number,
    language: string
  ) => {
    if (!playerId) return null;
    const { data, error } = await supabase
      .from("online_challenges")
      .insert({
        challenger_id: playerId,
        challenged_id: challengedId,
        timer_seconds: timerSeconds,
        word_length: wordLength,
        language,
        status: "pending",
      })
      .select()
      .single();

    return error ? null : data;
  }, [playerId]);

  const acceptChallenge = useCallback(async (challenge: OnlineChallenge) => {
    if (!playerId) return null;

    await supabase
      .from("online_challenges")
      .update({ status: "accepted" })
      .eq("id", challenge.id);

    const word = await getRandomWordAsync(
      challenge.language as Language,
      challenge.word_length as WordLength
    );

    const { data: match } = await supabase
      .from("online_matches")
      .insert({
        player1_id: challenge.challenger_id,
        player2_id: playerId,
        timer_seconds: challenge.timer_seconds,
        word_length: challenge.word_length,
        language: challenge.language,
        current_word: word,
        status: "active",
      })
      .select()
      .single();

    if (match) {
      await supabase.from("match_rounds").insert({
        match_id: match.id,
        round_number: 1,
        word,
        status: "active",
      });

      setActiveMatch(match as OnlineMatch);
      return match;
    }
    return null;
  }, [playerId]);

  const declineChallenge = useCallback(async (challengeId: string) => {
    await supabase
      .from("online_challenges")
      .update({ status: "declined" })
      .eq("id", challengeId);
    loadChallenges();
  }, [loadChallenges]);

  const forfeitMatch = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !playerId) return;

    const opponentId = playerId === match.player1_id ? match.player2_id : match.player1_id;

    await supabase
      .from("online_matches")
      .update({
        status: "finished",
        winner_id: opponentId,
        forfeited_by: playerId,
      } as any)
      .eq("id", match.id);

    // Award match points on forfeit too
    const p1Wins = match.player1_wins;
    const p2Wins = match.player2_wins;
    await awardMatchPoints(match, p1Wins, p2Wins, opponentId);
  }, [playerId]);

  const submitGuessTime = useCallback(async (guessTimeMs: number) => {
    const match = activeMatchRef.current;
    if (!match || !currentRound || !playerId) return;

    const isPlayer1 = playerId === match.player1_id;
    const updateField = isPlayer1 ? "player1_guess_time_ms" : "player2_guess_time_ms";

    const { data: updatedRound } = await supabase
      .from("match_rounds")
      .update({
        [updateField]: guessTimeMs,
        winner_id: playerId,
        status: "finished",
      })
      .eq("id", currentRound.id)
      .eq("status", "active")
      .select()
      .single();

    if (!updatedRound) return;

    const newP1Wins = match.player1_wins + (isPlayer1 ? 1 : 0);
    const newP2Wins = match.player2_wins + (!isPlayer1 ? 1 : 0);

    if (newP1Wins >= WINS_TO_WIN || newP2Wins >= WINS_TO_WIN) {
      const matchWinner = newP1Wins >= WINS_TO_WIN ? match.player1_id : match.player2_id;
      await supabase
        .from("online_matches")
        .update({
          player1_wins: newP1Wins,
          player2_wins: newP2Wins,
          status: "finished",
          winner_id: matchWinner,
        })
        .eq("id", match.id);
      await awardMatchPoints(match, newP1Wins, newP2Wins, matchWinner);
    } else {
      // Delay next round so both players can see what the word was
      setTimeout(async () => {
        const nextWord = await getRandomWordAsync(
          match.language as Language,
          match.word_length as WordLength
        );
        const nextRoundNum = match.current_round + 1;

        await supabase.from("match_rounds").insert({
          match_id: match.id,
          round_number: nextRoundNum,
          word: nextWord,
          status: "active",
        });

        await supabase
          .from("online_matches")
          .update({
            player1_wins: newP1Wins,
            player2_wins: newP2Wins,
            current_round: nextRoundNum,
            current_word: nextWord,
          })
          .eq("id", match.id);
      }, 3000);

      // Update wins immediately so both clients see new score
      await supabase
        .from("online_matches")
        .update({
          player1_wins: newP1Wins,
          player2_wins: newP2Wins,
        })
        .eq("id", match.id);
    }
  }, [currentRound, playerId]);

  const submitFailed = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !currentRound || !playerId) return;

    const isPlayer1 = playerId === match.player1_id;
    const updateField = isPlayer1 ? "player1_guess_time_ms" : "player2_guess_time_ms";

    await supabase
      .from("match_rounds")
      .update({ [updateField]: -1 })
      .eq("id", currentRound.id);

    const { data: round } = await supabase
      .from("match_rounds")
      .select("*")
      .eq("id", currentRound.id)
      .single();

    if (round && round.player1_guess_time_ms !== null && round.player2_guess_time_ms !== null && round.status === "active") {
      const p1 = round.player1_guess_time_ms;
      const p2 = round.player2_guess_time_ms;

      let winnerId: string | null = null;
      if (p1 === -1 && p2 === -1) {
        winnerId = null;
      } else if (p1 === -1) {
        winnerId = match.player2_id;
      } else if (p2 === -1) {
        winnerId = match.player1_id;
      } else {
        winnerId = p1 <= p2 ? match.player1_id : match.player2_id;
      }

      const { data: resolved } = await supabase
        .from("match_rounds")
        .update({ winner_id: winnerId, status: "finished" })
        .eq("id", round.id)
        .eq("status", "active")
        .select()
        .single();

      if (!resolved) return;

      const newP1Wins = match.player1_wins + (winnerId === match.player1_id ? 1 : 0);
      const newP2Wins = match.player2_wins + (winnerId === match.player2_id ? 1 : 0);

      if (newP1Wins >= WINS_TO_WIN || newP2Wins >= WINS_TO_WIN) {
        const matchWinner = newP1Wins >= WINS_TO_WIN ? match.player1_id : match.player2_id;
        await supabase
          .from("online_matches")
          .update({
            player1_wins: newP1Wins,
            player2_wins: newP2Wins,
            status: "finished",
            winner_id: matchWinner,
          })
          .eq("id", match.id);
        await awardMatchPoints(match, newP1Wins, newP2Wins, matchWinner);
      } else {
        setTimeout(async () => {
          const nextWord = await getRandomWordAsync(
            match.language as Language,
            match.word_length as WordLength
          );
          const nextRoundNum = match.current_round + 1;

          await supabase.from("match_rounds").insert({
            match_id: match.id,
            round_number: nextRoundNum,
            word: nextWord,
            status: "active",
          });

          await supabase
            .from("online_matches")
            .update({
              player1_wins: newP1Wins,
              player2_wins: newP2Wins,
              current_round: nextRoundNum,
              current_word: nextWord,
            })
            .eq("id", match.id);
        }, 3000);

        await supabase
          .from("online_matches")
          .update({
            player1_wins: newP1Wins,
            player2_wins: newP2Wins,
          })
          .eq("id", match.id);
      }
    }
  }, [currentRound, playerId]);

  const requestRematch = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !playerId) return;

    const isPlayer1 = playerId === match.player1_id;
    const field = isPlayer1 ? "rematch_player1" : "rematch_player2";

    await supabase
      .from("online_matches")
      .update({ [field]: true } as any)
      .eq("id", match.id);
  }, [playerId]);

  const declineRematch = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !playerId) return;

    const isPlayer1 = playerId === match.player1_id;
    const field = isPlayer1 ? "rematch_player1" : "rematch_player2";

    await supabase
      .from("online_matches")
      .update({ [field]: false } as any)
      .eq("id", match.id);
  }, [playerId]);

  const loadActiveMatch = useCallback(async () => {
    if (!playerId) return;

    const { data } = await supabase
      .from("online_matches")
      .select("*")
      .eq("status", "active")
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setActiveMatch(data[0] as OnlineMatch);
    }
  }, [playerId]);

  // Subscribe to challenges
  useEffect(() => {
    if (!playerId) return;

    loadChallenges();
    loadActiveMatch();

    const challengeChannel = supabase
      .channel(`challenges-${playerId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "online_challenges",
        filter: `challenged_id=eq.${playerId}`,
      }, () => loadChallenges())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "online_challenges",
        filter: `challenger_id=eq.${playerId}`,
      }, async (payload) => {
        if (payload.new && (payload.new as any).status === "accepted") {
          setTimeout(() => loadActiveMatch(), 500);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [playerId, loadChallenges, loadActiveMatch]);

  // Subscribe to match and round updates
  useEffect(() => {
    if (!activeMatch?.id) return;

    const matchId = activeMatch.id;

    const matchChannel = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "online_matches",
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        if (payload.new) {
          setActiveMatch(payload.new as OnlineMatch);
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "match_rounds",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const round = payload.new as MatchRound;
        if (round && round.status === "active") {
          setCurrentRound(round);
          setRoundStartTime(Date.now());
          setOpponentProgress({});
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "match_round_progress",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const row = payload.new as { player_id: string; attempt_number: number; correct_count: number; round_id: string };
        if (!playerId || row.player_id === playerId) return;
        const cur = activeMatchRef.current;
        // Map by attempt number for the current round only
        setOpponentProgress(prev => ({ ...prev, [row.attempt_number]: row.correct_count }));
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "match_rounds",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const round = payload.new as MatchRound;
        if (round && round.status === "finished") {
          setCurrentRound(prev => prev?.id === round.id ? round : prev);
        }
      })
      .subscribe();

    supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .eq("status", "active")
      .order("round_number", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCurrentRound(data[0]);
          setRoundStartTime(Date.now());
        }
      });

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [activeMatch?.id]);

  // Handle rematch: both agreed -> player1 creates new match
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== "finished" || !playerId) return;

    const m = activeMatch as any;
    const isPlayer1 = playerId === activeMatch.player1_id;

    if (m.rematch_player1 === true && m.rematch_player2 === true && isPlayer1) {
      (async () => {
        const word = await getRandomWordAsync(
          activeMatch.language as Language,
          activeMatch.word_length as WordLength
        );

        const { data: newMatch } = await supabase
          .from("online_matches")
          .insert({
            player1_id: activeMatch.player1_id,
            player2_id: activeMatch.player2_id,
            timer_seconds: activeMatch.timer_seconds,
            word_length: activeMatch.word_length,
            language: activeMatch.language,
            current_word: word,
            status: "active",
          })
          .select()
          .single();

        if (newMatch) {
          await supabase.from("match_rounds").insert({
            match_id: newMatch.id,
            round_number: 1,
            word,
            status: "active",
          });
          setActiveMatch(newMatch as OnlineMatch);
        }
      })();
    }
  }, [
    activeMatch?.status,
    (activeMatch as any)?.rematch_player1,
    (activeMatch as any)?.rematch_player2,
    playerId,
    activeMatch?.player1_id,
  ]);

  // Player2: detect new active match after rematch
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== "finished" || !playerId) return;

    const m = activeMatch as any;
    const isPlayer2 = playerId === activeMatch.player2_id;

    if (m.rematch_player1 === true && m.rematch_player2 === true && isPlayer2) {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from("online_matches")
          .select("*")
          .eq("status", "active")
          .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0 && data[0].id !== activeMatch.id) {
          setActiveMatch(data[0] as OnlineMatch);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [
    activeMatch?.status,
    (activeMatch as any)?.rematch_player1,
    (activeMatch as any)?.rematch_player2,
    playerId,
    activeMatch?.id,
  ]);

  const leaveMatch = useCallback(() => {
    setActiveMatch(null);
    setCurrentRound(null);
    setRoundStartTime(null);
  }, []);

  return {
    pendingChallenges,
    activeMatch,
    currentRound,
    roundStartTime,
    sendChallenge,
    acceptChallenge,
    declineChallenge,
    submitGuessTime,
    submitFailed,
    leaveMatch,
    loadActiveMatch,
    requestRematch,
    declineRematch,
    forfeitMatch,
  };
}
