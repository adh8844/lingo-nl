## Doel
Google- en Apple-login moeten weer starten én daarna dezelfde SSO-sessie delen tussen Lingo, Schoolplein en Mevrouw de Uil, zonder de bestaande e-mail/leerling-login te breken.

## Belangrijk uitgangspunt
Een browsercookie kan alleen automatisch gedeeld worden tussen subdomeinen van hetzelfde hoofddomein, bijvoorbeeld:

```text
lingo.najra.app
schoolplein.najra.app
mevrouwdeuil.najra.app
→ gedeelde cookie: .najra.app
```

Als Mevrouw de Uil op een ander hoofddomein staat, kan dezelfde cookie daar technisch niet werken. Dan moet SSO via een centrale login-redirect lopen, niet via directe cookie-sharing.

## Plan

### 1. Lovable Cloud social auth opnieuw laten configureren
Ik gebruik de officiële social-auth configuratie voor Google en Apple opnieuw, zodat de OAuth-broker en gegenereerde auth-module weer overeenkomen met de huidige gekoppelde apps/domeinen.

Waarom dit eerst:
- de huidige code gebruikt `@lovable.dev/cloud-auth-js`, maar de gegenereerde module is oud/gevoelig voor domeinwijzigingen;
- Google/Apple falen al bij de start van de flow, dus provider/broker-configuratie moet worden hersteld voordat we nog meer client-side workarounds toevoegen;
- dit is de correcte route voor Lovable Cloud OAuth, niet `supabase.auth.signInWithOAuth()`.

### 2. Eén centrale SSO-cookie-strategie maken
Ik vervang de ad-hoc `isNajraHost()`-logica door expliciete SSO-domainlogica:

```text
Als host eindigt op .najra.app of exact najra.app:
  schrijf auth-sessie óók als .najra.app cookie

Anders:
  gebruik host-only cookie/localStorage
```

Daarbij blijft localStorage bestaan als primaire opslag per app, maar de `.najra.app` cookie blijft de gedeelde SSO-brug tussen subdomeinen.

### 3. OAuth-callback betrouwbaar laten landen
De OAuth-start blijft met:

```ts
redirect_uri: window.location.origin
```

Maar ik controleer de callback-afhandeling op twee punten:
- na terugkomst van Google/Apple moet de sessie echt in de Supabase client terechtkomen;
- daarna moet dezelfde sessie direct naar de gedeelde `.najra.app` cookie geschreven worden.

Als nodig voeg ik een kleine `syncAuthSessionToSharedCookie` stap toe na OAuth, zodat Google/Apple exact dezelfde SSO-route krijgen als e-mail-login.

### 4. Cross-app SSO bij app-start herstellen
Bij het laden van Lingo/Schoolplein/Mevrouw de Uil moet de app:
- eerst normale localStorage proberen;
- daarna de gedeelde `.najra.app` cookie proberen;
- bij een geldige cookie de sessie herstellen en lokaal opslaan.

Hierdoor geldt:
- login op Schoolplein → Lingo ziet sessie;
- login op Lingo → Schoolplein ziet sessie;
- Google/Apple-gebruikers krijgen hetzelfde gedrag als e-mailgebruikers.

### 5. Mevrouw de Uil afhankelijk van domein
Ik bouw dit zo dat Mevrouw de Uil automatisch meedoet als die onder `.najra.app` draait, bijvoorbeeld `mevrouwdeuil.najra.app`.

Als Mevrouw de Uil op een ander hoofddomein staat, noteer ik in de code/plan expliciet dat browsercookies daar niet gedeeld kunnen worden. Dan is de juiste oplossing een centrale auth-host, bijvoorbeeld:

```text
login.najra.app → OAuth → terug naar gewenste app
```

Die centrale login kan dan SSO via redirects leveren, maar niet via één gedeelde cookie over verschillende hoofddomeinen.

## Niet doen
Ik ga niet:
- overstappen op directe `supabase.auth.signInWithOAuth()`;
- meer willekeurige redirect-varianten proberen;
- Apple/Google workarounds toevoegen buiten de Lovable Cloud OAuth-flow;
- e-mail/leerling-login wijzigen;
- rollen, spelers of bestaande database-logica aanpassen.

## Verwacht resultaat
Na implementatie moet een klik op **Doorgaan met Google** of **Doorgaan met Apple** weer naar de provider sturen. Na succesvolle login moet de sessie gedeeld worden tussen alle apps op `.najra.app`, inclusief Google- en Apple-gebruikers.