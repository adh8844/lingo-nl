## Probleem

Match `018cf56e-…` (NAJRA vs Janice) staat vast: ronde 1 is `finished` (beide spelers de timer laten verlopen → beide `-1`, winner `null`, geen punt voor wie dan ook), maar de match staat nog op `current_round=1, status=active`. Er is geen ronde 2 aangemaakt en niemand kan verder.

### Oorzaak

De server (`match-action`) maakt nooit zelf een volgende ronde. Dat doet uitsluitend de **client van speler 1**, 3 seconden nadat hij ziet dat de huidige ronde `finished` is (zie `useOnlineMatch.ts`, effect "Schedule next round on server"). Daar zitten twee gaten:

1. **Alleen speler 1** mag `next_round` aanroepen. Als P1 de tab sluit, het netwerk verliest of de realtime-update mist, gebeurt er niets meer — ook na refresh niet.
2. Bij **paginalaad** wordt alleen de **actieve** ronde opgehaald. Als de laatste ronde al `finished` is, is `currentRound` `null` en vuurt het schedule-effect nooit (`currentRound.status !== "finished"`). Refresh herstelt de match dus niet.

Daar bovenop redirect `Rankings.tsx` (regel 114) elke speler met een active match automatisch terug naar `/online-match`, waardoor ze in de vastzittende match opgesloten zitten.

De security-migraties hebben dit niet veroorzaakt (de edge function gebruikt service role), maar het was altijd al een latente bug die nu zichtbaar wordt.

## Plan

### 1. Vastzittende match opruimen
Eenmalige migration die match `018cf56e-bac8-4089-8717-3bd9c4236063` afsluit (`status='finished'`, `winner_id=null`) zodat NAJRA en Janice niet meer in de redirect blijven hangen. (Geen punten toegekend — was 0-0.)

### 2. Server: `next_round` idempotent maken vanaf elke deelnemer
`match-action` accepteert `next_round` al van beide spelers en heeft een `unique`-check op `(match_id, round_number)`. Geen wijziging nodig, maar bevestigen in code.

### 3. Client: herstel bij laden en bij stilstand (`useOnlineMatch.ts`)
- Bij `loadActiveMatch`: ook de **laatste ronde ongeacht status** ophalen. Als die `finished` is én `round_number === match.current_round`, direct (na korte delay voor de reveal) `next_round` aanroepen.
- Schedule-effect: **beide spelers** mogen `next_round` plannen na 3s (server is idempotent). Daarmee verdwijnt de single-point-of-failure op P1.
- Extra vangnet: als een match `active` is, geen `currentRound` actief is, en sinds de laatste ronde > 6s verstreken is → `next_round` aanroepen (recovery-timer, eens per match-id).

### 4. Verificatie
- DB-query: match 018cf56e staat op `finished`.
- Edge-function-logs van `match-action` checken op `next_round` calls.
- In preview/console testen: ronde laten timeouten als beide spelers → ronde 2 verschijnt automatisch binnen ~3-6s.

### Bestanden
- `supabase/migrations/<new>.sql` — match afsluiten.
- `src/hooks/useOnlineMatch.ts` — `loadActiveMatch` uitbreiden, schedule-effect openzetten voor P2, recovery-timer toevoegen.
- Geen wijziging in `match-action/index.ts` nodig.
