# Mascotte in titel: originele verhoudingen op landingspagina

## Oorzaak van het verschil

De `DingoMascot` component dwingt een **vierkant** kader af (zelfde `width` als `height`, plus inline `style`). De afbeelding zelf is 383×668 px — een **portret-rechthoek** (~0.57:1). `object-contain` past hem netjes in het vierkant in, maar laat dan links/rechts transparante ruimte over.

- Op **Landing** is het vak groot (45 / 80 / 112 px vierkant), dus de lege ruimte naast de mascotte is goed zichtbaar → oogt vierkant met witruimte ertussen.
- Op **Auth** is het vak klein (44 / 56 px vierkant) en met `mx-[-3px]` worden de letters er bovenop geschoven, waardoor de lege flanken minder opvallen → oogt smaller/rechthoekig.

In beide gevallen is de **getekende** mascotte gelijk van vorm; alleen het onzichtbare kader verschilt visueel in effect.

## Doel

Op de **landingspagina** de mascotte tonen in zijn echte verhouding (smal en hoog), zonder horizontale loze ruimte, zodat "L" en "ngo" strak aansluiten. Auth-pagina en spelen-pagina **ongewijzigd**.

## Aanpak

Alleen `src/pages/Landing.tsx` aanpassen. De `DingoMascot` component zelf blijft gelijk (wordt op andere plekken vierkant gebruikt). In Landing rendert de mascotte direct als `<img>` (of via een wrapper) met:

- `height` = huidige grootte (45 / 80 / 112 px responsief)
- `width` = `auto` (volgt natuurlijke beeldverhouding → ~26 / 46 / 64 px)
- `object-contain` blijft, geen geforceerde breedte/hoogte-stijl

Resultaat: geen lege horizontale flanken meer, mascotte staat strak tussen "L" en "ngo" met de bestaande `mx-[-3px]` overlap.

## Technische details

In `src/pages/Landing.tsx` (regel 162-165) wordt de huidige inline `DingoMascot` vervangen door een `<img>` met aspect-correcte rendering:

```tsx
<img
  src={dingoLogo}
  alt="Dingo mascotte"
  className="h-[45px] w-auto sm:h-[80px] md:h-[112px] object-contain block"
/>
```

Met import van `dingo-final-zittend-cool.png` bovenaan. Geen wijziging aan `DingoMascot.tsx`, Auth.tsx, of Index.tsx.
