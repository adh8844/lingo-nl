-- Restrict players SELECT to authenticated users only, removing anonymous read access to auth UUIDs.
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;

CREATE POLICY "Authenticated users can view players"
ON public.players
FOR SELECT
TO authenticated
USING (true);

-- Defense in depth: revoke broad table privileges from anon on the players table.
REVOKE ALL ON public.players FROM anon;