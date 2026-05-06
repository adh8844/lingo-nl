
CREATE TABLE public.match_round_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL,
  match_id uuid NOT NULL,
  player_id uuid NOT NULL,
  attempt_number int NOT NULL,
  correct_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id, attempt_number)
);

ALTER TABLE public.match_round_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select" ON public.match_round_progress FOR SELECT USING (true);
CREATE POLICY "progress_insert" ON public.match_round_progress FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_round_progress;
ALTER TABLE public.match_round_progress REPLICA IDENTITY FULL;

CREATE INDEX idx_mrp_match ON public.match_round_progress(match_id);
CREATE INDEX idx_mrp_round ON public.match_round_progress(round_id);
