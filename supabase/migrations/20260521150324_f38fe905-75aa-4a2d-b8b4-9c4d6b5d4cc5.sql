DROP FUNCTION IF EXISTS public.get_my_player();

CREATE FUNCTION public.get_my_player()
RETURNS SETOF public.players
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.players WHERE user_id = auth.uid() LIMIT 1
$$;