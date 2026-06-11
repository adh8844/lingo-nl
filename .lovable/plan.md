## Probleemdiagnose

De eerdere cookie/localStorage-aanpassing zit pas aan het einde van de login-flow, wanneer tokens/sessies worden opgeslagen. Jouw nieuwe observatie is belangrijker: in Safari én Firefox gebeurt het al mis bij het klikken op **Doorgaan met Google** of **Doorgaan met Apple**. Omdat inloggen met gebruikersnaam/e-mail wel werkt, is de backend-auth zelf niet stuk.

De meest waarschijnlijke oorzaak zit dus in de OAuth-startflow in `Auth.tsx`:

```ts
lovable.auth.signInWithOAuth(provider, {
  redirect_uri: `${window.location.origin}/auth`,
});
```

Voor Lovable Cloud OAuth hoort de standaard `redirect_uri` normaal de origin te zijn:

```ts
redirect_uri: window.location.origin
```

De OAuth-proxy gebruikt eigen routes zoals `/~oauth/initiate` en `/~oauth/callback`. Door `/auth` als redirect target mee te geven kan de flow op custom domains zoals `lingo.najra.app` niet betrouwbaar starten of afronden. Dat verklaart waarom wachtwoord-login werkt, maar Google/Apple niet.

## Oplossing

### 1. OAuth-start in `Auth.tsx` corrigeren

Pas `handleOAuth` aan zodat Google/Apple exact de Lovable Cloud OAuth-flow gebruiken:

```ts
const result = await lovable.auth.signInWithOAuth(provider, {
  redirect_uri: window.location.origin,
});

if (result.error) {
  toast(...);
  setLoading(false);
  return;
}

if (result.redirected) {
  return;
}

navTo("/spelen", { replace: true });
```

Waarom:
- `window.location.origin` werkt op custom domains én preview.
- De OAuth-broker handelt de callback af via de juiste infrastructuur.
- Als `redirected === true`, moet de app niets meer doen; de browser gaat naar Google/Apple.
- Als tokens direct terugkomen, navigeren we naar `/spelen`.

### 2. Cookie/localStorage-fix behouden, niet verder uitbreiden

De hybride storage in `src/integrations/supabase/client.ts` blijft staan. Die is nog steeds nuttig voor sessie-persistentie na succesvolle login, maar lost niet het klikken/starten van OAuth op. Ik ga hier niet opnieuw aan sleutelen om geen extra risico te introduceren.

### 3. Foutmelding verbeteren zonder extra flow-wijzigingen

Als OAuth direct een error teruggeeft, toon ik een duidelijke tekst in plaats van `String(error)`, zodat je bij testen ziet of het bijvoorbeeld om provider-configuratie, domein of popup/redirect gaat.

Bijvoorbeeld:

```ts
description: error.message ?? "OAuth kon niet worden gestart."
```

### 4. Niet doen

Ik ga niet:
- opnieuw aan backend-auth of providerconfiguratie draaien;
- `supabase.auth.signInWithOAuth()` gebruiken;
- CORS/fetch-workarounds toevoegen;
- meer opslaglogica toevoegen;
- extra credits verbranden aan brede debugging.

## Verwacht resultaat

Na deze aanpassing moet een klik op **Doorgaan met Google** of **Doorgaan met Apple** de browser direct naar de OAuth-flow sturen op:

- `https://lingo.najra.app`
- de Lovable preview
- gewone browservensters in Safari en Firefox

Als de klik daarna wél doorstuurt maar terugkomt zonder sessie, dan zit het vervolgprobleem bij provider/domeinconfiguratie. Maar op basis van jouw omschrijving is de eerste concrete fix de `redirect_uri` in `Auth.tsx`.