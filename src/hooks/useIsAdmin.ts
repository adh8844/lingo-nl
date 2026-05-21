import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";

/**
 * Bepaalt of de ingelogde gebruiker admin is via de Supabase RPC `is_admin()`.
 * Het admin-criterium (e-mailadres) staat uitsluitend in de database (RLS + SECURITY DEFINER functie)
 * en wordt nooit in de client-code genoemd.
 */
export function useIsAdmin() {
  const { session, authReady } = usePlayer();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!authReady) return;
    if (!session) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (cancelled) return;
      setIsAdmin(!error && data === true);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [authReady, session]);

  return { isAdmin, checking };
}
