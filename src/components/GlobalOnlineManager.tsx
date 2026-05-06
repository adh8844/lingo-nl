import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRandomWordAsync, WordLength } from "@/data/words";
import { playInviteSound, playAcceptSound } from "@/hooks/useSounds";

interface ChallengeNotif {
  id: string;
  challenger_id: string;
  challenger_name: string;
  timer_seconds: number;
  word_length: number;
  language: string;
}

const HEARTBEAT_INTERVAL = 5000;
const ACTIVITY_TIMEOUT = 15000; // 15 seconds

const GlobalOnlineManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [challenges, setChallenges] = useState<ChallengeNotif[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const getPlayerId = useCallback(() => localStorage.getItem("lingo-player-id"), []);

  // Track user activity (clicks, touches, keys)
  useEffect(() => {
    const markActive = () => { lastActivityRef.current = Date.now(); };
    const events = ["click", "touchstart", "keydown", "mousemove", "scroll"];
    events.forEach(e => window.addEventListener(e, markActive, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, markActive));
    };
  }, []);

  // Presence heartbeat - always running when player exists and recently active
  useEffect(() => {
    const playerId = getPlayerId();
    if (!playerId) return;

    const updatePresence = async () => {
      const isActive = Date.now() - lastActivityRef.current < ACTIVITY_TIMEOUT;
      if (isActive) {
        await supabase
          .from("player_presence")
          .upsert(
            { player_id: playerId, last_seen: new Date().toISOString(), status: "online" },
            { onConflict: "player_id" }
          );
      } else {
        await supabase.from("player_presence").delete().eq("player_id", playerId);
      }
    };

    updatePresence();
    heartbeatRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      supabase.from("player_presence").delete().eq("player_id", playerId);
    };
  }, [getPlayerId, location.pathname]);

  // Challenge subscription
  useEffect(() => {
    const playerId = getPlayerId();
    if (!playerId) return;

    const loadChallenges = async () => {
      const { data } = await supabase
        .from("online_challenges")
        .select("*")
        .eq("challenged_id", playerId)
        .eq("status", "pending");

      if (data && data.length > 0) {
        const ids = data.map(c => c.challenger_id);
        const { data: players } = await supabase
          .from("players")
          .select("id, display_name")
          .in("id", ids);
        const nameMap = new Map(players?.map(p => [p.id, p.display_name]) || []);

        setChallenges(data.map(c => ({
          id: c.id,
          challenger_id: c.challenger_id,
          challenger_name: nameMap.get(c.challenger_id) || "Onbekend",
          timer_seconds: c.timer_seconds,
          word_length: c.word_length,
          language: c.language,
        })));
      } else {
        setChallenges([]);
      }
    };

    loadChallenges();

    channelRef.current = supabase
      .channel(`global-ch-${playerId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "online_challenges",
        filter: `challenged_id=eq.${playerId}`,
      }, async (payload) => {
        const c = payload.new as any;
        if (c.status !== "pending") return;

        const { data: player } = await supabase
          .from("players")
          .select("display_name")
          .eq("id", c.challenger_id)
          .single();

        setChallenges(prev => {
          if (prev.some(x => x.id === c.id)) return prev;
          return [...prev, {
            id: c.id,
            challenger_id: c.challenger_id,
            challenger_name: player?.display_name || "Onbekend",
            timer_seconds: c.timer_seconds,
            word_length: c.word_length,
            language: c.language,
          }];
        });
        playInviteSound();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "online_challenges",
        filter: `challenger_id=eq.${playerId}`,
      }, (payload) => {
        const c = payload.new as any;
        if (c.status === "accepted") {
          playAcceptSound();
          setTimeout(() => navigate("/online-match"), 600);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "online_challenges",
        filter: `challenged_id=eq.${playerId}`,
      }, (payload) => {
        const c = payload.new as any;
        if (c.status !== "pending") {
          setChallenges(prev => prev.filter(x => x.id !== c.id));
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [getPlayerId, navigate, location.pathname]);

  const acceptChallenge = async (challenge: ChallengeNotif) => {
    const playerId = getPlayerId();
    if (!playerId || accepting) return;
    setAccepting(challenge.id);

    try {
      await supabase
        .from("online_challenges")
        .update({ status: "accepted" })
        .eq("id", challenge.id);

      const word = await getRandomWordAsync(
        "nl",
        challenge.word_length as WordLength
      );

      const { data: match } = await supabase
        .from("online_matches")
        .insert({
          player1_id: challenge.challenger_id,
          player2_id: playerId,
          timer_seconds: challenge.timer_seconds,
          word_length: challenge.word_length,
          language: "nl",
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

        playAcceptSound();
        setChallenges(prev => prev.filter(c => c.id !== challenge.id));
        navigate("/online-match");
      }
    } finally {
      setAccepting(null);
    }
  };

  const declineChallenge = async (challengeId: string) => {
    await supabase
      .from("online_challenges")
      .update({ status: "declined" })
      .eq("id", challengeId);
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
  };

  if (challenges.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 p-3 pointer-events-none">
      {challenges.map(c => (
        <div
          key={c.id}
          className="mx-auto w-full max-w-md bg-card border-2 border-accent shadow-2xl rounded-xl px-4 py-3 flex items-center justify-between gap-3 pointer-events-auto animate-bounce-in"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground text-sm truncate">
              ⚔️ {c.challenger_name} daagt je uit!
            </span>
            <span className="text-xs text-muted-foreground">
              {c.word_length} letters · {c.timer_seconds}s
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => acceptChallenge(c)}
              disabled={accepting === c.id}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50"
            >
              {accepting === c.id ? "..." : "✓"}
            </button>
            <button
              onClick={() => declineChallenge(c.id)}
              className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-bold text-xs hover:brightness-110 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GlobalOnlineManager;
