**Rebrand DingoLingo → educatieve woordenschattool voor groep 3–8**

Op basis van docentenfeedback en aangescherpte doelgroepkeuze rebranden we DingoLingo van "leuk verslavend spel" naar een educatieve woordenschattool voor leerlingen van 7–12 jaar (groep 3–8). De primaire klant is de leerkracht; het product is voor het kind. Daarnaast blijft een aparte "Klassiek / Snelheidsmodus" beschikbaar voor spelers die de competitieve game-ervaring willen.

**1. Positionering & merkboodschap**

Veranderingen aan teksten en framing (geen logica):

- **Tagline & landing:** vervang "eindeloos verslavend" en vergelijkbare gaming-taal door educatieve framing, bv. *"Nederlandse woordenschat oefenen, op jouw tempo"*.
- **Landing page** (src/pages/Landing.tsx): herschrijf hero, USP-blokken en CTA's gericht op twee doelgroepen:
  - **Leerkrachten:** eenvoudig niveaus instellen per klas en per leerling, voortgang volgen, woordenschat afstemmen op de methode.
  - **Leerlingen (7–12):** speels oefenen zonder tijdsdruk, duidelijke feedback, vriendelijke mascotte.
  - Voeg sectie "Voor in de klas" toe met concrete use cases (woordenschat herhalen, differentiëren binnen de klas).
- **SEO** (SEO.tsx, index.html, sitemap.xml): titles, descriptions en JSON-LD type richten op EducationalApplication i.p.v. game. Keywords: woordenschat oefenen, leren lezen groep 4, spelling oefenen basisschool.
- **Spelregels** (src/pages/Rules.tsx): kop herschrijven als "Hoe werkt de oefening". Woord "spel" mag blijven waar nuttig. Expliciet vermelden dat de tijdsdruk optioneel is.
- **Mascotte Dingo** blijft, maar de copy eromheen wordt vriendelijk-educatief in plaats van competitief.

&nbsp;

**2. Woordenlijst-kwaliteit**

**Probleem:** zeldzame, juridische en poëtische woorden (bv. NOCH) zitten in de pool. Voor de jongere leerlingen zijn deze ongeschikt.

**Oplossing:**

- Voeg drie kolommen toe aan dutch_words:
  - cefr_level — A1 / A2 / B1 / B2
  - frequency_band — 1 (zeer frequent) t/m 5 (zeldzaam)
  - educational (boolean) — geeft aan of een woord geschikt is voor de educatieve pool.
- **Eenmalige opschoonronde:** alle huidige woorden labelen. Zeldzame, juridische en poëtische woorden krijgen educational = false — ze worden niet verwijderd, alleen uit de educatieve pool gehaald.
- **Curatieprocces:** nieuwe woorden krijgen default educational = false totdat een admin ze keurt op CEFR-niveau en frequentie.
- **Bron:** gebruik een open frequentielijst (bv. SUBTLEX-NL / OpenTaal) als referentie tijdens curatie. Geen automatische import — alleen als hulp voor de admin.
- **Admin-tool uitbreiden** (src/pages/Admin.tsx):
  - Filters op CEFR-niveau, frequentie, woordlengte, status.
  - Bulk-actie: "markeer als zeldzaam / ongeschikt voor leerlingen".

&nbsp;

**3. Leerlingprofiel & niveaudifferentiatie**

**Kernprincipe:** in de educatieve modus bepaalt de leerkracht het niveau — niet een puntentelling of badge-systeem.

- **Leerlingprofiel** bevat:
  - Naam, klas/groep (groep 3 t/m 8)
  - Individueel ingesteld CEFR-niveau (A1 / A2 / B1 / B2)
  - Voorkeursmodus (zie §4)
- **Leerkracht kan per individuele leerling het CEFR-niveau instellen**, los van het klasniveau. Zo is differentiëren binnen één klas mogelijk: één leerling op A1, een ander op B1.
- **Leeftijdsaanpassingen per groep:**
  - Groep 3–4 (7–8 jaar): alleen 4-letterwoorden, geen timer, grote letters, maximale visuele ondersteuning.
  - Groep 5–6 (9–10 jaar): 4- en 5-letterwoorden beschikbaar, optionele timer.
  - Groep 7–8 (11–12 jaar): alle woordlengtes, optionele timer, volledige puntenmechaniek.
