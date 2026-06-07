## Wat er echt gebeurt

De architectuur klopt al: er bestaat een tabel `public.championship_standings` met 22 rijen, een index op `(school_id, rank_position)`, en een `pg_cron` job `refresh_championship_standings_3min` die elke 3 minuten succesvol draait (laatste runs: succeeded, ~0,5s). De RPC `get_championship_standings()` is een simpele lookup en doet geen berekening.

De ervaren ~5s komt dus **niet** uit het berekenen van de lijst. Het komt uit hoe `Rankings.tsx` de tab inlaadt:

1. Het laden start pas in een `useEffect` ná het mounten van de pagina, ná dat `PlayerProvider` klaar is met sessie/profiel ophalen — een ketting van wachtrondes.
2. Bij de "Kampioenschap"-tab wordt náást de RPC óók `loadAllPlayers` aangeroepen (`ensureLoaded("players", loadAllPlayers)`), terwijl die data voor deze tab niet nodig is (de RPC levert al `display_name` mee). Dat is een extra ronde over de `players`-tabel die nergens voor gebruikt wordt.
3. De RPC wordt pas afgevuurd nadat React de tab heeft geactiveerd — niet meteen bij paginabezoek.

## Plan

### Frontend (`src/pages/Rankings.tsx`)

1. **Verwijder de overbodige players-call voor de kampioenschapstab.** In de tab-effect blok laten we voor `championship` alleen `ensureLoaded("championship", loadChampionship)` staan. Geen `loadAllPlayers` meer voor deze tab.
2. **Start `loadChampionship` direct bij mount**, zodra de sessie er is — niet pas via de tab-effect. Aangezien Kampioenschap toch de default tab is, mag deze data parallel met `PlayerProvider` al onderweg zijn. We zetten een aparte `useEffect` met `[]` (of `[session]`) deps die meteen `ensureLoaded("championship", loadChampionship)` aanroept.
3. **Eerste paint zonder blokkade**: toon een lichte skeleton (lege rijen of een dunne "Bijwerken…" tekst) zo lang `loadingSection.championship` waar is, in plaats van een leeg blok. Geen visuele wachttijd zonder feedback.

### Backend

Geen schemawijzigingen nodig. De cache + cron werken; we doen niets extra's.

### Optioneel (alleen vermelden)

Mocht het probleem na de bovenstaande fix terugkomen, dan kunnen we de RPC nog versnellen door `current_player_school_id()` in de RPC te vervangen door een direct subqueryresultaat op `auth.uid()` zodat er één functie-call minder is — maar gezien 22 rijen en de bestaande index is dat waarschijnlijk niet merkbaar.

## Bestanden

- `src/pages/Rankings.tsx` — kleinere tab-effect, extra mount-effect, optionele skeleton.
