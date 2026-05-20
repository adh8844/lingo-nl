
-- Protect score/stat columns on players from direct client writes.
-- Only the service_role (used by the process-game-result edge function) may
-- modify points, streaks, games_played, hours_played, unlocks and last_played_date.
CREATE OR REPLACE FUNCTION public.guard_player_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
     OR NEW.last_played_date IS DISTINCT FROM OLD.last_played_date
     OR NEW.player_code IS DISTINCT FROM OLD.player_code
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected player columns directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_guard_protected_columns ON public.players;
CREATE TRIGGER players_guard_protected_columns
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.guard_player_protected_columns();
