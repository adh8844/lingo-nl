
-- Admin role assignment RPC
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
END;
$$;

-- Teacher RPC: zet leerling-modus, alleen als leerling in dezelfde school zit.
CREATE OR REPLACE FUNCTION public.teacher_set_pupil_mode(_player_id uuid, _mode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pupil_school uuid;
  caller_school uuid;
BEGIN
  IF _mode NOT IN ('leren','oefenen','klassiek','uitdaging') THEN
    RAISE EXCEPTION 'Ongeldige modus';
  END IF;

  IF NOT (public.is_teacher() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT school_id INTO pupil_school FROM public.players WHERE id = _player_id;
  caller_school := public.current_player_school_id();

  IF NOT public.is_admin() THEN
    IF pupil_school IS NULL OR caller_school IS NULL OR pupil_school <> caller_school THEN
      RAISE EXCEPTION 'Forbidden: leerling niet in jouw school';
    END IF;
  END IF;

  UPDATE public.players SET preferred_mode = _mode WHERE id = _player_id;
END;
$$;

-- Admin policies on user_roles
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;

CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin());

-- Allow teachers to view user_roles of pupils in their own school
DROP POLICY IF EXISTS user_roles_teacher_select ON public.user_roles;
CREATE POLICY user_roles_teacher_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.user_id = user_roles.user_id
        AND p.school_id IS NOT NULL
        AND p.school_id = public.current_player_school_id()
    )
  );

GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_set_pupil_mode(uuid, text) TO authenticated;
