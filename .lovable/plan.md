Hier is het volledige herziene plan met de drie aanpassingen verwerkt:

---

## Doel

DingoLingo uitbreiden met een B2B-aanbod voor basisscholen (Groep 3 t/m 8). Schoolleiders krijgen een eigen landingspagina, leerlingen krijgen individuele accounts gekoppeld aan hun school. Ranglijsten en online uitdagingen worden gefilterd per "kring" (eigen school, of de open community voor niet-schoolspelers).

---

## 1. Landing — schoolsectie + CTA

Bestand: `src/pages/Landing.tsx`

- Nieuwe sectie `<ForSchoolsSection />` toevoegen tussen `BadgesSection` en `FinalCTA`.
- Inhoud: kicker "Voor scholen", titel "DingoLingo voor de klas", korte pitch (taalontwikkeling Groep 3-8, veilige omgeving, eigen schoolomgeving), 4 voordeel-bullets (eigen accounts per leerling, eigen ranglijst binnen de school, €1 per leerling per jaar, geen reclame).
- Prominente CTA-knop "Ontdek het schoolaanbod →" die navigeert naar `/school`.
- Stijl: zelfde tokens als andere secties (card/border, primary, framer-motion fade-in), past in bestaand ritme.

---

## 2. Nieuwe pagina `/school`

Bestand: `src/pages/School.tsx` (nieuw) Route toevoegen in `src/App.tsx`: `<Route path="/school" element={<School />} />`.

Secties:

1. **Header / hero** — DingoLingo wordmark, terug-link naar `/`, headline "DingoLingo voor de basisschool", subkop voor schoolleiders/IB'ers.
2. **Waarom DingoLingo** — 3-4 kaarten: woordenschat & spelling, plezier (badges/streaks), veilige besloten omgeving, geschikt voor Groep 3 t/m 8.
3. **Eigen schoolomgeving** — uitleg dat leerlingen alleen klasgenoten zien op de ranglijst en alleen klasgenoten kunnen uitdagen.
4. **Prijs** — grote prijskaart: **€1 per leerlingaccount per schooljaar**, geen verborgen kosten, factuur per school, per jaar.
5. **Hoe het werkt** — 3 stappen: aanmelden → school krijgt code → leerlingen registreren met die code.
6. **CTA-formulier / mailto** — knop "Vraag schoolaccount aan" met `mailto:` naar schoolcontact (placeholder e-mail) plus secundaire knop "Terug naar landing".

Volledig in NL, semantische tokens, SEO-titel "DingoLingo voor scholen — Lingo voor Groep 3 t/m 8".

---

## 3. Database *(medium-risk migratie, bestaande data blijft intact)*

### 3a. Tabel `public.schools` — publieke metadata

Bevat alleen de informatie die ingelogde gebruikers mogen zien:

```sql
CREATE TABLE public.schools (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  city         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

```

**RLS** `schools`**:**

```sql
-- Alleen ingelogde gebruikers mogen schoolnamen lezen (bijv. voor profielen)
CREATE POLICY "schools_select_authenticated"
  ON public.schools FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE alleen via admin
CREATE POLICY "schools_admin_write"
  ON public.schools FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

```

---

### 3b. Tabel `public.school_details` — gevoelige beheerdata *(nieuw, apart)*

Bevat invite-code en contactgegevens. Volledig afgeschermd voor gewone gebruikers:

```sql
CREATE TABLE public.school_details (
  school_id     uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  invite_code   text NOT NULL UNIQUE,  -- 6 tekens, gegenereerd door admin
  contact_name  text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text
);

```

**RLS** `school_details`**:**

```sql
-- Geen SELECT voor gewone gebruikers — alleen admin
CREATE POLICY "school_details_admin_only"
  ON public.school_details FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

```

> De invite-code wordt nooit via een client-side query opgehaald. In een vervolgstap wordt deze alleen ontsloten via een beveiligde RPC (SECURITY DEFINER) die de code valideert zonder hem terug te sturen naar de client.

Unieke index:

```sql
CREATE UNIQUE INDEX idx_school_details_invite_code ON public.school_details(invite_code);

```

---

