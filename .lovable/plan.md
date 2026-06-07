## Probleem

De Mix-kaart op de spelenpagina flikkert kort als "vergrendeld" voordat hij beschikbaar wordt. Oorzaak: de ontgrendeling wordt asynchroon berekend uit meerdere queries (`games`, `player_badges`, `badges`) in `loadUnlockProgress`, terwijl 5- en 6-letter direct uit de al geladen `player` komen (`unlocked_5letter`, `unlocked_6letter`).

## Oplossing

Een persistente `unlocked_mix` kolom toevoegen op `players`, automatisch onderhouden door de backend, zodat de Mix-kaart meteen — net als de andere kaarten — uit het `player`-object gelezen kan worden.

### 1. Database migratie

- Kolom `unlocked_mix boolean NOT NULL DEFAULT false` toevoegen op `public.players`.
- `guard_player_protected_columns` trigger uitbreiden zodat `unlocked_mix` net als `unlocked_5letter`/`unlocked_6letter` alleen via service_role / admin geschreven mag worden.
- Eenmalige backfill: alle bestaande spelers die nu al voldoen aan de Mix-criteria (≥1000 punten totaal, ≥12 badges, badge `niet_te_stoppen`) krijgen `true`. Voor leerlingen in een school: altijd `true` (school-users hebben alles ontgrendeld, zie huidige logica in `Index.tsx`).
- De bestaande edge function `process-game-result` (die punten/badges toekent) wordt aangevuld zodat hij na elke game ook `unlocked_mix` herevalueert en bij het bereiken van de criteria op `true` zet. Eenmaal `true` blijft het `true`.

### 2. Frontend wijziging (`src/pages/Index.tsx`)

- `isMixUnlocked` berekenen analoog aan 5/6:
  ```ts
  const isMixUnlocked = isSchoolUser || (player?.unlocked_mix ?? false);
  ```
- `loadUnlockProgress` blijft staan voor het tonen van de voortgangsregels (`totalPoints / badgeCount / hasNietTeStoppen`) op de vergrendelde kaart, maar bepaalt niet meer de klikbaarheid. Resultaat: zodra `player` geladen is, krijgt de Mix-kaart direct de juiste status — geen flikker meer.

### 3. Types (`src/types/player.ts` + auto-generated `src/integrations/supabase/types.ts`)

- `unlocked_mix: boolean` toevoegen aan de `Player` interface. De Supabase types worden automatisch geregenereerd na de migratie.

## Bestanden

- Nieuwe migratie (kolom + trigger-update + backfill)
- `supabase/functions/process-game-result/index.ts` (Mix-criteria check toevoegen)
- `src/pages/Index.tsx` (gebruik `player.unlocked_mix`)
- `src/types/player.ts` (`unlocked_mix` veld)