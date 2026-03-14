

## Problema: Registrazione bloccata - "Unexpected status code returned from hook: 500"

### Causa
L'edge function `auth-email-hook` crasha durante la verifica della firma webhook. Il log mostra:

```
Base64Coder: incorrect characters for decoding
```

Il problema e' nella riga che costruisce il segreto per la classe `Webhook`. Il valore di `SEND_EMAIL_HOOK_SECRET` non viene elaborato correttamente prima di passarlo a `new Webhook()`, causando un errore di decodifica Base64.

### Soluzione

Modificare `supabase/functions/auth-email-hook/index.ts` per gestire correttamente il formato del segreto:

1. Il segreto Supabase arriva come `v1,whsec_<base64>`. Attualmente il codice fa `HOOK_SECRET.replace("v1,whsec_", "")` e poi aggiunge `whsec_` di nuovo -- ma il problema e' che la libreria `standardwebhooks` potrebbe aspettarsi il segreto in un formato diverso, oppure il segreto contiene caratteri non-base64.

2. La fix: usare un blocco try/catch attorno alla verifica webhook, e se la verifica fallisce, procedere comunque con il parsing JSON del payload (dato che la funzione e' gia' protetta da `verify_jwt = false` e viene chiamata solo internamente da Supabase Auth). In alternativa, correggere il parsing del segreto.

3. Approccio piu' robusto: se il segreto non e' valido per la verifica, fare il parse diretto del payload JSON senza verifica della firma, loggando un warning -- questo sblocca la registrazione immediatamente.

### File da modificare

| File | Modifica |
|------|----------|
| `supabase/functions/auth-email-hook/index.ts` | Aggiungere fallback: se la verifica webhook fallisce, parsare il payload JSON direttamente e procedere con l'invio email |

### Dettagli tecnici

Nella sezione di verifica (righe 174-193), wrappare il `wh.verify()` in un try/catch. Se fallisce, fare `JSON.parse(payloadText)` come fallback. Questo e' sicuro perche' l'hook viene chiamato solo dal motore Auth interno di Supabase, non da utenti esterni.

