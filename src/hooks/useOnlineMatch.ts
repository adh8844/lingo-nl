import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const WINS_TO_WIN = 5;
const REVEAL_BUFFER_MS = 1500;

async function callMatchAction(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("match-action", {
    body: { action, ...body },
  });
  if (error) {
    console.error(`match-action ${action} error`, error);
    return null;
  }
  return data;
}


async function awardMatchPoints(matchId: string) {
  try {
    await supabase.functions.invoke("award-match-points", {
      body: { match_id: matchId },
    });
  } catch (e) {
    console.error("Failed to award match points", e);
  }
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
  created_at?: string;
}

export function useOnlineMatch(playerId: string | undefined) {
  const [pendingChallenges, setPendingChallenges] = useState<OnlineChallenge[]>([]);
  const [activeMatch, setActiveMatch] = useState<OnlineMatch | null>(null);
  const [currentRound, setCurrentRound] = useState<MatchRound | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [opponentProgress, setOpponentProgress] = useState<Record<number, number>>({});
  const activeMatchRef = useRef<OnlineMatch | null>(null);
  const awardedRef = useRef<Set<string>>(new Set());
  const currentRoundRef = useRef<MatchRound | null>(null);
  const finishedAtRef = useRef<Record<string, number>>({});
  const pendingPromotionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeMatchRef.current = activeMatch;
  }, [activeMatch]);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  // Handle any round arriving from realtime / poll / initial fetch.
  // - Same id → update in place; record finishedAt when transitioning to finished.
  // - Newer round_number → buffer for REVEAL_BUFFER_MS after previous round finished,
  //   so the reveal banner has time to snapshot the just-played word.
  const handleIncomingRound = useCallback((round: MatchRound) => {
    const prev = currentRoundRef.current;
    if (prev && round.id === prev.id) {
      if (round.status === "finished" && prev.status !== "finished") {
        finishedAtRef.current[round.id] = Date.now();
      }
      setCurrentRound(round);
      return;
    }
    if (!prev || round.round_number > prev.round_number) {
      const promote = () => {
        pendingPromotionRef.current = null;
        currentRoundRef.current = round;
        setCurrentRound(round);
        setRoundStartTime(round.status === "active" ? Date.now() : null);
        setOpponentProgress({});
      };
      if (prev && prev.status === "finished") {
        const finishedAt = finishedAtRef.current[prev.id] ?? Date.now();
        const elapsed = Date.now() - finishedAt;
        const delay = Math.max(0, REVEAL_BUFFER_MS - elapsed);
        if (pendingPromotionRef.current) clearTimeout(pendingPromotionRef.current);
        pendingPromotionRef.current = setTimeout(promote, delay);
      } else {
        promote();
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingPromotionRef.current) clearTimeout(pendingPromotionRef.current);
    };
  }, []);


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
    const res = await callMatchAction("accept_challenge", { challenge_id: challenge.id });
    if (!res?.match_id) return null;
    // Match will be picked up by loadActiveMatch / realtime
    await new Promise(r => setTimeout(r, 200));
    return { id: res.match_id };
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
    await callMatchAction("forfeit", { match_id: match.id });
    if (!awardedRef.current.has(match.id)) {
      awardedRef.current.add(match.id);
      await awardMatchPoints(match.id);
    }
  }, [playerId]);

  const refetchLatestRound = useCallback(async (matchId: string) => {
    const { data } = await supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) handleIncomingRound(data as MatchRound);
  }, [handleIncomingRound]);

  const submitGuessTime = useCallback(async (guessTimeMs: number) => {
    const match = activeMatchRef.current;
    if (!match || !currentRound || !playerId) return;
    const res = await callMatchAction("submit_guess", {
      match_id: match.id,
      round_id: currentRound.id,
      guess_time_ms: Math.max(0, Math.round(guessTimeMs)),
    });
    if (res?.alreadyResolved || res?.alreadyRecorded) {
      refetchLatestRound(match.id);
    }
  }, [currentRound, playerId, refetchLatestRound]);

  const submitFailed = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !currentRound || !playerId) return;
    const res = await callMatchAction("submit_failed", {
      match_id: match.id,
      round_id: currentRound.id,
    });
    if (res?.alreadyResolved || res?.roundResolved || res?.finished) {
      refetchLatestRound(match.id);
    }
  }, [currentRound, playerId, refetchLatestRound]);


  const requestRematch = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !playerId) return;
    await callMatchAction("rematch_request", { match_id: match.id });
  }, [playerId]);

  const declineRematch = useCallback(async () => {
    const match = activeMatchRef.current;
    if (!match || !playerId) return;
    await callMatchAction("rematch_decline", { match_id: match.id });
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
        handleIncomingRound(payload.new as MatchRound);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "match_round_progress",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const row = payload.new as { player_id: string; attempt_number: number; correct_count: number; round_id: string };
        if (!playerId || row.player_id === playerId) return;
        setOpponentProgress(prev => ({ ...prev, [row.attempt_number]: row.correct_count }));
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "match_rounds",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        handleIncomingRound(payload.new as MatchRound);
      })
      .subscribe();

    refetchLatestRound(matchId);

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [activeMatch?.id, playerId, handleIncomingRound, refetchLatestRound]);

  // Recovery polling: every 4s while a match is active, refetch the latest
  // round + match in case a realtime event was dropped. Goes through the same
  // handleIncomingRound buffer so reveal timing is preserved.
  useEffect(() => {
    if (!activeMatch?.id || activeMatch.status !== "active") return;
    const matchId = activeMatch.id;
    const tick = async () => {
      const [roundRes, matchRes] = await Promise.all([
        supabase
          .from("match_rounds")
          .select("*")
          .eq("match_id", matchId)
          .order("round_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("online_matches")
          .select("*")
          .eq("id", matchId)
          .maybeSingle(),
      ]);
      if (matchRes.data) {
        const m = matchRes.data as OnlineMatch;
        setActiveMatch(prev => {
          if (!prev || prev.id !== m.id) return prev;
          // Shallow compare key fields to avoid unnecessary renders
          if (
            prev.status === m.status &&
            prev.current_round === m.current_round &&
            prev.player1_wins === m.player1_wins &&
            prev.player2_wins === m.player2_wins &&
            prev.winner_id === m.winner_id
          ) return prev;
          return m;
        });
      }
      if (roundRes.data) handleIncomingRound(roundRes.data as MatchRound);
    };
    const interval = setInterval(tick, 4000);
    return () => clearInterval(interval);
  }, [activeMatch?.id, activeMatch?.status, handleIncomingRound]);




  // Award match points once when match is finished
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== "finished") return;
    if (awardedRef.current.has(activeMatch.id)) return;
    awardedRef.current.add(activeMatch.id);
    awardMatchPoints(activeMatch.id);
  }, [activeMatch?.id, activeMatch?.status]);

  // Handle rematch: both agreed -> server creates new match (P1 triggers)
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== "finished" || !playerId) return;
    const m = activeMatch as any;
    if (m.rematch_player1 === true && m.rematch_player2 === true && playerId === activeMatch.player1_id) {
      (async () => {
        const res = await callMatchAction("create_rematch", { match_id: activeMatch.id });
        if (res?.match_id) {
          await new Promise(r => setTimeout(r, 200));
          loadActiveMatch();
        }
      })();
    }
  }, [
    activeMatch?.status,
    (activeMatch as any)?.rematch_player1,
    (activeMatch as any)?.rematch_player2,
    playerId,
    activeMatch?.player1_id,
    activeMatch?.id,
    loadActiveMatch,
  ]);

  // Player2: poll for new active match after rematch agreed
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== "finished" || !playerId) return;
    const m = activeMatch as any;
    if (m.rematch_player1 === true && m.rematch_player2 === true && playerId === activeMatch.player2_id) {
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
    opponentProgress,
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
