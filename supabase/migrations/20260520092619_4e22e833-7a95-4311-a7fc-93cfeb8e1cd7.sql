
-- 1) groups INSERT: only authenticated users, must create as themselves
DROP POLICY IF EXISTS "Anyone can create a group" ON public.groups;
CREATE POLICY "Authenticated users create own group"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = public.current_player_id());

-- 2) players INSERT: remove permissive public policy if it still exists
DROP POLICY IF EXISTS "Anyone can create a player" ON public.players;
-- (existing 'Authenticated users create own player' policy already enforces user_id = auth.uid())

-- 3) dutch_words INSERT: only authenticated; suggestions must be unapproved and attributed
DROP POLICY IF EXISTS "Anyone can suggest a word" ON public.dutch_words;
CREATE POLICY "Authenticated users can suggest a word"
  ON public.dutch_words
  FOR INSERT
  TO authenticated
  WITH CHECK (
    approved = false
    AND rejected = false
    AND suggested_by = public.current_player_id()
  );
-- Default new suggestions to unapproved
ALTER TABLE public.dutch_words ALTER COLUMN approved SET DEFAULT false;

-- 4) Ensure dutch_words UPDATE is admin-only (defensive: drop any leftover permissive policies)
DROP POLICY IF EXISTS "Anyone can update dutch_words" ON public.dutch_words;
-- (existing 'Admin can update dutch_words' policy with is_admin() check remains)

-- 5) Hide player birthdates from anonymous (public) visitors via column-level grants.
--    Authenticated users can still read birthdate for profile / birthday-badge logic.
REVOKE SELECT (birthdate) ON public.players FROM anon;

-- 6) Lock down SECURITY DEFINER helper functions so anon cannot invoke them
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_match_participant(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_player_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_player_total_points(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_player_daily_points(uuid, date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_player_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_total_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_daily_points(uuid, date, date) TO authenticated;
