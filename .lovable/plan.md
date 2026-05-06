## Doel

Vijf samenhangende verbeteringen verdeeld over Rankings, Profiel en de online Uitdagingswedstrijd.

---

## 1. Rankings — Overzicht klikbaar + uniforme iconen

Bestand: `src/pages/Rankings.tsx`

- Maak de titels van de 6 `MiniCard`'s op het tabblad **Overzicht** klikbaar. Bij klikken springt de gebruiker naar de bijbehorende volledige lijst:
  - Punten totaal → tab `points`, sub `total`
  - Dagscore → tab `points`, sub `today`
  - Max. reeks → tab `streak`
  - Huidige reeks → tab `streak` (zelfde lijst, want het hoofd-tabblad toont max-reeks; we openen wel `streak`)
  - Spellen totaal → tab `games`, sub `total`
  - Spellen vandaag → tab `games`, sub `today`
- Voeg `onTitleClick` (en `subTab`) prop toe aan `MiniCard`. Cursor pointer + hover-onderstreping.
- Vervang de iconen in de kaarttitels door horizontaal identieke paren:
  - Punten totaal & Dagscore: ⭐ (ster)
  - Max. reeks & Huidige reeks: 🔥 (vlam)
  - # Spellen totaal & # Spellen vandaag: 🎯 (dart)
- De `valueIcon` (rechts bij de score) blijft zoals nu.

---

## 2. Profiel — eigen naam wijzigen

Bestand: `src/pages/Profile.tsx`

- Alleen wanneer `isOwnProfile === true`: toon naast de `display_name` een klein potlood-icoontje (`Pencil` van lucide).
- Klik opent een inline edit (input + opslaan/annuleren knopjes) of een eenvoudige `Dialog`.
- Validatie: trim, min. 2 tekens, max. 24 tekens. Toon toast bij fout.
- Opslaan via `supabase.from("players").update({ display_name }).eq("id", currentPlayer.id)`. Daarna `usePlayer` refresh — eenvoudigste manier: lokale state updaten en `window.location.reload` vermijden door de `displayPlayer` lokaal te overschrijven én een `refresh()` aan te roepen in `usePlayerContext` als die bestaat (anders een lokale `setOverrideName`).
- Voor andere spelers (`!isOwnProfile`) verschijnt het potlood niet; geen update-mogelijkheid in UI. RLS staat updates al open; beveiliging is in dit geval UI-niveau (consistent met huidige patroon).

---

## 3. Uitdagingswedstrijd — puntenoverzicht ook voor verliezer

Bestand: `src/components/OnlineGame.tsx`, finished-view (regel 376–423)

- Verwijder de `isWinner &&` voorwaarde rond de breakdown-regel.
- Toon voor **beide** spelers:
  - "+ {gewonnen rondes × 20} ronde punten"
  - "+100 bonus ⭐" alleen voor de winnaar
- Voor de verliezer dus enkel de ronde-punten (kan 0 zijn → die regel weglaten als gewonnen rondes = 0).
- Forfeit-tekst blijft; regel `${opponentName} ontvangt punten` vervangen door duidelijke breakdown van eigen punten.

---

## 4. Uitdagingswedstrijd — toon het woord na elke gewonnen ronde

Bestanden: `src/components/OnlineGame.tsx` + `src/hooks/useOnlineMatch.ts`

Huidige flow: zodra speler A wint, wordt direct een nieuwe `match_round` ingevoegd → speler B krijgt nieuwe ronde zonder te zien wat het woord was.

Aanpak:

- Vertraag de start van de volgende ronde met een korte transitie van ~3 sec waarin het woord prominent wordt getoond aan **beide** spelers ("Het woord was: HUIS").
- Implementatie:
  - In `useOnlineMatch.ts` (`submitGuessTime` en `submitFailed`): in plaats van direct de nieuwe `match_round` insert + `online_matches` update, eerst alleen de huidige ronde `finished` zetten en `online_matches` updaten met nieuwe wins. Voeg pas na een `setTimeout` van 3000 ms (server-side niet mogelijk → client-side bij de winnaar) de nieuwe round toe en update `current_round`/`current_word`.
  - In `OnlineGame.tsx`: wanneer de huidige `currentRound.status === "finished"` en er nog geen nieuwe ronde binnen is, toon overlay met het woord en een aftellertje. Bestaande `roundTransition`-mechaniek uitbreiden zodat het woord en winnaar getoond worden ("Jij won!" / "{opponent} was sneller!" + "Het woord was: HUIS").
  - Bestaande "wasPlaying" tak (regels 113–124) toont al een transitie van 1500 ms voor de verliezer; verleng naar 3000 ms en voeg het woord toe aan de tekst.
  - Voor de winnaar: voeg vergelijkbare transitie toe (3000 ms) na de submit voordat het bord reset.

