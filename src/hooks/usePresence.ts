import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePresenceSettings } from "./useAppSettings";

export interface OnlinePlayer {
  player_id: string;
  display_name: string;
  player_code: string;
  points: number;
  best_streak: number;
  status: string;
  last_seen: string;
  school_id: string | null;
}

export function usePresence(playerId: string | undefined) {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { heartbeatIntervalMs, onlineThresholdMs } = usePresenceSettings();

  // Load online players
  const loadOnlinePlayers = useCallback(async () => {
    const threshold = new Date(Date.now() - onlineThresholdMs).toISOString();
    const { data } = await supabase
      .from("player_presence")
      .select("player_id, status, last_seen")
      .gte("last_seen", threshold);

    if (!data || data.length === 0) {
      setOnlinePlayers([]);
      return;
    }

    const playerIds = data.map(p => p.player_id).filter(id => id !== playerId);
    if (playerIds.length === 0) {
      setOnlinePlayers([]);
      return;
    }

    // Fetch caller's school_id to restrict the list to the same circle
    let mySchoolId: string | null = null;
    if (playerId) {
      const { data: me } = await supabase
        .from("players")
        .select("school_id")
        .eq("id", playerId)
        .maybeSingle();
      mySchoolId = (me as any)?.school_id ?? null;
    }

    const { data: players } = await supabase
      .from("players")
      .select("id, display_name, player_code, points, best_streak, school_id")
      .in("id", playerIds);

    if (players) {
      const presenceMap = new Map(data.map(p => [p.player_id, p]));
      setOnlinePlayers(
        players
          .filter((p: any) => (p.school_id ?? null) === mySchoolId)
          .map((p: any) => ({
            player_id: p.id,
            display_name: p.display_name,
            player_code: p.player_code,
            points: p.points ?? 0,
            best_streak: p.best_streak,
            status: presenceMap.get(p.id)?.status || "online",
            last_seen: presenceMap.get(p.id)?.last_seen || "",
            school_id: p.school_id ?? null,
          }))
      );
    }
  }, [playerId, onlineThresholdMs]);

  // Poll and subscribe to changes
  useEffect(() => {
    if (!playerId) return;

    loadOnlinePlayers();

    heartbeatRef.current = setInterval(() => {
      loadOnlinePlayers();
    }, heartbeatIntervalMs);

    const channel = supabase
      .channel("presence-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "player_presence" }, () => {
        loadOnlinePlayers();
      })
      .subscribe();

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      supabase.removeChannel(channel);
    };
  }, [playerId, loadOnlinePlayers, heartbeatIntervalMs]);

  return { onlinePlayers, loadOnlinePlayers };
}
