
-- Add points column to players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- Online match challenges table
CREATE TABLE public.online_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  challenged_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  timer_seconds integer NOT NULL DEFAULT 60,
  word_length integer NOT NULL DEFAULT 5,
  language text NOT NULL DEFAULT 'nl',
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.online_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges viewable by participants" ON public.online_challenges
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can create a challenge" ON public.online_challenges
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update a challenge" ON public.online_challenges
  FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can delete a challenge" ON public.online_challenges
  FOR DELETE TO public USING (true);

-- Online matches table
CREATE TABLE public.online_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  timer_seconds integer NOT NULL DEFAULT 60,
  word_length integer NOT NULL DEFAULT 5,
  language text NOT NULL DEFAULT 'nl',
  current_round integer NOT NULL DEFAULT 1,
  player1_wins integer NOT NULL DEFAULT 0,
  player2_wins integer NOT NULL DEFAULT 0,
  current_word text,
  status text NOT NULL DEFAULT 'active', -- active, finished
  winner_id uuid REFERENCES public.players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.online_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable by everyone" ON public.online_matches
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can create a match" ON public.online_matches
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update a match" ON public.online_matches
  FOR UPDATE TO public USING (true);

-- Match rounds for tracking individual round results
CREATE TABLE public.match_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.online_matches(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  word text NOT NULL,
  player1_guess_time_ms integer, -- null = not guessed yet
  player2_guess_time_ms integer,
  winner_id uuid REFERENCES public.players(id),
  status text NOT NULL DEFAULT 'active', -- active, finished
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rounds viewable by everyone" ON public.match_rounds
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can create a round" ON public.match_rounds
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update a round" ON public.match_rounds
  FOR UPDATE TO public USING (true);

-- Player presence table for online lobby
CREATE TABLE public.player_presence (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'online' -- online, in_game
);

ALTER TABLE public.player_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presence viewable by everyone" ON public.player_presence
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can upsert presence" ON public.player_presence
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update presence" ON public.player_presence
  FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can delete presence" ON public.player_presence
  FOR DELETE TO public USING (true);

-- Enable realtime for challenges, matches, rounds, and presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_presence;