---

## 5. Uitdagingswedstrijd — voortgang tegenstander zichtbaar (groene letters per poging)

Bestanden: `src/hooks/useOnlineMatch.ts`, `src/components/OnlineGame.tsx`, en database.

### Database

Nieuwe tabel `match_round_progress` (via migratie):

```text
id              uuid pk default gen_random_uuid()
round_id        uuid  (verwijst naar match_rounds.id, geen FK om in lijn te blijven met huidige patroon)
match_id        uuid
player_id       uuid
attempt_number  int   (1..5)
correct_count   int   (aantal "correct"/groen in die poging)
created_at      timestamptz default now()
unique (round_id, player_id, attempt_number)
```

RLS: `select`/`insert` voor `public` (consistent met `match_rounds`).
Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.match_round_progress;`

### Client

- In `OnlineGame.tsx#processGuess` en `handleInvalidGuess`: na elke voltooide poging (ook ongeldig → 1 groen) een rij inserten in `match_round_progress` met de huidige `attempt_number` en het aantal "correct"-tegels.
- In `useOnlineMatch.ts`: nieuwe state `opponentProgress: { attempt: number, correct: number }[]` per ronde. Subscribe op `match_round_progress` met `match_id=eq.{matchId}` en filter op `player_id !== playerId`. Reset bij ronde-wissel.
- In `OnlineGame.tsx`: render naast iedere gespeelde rij van het eigen bord een klein chipje rechts ("🟩 2") voor de overeenkomstige poging van de tegenstander. Alleen tonen wanneer de tegenstander die poging al heeft gedaan; nog niet gedane pogingen blijven leeg. Plaatsing: absolute/inline rechts van `LingoBoard`, grid-uitlijning per rij. Kleine, subtiele weergave.
- Tel de eerste letter van het woord altijd mee als correct (groen). Dus het minimaal aantal groene letters van de tegenstander is altijd 1.

---

## Vooruitzicht — schermen

Overzicht-tab (rankings):

```text
[ ⭐ Punten totaal       ]   [ ⭐ Dagscore          ]
  1. Janice    ⭐ 1240        1. Ellen     ⭐ 220
  2. Ellen     ⭐ 980         2. Janice    ⭐ 180
  3. Jelle     ⭐ 760         3. Jelle     ⭐ 90
                              (klikbare titels → lijst opent)

[ 🔥 Max. reeks          ]   [ 🔥 Huidige reeks    ]
[ 🎯 # Spellen totaal    ]   [ 🎯 # Spellen vandaag]
```

Online match — bord met opponent-progress:

```text
ronde 3   jij 2 - 1 tegenstander       ⏱ 1:12

   H U I _ _    🟩 1   ← poging 1 tegenstander
   H A R T _    🟩 2
   _ _ _ _ _
   _ _ _ _ _
   _ _ _ _ _
```

Tussen-ronde overlay (3 sec):

```text
        Jij won deze ronde! 🎉
        Het woord was: HUIS
              volgende ronde…
```

Finished-view (verliezer, geen forfeit):

```text
        😔
   {opponent} wint!
       3 - 5
   + 60 ronde punten
        [Opnieuw spelen] [Terug]
```

---

## Technische notities

- Geen serverside-functies aanpassen; punten-edge function blijft ongemoeid (online match-punten worden al client-side via `awardMatchPoints` toegekend).
- Round-transitie nu client-side getimed bij de winnaar; verliezer reageert op `INSERT` van de volgende `match_rounds` zoals nu — hij krijgt automatisch dezelfde 3-sec overlay omdat de winnaar pas na 3 sec de nieuwe ronde insert.
- Bij forfeit/match-einde geen tussen-overlay.
- `match_round_progress` rijen worden niet opgeschoond; klein volume, geen issue.
- Bij rematch wordt de nieuwe match-id gebruikt en de subscription hervat zonder oude progress te tonen.