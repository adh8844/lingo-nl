GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_player_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_participant(uuid) TO anon, authenticated;