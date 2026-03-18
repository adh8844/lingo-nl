import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Records a game completion for today and recalculates the player's streak.
 * Streak = number of consecutive days (midnight to midnight UTC) with at least one game completed.
 */
export function useStreaks(playerId: string | undefined) {
  const recordGameCompletion = useCallback(async () => {
    if (!playerId) return;

    // Insert today's completion (ignore duplicate)
    await supabase
      .from("game_completions")
      .upsert(
        { player_id: playerId, completed_date: new Date().toISOString().split("T")[0] },
        { onConflict: "player_id,completed_date" }
      );

    // Calculate streak: count consecutive days backwards from today
    const { data: completions } = await supabase
      .from("game_completions")
      .select("completed_date")
      .eq("player_id", playerId)
      .order("completed_date", { ascending: false })
      .limit(365);

    if (!completions || completions.length === 0) return;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = new Set(completions.map(c => c.completed_date));

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];

      if (dates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // Update player streak
    const { data: player } = await supabase
      .from("players")
      .select("best_streak")
      .eq("id", playerId)
      .single();

    const bestStreak = Math.max(player?.best_streak ?? 0, streak);

    await supabase
      .from("players")
      .update({ current_streak: streak, best_streak: bestStreak })
      .eq("id", playerId);
  }, [playerId]);

  return { recordGameCompletion };
}