### 3c. Tabel `public.players` uitbreiden

```sql
ALTER TABLE public.players
  ADD COLUMN school_id uuid NULL
    REFERENCES public.schools(id)
    ON DELETE SET NULL;

CREATE INDEX idx_players_school_id ON public.players(school_id);

```

Nullable, default NULL → bestaande spelers blijven "niet-school" (open community).

**RLS-policy:** `school_id` **alleen wijzigbaar door admin**

De bestaande `guard_player_protected_columns` trigger blijft ongewijzigd. Daarnaast een expliciete UPDATE-policy:

```sql
-- Speler mag eigen rij updaten, maar school_id niet zelf wijzigen
CREATE POLICY "players_update_own"
  ON public.players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND school_id IS NOT DISTINCT FROM (
      SELECT school_id FROM public.players WHERE user_id = auth.uid()
    )
  );

-- Admin mag alles updaten, inclusief school_id
CREATE POLICY "players_admin_update"
  ON public.players FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

```

---

### 3d. Helper-functies

```sql
-- Geeft school_id terug van de ingelogde speler
CREATE OR REPLACE FUNCTION public.current_player_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;

-- True als twee spelers in dezelfde kring zitten (zelfde school, of allebei NULL)
CREATE OR REPLACE FUNCTION public.players_in_same_circle(p1 uuid, p2 uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (SELECT school_id FROM public.players WHERE id = p1)
    IS NOT DISTINCT FROM
         (SELECT school_id FROM public.players WHERE id = p2);
$$;

```

---

## 4. Ranglijst-filtering *(eigen kring)*

Bestand: `src/pages/Rankings.tsx`

- Bij laden van `allPlayers`: `school_id` mee-selecteren en client-side filteren op `p.school_id === player.school_id` (NULL === NULL via `IS NOT DISTINCT FROM` logica).
- Voor RPC-gebaseerde lijsten (`get_points_in_range`, `get_games_count_total`, etc.): na ophalen filteren op `school_id` via een `playerSchool: Map<id, schoolId|null>` opgebouwd uit de `players` select.
- Onlinelijst (`usePresence`) eveneens filteren op eigen kring vóór render.
- Geen wijzigingen aan de RPC's zelf nodig.

---

## 5. Uitdagingen beperken tot eigen kring

- `src/pages/Rankings.tsx`: `canChallenge` extra conditie `samenKring(entry.id)`.
- `src/components/OnlineLobby.tsx`: `onlinePlayers` voor render filteren op eigen `school_id`.
- `src/hooks/useOnlineMatch.ts` (`sendChallenge`): vóór insert verifieren dat target zelfde kring heeft; anders toast "Je kunt alleen spelers binnen je eigen school uitdagen".
- Edge function `match-action` (server-side guard): bij `create_challenge` action checken met `players_in_same_circle()`; anders error. Voorkomt omzeiling via UI.

---

## 6. Speler-context

- `src/types/player.ts`: `school_id?: string | null` toevoegen.
- `src/hooks/usePlayerContext.tsx`: `school_id` wordt automatisch meegeselecteerd als `get_my_player` de volledige rij retourneert.

---

## Technische details

- Geen wijzigingen aan bestaande punten-/badge-logica.
- Geen UI voor leerling-registratie via invite_code in deze iteratie — alleen het fundament.
- Bestaande spelers blijven `school_id = NULL` → zien elkaar zoals nu.
- `mailto:` adres voor schoolaanmeldingen: het e-mailadres van de admin gebruiker. Geen adres hardcoded in code.

---

## Out of scope *(vervolgstappen)*

- Leerling-registratie via invite_code (beveiligde RPC die code valideert zonder terug te sturen).
- Self-service schoolportaal.
- Facturatie/abonnementen (Stripe).
- Admin-UI voor scholen beheren binnen `/admin`.

---

De drie kernwijzigingen samengevat:

1. **SELECT authenticated** in plaats van public op `schools`
2. `school_details` als aparte tabel voor invite-code en contactgegevens, enkel leesbaar voor admins
3. **Expliciete UPDATE-policy** op `players` die voorkomt dat een speler zelf zijn `school_id` kan aanpassen