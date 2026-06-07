
-- Permission helper
CREATE OR REPLACE FUNCTION public.can_view_player(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _target = public.current_player_id()
    OR public.is_admin()
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.players tp
        WHERE tp.id = _target
          AND tp.school_id IS NOT NULL
          AND tp.school_id = public.current_player_school_id()
      )
    )
$$;

-- games SELECT
DROP POLICY IF EXISTS games_select_own_or_admin ON public.games;
CREATE POLICY games_select_viewable
  ON public.games FOR SELECT
  USING (public.can_view_player(player_id));

-- points_log SELECT
DROP POLICY IF EXISTS points_log_select_own_or_admin ON public.points_log;
CREATE POLICY points_log_select_viewable
  ON public.points_log FOR SELECT
  USING (public.can_view_player(player_id));

-- player_badges SELECT
DROP POLICY IF EXISTS pbadges_select ON public.player_badges;
CREATE POLICY player_badges_select_viewable
  ON public.player_badges FOR SELECT
  USING (public.can_view_player(player_id));

-- RPCs: allow teacher access
CREATE OR REPLACE FUNCTION public.get_own_games(p_player_id uuid)
 RETURNS TABLE(level integer, solved boolean, attempts integer, duration_seconds integer, played_at timestamp with time zone, points_earned integer, first_green_attempt integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_player(p_player_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT g.level, g.solved, g.attempts, g.duration_seconds, g.played_at, g.points_earned, g.first_green_attempt
  FROM public.games g
  WHERE g.player_id = p_player_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_player_daily_points(p_id uuid, from_date date, to_date date)
 RETURNS TABLE(day date, total_points bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_player(p_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT (pl.created_at AT TIME ZONE 'UTC')::date AS day, COALESCE(SUM(pl.points), 0)::bigint AS total_points
  FROM public.points_log pl
  WHERE pl.player_id = p_id
    AND (pl.created_at AT TIME ZONE 'UTC')::date BETWEEN from_date AND to_date
  GROUP BY day
  ORDER BY day;
END;
$function$;
