## Probleem

De externe bug2prompt webhook retourneert 400:
`"severity" must be one of ["low","medium","high","critical"]`

Wij sturen nu `"Medium"` (hoofdletter), waardoor elke melding faalt met "Edge Function returned a non-2xx status code".

## Oplossing

In `supabase/functions/send-bug-report/index.ts` de severity normaliseren naar lowercase voordat het payload-object wordt opgebouwd:

```ts
severity: (severity ?? 'Medium').toString().toLowerCase(),
```

Voor de zekerheid ook `type` lowercasen (`'bug'` blijft gewoon `'bug'`, maar het voorkomt soortgelijke issues als bug2prompt daar ook strict op is).

Geen wijzigingen in `BugReportModal.tsx` — de UI mag de Nederlandse labels en de huidige `Low/Medium/High/Critical` state houden.

## Verificatie

Na de fix de edge function opnieuw aanroepen met een test-payload en bevestigen dat het antwoord `{ success: true }` is.
