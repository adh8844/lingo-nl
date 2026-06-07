
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE public.championship_standings (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  school_id uuid NULL,
  rank_points int NOT NULL,
  rank_streak int NOT NULL,
  rank_games int NOT NULL,
  rank_badges int NOT NULL,
  rank_challenges int NOT NULL,
  fallback_rank int NOT NULL,
  score numeric(8,3) NOT NULL,
  rank_position int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX championship_standings_school_idx ON public.championship_standings(school_id, rank_position);

GRANT SELECT ON public.championship_standings TO authenticated;
GRANT ALL ON public.championship_standings TO service_role;

ALTER TABLE public.championship_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own circle standings"
ON public.championship_standings FOR SELECT
TO authenticated
USING (
  school_id IS NOT DISTINCT FROM public.current_player_school_id()
);

CREATE OR REPLACE FUNCTION public.refresh_championship_standings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  TRUNCATE public.championship_standings;

  INSERT INTO public.championship_standings (
    player_id, school_id,
    rank_points, rank_streak, rank_games, rank_badges, rank_challenges,
    fallback_rank, score, rank_position, updated_at
  )
  WITH
  pool AS (SELECT id, school_id FROM public.players),
  group_size AS (SELECT school_id, COUNT(*)::int AS n FROM pool GROUP BY school_id),
  pts AS (
    SELECT p.id, RANK() OVER (PARTITION BY p.school_id ORDER BY p.points DESC) AS r
    FROM public.players p WHERE p.points > 0
  ),
  strk AS (
    SELECT p.id, RANK() OVER (PARTITION BY p.school_id ORDER BY GREATEST(p.best_streak, p.current_streak) DESC) AS r
    FROM public.players p WHERE GREATEST(p.best_streak, p.current_streak) > 0
  ),
  games_src AS (SELECT * FROM public.get_games_count_total()),
  gms AS (
    SELECT p.id, RANK() OVER (PARTITION BY p.school_id ORDER BY g.games_count DESC) AS r
    FROM public.players p
    JOIN games_src g ON g.player_id = p.id
    WHERE g.games_count > 0
  ),
  badges_src AS (SELECT * FROM public.get_badges_count_total()),
  bdg AS (
    SELECT p.id, RANK() OVER (PARTITION BY p.school_id ORDER BY b.badges_count DESC) AS r
    FROM public.players p
    JOIN badges_src b ON b.player_id = p.id
    WHERE b.badges_count > 0
  ),
  chl_src AS (SELECT * FROM public.get_completed_matches_count_total()),
  chl AS (
    SELECT p.id, RANK() OVER (PARTITION BY p.school_id ORDER BY c.matches_count DESC) AS r
    FROM public.players p
    JOIN chl_src c ON c.player_id = p.id
    WHERE c.matches_count > 0
  ),
  combined AS (
    SELECT
      pool.id AS pid,
      pool.school_id AS sid,
      gs.n AS fbr,
      COALESCE(pts.r,  gs.n)::int AS rp,
      COALESCE(strk.r, gs.n)::int AS rs,
      COALESCE(gms.r,  gs.n)::int AS rg,
      COALESCE(bdg.r,  gs.n)::int AS rb,
      COALESCE(chl.r,  gs.n)::int AS rc
    FROM pool
    JOIN group_size gs ON gs.school_id IS NOT DISTINCT FROM pool.school_id
    LEFT JOIN pts  ON pts.id  = pool.id
    LEFT JOIN strk ON strk.id = pool.id
    LEFT JOIN gms  ON gms.id  = pool.id
    LEFT JOIN bdg  ON bdg.id  = pool.id
    LEFT JOIN chl  ON chl.id  = pool.id
  ),
  scored AS (
    SELECT pid, sid, fbr, rp, rs, rg, rb, rc,
      ROUND((rp + rs * 2 + rg * 4 + rb * 4 + rc * 4)::numeric / 15.0, 3) AS sc
    FROM combined
  )
  SELECT
    pid, sid, rp, rs, rg, rb, rc, fbr, sc,
    RANK() OVER (PARTITION BY sid ORDER BY sc ASC)::int,
    now()
  FROM scored;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_championship_standings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_championship_standings() TO service_role;

CREATE OR REPLACE FUNCTION public.get_championship_standings()
RETURNS TABLE(
  player_id uuid,
  display_name text,
  rank_position int,
  score numeric,
  rank_points int,
  rank_streak int,
  rank_games int,
  rank_badges int,
  rank_challenges int,
  fallback_rank int,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cs.player_id, p.display_name,
    cs.rank_position, cs.score,
    cs.rank_points, cs.rank_streak, cs.rank_games, cs.rank_badges, cs.rank_challenges,
    cs.fallback_rank, cs.updated_at
  FROM public.championship_standings cs
  JOIN public.players p ON p.id = cs.player_id
  WHERE cs.school_id IS NOT DISTINCT FROM public.current_player_school_id()
  ORDER BY cs.rank_position ASC, p.display_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_championship_standings() TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_championship_standings_3min') THEN
    PERFORM cron.unschedule('refresh_championship_standings_3min');
  END IF;
END $$;

SELECT cron.schedule(
  'refresh_championship_standings_3min',
  '*/3 * * * *',
  $$SELECT public.refresh_championship_standings();$$
);

SELECT public.refresh_championship_standings();
