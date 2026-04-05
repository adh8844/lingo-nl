import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_ID = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export interface GameResultData {
  game_id: string;
  points_earned: number;
  points_breakdown: { points: number; reason: string }[];
  badges_earned: { id: string; name: string; category: string; points: number; is_rare: boolean }[];
  new_total_points: number;
  current_streak: number;
  best_streak: number;
  unlocked_5letter: boolean;
  unlocked_6letter: boolean;
  trigger_challenger?: boolean;
}

export function useGameResult() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GameResultData | null>(null);

  const submitResult = useCallback(async (params: {
    player_id: string;
    level: number;
    word: string;
    attempts: number;
    solved: boolean;
    duration_seconds: number;
    first_green_attempt?: number | null;
    is_challenger?: boolean;
  }): Promise<GameResultData | null> => {
    setLoading(true);
    try {
    const { data, error } = await supabase.functions.invoke("process-game-result", {
        body: { ...params, session_id: SESSION_ID, is_challenger: params.is_challenger },
      });
      if (error) throw error;
      setResult(data);
      return data;
    } catch (err) {
      console.error("Failed to process game result:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { submitResult, result, loading, clearResult, SESSION_ID };
}
