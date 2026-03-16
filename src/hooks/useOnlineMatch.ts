import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRandomWordAsync, Language, WordLength } from "@/data/words";

const WINS_TO_WIN = 5;

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

  // Load incoming challenges
  const loadChallenges = useCallback(async () => {
    if (!playerId) return;
    const { data } = await supabase
      .from("online_challenges")
      .select("*")
      .eq("challenged_id", playerId)
      .eq("status", "pending");

    if (data && data.length > 0) {
      // Get challenger names
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

  // Send a challenge
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

  // Accept a challenge
  const acceptChallenge = useCallback(async (challenge: OnlineChallenge) => {
    if (!playerId) return null;

    // Update challenge status
    await supabase
      .from("online_challenges")
      .update({ status: "accepted" })
      .eq("id", challenge.id);

    // Generate first word
    const word = await getRandomWordAsync(
      challenge.language as Language,
      challenge.word_length as WordLength
    );

    // Create match
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
      // Create first round
      await supabase
        .from("match_rounds")
        .insert({
          match_id: match.id,
          round_number: 1,
          word,
          status: "active",
        });

      setActiveMatch(match);
      return match;
    }
    return null;
  }, [playerId]);

  // Decline a challenge
  const declineChallenge = useCallback(async (challengeId: string) => {
    await supabase
      .from("online_challenges")
      .update({ status: "declined" })
      .eq("id", challengeId);
    loadChallenges();
  }, [loadChallenges]);

  // Submit guess time for current round
  const submitGuessTime = useCallback(async (guessTimeMs: number) => {
    if (!activeMatch || !currentRound || !playerId) return;

    const isPlayer1 = playerId === activeMatch.player1_id;
    const updateField = isPlayer1 ? "player1_guess_time_ms" : "player2_guess_time_ms";

    await supabase
      .from("match_rounds")
      .update({ [updateField]: guessTimeMs })
      .eq("id", currentRound.id);
  }, [activeMatch, currentRound, playerId]);

  // Submit failed round (didn't guess)
  const submitFailed = useCallback(async () => {
    if (!activeMatch || !currentRound || !playerId) return;

    const isPlayer1 = playerId === activeMatch.player1_id;
    const updateField = isPlayer1 ? "player1_guess_time_ms" : "player2_guess_time_ms";

    // Use -1 to indicate failure
    await supabase
      .from("match_rounds")
      .update({ [updateField]: -1 })
      .eq("id", currentRound.id);
  }, [activeMatch, currentRound, playerId]);

  // Check if both players submitted and determine round winner
  const checkRoundResult = useCallback(async (round: MatchRound) => {
    if (!activeMatch || !playerId) return;

    if (round.player1_guess_time_ms !== null && round.player2_guess_time_ms !== null && round.status === "active") {
      const p1 = round.player1_guess_time_ms;
      const p2 = round.player2_guess_time_ms;

      let winnerId: string | null = null;
      if (p1 === -1 && p2 === -1) {
        winnerId = null; // draw, no one gets a point
      } else if (p1 === -1) {
        winnerId = activeMatch.player2_id;
      } else if (p2 === -1) {
        winnerId = activeMatch.player1_id;
      } else {
        winnerId = p1 <= p2 ? activeMatch.player1_id : activeMatch.player2_id;
      }

      // Update round
      await supabase
        .from("match_rounds")
        .update({ winner_id: winnerId, status: "finished" })
        .eq("id", round.id);

      // Update match scores
      const newP1Wins = activeMatch.player1_wins + (winnerId === activeMatch.player1_id ? 1 : 0);
      const newP2Wins = activeMatch.player2_wins + (winnerId === activeMatch.player2_id ? 1 : 0);

      if (newP1Wins >= WINS_TO_WIN || newP2Wins >= WINS_TO_WIN) {
        const matchWinner = newP1Wins >= WINS_TO_WIN ? activeMatch.player1_id : activeMatch.player2_id;
        await supabase
          .from("online_matches")
          .update({
            player1_wins: newP1Wins,
            player2_wins: newP2Wins,
            status: "finished",
            winner_id: matchWinner,
          })
          .eq("id", activeMatch.id);
      } else {
        // Start next round
        const nextWord = await getRandomWordAsync(
          activeMatch.language as Language,
          activeMatch.word_length as WordLength
        );
        const nextRound = activeMatch.current_round + 1;

        await supabase
          .from("match_rounds")
          .insert({
            match_id: activeMatch.id,
            round_number: nextRound,
            word: nextWord,
            status: "active",
          });

        await supabase
          .from("online_matches")
          .update({
            player1_wins: newP1Wins,
            player2_wins: newP2Wins,
            current_round: nextRound,
            current_word: nextWord,
          })
          .eq("id", activeMatch.id);
      }
    }
  }, [activeMatch, playerId]);

  // Load active match for this player
  const loadActiveMatch = useCallback(async () => {
    if (!playerId) return;

    const { data } = await supabase
      .from("online_matches")
      .select("*")
      .eq("status", "active")
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setActiveMatch(data);
    }
  }, [playerId]);

  // Subscribe to challenges and match updates
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
        // If our challenge was accepted, load the match
        if (payload.new && (payload.new as any).status === "accepted") {
          setTimeout(() => loadActiveMatch(), 500);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [playerId, loadChallenges, loadActiveMatch]);

  // Subscribe to match and round updates when active
  useEffect(() => {
    if (!activeMatch) return;

    const matchChannel = supabase
      .channel(`match-${activeMatch.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "online_matches",
        filter: `id=eq.${activeMatch.id}`,
      }, (payload) => {
        if (payload.new) {
          setActiveMatch(payload.new as OnlineMatch);
        }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "match_rounds",
        filter: `match_id=eq.${activeMatch.id}`,
      }, (payload) => {
        const round = payload.new as MatchRound;
        if (round && round.status === "active") {
          setCurrentRound(round);
          setRoundStartTime(Date.now());
        } else if (round) {
          setCurrentRound(round);
          checkRoundResult(round);
        }
      })
      .subscribe();

    // Load current active round
    supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", activeMatch.id)
      .eq("status", "active")
      .order("round_number", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentRound(data);
          setRoundStartTime(Date.now());
        }
      });

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [activeMatch?.id, checkRoundResult]);

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
  };
}
