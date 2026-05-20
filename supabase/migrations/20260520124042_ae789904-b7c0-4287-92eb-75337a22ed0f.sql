
-- ============================================================
-- Migration A — Additive security helpers (non-breaking)
-- ============================================================

-- 1) Public-safe views ---------------------------------------------------------

CREATE OR REPLACE VIEW public.players_public
WITH (security_invoker = true)
AS
SELECT
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
FROM public.players;

GRANT SELECT ON public.players_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.online_matches_public
WITH (security_invoker = true)
AS
SELECT
  id,
  player1_id,
  player2_id,
  timer_seconds,
  word_length,
  language,
  current_round,
  player1_wins,
  player2_wins,
  status,
  winner_id,
  rematch_player1,
  rematch_player2,
  forfeited_by,
  created_at,
  updated_at
FROM public.online_matches;

GRANT SELECT ON public.online_matches_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.match_rounds_public
WITH (security_invoker = true)
AS
SELECT
  id,
  match_id,
  round_number,
  player1_guess_time_ms,
  player2_guess_time_ms,
  winner_id,
  status,
  created_at
FROM public.match_rounds;

GRANT SELECT ON public.match_rounds_public TO anon, authenticated;

-- 2) Aggregate RPCs -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_points_in_range(p_start timestamptz, p_end timestamptz DEFAULT NULL)
RETURNS TABLE(player_id uuid, total_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pl.player_id, COALESCE(SUM(pl.points), 0)::bigint
  FROM public.points_log pl
  WHERE pl.created_at >= p_start
    AND (p_end IS NULL OR pl.created_at < p_end)
  GROUP BY pl.player_id
$$;

CREATE OR REPLACE FUNCTION public.get_games_count_in_range(p_start timestamptz, p_end timestamptz DEFAULT NULL)
RETURNS TABLE(player_id uuid, games_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH base AS (
    SELECT g.player_id, 1 AS c
    FROM public.games g
    WHERE g.played_at >= p_start
      AND (p_end IS NULL OR g.played_at < p_end)
    UNION ALL
    SELECT m.player1_id AS player_id, 1 AS c
    FROM public.match_rounds r
    JOIN public.online_matches m ON m.id = r.match_id
    WHERE r.status = 'finished'
      AND r.created_at >= p_start
      AND (p_end IS NULL OR r.created_at < p_end)
    UNION ALL
    SELECT m.player2_id AS player_id, 1 AS c
    FROM public.match_rounds r
    JOIN public.online_matches m ON m.id = r.match_id
    WHERE r.status = 'finished'
      AND r.created_at >= p_start
      AND (p_end IS NULL OR r.created_at < p_end)
  )
  SELECT player_id, SUM(c)::bigint FROM base GROUP BY player_id
$$;

CREATE OR REPLACE FUNCTION public.get_badges_count_in_range(p_start timestamptz, p_end timestamptz DEFAULT NULL)
RETURNS TABLE(player_id uuid, badges_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pb.player_id, COUNT(*)::bigint
  FROM public.player_badges pb
  WHERE pb.earned_at >= p_start
    AND (p_end IS NULL OR pb.earned_at < p_end)
  GROUP BY pb.player_id
$$;

CREATE OR REPLACE FUNCTION public.get_completed_matches_count_in_range(p_start timestamptz, p_end timestamptz DEFAULT NULL)
RETURNS TABLE(player_id uuid, matches_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH completed AS (
    SELECT m.player1_id AS player_id
    FROM public.online_matches m
    WHERE (COALESCE(m.player1_wins,0) >= 5 OR COALESCE(m.player2_wins,0) >= 5)
      AND m.updated_at >= p_start
      AND (p_end IS NULL OR m.updated_at < p_end)
    UNION ALL
    SELECT m.player2_id AS player_id
    FROM public.online_matches m
    WHERE (COALESCE(m.player1_wins,0) >= 5 OR COALESCE(m.player2_wins,0) >= 5)
      AND m.updated_at >= p_start
      AND (p_end IS NULL OR m.updated_at < p_end)
  )
  SELECT player_id, COUNT(*)::bigint FROM completed GROUP BY player_id
$$;

CREATE OR REPLACE FUNCTION public.get_games_count_total()
RETURNS TABLE(player_id uuid, games_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH base AS (
    SELECT g.player_id, 1 AS c FROM public.games g
    UNION ALL
    SELECT m.player1_id, 1 FROM public.match_rounds r
      JOIN public.online_matches m ON m.id = r.match_id
      WHERE r.status = 'finished'
    UNION ALL
    SELECT m.player2_id, 1 FROM public.match_rounds r
      JOIN public.online_matches m ON m.id = r.match_id
      WHERE r.status = 'finished'
  )
  SELECT player_id, SUM(c)::bigint FROM base GROUP BY player_id
$$;

CREATE OR REPLACE FUNCTION public.get_badges_count_total()
RETURNS TABLE(player_id uuid, badges_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT player_id, COUNT(*)::bigint
  FROM public.player_badges
  GROUP BY player_id
$$;

CREATE OR REPLACE FUNCTION public.get_completed_matches_count_total()
RETURNS TABLE(player_id uuid, matches_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH completed AS (
    SELECT m.player1_id AS player_id FROM public.online_matches m
      WHERE COALESCE(m.player1_wins,0) >= 5 OR COALESCE(m.player2_wins,0) >= 5
    UNION ALL
    SELECT m.player2_id FROM public.online_matches m
      WHERE COALESCE(m.player1_wins,0) >= 5 OR COALESCE(m.player2_wins,0) >= 5
  )
  SELECT player_id, COUNT(*)::bigint FROM completed GROUP BY player_id
$$;

-- Personal game history (owner or admin only)
CREATE OR REPLACE FUNCTION public.get_own_games(p_player_id uuid)
RETURNS TABLE(
  level int,
  solved boolean,
  attempts int,
  duration_seconds int,
  played_at timestamptz,
  points_earned int,
  first_green_attempt int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_pid uuid;
BEGIN
  caller_pid := public.current_player_id();
  IF caller_pid IS NULL OR (caller_pid <> p_player_id AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT g.level, g.solved, g.attempts, g.duration_seconds, g.played_at, g.points_earned, g.first_green_attempt
  FROM public.games g
  WHERE g.player_id = p_player_id;
END;
$$;

-- Grant EXECUTE on aggregate RPCs to anon + authenticated (they only return aggregates)
GRANT EXECUTE ON FUNCTION public.get_points_in_range(timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_games_count_in_range(timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_badges_count_in_range(timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_completed_matches_count_in_range(timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_games_count_total() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_badges_count_total() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_completed_matches_count_total() TO anon, authenticated;

-- get_own_games is auth-only (uses current_player_id())
GRANT EXECUTE ON FUNCTION public.get_own_games(uuid) TO authenticated;
