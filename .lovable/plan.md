## Probleem

Na de tweede online match staat de knop "⚔️ Opnieuw spelen" voor beide spelers permanent disabled.

## Oorzaak

In `src/components/OnlineGame.tsx` (regel 88) staat lokale state:

```ts
const [rematchRequested, setRematchRequested] = useState(false);
```

Bij klik op de knop wordt deze op `true` gezet, en de knop heeft `disabled={rematchRequested}` (regel 554).

Wanneer beide spelers akkoord gaan, maakt de server een **nieuwe match** aan. `OnlineMatchPage` blijft gemount en geeft alleen een nieuwe `match` prop door — de `OnlineGame` component-instantie blijft dus bestaan en `rematchRequested` blijft `true`. Aan het einde van de tweede match is de knop daardoor al "disabled" zonder dat de speler ooit geklikt heeft. Hetzelfde geldt mogelijk voor `winSnapshot`, `prevWordRef`, etc., maar de directe klacht wordt verklaard door `rematchRequested`.

## Fix

Reset per-match UI-state telkens als `match.id` verandert.

In `src/components/OnlineGame.tsx`, voeg een effect toe:

```ts
useEffect(() => {
  setRematchRequested(false);
  setWinSnapshot(null);
  setShowForfeitConfirm(false);
  lossShownForRoundRef.current = null;
  prevRoundRef.current = null;
  prevWordRef.current = "";
}, [match.id]);
```

Dat is voldoende om de knop weer klikbaar te maken bij elke nieuwe match. De overige resets voorkomen dat oude snapshots/banners van match N doorlekken naar match N+1.

## Verificatie

- Speel 3 online matches achter elkaar; controleer dat "Opnieuw spelen" na elke match klikbaar is voor beide spelers.
- Controleer dat de share-knop (winSnapshot) na een rematch alleen verschijnt als die match daadwerkelijk gewonnen is.
