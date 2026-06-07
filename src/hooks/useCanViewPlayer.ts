import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsTeacher } from "@/hooks/useIsTeacher";

/**
 * Bepaalt of de huidige gebruiker het profiel/statistieken van een speler mag bekijken.
 * - Eigen profiel: altijd toegestaan
 * - Admin: alle profielen
 * - Docent: alleen leerlingen in dezelfde school
 */
export function useCanViewPlayer(targetPlayerId: string | undefined | null) {
  const { player, loading: playerLoading } = usePlayer();
  const { isAdmin, checking: adminChecking } = useIsAdmin();
  const { isTeacher, checking: teacherChecking } = useIsTeacher();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (playerLoading || adminChecking || teacherChecking) {
      setAllowed(null);
      return;
    }
    if (!targetPlayerId || !player) {
      setAllowed(false);
      return;
    }
    if (targetPlayerId === player.id) {
      setAllowed(true);
      return;
    }
    if (isAdmin) {
      setAllowed(true);
      return;
    }
    if (isTeacher && player.school_id) {
      supabase
        .from("players")
        .select("school_id")
        .eq("id", targetPlayerId)
        .single()
        .then(({ data }) => {
          if (cancelled) return;
          setAllowed(!!data && data.school_id === player.school_id);
        });
      return;
    }
    setAllowed(false);
    return () => {
      cancelled = true;
    };
  }, [targetPlayerId, player, playerLoading, isAdmin, adminChecking, isTeacher, teacherChecking]);

  return { allowed, checking: allowed === null };
}