- Woordpicker (src/data/words.ts) filtert de pool op het individuele CEFR-niveau van de ingelogde leerling.

&nbsp;

**4. Moeilijkheidsmodi**

Nieuwe modus-keuze op de spelpagina. De leerkracht stelt de standaardmodus in per klas of per leerling; de leerling kan zelf wisselen binnen de toegestane modi.


|                     |                       |            |              |                               |
| ------------------- | --------------------- | ---------- | ------------ | ----------------------------- |
| **Modus**           | **Doelgroep**         | **Timer**  | **Pogingen** | **Pool**                      |
| **Leren** (default) | Groep 3–6 / beginners | Geen timer | 5            | A1–A2, hoge frequentie        |
| **Oefenen**         | Groep 5–8 / gevorderd | 180s       | 5            | A2–B1                         |
| **Klassiek**        | Iedereen              | 90s        | 5            | Volledige educatieve pool     |
| **Uitdaging**       | Competitief           | 60s        | 5            | Inclusief moeilijkere woorden |


**• Default voor nieuwe leerlingen = Leren** (geen timer).

- Modus opslaan op players (kolom preferred_mode) en per sessie wijzigbaar.
- Untimed games (Leren-modus) leveren geen snelheidsbonus op — markeren in process-game-result.
- Multiplayer/online matches blijven beschikbaar, maar alleen in Klassiek of Uitdaging.

&nbsp;

**5. Unlock-logica**

**In de educatieve modus** bepaalt de leerkracht welk niveau en welke woordlengte een leerling speelt — de huidige badge/punten-unlock vervalt hier volledig.

**In Klassiek en Uitdaging** blijft de bestaande unlock-logica inhoudelijk overeind, maar wordt de weergave verbeterd:

- Op Index.tsx (level-kaarten) en Rules.tsx:
  - Eis-blokken met expliciete labels: *"Je hebt alles hiervan nodig:"* (AND) of *"Eén van deze is genoeg:"* (OR).
  - Per eis een voortgangsindicator ✓/✗ met status (X/Y).
  &nbsp;

**6. Klassen- en docentfunctionaliteit**

Er bestaan al **schools** en **school_details**. Uitbreiden:

- **Docentrol** naast admin: nieuwe app_role = teacher.
- **Klas aanmaken**, leerlingen koppelen via uitnodigingsmail. Docent koppelt maakt leerlingen aan op docent pagina.
- **Individueel niveau instellen** per leerling (CEFR + groep + modus) — zie §3.
- **Docentdashboard** per klas én per leerling:
  - Voortgang per leerling (gespeelde woorden, slagingspercentage).
  - Foutpatronen: welke woorden gaan het vaakst mis?
  - Tijd besteed per sessie.
- **Woordenset toewijzen per klas:** bv. "thema dieren – A2". Leerlingen in die klas spelen woorden uit de toegewezen set.
- **Export naar CSV** voor rapportage.

*(Volledige implementatie in latere iteratie; nu: scaffolding + rol + basisdashboard.)*

**7. AVG-compliance**

Scholen hebben wettelijk verplichte privacywaarborgen nodig voordat ze een tool in gebruik mogen nemen. Dit is een **voorwaarde voor adoptie** en moet gereed zijn vóór actieve schoolwerving.

- **Verwerkersovereenkomst (DPA):** een standaard verwerkersovereenkomst beschikbaar stellen die scholen kunnen ondertekenen. Documenteer welke persoonsgegevens worden verwerkt, op welke grondslag en hoe lang ze worden bewaard.
- **Geen tracking van kinderen zonder schoolaccount:** leerlingen zonder gekoppeld schoolaccount worden niet gevolgd. Geen analytics, cookies of profiling voor niet-ingelogde kinderen.
- **Data in de EU:** alle persoonsgegevens (inclusief Supabase-instantie) worden opgeslagen en verwerkt binnen de Europese Unie. Documenteer de regio expliciet in de privacy policy.
- **Dataminimalisatie:** sla alleen op wat nodig is voor de functionaliteit. Geen advertentie-gerelateerde data.
- **Privacy policy & cookiebeleid:** herschrijven met expliciete vermelding van kindergegevens (AVG art. 8), bewaartermijnen en rechten van ouders/verzorgers.
- **Verwijdering op verzoek:** leerkracht of schoolbeheerder kan leerlingdata volledig laten verwijderen.
  &nbsp;

