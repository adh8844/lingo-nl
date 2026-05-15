# Volledige import van ontbrekende woorden van lingowoorden.nl

## Wat ging er mis
De vorige fetch was afgekapt rond letter F/G. Door de pagina's nu volledig op te halen (via curl) krijg ik álle woorden t/m de Z.

## Gevonden vs database

| Lengte | Op pagina | Al in DB | **Nieuw** |
|---|---|---|---|
| 5  | 1.127 | 1.537 | **361** |
| 6  | 1.743 | 2.122 | **778** |
| 10 | 1.685 | 459   | **1.355** |
| 12 | 1.156 | 480   | **851** |
| **Totaal** | | | **3.345** |

(Woorden uit `/woord/{woord}/` href, dus icoontjes worden automatisch genegeerd. Vergelijking is case-insensitive op exacte match.)

## Aanpak

Alle 3.345 woorden in één keer via een bulk-INSERT uitvoeren. Dat past prima in één SQL-statement (Postgres heeft hier geen praktisch probleem mee — in de vorige import ging 902 in één keer goed; 3.345 ook).

Per nieuw woord wordt een rij toegevoegd met:
- `word` (lowercase)
- `length` (5/6/10/12)
- `approved = false` ← admin moet nog goedkeuren
- `appropriate = false`
- `rejected = false`
- `suggested_by = NULL`

Ze verschijnen dan in het admin-paneel onder "ter beoordeling". Met de bulk-knop (die ik net heb gefixt voor grote aantallen via chunks van 100) kun je per lengte snel alles goedkeuren of afwijzen.

## Volgorde van uitvoer

1. Insert van de 361 nieuwe 5-letter woorden
2. Insert van de 778 nieuwe 6-letter woorden
3. Insert van de 1.355 nieuwe 10-letter woorden
4. Insert van de 851 nieuwe 12-letter woorden

Als één van de inserts om welke reden dan ook faalt, val ik per lengte terug op chunks van ~500 woorden zodat de rest wel doorgaat.

## Daarna

Open `/admin` → tab "Woorden ter beoordeling" → filter per lengte → gebruik "Alles" / "Alleen correct" / "Afkeuren".
