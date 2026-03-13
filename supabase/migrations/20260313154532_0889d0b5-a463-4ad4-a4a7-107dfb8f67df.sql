
-- Groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by everyone" ON public.groups FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can create a group" ON public.groups FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Creator can update group" ON public.groups FOR UPDATE TO public USING (true);
CREATE POLICY "Creator can delete group" ON public.groups FOR DELETE TO public USING (true);

-- Group members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, player_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members are viewable by everyone" ON public.group_members FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can join a group" ON public.group_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can leave a group" ON public.group_members FOR DELETE TO public USING (true);
