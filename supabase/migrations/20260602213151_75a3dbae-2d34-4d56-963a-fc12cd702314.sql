CREATE TABLE IF NOT EXISTS public.pupil_credentials (
  player_id uuid PRIMARY KEY,
  username text NOT NULL,
  password text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pupil_credentials TO authenticated;
GRANT ALL ON public.pupil_credentials TO service_role;

ALTER TABLE public.pupil_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pupil_credentials_select_teacher_or_admin"
ON public.pupil_credentials
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = pupil_credentials.player_id
        AND p.school_id IS NOT NULL
        AND p.school_id = public.current_player_school_id()
    )
  )
);

CREATE TRIGGER update_pupil_credentials_updated_at
BEFORE UPDATE ON public.pupil_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();