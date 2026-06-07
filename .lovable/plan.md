# Toegang tot Profiel & Statistieken beperken

## Regels
- Eigen profiel/statistieken: iedereen.
- Admin (`is_admin()`): alle profielen en statistieken.
- Docent (`has_role(...,'teacher')`): alleen profielen/statistieken van leerlingen in **dezelfde school** (`players.school_id` matcht docent's `school_id`).
- Normale gebruikers en leerlingen: alleen zichzelf.

## Backend (RLS + helper)

Nieuwe migratie met:

1. SECURITY DEFINER helper `public.can_view_player(target uuid)`:
   ```
   self  OR is_admin()
        OR (has_role(auth.uid(),'teacher')
            AND target.school_id IS NOT NULL
            AND target.school_id = current_player_school_id())
   ```
2. RLS-policies bijwerken:
   - `games`: SELECT → `can_view_player(player_id)` (vervangt huidige own/admin).
   - `points_log`: idem.
   - `player_badges`: SELECT → `can_view_player(player_id)` (vervangt `true`).
3. RPC's `get_own_games` en `get_player_daily_points` → autorisatiecheck via `can_view_player` (i.p.v. alleen self/admin), zodat docent statistieken van leerling kan ophalen.

`players` SELECT blijft `true` (rankings/multiplayer hebben namen nodig).

## Frontend

1. Nieuw hookje `src/hooks/useCanViewPlayer.ts`:
   - input: `targetPlayerId`
   - resolve via huidige sessie: own ✓ / admin ✓ / teacher + zelfde `school_id` ✓.
   - Doet één lichte query naar `players` om `school_id` van target te halen wanneer nodig.

2. `src/pages/Profile.tsx` en `src/pages/Statistics.tsx`:
   - Als `playerId` gezet en gebruiker niet bevoegd → `toast.error("Geen toegang")` en `navigate("/profile", { replace: true })` (resp. `/statistics`).
   - Tijdens check: spinner/placeholder; geen data laden.

3. `src/pages/Rankings.tsx`:
   - Bouw set `viewableIds` op basis van rol:
     - admin → alle `id`s in dataset
     - teacher → eigen id + alle spelers met zelfde `school_id`
     - anders → alleen eigen id
   - Alle `onClick={() => navigate(\`/profile/${id}\`)}` op rij/naam:
     - wrap in `if (viewableIds.has(id)) navigate(...)` of render zonder klikgedrag (geen `cursor-pointer`, geen hover) wanneer niet toegestaan. Naam blijft zichtbaar.
   - Geldt voor alle plekken in Rankings (overview, points, streak, games, badges, challenges – ~6 locaties).

4. `src/pages/Teacher.tsx`: bestaande nav naar `/profile/:id` en `/statistics/:id` blijft werken — backend laat docent door.

## Niet wijzigen
- `players` SELECT-policy (namen blijven publiek voor rankings).
- Schoolcode / pupil_credentials logica.
- Andere edge functions.
