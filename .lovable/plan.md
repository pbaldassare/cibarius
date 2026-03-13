

## Problema Identificato

Dai log della edge function, il hook riceve payload come `{"type": "signup"}` invece di `{"user": {...}, "email_data": {...}}`. Questo perché:

1. **Manca la verifica del webhook** — Supabase invia i payload con firma crittografica che va verificata usando `standardwebhooks`. Il codice attuale usa `req.json()` direttamente, ma il payload va letto come testo e verificato con la libreria webhook.
2. **Manca il secret `SEND_EMAIL_HOOK_SECRET`** — Quando hai salvato l'hook nella dashboard, Supabase ha generato un secret (webhook secret). Questo va configurato come secret della edge function.

## Piano di Fix

### 1. Ottenere il webhook secret
- Nella dashboard Supabase → Authentication → Hooks → Send Email, c'è un secret generato (formato `v1,whsec_...`). Serve salvarlo come secret `SEND_EMAIL_HOOK_SECRET`.

### 2. Aggiornare la edge function `auth-email-hook/index.ts`
- Importare `Webhook` da `standardwebhooks`
- Leggere il payload come testo (`req.text()`) invece di JSON
- Verificare la firma con `wh.verify(payload, headers)`
- Estrarre `user` e `email_data` dal payload verificato

```text
Flusso attuale (broken):
  req.json() → payload.user (undefined) → errore

Flusso corretto:
  req.text() → wh.verify(text, headers) → { user, email_data } → send email
```

### 3. Re-deploy della edge function

### Dettagli Tecnici

Modifiche al file `supabase/functions/auth-email-hook/index.ts`:
- Aggiungere import: `import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"`
- Sostituire la lettura del payload con verifica webhook
- Il secret `SEND_EMAIL_HOOK_SECRET` va letto con `Deno.env.get("SEND_EMAIL_HOOK_SECRET")`
- Rimuovere il prefisso `v1,whsec_` dal secret prima di passarlo a `new Webhook()`

