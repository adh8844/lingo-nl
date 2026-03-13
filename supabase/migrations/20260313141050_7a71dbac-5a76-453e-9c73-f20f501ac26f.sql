
-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friends table (follow relationship)
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Players are publicly readable (for leaderboard)
CREATE POLICY "Players are viewable by everyone"
  ON public.players FOR SELECT USING (true);

-- Anyone can create a player
CREATE POLICY "Anyone can create a player"
  ON public.players FOR INSERT WITH CHECK (true);

-- Anyone can update a player
CREATE POLICY "Anyone can update a player"
  ON public.players FOR UPDATE USING (true);

-- Friends are publicly readable
CREATE POLICY "Friends are viewable by everyone"
  ON public.friends FOR SELECT USING (true);

-- Anyone can add a friend
CREATE POLICY "Anyone can add a friend"
  ON public.friends FOR INSERT WITH CHECK (true);

-- Anyone can remove a friend
CREATE POLICY "Anyone can remove a friend"
  ON public.friends FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_players_code ON public.players(player_code);
CREATE INDEX idx_friends_player ON public.friends(player_id);
CREATE INDEX idx_friends_friend ON public.friends(friend_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
