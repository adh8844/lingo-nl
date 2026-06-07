
# Kampioenschap-tab op de rankingspagina

## Doel
Nieuwe tab **"Kampioenschap"** (eerste tab, standaard geopend) die spelers rangschikt op basis van hun positie in de 5 andere klassementen. Lager = beter.

Score-formule:
```
score = (rang_punten + rang_reeks * 2 + rang_spellen * 4 + rang_badges * 4 + rang_uitdagingen * 4) / 15
```

### Omgang met "geen rang"
Spelers die in een sublijst geen rang hebben (waarde 0 of niet aanwezig), krijgen voor die categorie **rang = N**, waarbij **N = totaal aantal spelers in `players`-tabel** (per kring/school, om consistent te blijven met hoe de andere lijsten gefilterd worden).

Dit straft afwezigheid in een lijst exact zo zwaar als "laatst staan" — geen voordeel meer voor spelers die nergens punten hebben gehaald.

## Voorbeeld (kring met N spelers)
Stel N = 16. Speler "Pieter" met punten rang 15, geen reeks (→ 16), geen spellen (→ 16), geen badges (→ 16), geen uitdagingen (→ 16):

score = (15 + 16·2 + 16·4 + 16·4 + 16·4) / 15 = (15 + 32 + 64 + 64 + 64) / 15 = 239/15 = **15.933**

Horse lover (4, 1, 2, 1, 4): (4 + 2 + 8 + 4 + 16)/15 = 34/15 = **2.267**

## UI

- Tab "Kampioenschap" 🏆, eerste positie, default actief.
- Lijst toont **alleen positie + naam + score** (compact). Geen extra cijfers inline.
- **Klik op een naam → popup** (shadcn `Dialog`) met de opbouw:
  ```
  Horse lover — score 2.267

  Punten       rang 4   × 1  =  4
  Reeks        rang 1   × 2  =  2
  Spellen      rang 2   × 4  =  8
  Badges       rang 1   × 4  =  4
  Uitdagingen  rang 4   × 4  = 16
  ─────────────────────────────
  Totaal      34 / 15  = 2.267
  ```
  Een ingevulde fallback-rang wordt weergegeven als "rang N (geen score)" zodat duidelijk is dat de speler in die categorie nog niets gedaan heeft.
- **Paginatie**: hergebruik bestaand `PAGE_SIZE = 10` mechanisme met "Vorige / Volgende" knoppen, identiek aan andere tabs.
- "Profiel openen" knop in de popup, alleen zichtbaar als `canView` true is.
- Kleine "Bijgewerkt: HH:MM" timestamp onder de lijst.

## Backend (performance)

Cache-tabel + pg_cron refresh elke 3 minuten.

1. **Tabel `public.championship_standings`**:
   - `player_id uuid PK`, `school_id uuid null`, `rank_points`, `rank_streak`, `rank_games`, `rank_badges`, `rank_challenges` (int), `score numeric(8,3)`, `position int`, `updated_at timestamptz`.
   - RLS: `SELECT` voor `authenticated` met `players_in_same_circle(player_id, current_player_id())`. Geen client-writes.
   - GRANT SELECT aan `authenticated`, ALL aan `service_role`.

2. **Functie `public.refresh_championship_standings()`** (SECURITY DEFINER):
   - Per `school_id`-groep:
     - Bereken `N` = aantal spelers in die kring (`COUNT(*) FROM players WHERE school_id IS NOT DISTINCT FROM <groep>`).
     - `RANK()` over 5 bronlijsten alleen voor spelers met `value > 0`.
     - Spelers zonder rang in een lijst → fallback-rang = `N`.
     - Score = `(pr + sr*2 + gr*4 + br*4 + cr*4) / 15.0`.
     - `position` via `RANK() OVER (PARTITION BY school_id ORDER BY score ASC)`.
   - `TRUNCATE` + `INSERT` in één transactie.

3. **RPC `public.get_championship_standings()`** (STABLE, SECURITY DEFINER): geeft cache-rijen terug voor eigen kring, joined met `display_name`. Pure lookup.

4. **`pg_cron`**: elke 3 minuten `SELECT refresh_championship_standings();`.

5. Eénmalige `SELECT refresh_championship_standings();` aan het eind van de migratie.

## Frontend (`src/pages/Rankings.tsx`)

- Type `Tab` uitbreiden met `"championship"`. Default `tab` = `"championship"`. Eerste in `tabs`-array.
- State `championshipList: ChampionshipEntry[]` met `{ id, display_name, score, ranks: {points, streak, games, badges, challenges}, fallback_rank: number }` (zodat de popup kan tonen welke fallback-waarde gebruikt is).
- `loadChampionship` → `supabase.rpc("get_championship_standings")`, via bestaand `ensureLoaded`/`loadingSection`-mechanisme (lazy bij tab-open).
- Compacte rij-render: `medal(i) + naam + score`. Klik opent dialog.
- Nieuw component `src/components/ChampionshipDetailDialog.tsx` met shadcn `Dialog`.
- Paginatie via bestaande `pageMap` (key = `"championship"`).

## Bestanden

- **Nieuwe migratie**: tabel, RLS, GRANTs, refresh-functie (met fallback-rang = N-logica), RPC, cron-schedule, initiële refresh.
- **`src/pages/Rankings.tsx`**: nieuwe tab, default, lazy loader, compacte render, dialog-open handler.
- **`src/components/ChampionshipDetailDialog.tsx`** (nieuw).
- **`src/integrations/supabase/types.ts`**: auto-regenereerd.
