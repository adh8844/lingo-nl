import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Player {
  id: string;
  player_code: string;
  display_name: string;
  current_streak: number;
  best_streak: number;
  points: number;
  birthdate?: string | null;
  total_games_played: number;
  total_hours_played: number;
  last_played_date?: string | null;
  unlocked_5letter: boolean;
  unlocked_6letter: boolean;
  created_at: string;
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
          setPlayer(data as unknown as Player);
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
    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from("players")
        .insert({ display_name: displayName, player_code: code })
        .select()
        .single();
      if (data) {
        localStorage.setItem("lingo-player-id", data.id);
        setPlayer(data as unknown as Player);
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

  const refreshPlayer = useCallback(async () => {
    if (!player) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", player.id)
      .single();
    if (data) setPlayer(data as unknown as Player);
  }, [player]);

  return { player, loading, createPlayer, refreshPlayer };
}
