## Oorzaak

Wanneer beide spelers op "Opnieuw spelen" klikken, maakt de server netjes een nieuwe match aan (`create_rematch`). De client laadt die ook (`loadActiveMatch` of P2-polling), waardoor `activeMatch` doorzet naar de nieuwe match-ID. Het realtime-kanaal wordt voor de nieuwe match opnieuw opgezet en `refetchLatestRound` haalt ronde 1 op.

**Het probleem zit in `handleIncomingRound` (src/hooks/useOnlineMatch.ts):**

```
if (!prev || round.round_number > prev.round_number) { ... promote ... }
```

`prev` is de laatste ronde van de **vorige (afgelopen) match** — bijvoorbeeld round 7. De nieuwe match begint bij round_number 1. Dus `1 > 7` is false, en ronde 1 wordt **nooit** gepromoveerd naar `currentRound`. Resultaat: `OnlineGame` blijft de eindstand van de vorige match tonen en het spel hangt voor beide spelers. Een refresh helpt soms omdat de hook dan met `prev = null` start — maar als dezelfde stale `currentRound` of een race nog speelt (P2 polling die de oude match terugziet voordat realtime de nieuwe levert) blijft het hangen.

Bijkomende kleinere issues die de hang versterken:
- `currentRoundRef`, `finishedAtRef` en de eventuele `pendingPromotionRef`-timer worden niet gereset bij wissel naar een nieuwe match.
- De P2-pollinginterval blijft soms in stand omdat hij alleen wordt opgeruimd wanneer hij zelf een nieuwe match vindt; als P1's `loadActiveMatch` eerder is, kan de cleanup achterblijven (kleinere bijwerking).

## Plan

Eén gerichte wijziging in `src/hooks/useOnlineMatch.ts`. Geen schema-wijziging, geen server-wijziging, geen UI-wijziging.

### 1. `handleIncomingRound` — herken match-wissel

Behandel een binnenkomende ronde als "nieuwe match" wanneer `round.match_id !== prev.match_id`. In dat geval direct promoveren (zonder reveal-buffer, want er is geen lopende reveal van de nieuwe match) en interne refs schoonmaken:

```ts
const prev = currentRoundRef.current;

// Same round: update in place + record finishedAt transition
if (prev && round.id === prev.id) { ... bestaande logica ... }

// New match entirely → promote immediately, clear state
if (!prev || round.match_id !== prev.match_id) {
  if (pendingPromotionRef.current) {
    clearTimeout(pendingPromotionRef.current);
    pendingPromotionRef.current = null;
  }
  finishedAtRef.current = {};
  currentRoundRef.current = round;
  setCurrentRound(round);
  setRoundStartTime(round.status === "active" ? Date.now() : null);
  setOpponentProgress({});
  return;
}

// Same match, newer round → bestaande reveal-buffer logica
if (round.round_number > prev.round_number) { ... bestaand ... }
```

De reveal-buffer voor opvolgende rondes binnen dezelfde match (de fix die het reveal-woord beschermt) blijft volledig intact.

### 2. Reset bij wissel van match

Voeg een klein effect toe dat reageert op `activeMatch?.id`-wissel: leeg `currentRound`, `roundStartTime`, `opponentProgress` en de refs (`finishedAtRef`, `pendingPromotionRef`). Hierna haalt het bestaande effect (`refetchLatestRound(matchId)` in het channel-effect) ronde 1 van de nieuwe match op, die nu correct wordt gepromoveerd door stap 1.

### 3. P2-polling: stop ook als activeMatch.id wijzigt

In het P2-polling-effect na rematch: voeg in de poll-callback een check toe dat `activeMatchRef.current.id` nog gelijk is aan de match-ID waarvoor de poll startte; zo niet, `clearInterval`. Voorkomt dat een tweede swap naar een verkeerde match plaatsvindt als P1's `loadActiveMatch` net eerder is geweest.

## Verificatie

- Match afronden met P1+P2 beide rematch → nieuwe match moet automatisch starten met ronde 1 zichtbaar voor beide spelers, zonder refresh.
- Reveal-woord aan einde van een ronde *binnen* een match blijft correct getoond (de reveal-buffer voor `round.round_number > prev.round_number` is ongewijzigd).
- Normale rondewissels en de bestaande recovery-polling blijven werken.

## Bestanden

- `src/hooks/useOnlineMatch.ts` — alleen de hook, geen andere files.
