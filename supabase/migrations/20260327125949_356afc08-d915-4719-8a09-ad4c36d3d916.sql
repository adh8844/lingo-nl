
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS total_games_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hours_played numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_date date,
  ADD COLUMN IF NOT EXISTS unlocked_5letter boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlocked_6letter boolean NOT NULL DEFAULT false;

UPDATE public.players SET points = 0;

CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  level integer NOT NULL,
  word text NOT NULL,
  attempts integer,
  solved boolean NOT NULL DEFAULT false,
  duration_seconds integer,
  points_earned integer NOT NULL DEFAULT 0,
  session_id text,
  first_green_attempt integer,
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_games_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  game_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_points_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  CONSTRAINT fk_points_game FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  is_rare boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.player_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  badge_id text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, badge_id),
  CONSTRAINT fk_pbadges_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  CONSTRAINT fk_pbadges_badge FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games_insert" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "games_select" ON public.games FOR SELECT USING (true);
CREATE POLICY "games_update" ON public.games FOR UPDATE USING (true);
CREATE POLICY "points_insert" ON public.points_log FOR INSERT WITH CHECK (true);
CREATE POLICY "points_select" ON public.points_log FOR SELECT USING (true);
CREATE POLICY "badges_select" ON public.badges FOR SELECT USING (true);
CREATE POLICY "badges_insert" ON public.badges FOR INSERT WITH CHECK (true);
CREATE POLICY "pbadges_insert" ON public.player_badges FOR INSERT WITH CHECK (true);
CREATE POLICY "pbadges_select" ON public.player_badges FOR SELECT USING (true);

INSERT INTO public.badges (id, name, category, description, points, is_rare) VALUES
  ('nachtuil', 'Nachtuil', 'Tijd', 'Rond 5 spellen af tussen 00:00 en 05:00', 15, false),
  ('vroege_vogel', 'Vroege vogel', 'Tijd', 'Rond 5 spellen af voor 07:00', 10, false),
  ('maneschijn', 'Maneschijn', 'Tijd', 'Speel 2 spellen tussen 22:00 en 23:00', 12, false),
  ('weekendstrijder', 'Weekendstrijder', 'Tijd', 'Voltooi 10+ spellen op een zaterdag of zondag', 18, false),
  ('op_dreef', 'Op dreef', 'Reeks', 'Speel 3 dagen op rij', 20, false),
  ('niet_te_stoppen', 'Niet te stoppen', 'Reeks', 'Speel 7 dagen op rij', 50, true),
  ('ijzersterk', 'IJzersterk', 'Reeks', 'Speel 30 dagen op rij', 150, true),
  ('maandmaster', 'Maandmaster', 'Reeks', 'Speel elke dag van een kalendermaand', 80, true),
  ('supersnel', 'Supersnel', 'Vaardigheid', 'Raad een woord razendsnel', 25, false),
  ('vlekkeloos', 'Vlekkeloos', 'Vaardigheid', 'Raad het woord in de eerste poging', 40, true),
  ('comeback', 'Comeback', 'Vaardigheid', 'Win na 3+ pogingen zonder groen', 30, false),
  ('meesterspeler', 'Meesterspeler', 'Vaardigheid', 'Win 10 spellen op rij', 60, true),
  ('fair_play', 'Fair play', 'Sociaal', 'Daag een nieuwe speler uit', 15, false),
  ('werver', 'Werver', 'Sociaal', 'Nodig 3 actieve vrienden uit', 45, true),
  ('feestbeest', 'Feestbeest', 'Sociaal', 'Speel op je verjaardag', 20, false),
  ('uitdager', 'Uitdager', 'Sociaal', 'Neem deel aan 5 uitdagingswedstrijden', 35, false),
  ('marathonloper', 'Marathonloper', 'Uithoudingsvermogen', 'Speel 10+ spellen op één dag', 30, false),
  ('golfrijder', 'Golfrijder', 'Uithoudingsvermogen', 'Speel 5+ spellen in één sessie', 45, false),
  ('onvermoeibaar', 'Onvermoeibaar', 'Uithoudingsvermogen', 'Speel 50+ spellen in één week', 65, true),
  ('tijdloze', 'Tijdloze', 'Uithoudingsvermogen', 'Bereik 100 uur speeltijd', 100, true),
  ('alleskunner', 'Alleskunner', 'Prestige', 'Verdien een badge uit elke categorie', 100, true),
  ('veteraan', 'Veteraan', 'Prestige', 'Account >365 dagen en >100 spellen', 80, true),
  ('legend', 'Legend', 'Prestige', 'Sta in de top 3 puntenranglijst', 120, true),
  ('verzamelaar', 'Verzamelaar', 'Prestige', 'Verdien 20+ unieke badges', 90, true);
