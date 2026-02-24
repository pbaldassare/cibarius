

## STEP 1B — Autenticazione, Profili e Protezione Route

### Panoramica
Implementeremo il sistema di login/signup con Supabase Auth, una tabella `profiles` con trigger automatico, protezione delle route e logout.

---

### 1. Migrazione Database

Una singola migrazione SQL che crea:

- **Tabella `profiles`** con colonne: `id` (uuid PK, ref auth.users on delete cascade), `email` (text unique not null), `full_name` (text), `phone` (text), `role` (text not null default 'user'), `created_at` (timestamptz default now())
- **Trigger di validazione** del campo `role` (tramite trigger, non CHECK constraint) che accetta solo: `user`, `restaurant_owner`, `admin`, `professional`, `supplier`
- **Funzione `handle_new_user()`** che al signup inserisce automaticamente una riga in `profiles` con `id = NEW.id`, `email = NEW.raw_user_meta_data->>'email'`, `role = 'user'`
- **Trigger `on_auth_user_created`** su `auth.users` AFTER INSERT che chiama `handle_new_user()`
- **RLS abilitata** con due policy:
  - SELECT: `auth.uid() = id`
  - UPDATE: `auth.uid() = id`

**Nota**: il knowledge file dice di non attaccare trigger a tabelle in schema riservati come `auth`. Tuttavia, il trigger `on_auth_user_created` su `auth.users` e' il pattern standard raccomandato da Supabase per auto-creare profili. Lo useremo.

---

### 2. Nuovi File

#### `src/hooks/useAuth.tsx` — Context di autenticazione
- React Context che wrappa l'app
- Usa `onAuthStateChange` (impostato PRIMA di `getSession()` come da best practice)
- Espone: `session`, `user`, `loading`, `signOut`
- `signOut` chiama `supabase.auth.signOut()` e fa redirect a `/auth/login`

#### `src/components/ProtectedRoute.tsx`
- Wrapper che controlla `session` dal context
- Se `loading` mostra spinner
- Se non autenticato, redirect a `/auth/login`

#### `src/pages/auth/LoginPage.tsx`
- Form email + password con UI coerente (card bianca, primary blu, mobile-first)
- Chiama `supabase.auth.signInWithPassword()`
- Link a signup e forgot password
- Se gia' loggato, redirect a `/`

#### `src/pages/auth/SignupPage.tsx`
- Form email + password + nome completo
- Chiama `supabase.auth.signUp()` con `emailRedirectTo: window.location.origin`
- Passa `full_name` nei `data` metadata (opzionale)
- Link a login

#### `src/pages/auth/ForgotPasswordPage.tsx`
- Form solo email
- Chiama `supabase.auth.resetPasswordForEmail()` con `redirectTo`
- Mostra messaggio di conferma

#### `src/pages/auth/ResetPasswordPage.tsx`
- Form nuova password (necessario per completare il reset)
- Chiama `supabase.auth.updateUser({ password })`
- Route pubblica

---

### 3. Modifiche a File Esistenti

#### `src/App.tsx`
- Wrappa tutto con `AuthProvider`
- Aggiunge route `/auth/login`, `/auth/signup`, `/auth/forgot`, `/reset-password`
- Le route dell'app (dentro `MobileLayout`) vengono wrappate con `ProtectedRoute`

#### `src/pages/ProfiloPage.tsx`
- Il bottone "Esci" chiama `signOut()` dal context
- Mostra email dell'utente loggato dal context

#### `src/integrations/supabase/types.ts`
- Verra' rigenerato automaticamente dopo la migrazione

---

### 4. UI delle Pagine Auth

Stile coerente con il design system esistente:
- Sfondo `bg-background`, card bianche centrate
- Primary blu (#1E5BFF) per bottoni e link
- Font Inter, padding ampio, mobile-first (`max-w-lg mx-auto`)
- Icona/logo in alto, titolo, form con `Input` e `Button` gia' esistenti
- Messaggi di errore in rosso (destructive)
- Toast per feedback (signup riuscito, email inviata, ecc.)

---

### 5. Sequenza di Implementazione

1. Migrazione SQL (profiles + trigger + RLS)
2. `useAuth.tsx` context
3. `ProtectedRoute.tsx`
4. Pagine auth (Login, Signup, Forgot, ResetPassword)
5. Aggiornamento `App.tsx` con nuove route e protezione
6. Aggiornamento `ProfiloPage.tsx` con logout funzionante

