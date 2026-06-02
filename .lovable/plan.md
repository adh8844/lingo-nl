# Plan — Admin, Docent, Speelmodi & Mix-variant

## 1. Database (migratie)

- `dutch_words`: voeg admin RLS UPDATE policy uit (al aanwezig). Geen schemawijziging nodig — `educational` bestaat al.
- `players`:
  - Verander default van `preferred_mode` zodat onbeheerde spelers leesbaar zijn; we behandelen "klassiek" als default voor spelers zonder `school_id` in de app-laag (geen backfill nodig).
- Nieuwe helper RPC `assign_user_role(_user_id uuid, _role app_role)` (SECURITY DEFINER) — alleen aanroepbaar door admin: vervangt bestaande rij(en) in `user_roles` voor die user.
- RLS op `user_roles`:
  - Admin: INSERT/UPDATE/DELETE policies.
  - Teacher: SELECT op rijen van leerlingen in eigen school (al deels mogelijk via `players` join).
- Toevoegen RPC `teacher_set_pupil_mode(_player_id uuid, _mode text)` (SECURITY DEFINER) die controleert dat caller `is_teacher()` is én leerling dezelfde `school_id` heeft.
- `players.preferred_mode` krijgt nieuwe toegestane waarde `"mix"` voor woordlengte (zie hieronder we slaan modus en lengte gescheiden op — geen DB-wijziging).

## 2. Admin-pagina (`src/pages/Admin.tsx`)

- In de **zoekresultaten** en in **pending words**: extra kolom + toggle/switch voor `educational`. Knop "Markeer als educatief" / "Niet educatief".
- Nieuwe sectie/collapsible **"Educatieve pool"**: bulk-actie — selecteer woorden uit zoekresultaten en zet ze in/uit educatieve pool.
- Nieuwe top-level tab/link **"Spelers"** → navigeert naar `/admin/spelers`.

## 3. Nieuwe pagina `/admin/spelers` (`src/pages/AdminPlayers.tsx`)

- Lijst van alle `players` met zoek/filter (naam, school, rol).
- Per rij: dropdown rol (`speler` / `teacher` / `admin`) → schrijft via nieuwe RPC `assign_user_role`. Admin wordt via `user_roles` rol `admin` toegekend (extra enum-waarde toevoegen aan `app_role`: `admin`).
- Per rij: dropdown speelmodus (`leren` / `oefenen` / `klassiek` / `uitdaging`) + dropdown school-koppeling.
- Server-update direct via supabase update (admin RLS staat dit al toe).

## 4. Docent-pagina (`/docent` – herontwerp van `src/pages/Teacher.tsx`)

- Verwijder huidige "aanvragen" landing en bouw echt dashboard, alleen zichtbaar als `isTeacher`:
  - **Mijn leerlingen**: lijst van `players` met `school_id = current_player_school_id()`.
  - Per leerling: huidige modus + dropdown om modus te wijzigen (via `teacher_set_pupil_mode` RPC).
  - Per leerling: punten, streak, badges, laatst gespeeld; klik → `/statistics/:playerId`.
  - **Klas-dashboard**: top-3 leerlingen deze week, totaal aantal spellen, gemiddelde punten.
- Niet-docent: korte instructie + mailto (huidige inhoud verplaatst hier naartoe).

## 5. Spelen-pagina (`src/pages/Index.tsx`)

- **Verwijder** de modus-selector kaarten.
- Modus wordt automatisch bepaald:
  - geen `school_id` → `"klassiek"`.
  - met `school_id` → `player.preferred_mode` (door docent gezet).
- Toon de modus alleen als klein label boven de levelkeuze ("Modus: Klassiek · door je docent ingesteld" als school-leerling).
- **Voeg vierde kaart "Mix" toe** naast 4/5/6.
  - Bij klikken: `setSelectedLevel('mix')`. Bij start van elke ronde kiest het spel willekeurig 4/5/6.
  - Gelocked voor "klassiek"-spelers tot: `points ≥ 1000` AND `badgeCount ≥ 12` AND badge `niet_te_stoppen`.
  - Unlock-uitleg op de kaart vergelijkbaar met level 6 (AND-blok).

## 6. Game-logica (`src/components/LingoGame.tsx` + `process-game-result`)

- `LingoGame` accepteert nieuwe prop `mixMode?: boolean`. Bij `mixMode`, op mount én bij "Volgende ronde" → random lengte 4|5|6 → laad woord met die lengte.
- `process-game-result` edge function: als param `mix: true`, gebruik scoring-formule van 6-letter ongeacht werkelijke lengte (multiplier-tabel). Anders ongewijzigd.
- Unlock-progress: voeg `nietTeStoppen`-badge-check en `badgeCount`-totaal toe (al deels berekend) → bepaalt mix-unlock.

## 7. Onbeheerde spelers → klassiek

- Bij eerste login zonder `school_id`: app gebruikt `klassiek` als modus, slaat dit niet meer in localStorage.
- `useGameResult.submitResult` stuurt `mode` op basis van player (niet meer uit localStorage).

## 8. Routing (`src/App.tsx`)

- Nieuwe route `/admin/spelers` → `AdminPlayers`.
- `/docent` blijft, maar herontworpen.

## Technische notities

- `app_role` enum krijgt waarde `'admin'` (naast bestaande `'teacher'`, `'student'`). `is_admin()` kan ongewijzigd blijven (jwt email check) — maar nieuwe rij in `user_roles` is informatief voor admin-toewijzing via UI.
- Alle nieuwe RPC's `SECURITY DEFINER`, `SET search_path = public`, owner-check via `is_admin()` of `is_teacher()`.
- Mix-scoring: speelt mee in dezelfde `level`-kolom als 6 voor punten, maar logt extra `mode = 'mix'` in `points_log.reason` voor traceability.
- Front-end: nieuwe `WordLength` houden, en aparte `selectedVariant: 4|5|6|'mix'` introduceren in `Index.tsx`.

## Volgorde van implementatie

1. Migratie: enum-waarde + RPC's + admin/teacher RLS updates.
2. Admin: `educational` toggle in zoek-/pending-lijsten.
3. Admin: nieuwe `/admin/spelers` pagina.
4. Docent-dashboard herbouw.
5. Index: modus-selector verwijderen, Mix-variant toevoegen, unlock-logica.
6. Edge function `process-game-result`: mix-scoring afhandeling.