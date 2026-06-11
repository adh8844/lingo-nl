## Probleem

`src/integrations/supabase/client.ts` schrijft álle sessie-cookies met `domain=.najra.app; Secure`. Dit werkt op productie alleen als álles perfect klopt, maar veroorzaakt in de praktijk uitlog-problemen — ook in gewone browsersessies op `lingo.najra.app`:

- Sommige browsers (vooral Safari/iOS en strikte tracking-preventie) accepteren of bewaren third-party-achtige domain-cookies inconsistent.
- Na de Google/Apple OAuth-redirect schrijft Supabase meerdere keys (`sb-*-auth-token`, code-verifier, etc.). Als één daarvan niet terugleesbaar is, mislukt de PKCE-uitwisseling → sessie verdwijnt direct.
- Er is geen fallback: zodra de cookie niet wordt geaccepteerd, is er geen alternatieve opslag → user lijkt "niet ingelogd".
- In preview/localhost werkt het sowieso niet, waardoor je het niet kunt reproduceren/debuggen.

## Oplossing: robuuste hybride storage

Eén bestand aanpassen: `src/integrations/supabase/client.ts`.

Strategie — **schrijf naar zowel cookies als `localStorage`, lees met fallback**. Zo werkt SSO via cookies tussen `*.najra.app`, en blijft de sessie altijd lokaal beschikbaar als backup, zelfs als de browser de cookie weigert.

### Gedrag

1. **`setItem(key, value)`**:
   - Altijd schrijven naar `localStorage` (primaire, betrouwbare opslag).
   - Daarnaast: cookie zetten. Bepaal scope dynamisch:
     - Hostname eindigt op `najra.app` → `domain=.najra.app; Secure` (voor SSO tussen subdomeinen).
     - Anders → host-only cookie zonder `domain`, `Secure` alleen als `https:`.
   - Cookie-flags: `path=/; max-age=604800; SameSite=Lax`.

2. **`getItem(key)`**:
   - Eerst `localStorage` proberen.
   - Als leeg, fallback naar cookie (zodat een sessie die op een ander subdomein is gestart via SSO wordt opgepikt en daarna ook lokaal wordt gecached bij de volgende `setItem`).

3. **`removeItem(key)`**:
   - Verwijder uit `localStorage`.
   - Verwijder cookie zowel met `domain=.najra.app` als host-only (om "stuck" cookies van eerdere configs op te ruimen).

4. **SSR-safety**: `typeof window === 'undefined'` checks behouden.

### Waarom dit het probleem oplost

- **Op `lingo.najra.app` in een normale browser**: ook als de domain-cookie geweigerd of niet meteen teruggelezen wordt, vindt Supabase de tokens via `localStorage` → login en sessie-refresh werken betrouwbaar.
- **Cross-subdomein SSO**: blijft werken via de cookie. Eerste bezoek aan een nieuw subdomein leest de cookie en spiegelt 'm naar `localStorage`.
- **Preview/localhost**: werkt automatisch via `localStorage` + host-only cookie.
- **Geen wijzigingen** aan `Auth.tsx`, OAuth-flow, `redirect_uri` of Supabase-config nodig.

## Verificatie

1. Op `lingo.najra.app` (normale browser, ook Safari): uitloggen, cookies wissen, opnieuw inloggen met Google → moet ingelogd blijven na refresh.
2. Op `schoolplein.najra.app` ingelogd → naar `lingo.najra.app` → automatisch herkend (SSO via cookie, daarna gespiegeld naar localStorage).
3. In preview: Google-login moet ook werken (sessie via localStorage).
4. DevTools → Application controleren: zowel `localStorage` `sb-*-auth-token` als cookie aanwezig op productie.