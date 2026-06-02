
-- 1. App role enum + user_roles table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'teacher') OR public.is_admin() $$;

-- 2. dutch_words: educational labels
ALTER TABLE public.dutch_words
  ADD COLUMN IF NOT EXISTS cefr_level text,
  ADD COLUMN IF NOT EXISTS frequency_band smallint,
  ADD COLUMN IF NOT EXISTS educational boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dutch_words_educational
  ON public.dutch_words (length, educational, approved, appropriate, rejected);

-- 3. players: mode + level + group
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS preferred_mode text NOT NULL DEFAULT 'leren',
  ADD COLUMN IF NOT EXISTS cefr_level text,
  ADD COLUMN IF NOT EXISTS school_group smallint;

-- Allow teacher to update their own pupils (same school)
DROP POLICY IF EXISTS "Teacher can update pupils in own school" ON public.players;
CREATE POLICY "Teacher can update pupils in own school"
ON public.players FOR UPDATE TO authenticated
USING (
  public.is_teacher()
  AND school_id IS NOT NULL
  AND school_id = public.current_player_school_id()
)
WITH CHECK (
  public.is_teacher()
  AND school_id IS NOT NULL
  AND school_id = public.current_player_school_id()
);

-- Update protected-columns guard to allow teachers to change school_id of their pupils via service role (no change needed, teachers act via app + service_role edge fn if required).
