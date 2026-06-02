ALTER TABLE public.players ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS players_username_unique ON public.players (lower(username)) WHERE username IS NOT NULL;