

## Problema

L'hook `auth-email-hook` sta crashando con errore **"Base64Coder: incorrect characters for decoding"** perche il secret `SEND_EMAIL_HOOK_SECRET` ha un formato non compatibile con la libreria `standardwebhooks`. Ogni tentativo di signup causa un errore 500, e dopo i vari retry Supabase ha raggiunto il rate limit delle email (429).

**L'approccio attuale e sbagliato.** Il progetto usa la gestione manuale con `standardwebhooks` + `RESEND_API_KEY`, ma dovrebbe usare il **sistema managed di Lovable** che gestisce automaticamente credenziali e invio email.

## Piano

### 1. Ricreare l'hook con il sistema Lovable managed
- Usare `scaffold_auth_email_templates` per ricreare correttamente la edge function con `@lovable.dev/webhooks-js` (verifica firma) e `@lovable.dev/email-js` (invio email)
- Questo elimina la necessita di `SEND_EMAIL_HOOK_SECRET` e `RESEND_API_KEY` manuali

### 2. Applicare il branding Cibarius ai template
- Leggere `src/index.css` per i colori del brand
- Aggiornare i 6 template email (signup, recovery, magic-link, invite, email-change, reauthentication) con colori, logo e testi in italiano gia presenti nel codice attuale

### 3. Deploy
- Deployare la edge function `auth-email-hook` aggiornata

### 4. Rate limit
- Il rate limit si risolve da solo aspettando qualche minuto. Una volta che l'hook funziona, le email partiranno normalmente.

### Dettagli tecnici

Il sistema Lovable managed:
- Usa `LOVABLE_API_KEY` (provisionato automaticamente) invece di `RESEND_API_KEY`
- Usa `@lovable.dev/webhooks-js` per verificare i webhook invece di `standardwebhooks`
- Usa `@lovable.dev/email-js` per inviare le email tramite callback URL
- Non richiede la configurazione manuale di segreti nel dashboard Supabase

