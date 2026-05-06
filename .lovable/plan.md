## Doel

Op de Rankings-pagina ook **uitdagingsrondes** (online matches) meetellen in de lijsten **# Spellen totaal** en **# Spellen vandaag**, zodat de competitie eerlijker is voor spelers die veel online matches spelen.

## Databron

De data is volledig beschikbaar:

- `match_rounds` bevat elke individuele ronde met `match_id`, `created_at`, `status`.
- `online_matches` koppelt `match_id` aan `player1_id` + `player2_id`.

Elke afgesloten ronde (`status = 'finished'`) telt mee voor **beide** spelers van de bijbehorende match. Een match van bv. 5 rondes = 5 spellen voor speler 1 én 5 spellen voor speler 2.

In de DB staan momenteel ~403 finished rondes over 47 matches.

## Wijzigingen in `src/pages/Rankings.tsx`

### 1. `loadGamesTotal` uitbreiden

Naast het pagineren over `games`, ook ophalen:

```ts
const { data: rounds } = await supabase
  .from("match_rounds")
  .select("match_id, online_matches!inner(player1_id, player2_id)")
  .eq("status", "finished");
```

Per ronde +1 toevoegen aan `counts[player1_id]` en `counts[player2_id]`. Pagineren als er meer dan 1000 rondes zijn (zelfde patroon als bestaand).

### 2. `loadGamesToday` uitbreiden

Zelfde join, maar gefilterd met `.gte("created_at", amsterdamStartOfTodayISO())`.

### 3. UI

Geen visuele wijzigingen — de lijsten blijven hetzelfde, de tellingen worden alleen completer. Eventueel later een tooltip "incl. uitdagingsrondes" toevoegen, maar dat is niet nodig.

## Alternatief overwogen

Per ronde een rij in `games` schrijven vanuit `OnlineGame.tsx` zou ook werken, maar:

- vereist backend-wijziging
- heeft risico op dubbele tellingen bij realtime sync
- de huidige join-aanpak is volledig backwards-compatible

## Out of scope

- Punten uit uitdagingen worden al via `points_log` correct meegerekend in Punten-lijsten.
- Reeksen-logica blijft ongewijzigd.

## Challengers

- In het geval challengers ook nog niet meegenomen werden in het aantal gespeelde spellen op de rankingspagina, neem deze op dezelfde manier dan ook mee.