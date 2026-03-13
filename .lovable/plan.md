

## Piano: Doppia password + email verification non obbligatoria

### Cosa cambia

1. **Aggiungere campo "Conferma password"** nello Step 2 della registrazione, con validazione che le due password coincidano. Mostrare errore inline se non corrispondono.

2. **Rimuovere l'obbligo di conferma email** prima di accedere all'app. L'email di verifica viene comunque inviata dopo la registrazione, ma l'utente può usare l'app immediatamente senza aspettare la conferma.

### Dettagli tecnici

**File: `src/pages/auth/SignupPage.tsx`**
- Nuovo stato `confirmPassword`
- Nuovo campo Input "Conferma password" con toggle visibilità, subito dopo il campo password
- Messaggio di errore rosso se le password non coincidono (`password !== confirmPassword`)
- Aggiornare `canGoNext()` step 2: richiedere anche `confirmPassword` e che coincida con `password`

**Supabase Dashboard** (azione manuale):
- In **Authentication → Settings → Email**, disabilitare "Confirm email". Questo permette agli utenti di accedere subito dopo la registrazione, ricevendo comunque la mail di verifica in background.

### Note
- Valido per tutti i tipi di account (user, restaurant_owner, professional)
- Il campo email resta nel form (serve a Supabase per l'auth), ma la conferma via link non blocca più l'accesso

