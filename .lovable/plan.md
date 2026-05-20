## Doel

De grote titel op de landingspagina, inlogpagina (`/auth`) en spelpagina (`/spelen`) krijgt een nieuwe opmaak:

- **Dingo** → in het bestaande themarood (`text-accent`, HSL `4 85% 55%`)
- **Lingo** → in het bestaande themageel (`text-primary`, HSL `45 100% 55%`)
- De **i** in "Lingo" wordt vervangen door de DingoMascot-afbeelding
- De **i** in "Dingo" blijft gewoon een letter "i"

## Hoe het er ongeveer uit komt te zien

```text
   ┌─────┐   ┌─────┐   ┌─────┐  ╔═══╗  ┌─────┐   ┌─────┐   ┌─────┐
   │  D  │   │  i  │   │  n  │  ║ g ║  │  o  │   │     │   │     │
   │  D  │   │  i  │   │  n  │  ║ g ║  │  o  │   │  L  │ 🐕  │ngo│
   └─────┘   └─────┘   └─────┘  ╚═══╝  └─────┘   └─────┘   └─────┘
   ◄────────── ROOD (accent) ──────────►          ◄──── GEEL (primary) ────►
                                                          ▲
                                                          │
                                                  mascot vervangt de "i"
```

Visueel, op één regel:

```text
D i n g o  L🐕n g o
└─────────┘ └──────┘
   rood       geel
              ↑ mascotte staat op de plek van de i
```

## Wijzigingen per pagina

### 1. `src/pages/Landing.tsx` — hero h1 (regels 141-164)

Huidige structuur: `Ding` + mascot + `Lingo` (alles in `text-primary` geel).

Nieuwe structuur:
- `<span class="text-accent">Dingo</span>` (rood, géén mascot)
- `<span class="text-primary">L</span>` + mascot (op i-positie) + `<span class="text-primary">ngo</span>`
- Mascot-grootte en bestaande motion-animaties blijven gelijk (size 56 mobiel, 100 sm, 140 md).
- De rand-margins `mx-[-4px] sm:mx-[-6px]` worden licht bijgesteld zodat de mascotte strak in de plek van de "i" past tussen L en n.

### 2. `src/pages/Auth.tsx` — h1 (regels 120-125)

Huidige structuur: `Ding` + mascot + `Lingo`.

Wordt: `Dingo` (rood) + `L` + mascot + `ngo` (geel). Bestaande responsive switch (mascot 44 mobiel / 56 desktop) blijft.

### 3. `src/pages/Index.tsx` — twee plekken

- **Spel-actief titel (regel 89)**: `<h1>DingoLingo</h1>` wordt opgesplitst: `Dingo` in `text-accent`, `Lingo` in `text-primary` (geen mascotte hier, want huidige versie heeft die ook niet en het is een kleine titel).
- **Hoofd-hero (regels 154-162)**: zelfde patroon als Landing — `Dingo` rood, `L` + mascot + `ngo` geel. Responsive mascot-sizes (44/56/72) blijven gelijk.

## Wat NIET verandert

- De kleine navigatiebalk bovenaan (Landing & Auth) — daar staat het logo "Ding[mascot]Lingo" op klein formaat; gebruiker vraagt expliciet om "the title", dus deze laat ik ongemoeid tenzij anders aangegeven.
- Footer-tekst "DingoLingo" in Landing footer blijft één kleur (gewone fließtext).
- SEO-titels, marquee-woorden, alle andere content.
- Kleuren `--primary` en `--accent` in `index.css` — die bestaan al en worden hergebruikt.

## Technische details

- Geen nieuwe design tokens nodig; `text-accent` (rood) en `text-primary` (geel) bestaan al in de Tailwind-config via de bestaande HSL CSS-variabelen.
- Alleen JSX-wijzigingen in 3 bestanden. Geen logica, geen backend, geen nieuwe assets.
- Animaties (framer-motion `initial/animate/transition`) blijven per span behouden; de "L" en "ngo" krijgen elk hun eigen `motion.span` zodat de mascotte er tussenin kan poppen met de bestaande spring-animatie.
