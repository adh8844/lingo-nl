
Problemen en bevindingen:

1. Native toetsenbord bij uitdagingswedstrijd
- In `src/components/LingoGame.tsx` bestaat al een verborgen input + knop `⌨️ Open toetsenbord`.
- In `src/components/ChallengerGame.tsx` ontbreekt die mobiele invoer volledig.
- In `src/components/OnlineGame.tsx` ontbreekt die ook; daar werkt alleen de game-keyboard/window keydown.
- Daardoor kan het native toetsenbord nu niet expliciet geopend worden tijdens challenge/uitdagingsflows.

2. Janice punten / statistiekgrafiek
- Janice staat nu in de database op `13030` punten, en de som van haar `points_log` is ook `13030`. Er is dus op dit moment geen algemene mismatch meer in de opgeslagen totaalscore.
- De grafiek op `src/pages/Statistics.tsx` haalt `points_log` rechtstreeks op zonder server-side aggregatie. Daardoor geldt de standaard querylimiet van 1000 rijen.
- Janice heeft `1254` puntenregels; de huidige query pakt daardoor niet alle recente regels mee. Omdat er oplopend op datum wordt gesorteerd, vallen juist de nieuwste dagen buiten beeld.
- In de data staan wel degelijk recente punten voor Janice op 8, 9, 11, 12, 13 en 15 april. Dat verklaart waarom de grafiek “niets meer na 07-04-2026” laat zien terwijl er wel punten zijn.

3. Waarschijnlijke extra bron van puntproblemen
- `src/hooks/useOnlineMatch.ts` werkt nog met client-side punttoekenning voor online matches:
  - insert in `points_log`
  - daarna `players.points` verhogen via read + update
- Dat is niet dezelfde veilige totaallogica als in `process-game-result` en kan bij gelijktijdige updates of meerdere events alsnog tijdelijke of nieuwe afwijkingen veroorzaken.

Plan van aanpak:

1. Mobiele keyboard-ondersteuning uitbreiden
- Voeg in `ChallengerGame.tsx` dezelfde hidden-input + `Open toetsenbord` knop toe als in `LingoGame.tsx`.
- Voeg in `OnlineGame.tsx` dezelfde hidden-input + knop toe voor online uitdaging-/wedstrijdschermen.
- Neem dezelfde bescherming over tegen dubbele letters:
  - globale `keydown` negeren wanneer de hidden input focus heeft
  - letters alleen via `onInput` van de hidden input verwerken
  - geen auto-focus, zodat het native toetsenbord alleen opent na expliciete klik op de knop.

2. Statistieken-grafiek correct maken
- Vervang in `Statistics.tsx` de directe `points_log`-select door een backend-aggregatie per dag.
- Maak een databasefunctie die per speler en per dag de som van punten teruggeeft voor een datumrange.
- Laat de pagina daarmee exact de laatste 30 dagen opbouwen, inclusief dagen met 0 punten.
- Zo verdwijnt de 1000-rijenlimiet uit deze grafiek en worden Janice’ recente dagen weer correct getoond.

3. Puntensynchronisatie voor online matches harden
- Pas de online match-puntlogica aan zodat na online beloningen niet meer client-side `players.points = current + pts` wordt gebruikt.
- Gebruik in plaats daarvan dezelfde server-side totaalsom als bron van waarheid, zodat `players.points` altijd gelijk blijft aan `points_log`.
- Dit voorkomt dat soortgelijke problemen later opnieuw ontstaan bij spelers die veel online spelen.

4. Verificatie na implementatie
- Controleer Janice opnieuw:
  - totaalscore in ranking vs som van `points_log`
  - statistiekgrafiek met recente dagen
  - punten na een nieuwe online uitdaging / challenge
- Controleer ook dat het native toetsenbord in gewone Lingo, Challenger en online uitdaging alleen opent via de knop en geen dubbele letters meer geeft.

Technische wijzigingen:
- `src/components/ChallengerGame.tsx`
- `src/components/OnlineGame.tsx`
- `src/pages/Statistics.tsx`
- `src/hooks/useOnlineMatch.ts`
- nieuwe database migratie voor dagelijkse punten-aggregatie
