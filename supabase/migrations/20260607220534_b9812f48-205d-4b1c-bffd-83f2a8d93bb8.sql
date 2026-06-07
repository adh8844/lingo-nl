
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS unlocked_mix boolean NOT NULL DEFAULT false;

-- Backfill BEFORE updating the guard trigger (bypass trigger as superuser)
SET LOCAL session_replication_role = 'replica';

UPDATE public.players
   SET unlocked_mix = true
 WHERE school_id IS NOT NULL
   AND unlocked_mix = false;

WITH badge_counts AS (
  SELECT player_id, COUNT(*)::int AS n,
         BOOL_OR(badge_id = 'niet_te_stoppen') AS has_nts
  FROM public.player_badges
  GROUP BY player_id
)
UPDATE public.players p
   SET unlocked_mix = true
  FROM badge_counts bc
 WHERE bc.player_id = p.id
   AND p.school_id IS NULL
   AND p.unlocked_mix = false
   AND p.points >= 1000
   AND bc.n >= 12
   AND bc.has_nts = true;

SET LOCAL session_replication_role = 'origin';

-- Now update guard trigger to also protect unlocked_mix
CREATE OR REPLACE FUNCTION public.guard_player_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.points IS DISTINCT FROM OLD.points
     OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
     OR NEW.best_streak IS DISTINCT FROM OLD.best_streak
     OR NEW.total_games_played IS DISTINCT FROM OLD.total_games_played
     OR NEW.total_hours_played IS DISTINCT FROM OLD.total_hours_played
     OR NEW.unlocked_5letter IS DISTINCT FROM OLD.unlocked_5letter
     OR NEW.unlocked_6letter IS DISTINCT FROM OLD.unlocked_6letter
     OR NEW.unlocked_mix IS DISTINCT FROM OLD.unlocked_mix
     OR NEW.last_played_date IS DISTINCT FROM OLD.last_played_date
     OR NEW.player_code IS DISTINCT FROM OLD.player_code
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
  THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Not allowed to modify protected player columns directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
