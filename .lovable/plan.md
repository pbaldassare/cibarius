

# Piano: Fix profilo ristoratore — immagine e impostazioni

## Problemi identificati

1. **"Impostazioni" apre un dialog generico** con solo Nome e Telefono, invece di portare alla pagina `RestaurantSettingsPage` (`/restaurant/settings`) dove ci sono tutti i nuovi campi (immagine, ubicazione, social).

2. **Upload avatar non funziona** — il codice usa il bucket `avatars` (riga 199 di ProfiloPage) che potrebbe non esistere o non avere i permessi corretti. Serve verificare e creare il bucket se mancante.

3. **Migrazione DB: manca `NOTIFY pgrst`** — dopo aver aggiunto le colonne alla tabella `restaurants`, PostgREST potrebbe non vederle. Serve una migrazione con `NOTIFY pgrst, 'reload schema'`.

## Soluzione

### 1. Redirect "Impostazioni" per restaurant_owner
In `ProfiloPage.tsx`, modificare il click handler del pulsante "Impostazioni": se il ruolo è `restaurant_owner`, fare `navigate("/restaurant/settings")` invece di aprire il dialog generico.

### 2. Creare bucket `avatars` (se mancante)
Aggiungere una migrazione SQL che crea il bucket `avatars` come pubblico con policy RLS per upload/lettura.

### 3. Aggiungere NOTIFY pgrst
Nuova migrazione SQL con `NOTIFY pgrst, 'reload schema'` per forzare PostgREST a ricaricare lo schema dopo le colonne aggiunte a `restaurants`.

## File coinvolti

| File | Modifica |
|------|----------|
| `src/pages/ProfiloPage.tsx` | Redirect a `/restaurant/settings` per restaurant_owner |
| Migrazione SQL | Creare bucket `avatars` + policy RLS + NOTIFY pgrst |

