import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuthReady() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession((prev) => {
        // Avoid updating state when the session is effectively unchanged
        // (e.g. TOKEN_REFRESHED on tab focus). New object refs would otherwise
        // cascade into player reloads and make the page appear to refresh.
        if (prev?.user?.id === nextSession?.user?.id && prev?.access_token === nextSession?.access_token) {
          return prev;
        }
        return nextSession;
      });
      setUser((prev) => {
        if (prev?.id === nextSession?.user?.id) return prev;
        return nextSession?.user ?? null;
      });
      setIsReady(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      applySession(restoredSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  return { isReady, session, user };
}