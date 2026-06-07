## Doel

Tabellen `groups`, `group_members` en `friends` volledig verwijderen, samen met alle bijbehorende frontend- en edge-functioncode. Schools-functionaliteit blijft ongewijzigd.

## Database migratie

Eén migratie die het volgende doet:

- `DROP TABLE IF EXISTS public.group_members CASCADE;`
- `DROP TABLE IF EXISTS public.groups CASCADE;`
- `DROP TABLE IF EXISTS public.friends CASCADE;`
- Verwijder de bijbehorende badge `werver` uit `public.badges` (en `player_badges` via cascade of expliciete DELETE), aangezien deze badge afhankelijk is van de friends-tabel.

## Frontend

- Verwijder bestand `src/components/Leaderboard.tsx` (geen imports gevonden — component is ongebruikt).
- Geen andere componenten gebruiken `friends`/`groups`/`group_members`.
- Pas het getal van het totaal aantal badges aan naar 23 op badges pagina en spelregel pagina.

## Edge function

- `supabase/functions/process-game-result/index.ts`: verwijder het volledige `werver`-badge-blok (regels rond 460–470) dat `from('friends')` query't. Rest van de badge-logica blijft ongewijzigd.

## Niet aangeraakt

- Alle `school_id` / `schools` / `school_details` / `school_group` code blijft staan.
- `pupil_credentials`, `players.school_id`, teacher-flow blijven ongewijzigd.
- Oude migratiebestanden in `supabase/migrations/` blijven staan (history); alleen de nieuwe drop-migratie wordt toegevoegd.

## Opmerking

De `werver`-badge wordt uit de DB en uit de toekenning verwijderd. Spelers die hem al hadden verliezen hun toekenning (via cascade op `player_badges`).