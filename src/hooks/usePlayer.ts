import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Player {
  id: string;
  player_code: string;
  display_name: string;
  current_streak: number;
  best_streak: number;
  points: number;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // Load player from localStorage id
  useEffect(() => {
    const loadPlayer = async () => {
      const playerId = localStorage.getItem("lingo-player-id");
      if (playerId) {
        const { data } = await supabase
          .from("players")
          .select("*")
          .eq("id", playerId)
          .single();
        if (data) {
          setPlayer(data);
        } else {
          localStorage.removeItem("lingo-player-id");
        }
      }
      setLoading(false);
    };
    loadPlayer();
  }, []);

  const createPlayer = useCallback(async (displayName: string) => {
    let code = generateCode();
    // Try up to 3 times for unique code
    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from("players")
        .insert({ display_name: displayName, player_code: code })
        .select()
        .single();
      if (data) {
        localStorage.setItem("lingo-player-id", data.id);
        setPlayer(data);
        return data;
      }
      if (error?.code === "23505") {
        code = generateCode();
      } else {
        throw error;
      }
    }
    throw new Error("Could not generate unique code");
  }, []);

  const updateStreak = useCallback(
    async (currentStreak: number, bestStreak: number) => {
      if (!player) return;
      const { data } = await supabase
        .from("players")
        .update({ current_streak: currentStreak, best_streak: bestStreak })
        .eq("id", player.id)
        .select()
        .single();
      if (data) setPlayer(data);
    },
    [player]
  );

  const refreshPlayer = useCallback(async () => {
    if (!player) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", player.id)
      .single();
    if (data) setPlayer(data);
  }, [player]);

  return { player, loading, createPlayer, updateStreak, refreshPlayer };
}
