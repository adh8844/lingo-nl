## 5 Hoog-risico Refactors — Beveiligingsplan

Deze refactors verplaatsen veel game-logica van client naar server (Edge Functions + RPC's). De game zelf blijft hetzelfde, maar onder de motorkap verandert er veel.

---

### 1. `games` & `points_log` privé maken (Rankings via RPC)

**Probleem:** iedereen kan alle gamehistorie + puntenlog van iedereen lezen.

**Aanpak:**
- Nieuwe SECURITY DEFINER RPC's die alleen **geaggregeerde** data teruggeven:
  - `get_leaderboard(period text)` → `[{player_id, display_name, total_points, games_played, ...}]`
  - `get_player_stats(p_id uuid)` → eigen detaildata (alleen voor eigenaar of admin)
  - `get_recent_games(p_id uuid, limit int)` → eigen recente games
- RLS op `games` en `points_log` SELECT inperken:
  - `games`: alleen eigenaar + admin
  - `points_log`: alleen eigenaar + admin
- Rankings/Statistics/Profile pagina's omschrijven naar RPC's i.p.v. directe `select("*")`.

**Impact:** Rankings.tsx, Statistics.tsx, Profile.tsx, usePoints.ts, useStreaks.ts, Leaderboard.tsx, Admin.tsx aanpassen.

---

### 2. `players.user_id` verbergen

**Probleem:** `user_id` (auth UUID) is publiek.

**Aanpak:**
- Een database **view** `public.players_public` maken zonder `user_id` en `birthdate`.
- RLS op `players` SELECT inperken: alleen eigen rij + admin krijgen `user_id` te zien (via kolom-restrictie is lastig in Postgres, dus we gebruiken een view).
- Frontend queries op `players` → `players_public` waar `user_id` niet nodig is.
- Plekken die `user_id` nodig hebben (Auth-flow, eigen profile) blijven op `players` querien.

**Impact:** alle `from("players").select(...)` plekken nalopen.

---

### 3. Match-uitkomst server-side (`match_outcome_manipulation`)

**Probleem:** spelers kunnen `winner_id`, `player1_wins`, `status` zelf zetten.

**Aanpak:**
- Nieuwe edge function **`resolve-match-round`**:
  - Input: `{ match_id, round_id, action: "guess_correct" | "guess_failed", guess_time_ms? }`
  - Server haalt huidige round op, valideert dat caller deelnemer is, en bepaalt winnaar op basis van **timestamps in de DB** (server-side berekend).
  - Update `match_rounds` + `online_matches` + start volgende ronde of finished match (allemaal service_role).
  - Roept intern `award-match-points` aan bij finish.
- RLS op `online_matches` en `match_rounds` UPDATE: alleen service_role (alleen INSERT van eerste match/round blijft toegestaan voor `acceptChallenge`, of we verplaatsen die ook).
- `useOnlineMatch.ts`: `submitGuessTime`, `submitFailed`, en next-round-logica vervangen door één `functions.invoke("resolve-match-round")` call.

**Impact:** useOnlineMatch.ts grondig herschrijven. Realtime subscriptions blijven werken (server-side updates triggeren ze).

---

### 4. Wedstrijdwoorden afschermen (`word_exposure_matches`)

**Probleem:** `current_word` en `match_rounds.word` zijn publiek leesbaar → cheaten mogelijk.

**Aanpak:**
- RLS SELECT op `online_matches` en `match_rounds` inperken tot deelnemers (`is_match_participant`).
- Voor presence/lobby/leaderboard queries: gebruik `online_matches_public` view zonder `current_word` (en evt. zonder andere gevoelige velden), of pas Lobby aan om alleen eigen matches te lezen.

**Impact:** OnlineLobby, GlobalOnlineManager nalopen.

---

### 5. Replay-protectie (`game_replay_no_dedup`)

**Probleem:** dezelfde game kan oneindig vaak ingediend worden voor punten.

**Aanpak in `process-game-result`:**
- **Minimum duration guard**: `duration_seconds >= 3` (anders weiger).
- **Per-session dedup**: één game per `(player_id, word, session_id)` per dag. Als er al een bestaat → 200 OK zonder punten toekennen.
- **Rate limit**: max 1 submit per speler per 5s (check laatste `played_at` in `games`).

**Impact:** alleen `process-game-result/index.ts`.

---

### Volgorde van uitvoering

```text
Stap 1: Migration A — RPC's voor leaderboard/stats + view players_public + view online_matches_public
Stap 2: Frontend aanpassen op nieuwe RPC's/views (Rankings, Statistics, Profile, Leaderboard, Lobby)
Stap 3: Edge function resolve-match-round + useOnlineMatch refactor
Stap 4: Migration B — RLS tighten (games/points_log SELECT, players user_id, matches UPDATE + words)
Stap 5: process-game-result replay protection
Stap 6: Mark findings as fixed
```

### Risico's

- **Breaking changes** in live matches tijdens deploy (lopende matches kunnen vastlopen).
- Realtime-subscriptions kunnen breken als RLS te streng wordt → moet getest.
- Rankings/Statistics performance: RPC's moeten geïndexeerd zijn.

### Wat blijft buiten scope

- `realtime_open_channel_access` (kan niet aangepast worden — reserved schema).
- Leaked password protection (handmatig in Cloud → Auth settings).
- SECURITY DEFINER linter warnings (acceptabel — door RLS afgeschermd).

---

**Bevestig je dat ik dit volledig mag uitvoeren?** Reken op meerdere migraties + edge function deploys + grote frontend refactor.
