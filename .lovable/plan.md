

# Dingo Mascot & Win Animations Plan

## Overzicht
Een Dingo-mascotte ontwerpen als logo/mascotte voor Lingo en deze plaatsen op de Login- en hoofdpagina. Daarnaast 5 win-animaties toevoegen die willekeurig verschijnen naast de bestaande confetti.

## 1. Dingo Mascotte genereren via AI Image Generation

Gebruik de Lovable AI image generation (google/gemini-2.5-flash-image) om via een Edge Function 6 Dingo-afbeeldingen te genereren en op te slaan in Supabase Storage:

1. **Mascotte/Logo** - Vrolijke cartoon Dingo met "LINGO" thema (voor login + hoofdpagina)
2. **Dansende Dingo** - Win-animatie variant
3. **Trotse Dingo met zonnebril** - Win-animatie variant
4. **Dingo die de letter D eet** - Win-animatie variant
5. **Dingo met confetti** - Win-animatie variant
6. **Dingo met trofee** - Win-animatie variant

Omdat AI-gegenereerde afbeeldingen groot zijn en runtime generatie traag is, genereren we deze eenmalig via een Edge Function en slaan ze op in een Supabase Storage bucket. De app laadt ze vervolgens als statische URLs.

## 2. Edge Function: `generate-mascot`

- Roept de Lovable AI gateway aan met het `google/gemini-2.5-flash-image` model
- Genereert alle 6 afbeeldingen met specifieke prompts
- Slaat ze op in een `mascot` storage bucket
- Wordt eenmalig handmatig aangeroepen door de admin

## 3. Database/Storage wijzigingen

- Nieuwe Supabase Storage bucket: `mascot` (public)
- Geen tabelwijzigingen nodig

## 4. UI Wijzigingen

### `DingoMascot.tsx` (nieuw component)
- Laadt de mascotte-afbeelding uit de storage bucket
- Configureerbare grootte via props
- Gebruikt op Auth.tsx en Index.tsx

### `Auth.tsx`
- Dingo mascotte toevoegen boven de "LINGO" titel
- Grootte ~80-100px

### `Index.tsx`
- Dingo mascotte toevoegen boven de "LINGO" titel op de hoofdpagina
- Kleinere versie in de game header

### `WinAnimation.tsx` (nieuw component)
- Toont een willekeurige Dingo win-animatie als overlay na het winnen
- 5 varianten: dansend, trots met zonnebril, D etend, confetti, trofee
- CSS animaties: bounce-in, lichte beweging/schudden
- Verdwijnt na ~3 seconden of bij klik
- Wordt getoond naast de bestaande confetti

### `LingoGame.tsx`
- Bij `won === true`: toon `<WinAnimation />` component
- Willekeurige selectie uit de 5 varianten

### `OnlineGame.tsx`
- Zelfde win-animatie toevoegen bij match-winst

## 5. Alternatieve aanpak: Inline SVG mascotte

Omdat AI image generation onvoorspelbaar kan zijn qua stijl en consistentie, is een alternatief om de Dingo als inline SVG/CSS art te maken. Dit geeft:
- Volledige controle over de stijl
- Geen externe dependencies
- Instant laden, geen storage nodig
- Animeerbaar met CSS

De win-animaties kunnen dan CSS-geanimeerde varianten zijn van dezelfde SVG basis.

## Technische details

- Afbeeldingen worden opgeslagen als publieke URLs in Supabase Storage
- Win-animatie overlay met `position: fixed`, `z-index: 50`, fade-in/out
- Willekeurige selectie via `Math.random()`
- CSS keyframe animaties voor bounce, wiggle, scale effecten

## Bestanden die worden aangemaakt/gewijzigd

| Bestand | Actie |
|---|---|
| `src/components/DingoMascot.tsx` | Nieuw - mascotte component |
| `src/components/WinAnimation.tsx` | Nieuw - win animatie overlay |
| `src/pages/Auth.tsx` | Mascotte toevoegen |
| `src/pages/Index.tsx` | Mascotte toevoegen |
| `src/components/LingoGame.tsx` | Win animatie toevoegen |
| `src/components/OnlineGame.tsx` | Win animatie toevoegen |
| `supabase/functions/generate-mascot/index.ts` | Nieuw - eenmalige image generatie |
| Storage bucket `mascot` | Nieuw - publieke bucket |

