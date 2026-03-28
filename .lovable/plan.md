

# Dingo Mascotte Logo — 5 Opties Genereren

## Wat we gaan doen
5 verschillende Dingo-logo varianten genereren met AI image generation, elk met een andere stijl/pose. De gebruiker kiest er één, daarna passen we het logo aan in de app.

## Aanpak

1. **5 afbeeldingen genereren** via het AI gateway script met verschillende prompts:
   - **Optie 1**: Realistische cartoon Dingo staand op vier poten, vriendelijk, warm oranje/bruin
   - **Optie 2**: Speelse Dingo zittend met kwispelende staart, meer illustratief
   - **Optie 3**: Stoere Dingo staand op vier poten, lichte grijns, game-mascotte stijl
   - **Optie 4**: Schattige Dingo puppy staand, grote ogen, ronde vormen
   - **Optie 5**: Elegante Dingo in profiel, staand op vier poten, minimalistisch logo-stijl

2. **Alle 5 opslaan** in `/mnt/documents/` zodat de gebruiker ze kan bekijken en kiezen

3. **Na keuze**: het gekozen logo vervangen in `src/assets/dingo-logo.png` en de win-animaties later aanpassen

## Technische details
- Gebruik `google/gemini-3-pro-image-preview` model voor hogere kwaliteit
- Prompts benadrukken: "dingo dog (NOT a cat), natural look, standing on four legs, Australian wild dog"
- Output naar `/mnt/documents/dingo-option-1.png` t/m `dingo-option-5.png`
- Geen codewijzigingen tot de gebruiker een keuze maakt

