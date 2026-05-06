## Doel

Het Overzicht-tabblad op `/rankings` opnieuw indelen met paginabrede gecombineerde kaarten (met subtabs zoals Dagkanjers), meerdere telfouten oplossen en de Dagkanjers-styling aanpassen.

## Wijzigingen in `src/pages/Rankings.tsx`

### 1. Nieuwe lay-out van het Overzicht-tab (volgorde van boven naar beneden)

```text
[Online kaart]               (alleen als er online spelers zijn)
[Dagkanjers]                 (subtabs Vandaag / Gisteren — bestaand)
[Aantal punten]              paginabreed, subtabs: Totaal | Vandaag
[Aantal spellen]             paginabreed, subtabs: Totaal | Vandaag
[Reeks]                      paginabreed, subtabs: Maximaal | Huidige
[Badges] [Uitdagingen]       2 kolommen naast elkaar (huidige MiniCards)
```

De zes losse MiniCards voor punten/spellen/reeks worden vervangen door drie nieuwe paginabrede `MergedCard`-componenten met dezelfde top-3 lay-out als de huidige MiniCard, maar met een interne subtab-keuze (zelfde stijl als Dagkanjers). De titel blijft klikbaar en navigeert naar de bijbehorende detail-tab met de juiste subselectie.

State toevoegen: `overviewPointsSub`, `overviewGamesSub`, `overviewStreakSub` (lokaal in Overzicht; hergebruik bestaande `pointsSub` / `gamesSub` mag ook).

### 2. Telling Uitdagingen corrigeren (tab + MiniCard + Dagkanjers)

Op dit moment telt `loadChallenges` en `computeChampionsForRange` alleen spelers die zélf 5 ronde-wins hebben (winnaars). Een afgeronde uitdagingswedstrijd moet voor BEIDE deelnemers tellen (zowel uitdager als uitgedaagde, ongeacht winst/verlies).

Aanpassing in `loadChallenges` en in de challenges-sectie van `computeChampionsForRange`:

```ts
const completed = (m.player1_wins ?? 0) >= 5 || (m.player2_wins ?? 0) >= 5;
if (completed) {
  counts[m.player1_id] = (counts[m.player1_id] || 0) + 1;
  counts[m.player2_id] = (counts[m.player2_id] || 0) + 1;
}
```

### 3. Dagkanjers — # Spellen telt ook uitdagingsrondes mee

In `computeChampionsForRange` ontbreekt `match_rounds`. Dezelfde logica als in `loadGamesToday` toevoegen zodat het Dagkanjer-aantal én de winnaar overeenkomen met de "# Spellen vandaag"-lijst (bv. Ellen 89 i.p.v. Horse lover 13). Filter op `created_at` binnen `[startISO, endISO)` en `status = 'finished'`, en tel +1 voor `player1_id` én `player2_id`.

### 4. Dagkanjers — styling van de waarde

Per item: naam blijft vetgedrukt; het getal wordt niet meer vetgedrukt en komt tussen haakjes achter de naam:

```text
⭐ Dagscore   Ellen (245)
🎮 # Spellen  Ellen (89)
```

Implementatie: vervang `<span className="font-extrabold">{value}</span>` door `<span className="text-muted-foreground font-normal">({value})</span>` direct na de naam.

## Geen database-wijzigingen

Alles kan client-side worden opgelost; bestaande tabellen `online_matches`, `match_rounds`, `games`, `points_log`, `player_badges` voldoen.
