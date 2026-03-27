import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

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
  user_id?: string | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load or create player when session changes
  useEffect(() => {
    const loadOrCreatePlayer = async () => {
      if (!session?.user) {
        setPlayer(null);
        setLoading(false);
        return;
      }

      // Try to find existing player by user_id
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setPlayer(data as unknown as Player);
        setLoading(false);
        return;
      }

      // Auto-create player profile for new users
      const displayName =
        session.user.user_metadata?.display_name ||
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        "Speler";

      let code = generateCode();
      for (let i = 0; i < 3; i++) {
        const { data: newPlayer, error } = await supabase
          .from("players")
          .insert({
            display_name: displayName,
            player_code: code,
            user_id: session.user.id,
          })
          .select()
          .single();

        if (newPlayer) {
          setPlayer(newPlayer as unknown as Player);
          break;
        }
        if (error?.code === "23505") {
          code = generateCode();
        } else {
          console.error("Failed to create player:", error);
          break;
        }
      }
      setLoading(false);
    };

    loadOrCreatePlayer();
  }, [session]);

  const refreshPlayer = useCallback(async () => {
    if (!player) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", player.id)
      .single();
    if (data) setPlayer(data as unknown as Player);
  }, [player]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPlayer(null);
  }, []);

  return { player, session, loading, refreshPlayer, signOut };
}
