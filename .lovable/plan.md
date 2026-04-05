
# Plan: Drie nieuwe features

## 1. Dagelijks puntenverlies bij inactiviteit (-100 punten)
- Wanneer een speler op een dag 0 games speelt, verliest hij 100 punten
- Implementatie: bij elke login/game-start controleren hoeveel dagen sinds laatste spel er geen games zijn gespeeld
- Voor elke gemiste dag -100 punten aftrekken (minimum 0 punten)
- Logging in `points_log` met reden "inactivity_penalty"
- Berekening in de `process-game-result` edge function of bij het laden van het spelersprofiel

## 2. 600 Nederlandse lange woorden toevoegen
- 200 woorden van 10 letters
- 200 woorden van 12 letters  
- 200 woorden van 14 letters
- Alle woorden worden als `approved: false` ingevoerd
- Admin kan ze later goedkeuren via de admin-pagina
- Database ondersteunt al variabele woordlengtes

## 3. Challenger-modus (elke 25 games)
- Na elke 25 afgeronde games krijgt de speler een Challenger
- Challenger = een woord van 10, 12 of 14 letters
- 25% van de letters worden getoond (naar boven afgerond), eerste letter altijd inbegrepen
- Slechts 1 poging om het woord te raden
- Timer: 20 seconden
- Beloning: 200 punten bij succes, 0 bij falen
- Nieuwe component `ChallengerGame` 
- Tracking in `games` tabel met een speciaal level (10/12/14)
- WordLength type uitbreiden naar 10 | 12 | 14

## Technische stappen
1. **Migration**: WordLength types hoeven niet in DB te wijzigen (length is al integer)
2. **Insert**: 600 woorden invoegen via insert tool
3. **Edge function update**: Inactiviteitsboete berekenen in `process-game-result`
4. **Code**: 
   - `WordLength` type uitbreiden
   - Nieuw `ChallengerGame` component
   - Challenger trigger in `LingoGame` na elke 25 games
   - UI voor challenger met speciale layout (grotere tiles)
