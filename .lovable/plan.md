

# Profilo: Impostazioni, Avatar, Elimina Account e Supporto

## Panoramica

Rifare la sezione Impostazioni del profilo con funzionalita' reali e aggiungere un sistema di segnalazioni/suggerimenti gestibile dall'admin.

## Modifiche previste

### 1. Database: nuovi campi e tabella

**Migration SQL**:
- Aggiungere colonna `avatar_url` (text, nullable) alla tabella `profiles`
- Creare tabella `support_requests`:
  - `id` (uuid PK)
  - `user_id` (uuid FK profiles)
  - `type` (text: "problema" | "suggerimento")
  - `message` (text)
  - `status` (text: "open" | "resolved" | "closed", default "open")
  - `admin_notes` (text, nullable)
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz, nullable)
- Creare bucket Storage `avatars` (pubblico) per le immagini profilo
- RLS: utenti inseriscono le proprie richieste, admin leggono e aggiornano tutto

### 2. Pagina Profilo (`src/pages/ProfiloPage.tsx`)

Sostituire "Impostazioni" e "Aiuto" con funzionalita' reali:

**Sezione avatar**: Rendere l'avatar cliccabile per caricare una foto profilo. Dopo l'upload su Storage `avatars`, salvare l'URL in `profiles.avatar_url`. Mostrare l'immagine reale al posto dell'emoji.

**"Impostazioni" diventa tap che apre un dialog** con:
- Modifica nome completo
- Modifica telefono
- Bottone "Salva"

**"Aiuto" diventa "Segnala un problema o suggerimento"**: tap apre un dialog/sheet con:
- Select tipo: "Problema" / "Suggerimento"
- Textarea per il messaggio
- Bottone "Invia segnalazione"
- Inserisce in `support_requests`

**"Elimina account"**: Aggiungere un bottone rosso in fondo, prima di "Esci". Al tap, dialog di conferma con testo "Sei sicuro? Questa azione e' irreversibile." che chiama `signOut` + disabilita l'account (o lo segnala per eliminazione admin).

### 3. Pagina admin segnalazioni (`src/pages/admin/AdminSupportPage.tsx`)

Nuova pagina `/admin/support`:
- Lista delle `support_requests` ordinate per data (piu' recenti prima)
- Per ogni richiesta: tipo (badge colorato), messaggio, email utente, data
- Azioni: "Segna come risolto" / "Chiudi" + campo note admin
- Filtro per status (aperte / risolte / chiuse)

### 4. Dashboard admin (`src/pages/admin/AdminPage.tsx`)

Aggiungere card "Segnalazioni Utenti" con contatore richieste aperte e link a `/admin/support`.

### 5. Routing (`src/App.tsx`)

Aggiungere rotta `/admin/support` con la nuova pagina.

---

## Dettagli tecnici

### File coinvolti: 5 + migration

- **Migration SQL**: `avatar_url` su profiles + tabella `support_requests` + bucket storage + RLS
- `src/pages/ProfiloPage.tsx`: avatar upload, dialog impostazioni, dialog segnalazione, elimina account
- `src/pages/admin/AdminSupportPage.tsx` (nuovo): gestione segnalazioni
- `src/pages/admin/AdminPage.tsx`: card segnalazioni
- `src/App.tsx`: rotta `/admin/support`
- `src/integrations/supabase/types.ts`: aggiornamento tipi

### Upload avatar
Usare `supabase.storage.from("avatars").upload(userId + ".jpg", file, { upsert: true })` e poi `getPublicUrl` per salvare l'URL in `profiles.avatar_url`.

### Elimina account
Per sicurezza, non eliminare direttamente ma aggiornare un campo `deleted_at` o inserire una richiesta di tipo "delete_account" nella tabella support_requests, cosi' l'admin puo' gestirlo manualmente.

