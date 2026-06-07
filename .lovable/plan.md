## Probleem

In de mix-modus (`LingoGame.tsx`) wisselt elke ronde de woordlengte (4/5/6). De `useWordDefinition(targetWord, activeLength)` hook draait elke render. In `startNewRound` gebeurt nu:

```ts
setActiveLength(nextLen);           // render 1: (OUD targetWord, NIEUWE lengte) ← mismatch!
const word = await getRandomWordAsync(...);
setTargetWord(word);                // render 2: (nieuw word, nieuwe lengte) ✓
```

Tussen `setActiveLength` en `setTargetWord` zit een `await`, dus React batcht ze niet. Render 1 stuurt het oude woord met de nieuwe lengte naar de edge function → upsert in `word_definitions` met verkeerde `length`. Daarom staat bv. "liepen" (6 letters) opgeslagen met `length=4`.

## Wijzigingen

### 1. Code-fix in `src/components/LingoGame.tsx`

In `startNewRound`: eerst het woord laden, dan `activeLength` en `targetWord` na elkaar zetten — zonder await ertussen — zodat de hook nooit een mismatched paar ziet.

```ts
const word = await getRandomWordAsync("nl", nextLen, mode === "leren" ? "educational" : "full");
setActiveLength(nextLen);
setTargetWord(word);
```

(`ChallengerGame.tsx` heeft een vaste `challengerLevel` en wordt niet aangepast.)

### 2. Database migratie

- Verwijder alle rijen uit `word_definitions` waar `char_length(word) <> length` (≈ 92 rijen).
- Voeg een `CHECK (char_length(word) = length)` constraint toe op `word_definitions` zodat dit nooit meer kan gebeuren.

### 3. Extra defensieve check in `supabase/functions/get-word-definition/index.ts`

Valideer dat `word.length === length`; zo niet → 400-response, geen lookup/insert. Voorkomt dat een verkeerd paar überhaupt bij de DB komt, mocht een andere client deze fout maken.

## Niet aangeraakt

- Bestaande definities met correcte (word, length) blijven staan.
- Geen wijzigingen aan `useWordDefinition` hook, `WordDefinitionBubble`, of overige game-logica.