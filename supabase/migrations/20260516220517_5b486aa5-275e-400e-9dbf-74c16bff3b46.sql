
-- =========================================================
-- 1) players: tighten INSERT to authenticated owners only
-- =========================================================
DROP POLICY IF EXISTS "Anyone can create a player" ON public.players;

CREATE POLICY "Authenticated users create own player"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- =========================================================
-- 2) points_log: revoke client INSERT (service-role only via edge function)
-- =========================================================
DROP POLICY IF EXISTS "points_insert_own" ON public.points_log;
-- No INSERT policy => client INSERTs blocked. Edge function uses service role and bypasses RLS.

-- =========================================================
-- 3) badges + player_badges: lock writes
-- =========================================================
-- badges: only admin may add/modify catalogue entries
DROP POLICY IF EXISTS "badges_insert_admin" ON public.badges;
DROP POLICY IF EXISTS "badges_update_admin" ON public.badges;
DROP POLICY IF EXISTS "badges_delete_admin" ON public.badges;

CREATE POLICY "badges_insert_admin" ON public.badges
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "badges_update_admin" ON public.badges
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "badges_delete_admin" ON public.badges
FOR DELETE TO authenticated
USING (public.is_admin());

-- player_badges: no client writes; edge function (service role) inserts awards.
-- (Existing SELECT policy "pbadges_select" remains; no INSERT/UPDATE/DELETE policies => denied.)

-- =========================================================
-- 4) player_presence: restrict writes to owning player
-- =========================================================
DROP POLICY IF EXISTS "Anyone can upsert presence" ON public.player_presence;
DROP POLICY IF EXISTS "Anyone can update presence" ON public.player_presence;
DROP POLICY IF EXISTS "Anyone can delete presence" ON public.player_presence;

CREATE POLICY "Own presence insert"
ON public.player_presence
FOR INSERT
TO authenticated
WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "Own presence update"
ON public.player_presence
FOR UPDATE
TO authenticated
USING (player_id = public.current_player_id())
WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "Own presence delete"
ON public.player_presence
FOR DELETE
TO authenticated
USING (player_id = public.current_player_id());

-- =========================================================
-- 5) realtime.messages: require authentication for broadcast/presence topics
--    (postgres_changes are filtered by source-table RLS independently)
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages';

    EXECUTE $p$CREATE POLICY "Authenticated can read realtime messages"
      ON realtime.messages FOR SELECT
      TO authenticated USING (true)$p$;

    EXECUTE $p$CREATE POLICY "Authenticated can write realtime messages"
      ON realtime.messages FOR INSERT
      TO authenticated WITH CHECK (true)$p$;
  END IF;
END$$;
