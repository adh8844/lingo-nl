
-- ===== online_matches: restrict SELECT to participants/admin, block client writes =====
DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.online_matches;
DROP POLICY IF EXISTS "Participants can create match" ON public.online_matches;
DROP POLICY IF EXISTS "Participants can update match" ON public.online_matches;

CREATE POLICY "online_matches_select_participants"
ON public.online_matches FOR SELECT
TO authenticated
USING (
  player1_id = public.current_player_id()
  OR player2_id = public.current_player_id()
  OR public.is_admin()
);

CREATE POLICY "online_matches_no_client_insert"
ON public.online_matches FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "online_matches_no_client_update"
ON public.online_matches FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "online_matches_no_client_delete"
ON public.online_matches FOR DELETE
TO anon, authenticated
USING (false);

-- ===== match_rounds: restrict SELECT to participants/admin, block client writes =====
DROP POLICY IF EXISTS "Rounds viewable by everyone" ON public.match_rounds;
DROP POLICY IF EXISTS "Participants can create round" ON public.match_rounds;
DROP POLICY IF EXISTS "Participants can update round" ON public.match_rounds;

CREATE POLICY "match_rounds_select_participants"
ON public.match_rounds FOR SELECT
TO authenticated
USING (public.is_match_participant(match_id) OR public.is_admin());

CREATE POLICY "match_rounds_no_client_insert"
ON public.match_rounds FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "match_rounds_no_client_update"
ON public.match_rounds FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "match_rounds_no_client_delete"
ON public.match_rounds FOR DELETE
TO anon, authenticated
USING (false);

-- ===== match_round_progress: restrict SELECT to participants =====
DROP POLICY IF EXISTS "progress_select" ON public.match_round_progress;

CREATE POLICY "match_round_progress_select_participants"
ON public.match_round_progress FOR SELECT
TO authenticated
USING (public.is_match_participant(match_id) OR public.is_admin());
