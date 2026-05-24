## Doel

Na een gespeelde ronde (solo én online wedstrijd-overwinning) krijgt de speler een "Deel je resultaat"-knop. De gedeelde post bevat een **afbeelding (PNG)** van het Lingo-raster in de stijl van de app — geen emoji-tegels — met daaronder een pakkende NL-tekst en de link https://lingo.najra.app.

## Aanpak: raster als afbeelding

We renderen het 5×N raster naar een PNG via een **off-screen `<canvas>`**, zodat de afbeelding er identiek uitziet aan de app (zelfde tegelkleuren, afgeronde hoeken, letters in vet) en gedeeld kan worden als bestand.

### Nieuw bestand: `src/lib/shareImage.ts`
Exporteert `renderResultImage({ guesses, statuses, wordLength, solved, title })` → `Promise<Blob>`.

Op het canvas (bv. 600×800px, devicePixelRatio aware):
- Donkere achtergrond met `--background` kleur uit de app
- Bovenaan: "DingoLingo" wordmark + Dingo-mascotte (laden via `new Image()` op het bestaande asset `src/assets/dingo-final-zittend-cool.png`)
- Lingo-raster: tegels met dezelfde kleuren als `LingoTile` (`correct`→groen, `present`→geel, `absent`→grijs), afgeronde hoeken, witte hoofdletters gecentreerd
- Onderaan: kleine tekst "lingo.najra.app"

Geen externe dependencies; pure Canvas 2D API. Kleuren uit `getComputedStyle(document.documentElement).getPropertyValue('--tile-correct')` etc. zodat het automatisch met het thema meekleurt.

### Nieuw component: `src/components/ShareResultButton.tsx`
Props:
- `guesses: string[]`
- `statuses: TileStatus[][]`
- `wordLength: number`
- `solved: boolean`
- `mode: "solo" | "online"`
- `extra?: { attempts?: number; opponentName?: string; score?: string }`

Gedrag:
1. Bouw bijschrift:
   - Solo gewonnen: `Ik kraakte het DingoLingo woord in ${attempts}/5! 🎯`
   - Solo verloren: `Ik ging onderuit bij DingoLingo 💀 — speel jij beter?`
   - Online: `Ik won mijn DingoLingo wedstrijd tegen ${opponentName} (${score}) ⚔️`
   - Altijd gevolgd door: `Speel mee op https://lingo.najra.app`
2. Bij klik op "Deel resultaat" → render PNG via `renderResultImage(...)` → open shadcn `Dialog` met:
   - Preview van de gegenereerde afbeelding
   - Knop **Delen** (gebruikt `navigator.share({ files: [file], text })` indien beschikbaar)
   - Knop **Download afbeelding** (anchor met `URL.createObjectURL`)
   - Knop **Kopieer tekst**
   - Snelkoppelingen WhatsApp / X / Facebook met pre-filled tekst + link (deze platforms ondersteunen geen file-share via URL, dus tekst+link; afbeelding kan apart gedownload en bijgevoegd worden — wordt vermeld in een hint)
3. Toast bevestiging na kopiëren/download.

### Integraties

**`src/components/LingoGame.tsx`** — in het bestaande game-over blok, naast de "Volgende ronde"-knop:
```tsx
<ShareResultButton
  mode="solo"
  guesses={guesses}
  statuses={statuses}
  wordLength={wordLength}
  solved={won}
  extra={{ attempts: guesses.length }}
/>
```

**`src/components/OnlineGame.tsx`** — bij wedstrijd-overwinning (eindscherm naast "Rematch"), alleen voor de winnaar:
```tsx
<ShareResultButton
  mode="online"
  guesses={lastRoundGuesses}
  statuses={lastRoundStatuses}
  wordLength={lastRoundWordLength}
  solved
  extra={{ opponentName, score: `${myWins}-${opponentWins}` }}
/>
```
De laatst gespeelde ronde wordt al bijgehouden in component-state; geen extra game-logica nodig.

## Technische details

- Share-URL templates (fallback voor desktop browsers zonder Web Share):
  - WhatsApp: `https://wa.me/?text={encoded}`
  - X: `https://twitter.com/intent/tweet?text={encoded}`
  - Facebook: `https://www.facebook.com/sharer/sharer.php?u={url}&quote={encoded}`
- `navigator.canShare({ files })` check vóór file-share aan te bieden.
- Canvas-render is volledig client-side; geen edge function nodig.

## Scope

Alleen UI / presentatie. Geen wijzigingen aan database, edge functions of game-logica.