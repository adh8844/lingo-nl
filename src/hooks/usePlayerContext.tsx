import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import type { Player } from "@/types/player";

interface PlayerContextValue {
  player: Player | null;
  session: ReturnType<typeof useAuthReady>["session"];
  loading: boolean;
  authReady: boolean;
  refreshPlayer: () => Promise<void>;
  signOut: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { isReady, session, user } = useAuthReady();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(true);

  const loadPlayer = useCallback(async () => {
    if (!user) {
      setPlayer(null);
      localStorage.removeItem("lingo-player-id");
      setLoadingPlayer(false);
      return;
    }

    setLoadingPlayer(true);

    const { data } = await supabase.rpc("get_my_player");

    if (data) {
      const nextPlayer = data as unknown as Player;
      setPlayer(nextPlayer);
      localStorage.setItem("lingo-player-id", nextPlayer.id);
      setLoadingPlayer(false);
      return;
    }

    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Speler";

    let code = generateCode();

    for (let i = 0; i < 3; i++) {
      const { error: insertError } = await supabase
        .from("players")
        .insert({
          display_name: displayName,
          player_code: code,
          user_id: user.id,
        });

      const { data: newPlayer, error } = insertError
        ? { data: null, error: insertError }
        : await supabase.rpc("get_my_player");

      if (newPlayer) {
        const nextPlayer = newPlayer as unknown as Player;
        setPlayer(nextPlayer);
        localStorage.setItem("lingo-player-id", nextPlayer.id);
        setLoadingPlayer(false);
        return;
      }

      if (error?.code === "23505") {
        code = generateCode();
        continue;
      }

      console.error("Failed to create player:", error);
      break;
    }

    setLoadingPlayer(false);
  }, [user]);

  useEffect(() => {
    if (!isReady) return;
    void loadPlayer();
  }, [isReady, loadPlayer]);

  const refreshPlayer = useCallback(async () => {
    if (!player) return;
    const { data } = await supabase.rpc("get_my_player");
    if (data) {
      const nextPlayer = data as unknown as Player;
      setPlayer(nextPlayer);
      localStorage.setItem("lingo-player-id", nextPlayer.id);
    }
  }, [player]);

  const signOut = useCallback(async () => {
    localStorage.removeItem("lingo-player-id");
    setPlayer(null);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      player,
      session,
      loading: !isReady || loadingPlayer,
      authReady: isReady,
      refreshPlayer,
      signOut,
    }),
    [player, session, isReady, loadingPlayer, refreshPlayer, signOut]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayerContext must be used within a PlayerProvider");
  }
  return context;
}