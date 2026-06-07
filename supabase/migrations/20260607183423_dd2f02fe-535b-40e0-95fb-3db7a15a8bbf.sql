DELETE FROM public.player_badges WHERE badge_id = 'werver';
DELETE FROM public.badges WHERE id = 'werver';
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;