
CREATE OR REPLACE FUNCTION public.refresh_championship_standings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      (rp + rs * 2 + rg * 4 + rb * 4 + rc * 4)::numeric AS sc
    FROM combined
  )
  SELECT
    pid, sid, rp, rs, rg, rb, rc, fbr, sc,
    RANK() OVER (PARTITION BY sid ORDER BY sc ASC)::int,
    now()
  FROM scored;
END;
$function$;

SELECT public.refresh_championship_standings();
