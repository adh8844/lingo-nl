import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Points rules:
 * - Single player: +1 per correct word
 * - Single player timer bonus: 90s = +1, 60s = +2, 30s = +3
 * - Two-player match win (5 games): +10
 * - Online match win (5 games): +10
 */

export function getTimerBonus(timerSeconds: number): number {
  if (timerSeconds <= 30) return 3;
  if (timerSeconds <= 60) return 2;
  if (timerSeconds <= 90) return 1;
  return 0;
}

export function usePoints(playerId: string | undefined) {
  const addPoints = useCallback(async (amount: number) => {
    if (!playerId || amount <= 0) return;

    // Use RPC-style update: read current then update
    const { data: current } = await supabase
      .from("players")
      .select("points")
      .eq("id", playerId)
      .single();

    if (current) {
      await supabase
        .from("players")
        .update({ points: (current.points ?? 0) + amount })
        .eq("id", playerId);
    }
  }, [playerId]);

  const awardSinglePlayerWin = useCallback(async (timerSeconds: number) => {
    const base = 1;
    const bonus = getTimerBonus(timerSeconds);
    await addPoints(base + bonus);
  }, [addPoints]);

  const awardMatchWin = useCallback(async () => {
    await addPoints(10);
  }, [addPoints]);

  return { addPoints, awardSinglePlayerWin, awardMatchWin };
}
