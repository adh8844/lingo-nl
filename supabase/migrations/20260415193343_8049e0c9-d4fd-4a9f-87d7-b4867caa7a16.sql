
CREATE OR REPLACE FUNCTION public.get_player_daily_points(p_id uuid, from_date date, to_date date)
RETURNS TABLE(day date, total_points bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COALESCE(SUM(points), 0)::bigint AS total_points
  FROM public.points_log
  WHERE player_id = p_id
    AND (created_at AT TIME ZONE 'UTC')::date BETWEEN from_date AND to_date
  GROUP BY day
  ORDER BY day;
$$;
