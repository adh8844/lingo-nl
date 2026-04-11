
CREATE OR REPLACE FUNCTION public.get_player_total_points(p_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::bigint FROM public.points_log WHERE player_id = p_id;
$$;
