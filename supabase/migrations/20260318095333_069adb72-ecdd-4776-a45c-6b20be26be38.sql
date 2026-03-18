
-- Add forfeited_by column to online_matches for tracking who left
ALTER TABLE public.online_matches ADD COLUMN IF NOT EXISTS forfeited_by uuid REFERENCES public.players(id);

-- Create game_completions table for daily streak tracking
CREATE TABLE public.game_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, completed_date)
);

ALTER TABLE public.game_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert completions" ON public.game_completions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can view completions" ON public.game_completions FOR SELECT TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_completions;
