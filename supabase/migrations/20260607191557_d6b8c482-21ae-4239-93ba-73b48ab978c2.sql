
-- 1. Lock down online_challenges SELECT
DROP POLICY IF EXISTS "Challenges viewable by participants" ON public.online_challenges;
CREATE POLICY "Challenges viewable by participants"
ON public.online_challenges
FOR SELECT
TO authenticated
USING (
  challenger_id = public.current_player_id()
  OR challenged_id = public.current_player_id()
);

-- 2. Revoke user_id column on players from authenticated (already revoked from anon)
REVOKE SELECT (user_id) ON public.players FROM authenticated;
-- Owner can still read own row's user_id via get_my_player() (security definer).

-- 3. Admin RPC to list players with user_id for role management
CREATE OR REPLACE FUNCTION public.admin_list_players_with_user_id()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  player_code text,
  points integer,
  preferred_mode text,
  school_id uuid,
  total_games_played integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.player_code, p.points,
         p.preferred_mode, p.school_id, p.total_games_played
  FROM public.players p
  ORDER BY p.display_name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_players_with_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_players_with_user_id() TO authenticated;