**8. "Fun mode" naast educatieve tool**

**Eén app, twee ingangen**

- Hoewel we twee varianten aanbieden, de landing pagina adverteert alleen de leerlingen versie van de applicatie: *"Voor leerlingen & klassen"*. Op dit moment adverteren we niet met de “klassiek spelen” variant. Registreren maakt je echter standaard aan “klassiek spelen” speler.
- Een gebruiker met de rol ‘teacher’ heeft toegang tot de leraren pagina. Daar kan de docent leerlingen toevoegen. Leerlingen loggen in met gebruikersnaam, niet met e-mailadres. Gebruikersnaam wordt automatisch gegenereerd op basis van voornaam kind. Gebruikersnaam is uniek en bestaat uit kleine letter {voornaam}{nnn} waarin {nnn} drie willekeurige getallen zijn. Het wachtwoord voor de leerlingen is een 4 cijferige code, automatisch gegenereerd nadat de docent de leerling heeft toegevoegd aan het systeem.
- De inlogpagina voor leerlingen moet aansprekend zijn voor de kinderen. Bewegende elementen. Wel in de stijl van de applicatie.
- De inlogpagina van de ‘klassiek spelen’ spelers blijft gelijk.
  &nbsp;

**9. Technische impact (samengevat)**


|                                       |                                                                |
| ------------------------------------- | -------------------------------------------------------------- |
| **Onderdeel**                         | **Wijziging**                                                  |
| dutch_words                           | Kolommen: cefr_level, frequency_band, educational              |
| players                               | Kolommen: preferred_mode, cefr_level, school_group (groep 3–8) |
| app_role                              | Nieuwe waarde: teacher                                         |
| Woordpicker (words.ts)                | Filtert op CEFR-niveau en educational = true per modus         |
| LingoGame, OnlineGame, ChallengerGame | Modus-selector + integratie modus-filters                      |
| process-game-result                   | Geen snelheidsbonus voor untimed games                         |
| Rules.tsx, Index.tsx                  | Unlock-uitleg verbeterd (AND/OR labels + voortgang)            |
| Landing.tsx                           | Herschreven voor leerkrachten + leerlingen 7–12                |
| Admin.tsx                             | Filters + bulk-acties voor woordcuratie                        |
| SEO.tsx, index.html                   | EducationalApplication JSON-LD, nieuwe keywords                |
| Privacy policy, cookiebeleid          | Herschreven voor AVG/kinderdata                                |


**10. Volgorde van uitvoeren**

1. **AVG-compliance** — verwerkersovereenkomst, privacybeleid, EU-dataopslag, geen tracking zonder account. *(Voorwaarde voor schoolwerving)*
2. **Copy-rebrand** — Landing, Rules, Index, SEO herschrijven voor doelgroep leerkrachten + 7–12 jaar.
3. **Modi** — Leren / Oefenen / Klassiek / Uitdaging implementeren; default Leren zonder timer; untimed = geen snelheidsbonus.
4. **Leerlingprofiel & niveaudifferentiatie** — groep 3–8, individueel CEFR per leerling, leerkracht beheert niveau.
5. **Unlock-logica** — educatieve modus: leerkracht bepaalt toegang. Klassiek/Uitdaging: bestaande logica met verbeterde weergave.
6. **Woordenlijst-kwaliteit** — CEFR + frequentie labels, educational-vlag, opschoonronde archaïsche woorden, admin-curatie.
7. **Docentrol & klas-scaffolding** — teacher-rol, klassen aanmaken, leerlingen koppelen, basisvoortgang.
8. **Docentdashboard & woordensets per klas** — uitgebreid dashboard, foutpatronen, CSV-export, thematische woordensets.