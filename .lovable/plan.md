# Nieuwe woorden importeren ter goedkeuring

## Bron

Vier categoriepagina's op lingowoorden.nl (5, 6, 10 en 12 letters). Woorden worden geëxtraheerd uit de href-pattern `/woord/{woord}/` zodat icoontjes (`<i class="fas ...">`) automatisch buiten beeld blijven.

## Aantallen na vergelijking met de database


| Lengte     | Op pagina | Al in DB | **Nieuw toe te voegen** |
| ---------- | --------- | -------- | ----------------------- |
| 5          | 295       | 1381     | **156**                 |
| 6          | 296       | 1912     | **210**                 |
| 10         | 277       | 205      | **254**                 |
| 12         | 293       | 198      | **282**                 |
| **Totaal** | &nbsp;    | &nbsp;   | **902**                 |


## Eerste 25 nieuwe woorden per lengte

**5 letters (156 nieuw)**
aldus, aftel, actie, apart, adres, airco, arena, ademt, alsof, alpen, armoe, admin, appen, alert, award, afnam, acuut, aruba, assen, atlas, aroma, alarm, boxen, beten, basis

**6 letters (210 nieuw)**
actief, afloop, agenda, afrond, afzien, achten, alleen, afdruk, aantal, andere, atlete, afrika, alsnog, artsen, advies, aanval, aanpak, absurd, afname, aanbod, alweer, acties, albert, alvast, afkeer

**10 letters (254 nieuw)**
anderhalve, afstamming, agrarische, achterhoek, activiteit, ambitieuze, abonnement, aanvallers, aanleiding, aangeraden, afgeleverd, aanmerking, aanvliegen, afmetingen, amerikanen, aangewezen, aangegeven, aangelegde, aanspoelen, autoritair, actiegroep, aangetoond, afgeblazen, autowassen, accupakket

**12 letters (282 nieuw)**
aangescherpt, actiegroepen, accepteerden, actievoerder, aanscherping, activiteiten, arbeidsmarkt, abonnementen, aankondiging, aanwezigheid, architectuur, automatische, aangespoelde, aanbiedingen, alcoholprijs, advertenties, afwisselende, achtertuinen, australische, aangetrokken, aangekondigd, afschrijving, automobilist, achilleshiel, achterwielen

## Insert-aanpak

Per nieuw woord wordt één rij toegevoegd aan `dutch_words`:

- `word` (lowercase)
- `length` (5/6/10/12)
- `approved = false` ← admin moet nog goedkeuren
- `appropriate = false`
- `rejected = false`
- `suggested_by = NULL`

Door `approved=false` verschijnen ze niet in de actieve woordpool en zijn ze pas speelbaar nadat jij ze in het admin-paneel goedkeurt.

## Open vraag

Wil je dat ik ze allemaal (902 woorden) in één keer importeer, of liever per lengte zodat je ze gefaseerd kunt reviewen in admin? Allemaal in 1x is prima.