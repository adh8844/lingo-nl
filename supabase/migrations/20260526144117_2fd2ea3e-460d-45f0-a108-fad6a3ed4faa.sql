
-- 1. Schools (public metadata)
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools_select_authenticated"
  ON public.schools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "schools_admin_insert"
  ON public.schools FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "schools_admin_update"
  ON public.schools FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "schools_admin_delete"
  ON public.schools FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. School details (sensitive, admin-only)
CREATE TABLE public.school_details (
  school_id uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_details TO authenticated;
GRANT ALL ON public.school_details TO service_role;

ALTER TABLE public.school_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_details_admin_all"
  ON public.school_details FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE UNIQUE INDEX idx_school_details_invite_code ON public.school_details(invite_code);

-- 3. Add school_id to players
ALTER TABLE public.players
  ADD COLUMN school_id uuid NULL
    REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX idx_players_school_id ON public.players(school_id);

-- Update guard trigger to also protect school_id from self-edit
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

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.current_player_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT school_id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.players_in_same_circle(p1 uuid, p2 uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (SELECT school_id FROM public.players WHERE id = p1)
    IS NOT DISTINCT FROM
         (SELECT school_id FROM public.players WHERE id = p2);
$$;
