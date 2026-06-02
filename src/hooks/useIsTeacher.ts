import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";

/**
 * Checkt of de huidige gebruiker de docent-rol heeft.
 * Gebruikt de `has_role(user_id, role)` SECURITY DEFINER functie + `user_roles` tabel.
 */
export function useIsTeacher() {
  const { session, authReady } = usePlayer();
  const [isTeacher, setIsTeacher] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!authReady) return;
    if (!session) {
      setIsTeacher(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    supabase
      .rpc("has_role", { _user_id: session.user.id, _role: "teacher" as never })
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsTeacher(!error && data === true);
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, session]);

  return { isTeacher, checking };
}
