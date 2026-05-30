# Woord-definitie aan het einde van elke ronde

Toon een spraakballon met korte uitleg + voorbeeldzin zodra een ronde eindigt (solo en challenger, maar NIET voor online). Definities worden aan het begin van de ronde alvast opgehaald zodat er geen wachttijd is.

## Database

Nieuwe tabel `word_definitions`:

- `word` (text, lowercase) + `length` (int) — samen unique
- `definition` (text, ≤ ~80 tekens)
- `example` (text, ≤ ~50 tekens)
- `source` ('ai' | 'manual'), timestamps

RLS:

- iedereen mag lezen (`SELECT` voor anon + authenticated)
- alleen service_role mag schrijven (edge function gebruikt service key)

## Edge function: `get-word-definition`

Input: `{ word, length }`.

Stappen:

1. Lookup in `word_definitions`. Indien aanwezig → return direct.
2. Anders: roep Lovable AI Gateway aan (`google/gemini-3-flash-preview`) met de exact gespecificeerde prompt:
  > "Een korte uitleg van het woord '[WORD]'. Gebruik hiervoor maximaal 40 tekens. Gevolgd door een voorbeeldzin met dit woord erin. Deze zin mag niet langer zijn dan 25 tekens."
3. Parse response naar `{ definition, example }` (structured output via AI SDK `Output.object`).
4. Upsert in `word_definitions` met `source = 'ai'`.
5. Return `{ definition, example }`.

Fouten (429/402/parse-fail) → return `{ definition: null, example: null }` zodat UI gracefully kan verbergen.

## Frontend

### Nieuwe hook `useWordDefinition(word, length)`

- Trigger fetch zodra `word` set is (begin van ronde) via `supabase.functions.invoke('get-word-definition', ...)`.
- Cached in-memory per `word`.
- Returnt `{ definition, example, loading }`.

### Nieuwe component `WordDefinitionBubble`

- Spraakballon-stijl (afgeronde kaart met "tail"), gebruikt design tokens (`bg-card`, `border-border`, `text-foreground`, accent voor woord).
- Toont het woord in hoofdletters + definitie + cursieve voorbeeldzin.
- Skeleton-state als nog aan het laden bij game-end (zou zelden voorkomen door pre-fetch).
- Indien beide velden leeg → render niets.

### Integratie

`**src/components/LingoGame.tsx**`

- Hook aanroepen zodra `targetWord` gezet is in `startNewRound`.
- Render `WordDefinitionBubble` in het game-over blok (zowel bij win als verlies), boven de "Volgende ronde"-knop.

`**src/components/ChallengerGame.tsx**`

- Zelfde patroon: pre-fetch bij start, toon bubble aan einde.

`**src/components/OnlineGame.tsx**`

- Geen wijzigingen aan bestand. In online games laten we de definities niet zien en vragen deze ook niet op vanuit de database of de AI-agent.

## Technische details

- Edge function gebruikt `verify_jwt = false` (consistent met andere functies) maar valideert input met zod.
- Geen wijzigingen aan punten-, badge- of match-logic.
- Definitie ophalen is fire-and-forget; falen ervan blokkeert het spel niet.
- Geen wijziging aan bestaande types/schema's behalve toegevoegde tabel.

## Bestanden

Nieuw:

- `supabase/migrations/<timestamp>_word_definitions.sql`
- `supabase/functions/get-word-definition/index.ts`
- `src/hooks/useWordDefinition.ts`
- `src/components/WordDefinitionBubble.tsx`

Gewijzigd:

- `src/components/LingoGame.tsx`
- `src/components/ChallengerGame.tsx`