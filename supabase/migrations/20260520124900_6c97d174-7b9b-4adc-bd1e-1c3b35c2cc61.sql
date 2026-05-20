
-- =========================================================
-- Phase 1 + 2: Lock down games/points_log SELECT and hide
-- players.user_id / players.birthdate from public viewers.
-- =========================================================

-- 1) Restrict SELECT on games to owner or admin -------------
DROP POLICY IF EXISTS "games_select" ON public.games;

CREATE POLICY "games_select_own_or_admin"
ON public.games
FOR SELECT
TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_admin()
);

-- 2) Restrict SELECT on points_log to owner or admin --------
DROP POLICY IF EXISTS "points_select" ON public.points_log;

CREATE POLICY "points_log_select_own_or_admin"
ON public.points_log
FOR SELECT
TO authenticated
USING (
  player_id = public.current_player_id()
  OR public.is_admin()
);

-- 3) Column-level lockdown of players.user_id / birthdate ---
-- Revoke from all client roles; service_role keeps full access.
REVOKE SELECT (user_id, birthdate) ON public.players FROM anon;
REVOKE SELECT (user_id, birthdate) ON public.players FROM authenticated;
REVOKE SELECT (user_id, birthdate) ON public.players FROM PUBLIC;

-- Re-grant SELECT on all other columns explicitly to keep
-- existing public reads working.
GRANT SELECT (
  id,
  display_name,
  player_code,
  points,
  current_streak,
  best_streak,
  total_games_played,
  total_hours_played,
  unlocked_5letter,
  unlocked_6letter,
  last_played_date,
  created_at,
  updated_at
) ON public.players TO anon, authenticated;

-- 4) Self-profile RPC (returns full row incl. user_id) ------
CREATE OR REPLACE FUNCTION public.get_my_player()
RETURNS public.players
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.players WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_player() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_player() TO authenticated;
