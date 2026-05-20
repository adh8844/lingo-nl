
-- Block all client-side INSERT/UPDATE/DELETE on games (only service_role bypasses RLS)
CREATE POLICY "games_no_client_insert" ON public.games FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "games_no_client_update" ON public.games FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "games_no_client_delete" ON public.games FOR DELETE TO authenticated, anon USING (false);

-- Block all client-side INSERT/UPDATE/DELETE on points_log
CREATE POLICY "points_log_no_client_insert" ON public.points_log FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "points_log_no_client_update" ON public.points_log FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "points_log_no_client_delete" ON public.points_log FOR DELETE TO authenticated, anon USING (false);

-- Block all client-side INSERT/UPDATE/DELETE on player_badges
CREATE POLICY "player_badges_no_client_insert" ON public.player_badges FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "player_badges_no_client_update" ON public.player_badges FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "player_badges_no_client_delete" ON public.player_badges FOR DELETE TO authenticated, anon USING (false);

-- Revoke EXECUTE on SECURITY DEFINER helpers that are only used inside RLS / triggers / service role.
-- Postgres still invokes them during policy evaluation regardless of grants.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_player_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_match_participant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_total_points(uuid) FROM PUBLIC, anon, authenticated;
