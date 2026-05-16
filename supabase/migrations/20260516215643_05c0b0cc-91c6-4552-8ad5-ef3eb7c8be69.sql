
-- ===== Helper functions =====
CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((auth.jwt() ->> 'email') = 'denheijera@icloud.com', false) $$;

CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.online_matches m
    WHERE m.id = p_match_id
      AND (m.player1_id = public.current_player_id() OR m.player2_id = public.current_player_id())
  )
$$;

-- ===== players =====
REVOKE SELECT (user_id, birthdate) ON public.players FROM anon;

DROP POLICY IF EXISTS "Anyone can update a player" ON public.players;
CREATE POLICY "Players can update own row" ON public.players
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ===== games =====
DROP POLICY IF EXISTS "games_insert" ON public.games;
DROP POLICY IF EXISTS "games_update" ON public.games;
-- No INSERT/UPDATE policies => only service role (edge function) may write.

-- ===== points_log =====
DROP POLICY IF EXISTS "points_insert" ON public.points_log;
CREATE POLICY "points_insert_own" ON public.points_log
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());

DROP POLICY IF EXISTS "points_select" ON public.points_log;
CREATE POLICY "points_select" ON public.points_log
  FOR SELECT USING (true);

-- ===== player_badges =====
DROP POLICY IF EXISTS "pbadges_insert" ON public.player_badges;
-- only service role inserts

-- ===== badges =====
DROP POLICY IF EXISTS "badges_insert" ON public.badges;
-- catalogue only managed via migrations/service role

-- ===== game_completions =====
DROP POLICY IF EXISTS "Anyone can insert completions" ON public.game_completions;
CREATE POLICY "Own completions insert" ON public.game_completions
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());

-- ===== match_round_progress =====
DROP POLICY IF EXISTS "progress_insert" ON public.match_round_progress;
CREATE POLICY "progress_insert_own" ON public.match_round_progress
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id()
              AND public.is_match_participant(match_id));

-- ===== online_matches =====
DROP POLICY IF EXISTS "Anyone can create a match" ON public.online_matches;
DROP POLICY IF EXISTS "Anyone can update a match" ON public.online_matches;
CREATE POLICY "Participants can create match" ON public.online_matches
  FOR INSERT TO authenticated
  WITH CHECK (player1_id = public.current_player_id()
              OR player2_id = public.current_player_id());
CREATE POLICY "Participants can update match" ON public.online_matches
  FOR UPDATE TO authenticated
  USING (player1_id = public.current_player_id()
         OR player2_id = public.current_player_id())
  WITH CHECK (player1_id = public.current_player_id()
              OR player2_id = public.current_player_id());

-- ===== match_rounds =====
DROP POLICY IF EXISTS "Anyone can create a round" ON public.match_rounds;
DROP POLICY IF EXISTS "Anyone can update a round" ON public.match_rounds;
CREATE POLICY "Participants can create round" ON public.match_rounds
  FOR INSERT TO authenticated
  WITH CHECK (public.is_match_participant(match_id));
CREATE POLICY "Participants can update round" ON public.match_rounds
  FOR UPDATE TO authenticated
  USING (public.is_match_participant(match_id))
  WITH CHECK (public.is_match_participant(match_id));

-- ===== dutch_words =====
DROP POLICY IF EXISTS "Anyone can update dutch_words" ON public.dutch_words;
CREATE POLICY "Admin can update dutch_words" ON public.dutch_words
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== groups =====
DROP POLICY IF EXISTS "Creator can update group" ON public.groups;
DROP POLICY IF EXISTS "Creator can delete group" ON public.groups;
CREATE POLICY "Creator can update group" ON public.groups
  FOR UPDATE TO authenticated
  USING (created_by = public.current_player_id())
  WITH CHECK (created_by = public.current_player_id());
CREATE POLICY "Creator can delete group" ON public.groups
  FOR DELETE TO authenticated
  USING (created_by = public.current_player_id());

-- ===== group_members =====
DROP POLICY IF EXISTS "Anyone can join a group" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can leave a group" ON public.group_members;
CREATE POLICY "Self can join group" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());
CREATE POLICY "Self can leave group" ON public.group_members
  FOR DELETE TO authenticated
  USING (player_id = public.current_player_id());

-- ===== online_challenges =====
DROP POLICY IF EXISTS "Anyone can create a challenge" ON public.online_challenges;
DROP POLICY IF EXISTS "Anyone can update a challenge" ON public.online_challenges;
DROP POLICY IF EXISTS "Anyone can delete a challenge" ON public.online_challenges;
CREATE POLICY "Challenger creates challenge" ON public.online_challenges
  FOR INSERT TO authenticated
  WITH CHECK (challenger_id = public.current_player_id());
CREATE POLICY "Participant updates challenge" ON public.online_challenges
  FOR UPDATE TO authenticated
  USING (challenger_id = public.current_player_id()
         OR challenged_id = public.current_player_id())
  WITH CHECK (challenger_id = public.current_player_id()
              OR challenged_id = public.current_player_id());
CREATE POLICY "Participant deletes challenge" ON public.online_challenges
  FOR DELETE TO authenticated
  USING (challenger_id = public.current_player_id()
         OR challenged_id = public.current_player_id());

-- ===== friends =====
DROP POLICY IF EXISTS "Anyone can add a friend" ON public.friends;
DROP POLICY IF EXISTS "Anyone can remove a friend" ON public.friends;
CREATE POLICY "Self can add friend" ON public.friends
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());
CREATE POLICY "Self can remove friend" ON public.friends
  FOR DELETE TO authenticated
  USING (player_id = public.current_player_id());
