## Probleem

Nieuw aangemelde gebruikers (laatste 2 op 21 mei) staan **wel** in `auth.users`, maar er wordt **geen** rij aangemaakt in de `players` tabel. Daardoor: geen punten, niet zichtbaar in rankings.

## Oorzaak

De database-functie `get_my_player()` is gedefinieerd als `RETURNS players` (een enkele composite row, geen `SETOF`). Als de gebruiker nog geen player-rij heeft, retourneert deze functie geen `null`, maar een **composite met allemaal NULL-velden** (`{id: null, display_name: null, ...}`).

In `src/hooks/usePlayerContext.tsx` controleert `loadPlayer()`:

```ts
const { data } = await supabase.rpc("get_my_player");
if (data) {                              // ← truthy, want {} is truthy
  setPlayer(data as Player);
  localStorage.setItem("lingo-player-id", nextPlayer.id);  // ← slaat "null" op
  return;                                // ← INSERT wordt nooit bereikt
}
```

Gevolgen:
- De `INSERT` voor de player wordt nooit uitgevoerd (daarom geen RLS-error op `players` in de logs)
- `localStorage` bevat de string `"null"` als player-id
- Alle vervolgcalls (`player_presence` upsert, etc.) sturen `"null"` als UUID → de logs staan vol met `invalid input syntax for type uuid: "null"` (elke 5 seconden) en `new row violates row-level security policy for table "player_presence"`
- Geen punten omdat `process-game-result` nooit fatsoenlijk aangeroepen wordt met een geldig player-id

Dit is dus **geen** te-strenge RLS — de bestaande policies kloppen. Het is een client/RPC contract-bug die pas zichtbaar werd voor splinternieuwe gebruikers.

## Oplossing

Twee aanvullende fixes — beide nodig voor robuustheid:

### 1. SQL: `get_my_player` herschrijven naar `SETOF players`

Migratie:

```sql
CREATE OR REPLACE FUNCTION public.get_my_player()
RETURNS SETOF public.players
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.players WHERE user_id = auth.uid() LIMIT 1
$$;
```

Met `SETOF` retourneert PostgREST een lege array `[]` als er geen rij is, en de client krijgt netjes `data = null` (of `[]`, afhankelijk van `.single()` vs `.maybeSingle()`).

### 2. Client: defensieve check in `usePlayerContext.tsx`

In `loadPlayer()` en `refreshPlayer()` controleren op `data?.id` in plaats van alleen `data`. Hetzelfde geldt voor de check ná de retry-insert.

```ts
if (data?.id) { ... }
```

Zo zijn we beschermd tegen onverwachte composite-NULLs of array-responses na de SETOF-wijziging.

### 3. Opschonen stale localStorage

Bij opstart in `PlayerProvider`: als `localStorage.getItem("lingo-player-id") === "null"` (string) → verwijderen. Dat ruimt de huidige browsers van bestaande getroffen gebruikers op zodat ze niet blijven hangen.

### 4. Handmatig herstel bestaande accounts

Voor de 2 reeds aangemelde gebruikers zonder players-rij: na de fix is de eenvoudigste oplossing dat ze opnieuw inloggen — `loadPlayer` maakt dan alsnog de player aan. Geen handmatige inserts nodig.

## Niet veranderen

- RLS-policies op `players`, `player_presence`, `points_log` blijven ongewijzigd — die zijn correct.
- `is_admin()` en hardcoded admin-e-mail (in DB-functie) blijven zoals ze nu zijn (eerdere refactor).

## Verificatie

Na uitrollen:
- Test met een nieuw account → controleer dat er een rij in `players` verschijnt en de naam in de ranglijst komt
- Check Postgres-logs: de stroom `invalid input syntax for type uuid: "null"` moet stoppen
