## Probleem

De online wedstrijden lopen sinds de landing-page update vertraagd en raken regelmatig vastgeplakt tussen rondes. Drie samenhangende oorzaken:

### 1. Trage overgang tussen rondes (en stilstand)
De volgende ronde wordt nooit door de server zelf aangemaakt. Pas **3 seconden** nadat de huidige ronde `finished` is, mag speler 1 `next_round` aanroepen (speler 2 als fallback na 6 s). Daar bovenop komt:
- de netwerkrondrit naar de edge function
- mogelijke cold-start van de edge function
- realtime-propagatie van de `INSERT` op `match_rounds`

Resultaat: typisch 4–7 seconden dood scherm, en als één realtime-event verloren gaat staat het spel stil tot een refresh.

### 2. P1 raadt het woord, P2 ziet het pas seconden later
Server markeert de ronde direct `finished` (winnaar = P1). P2 hangt volledig aan één realtime-`UPDATE`-event op `match_rounds`. Als dat event vertraagt of mist, blijft P2's bord en timer doorlopen → het loopt visueel uit de pas. Geen polling-vangnet.

### 3. Te veel kanaal-rebuilds bij navigatie
`GlobalOnlineManager` herbouwt op **elke** route-wissel zijn presence-heartbeat en zijn realtime-channel (door `location.pathname` in de effect-deps). Dat zorgt voor onnodige churn op de realtime-verbinding precies wanneer een match speelt.

## Plan

### 1. Server maakt zelf de volgende ronde aan (`supabase/functions/match-action/index.ts`)
Wanneer een ronde resolved wordt (in `submit_guess`, `submit_failed`, `resolveAndAdvance`) en de match nog niet voorbij is, direct binnen dezelfde request:
- `match_rounds` insert voor `round_number + 1` met een nieuw willekeurig woord
- `online_matches` update naar `current_round + 1` en `current_word`

Idempotent via de bestaande check `(match_id, round_number)` en de match-status (`active`).

Resultaat: zodra een ronde `finished` is, **bestaat de volgende ronde al** in de database. Realtime stuurt direct het `INSERT`-event uit; geen 3–6 s clientwachttijd meer.

### 2. Reveal-woord blijft gegarandeerd zichtbaar (`src/hooks/useOnlineMatch.ts`, `src/components/OnlineGame.tsx`)

Dit is de **kritieke wijziging** om te voorkomen dat het probleem van vroeger terugkomt waarbij het volgende woord per ongeluk werd onthuld:

- `useOnlineMatch` krijgt een `pendingNextRound`-buffer. Wanneer er realtime een `INSERT` binnenkomt voor een `round_number > currentRound.round_number`, wordt die **niet meteen** in `currentRound` gezet. In plaats daarvan:
  - Bewaar de nieuwe ronde in `pendingNextRound`.
  - Pas wanneer de reveal-buffer verstreken is (≥ 1500 ms ná het moment dat de huidige ronde `finished` werd, óf direct als de huidige ronde nog niet eens finished was — edge case), wordt `pendingNextRound` gepromoveerd naar `currentRound` en `roundStartTime` gezet.
- `OnlineGame`'s loss-effect blijft draaien op `currentRound.status === 'finished'` en kan dus altijd op tijd `revealWord` snapshotten en de banner tonen.
- De bestaande `revealWord`-snapshot en `prevWordRef`-mechanismen blijven onveranderd; ze zijn de tweede verdedigingslinie.
- De reveal-tijd kan veilig terug naar 1500 ms (was 3000) zonder dat de timing op de tegenstander wacht — de server heeft de ronde toch al klaarstaan.

Het oude `Schedule next round on server`-effect en `nextRoundScheduledRef` worden verwijderd; niet meer nodig.

### 3. Recovery-polling als realtime een event mist (`src/hooks/useOnlineMatch.ts`)
Naast het realtime-kanaal: elke 4 s tijdens een `active` match een lichte fetch doen van de laatste `match_rounds`-rij en de match-rij. Als de DB een nieuwere ronde of statuswijziging laat zien dan de client kent, dezelfde reducers aanroepen — inclusief dezelfde `pendingNextRound`-buffer uit punt 2, zodat ook hier de reveal niet wordt overgeslagen. Elke gemiste realtime-push herstelt zich binnen ~4 s automatisch.

### 4. Snellere "X was sneller"-feedback voor P2 (`useOnlineMatch.ts`)
De realtime-`UPDATE` op `match_rounds` blijft de primaire weg. De polling uit punt 3 vangt het wanneer die mist. Aanvullend: zodra een eigen `submit_guess` response `alreadyResolved` retourneert, direct een refetch van de huidige ronde forceren in plaats van wachten op realtime.

### 5. Geen kanaal-churn bij navigatie (`src/components/GlobalOnlineManager.tsx`)
`location.pathname` uit de dependency-arrays van presence-heartbeat en challenge-subscription verwijderen. Beide effects moeten één keer per `playerId` opzetten, niet bij elke route-wissel.

### 6. Verificatie
- DB: nieuwe `match_rounds`-rij verschijnt binnen <500 ms na het einde van de vorige ronde.
- Twee browsers naast elkaar: P1 raadt het woord → P2 ziet binnen ~1 s "X was sneller" met het **correcte** woord, board reset pas ná de reveal van 1500 ms.
- Specifiek QA-pad voor het reveal-probleem: P1 raadt extreem snel → controleer dat P2 op het scherm krijgt: status `finished`, oude woord onthuld, reveal-banner, daarna pas (≥1500 ms later) het nieuwe lege bord met de nieuwe begin-letter. Het nieuwe woord mag nooit "doorlekken" naar de revealtekst.
- Realtime kanaal tijdelijk blokkeren in DevTools → match loopt na maximaal 4 s vanzelf door dankzij polling, en óók daar moet de reveal correct getoond worden.
- Geen functionele wijziging aan scoring of badges.

### Technische details / bestanden
- `supabase/functions/match-action/index.ts` — `resolveAndAdvance` en de inline-resolve in `submit_guess` breiden uit met "create next round als match nog active". Idempotent via de bestaande unique-check.
- `src/hooks/useOnlineMatch.ts` — schedule-effect verwijderen, `pendingNextRound`-buffer toevoegen, polling-effect toevoegen (4 s, cleared on match-change/unmount), `submitGuessTime`/`submitFailed` triggeren bij `alreadyResolved` een lokale refetch.
- `src/components/OnlineGame.tsx` — reveal-tijd 3000 → 1500 ms; verder geen wijziging aan `revealWord`/`prevWordRef`-logica.
- `src/components/GlobalOnlineManager.tsx` — `location.pathname` uit deps van beide useEffects.

Geen schema-wijziging nodig.
