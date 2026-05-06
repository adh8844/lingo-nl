
# Plan: Rankings-pagina uitbreiden

## Doel
De Rankings-pagina leuker maken door meerdere ranglijsten naast totale punten. Nieuwe tabvolgorde: **Overzicht · Punten · Reeks · # Spellen**. Tabs Vrienden en Groepen verdwijnen hier (vrienden blijven beschikbaar via de leaderboard op het startscherm).

## Tabstructuur

```text
┌──────────────────────────────────────────────────────────┐
│ Overzicht | Punten | Reeks | # Spellen                   │  ← Overzicht is default
└──────────────────────────────────────────────────────────┘
```

### 1. Overzicht (default)
Toont de **top 3** van alle 6 onderstaande lijstjes onder elkaar als compacte mini-kaartjes:

```text
⭐ Punten totaal              📅 Dagscore (vandaag)
 🥇 Jelle      1.820          🥇 Ellen        320
 🥈 Lisanne    1.640          🥈 Jelle        290
 🥉 Ellen      1.510          🥉 Janice       180

🔥 Max. reeks                  ⚡ Huidige reeks
 🥇 Jos          12            🥇 Jelle         7
 🥈 Jelle        10            🥈 Lisanne       5
 🥉 Arie-Jan      8            🥉 Ellen         3

🎮 # Spellen totaal           🎯 # Spellen vandaag
 🥇 Jelle        412           🥇 Ellen         9
 🥈 Lisanne      358           🥈 Jelle         7
 🥉 Jos          290           🥉 Janice        4
```

Elke mini-kaart heeft de titel als kop en max 3 rijen met 🥇🥈🥉. Klik op een speler → profiel.

### 2. Punten (sub-tabs)
```text
[ Totaal ]  [ Vandaag ]
```
- **Totaal**: bestaande lijst (`players.points` desc) — ongewijzigd.
- **Vandaag**: som van `points_log.points` per speler waar `created_at` op vandaag valt (Europe/Amsterdam), desc. Reset automatisch om middernacht omdat de query datum-gefilterd is.

### 3. Reeks
Eén lijst, alle spelers gesorteerd op `GREATEST(best_streak, current_streak)` desc (zodat een huidige reeks die de oude topt direct meetelt). Toont per rij beide waarden:
```text
🥇 Jos        🔥 12   (nu 4)
🥈 Jelle      🔥 11   (nu 11)   ← current heeft best ingehaald
🥉 Lisanne    🔥  9   (nu 2)
```

### 4. # Spellen (sub-tabs)
```text
[ Totaal ]  [ Vandaag ]
```
- **Totaal**: aantal rijen in `games` per `player_id`, desc. Dit telt automatisch alle losse spellen, ook die uit uitdagingen/challenger (elke ronde wordt als game gelogd).
- **Vandaag**: aantal rijen in `games` per speler waar `played_at` op vandaag (Europe/Amsterdam) valt, desc. Reset om middernacht.

## Technische uitwerking

### Bestand
`src/pages/Rankings.tsx` wordt herschreven. Vrienden/Groepen-code en challenge-knoppen-in-lijst worden verwijderd (challenge-flow blijft elders bestaan via OnlineLobby/Leaderboard).

### State
```ts
type Tab = "overview" | "points" | "streak" | "games";
type PointsSub = "total" | "today";
type GamesSub = "total" | "today";
```
Default `tab = "overview"`.

### Queries (allemaal client-side via supabase-js)
- **Punten totaal**: `players` order points desc.
- **Punten vandaag**: `points_log` select `player_id, points, created_at` waar `created_at >= startOfTodayAmsterdamUTC`; client-side groeperen + sorteren; join met `players` voor naam.
- **Max reeks**: `players` select all; client-side sort op `Math.max(best_streak, current_streak)` desc.
- **Huidige reeks** (alleen voor Overzicht-top3): `players` order `current_streak` desc.
- **Spellen totaal**: `games` select `player_id`; client-side count per speler. (Bij groei eventueel later een view/RPC.)
- **Spellen vandaag**: `games` select `player_id, played_at` met `played_at >= startOfTodayAmsterdam`; client-side count.

`startOfTodayAmsterdam` bepalen door huidige tijd in Europe/Amsterdam te formatten naar `YYYY-MM-DD`, en daar `T00:00:00` + offset bij te zetten — consistent met bestaande Amsterdam-aanpak in het project.

### UI
- Tabbalk: 4 knoppen, bestaande styling hergebruiken.
- Sub-tab balk (binnen Punten en # Spellen): kleinere pill-knoppen onder de hoofdtab.
- `renderRankRow` wordt generiek met een `value`-prop + label-icoon zodat hij zowel ⭐ punten, 🔥 reeks als 🎮 spellen kan tonen.
- Overzicht: grid van 6 kaartjes (1 kolom mobiel, 2 kolommen ≥ sm).

### Geen DB-wijzigingen nodig
Alle data zit al in `players`, `points_log` en `games`. Geen migraties, geen edge-functions.

## Buiten scope
- Vrienden- en groepenfunctionaliteit blijft bestaan (alleen weggehaald uit deze pagina).
- Geen wijziging aan puntenberekening of badges.
