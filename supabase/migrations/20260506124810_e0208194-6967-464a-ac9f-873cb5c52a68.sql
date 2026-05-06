
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admin can insert app_settings"
  ON public.app_settings FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = 'denheijera@icloud.com');

CREATE POLICY "Only admin can update app_settings"
  ON public.app_settings FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'denheijera@icloud.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'denheijera@icloud.com');

CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES
  ('heartbeat_interval_ms', '5000'),
  ('online_threshold_ms', '15000')
ON CONFLICT (key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
