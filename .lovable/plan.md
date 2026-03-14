

## Disabilitare la conferma email alla registrazione

### Problema
Dopo la registrazione, l'utente riceve l'errore "Email not confirmed" quando prova a fare login. La conferma email via link blocca l'accesso immediato.

### Soluzione
Questo non è un problema di codice frontend — è un'impostazione di Supabase. Bisogna disabilitare la conferma email obbligatoria nel progetto Supabase.

**Azione nel dashboard Supabase:**
- Authentication → Settings → "Confirm email" → **disattivare**

Questo permette agli utenti di accedere immediatamente dopo la registrazione senza dover cliccare il link di conferma.

### Inoltre, nel codice
Nel `LoginPage.tsx`, il messaggio di errore per "email_not_confirmed" non è gestito in modo user-friendly. Si può aggiungere un caso specifico nel toast di errore per mostrare un messaggio più chiaro.

| File | Modifica |
|------|----------|
| Dashboard Supabase | Authentication → Settings → disattivare "Confirm email" |
| `src/pages/auth/LoginPage.tsx` | Aggiungere gestione errore "email not confirmed" con messaggio italiano più chiaro (opzionale, non servirà più dopo la disattivazione) |

