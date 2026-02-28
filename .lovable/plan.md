

# 4 Nuove Funzionalita' per Cibarius

Implementazione di messaggistica, lista della spesa, calendario appuntamenti e PDF del piano alimentare, mantenendo l'identita' visiva Cibarius (palette blu/arancio, Fredoka, card arrotondate, gradient primary).

---

## 1. Messaggistica bidirezionale (Pro <-> Cliente)

### Database
Nuova tabella `messages`:
- `id` (uuid, PK)
- `sender_id` (uuid, references profiles)
- `receiver_id` (uuid, references profiles)
- `content` (text)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

RLS:
- SELECT/INSERT: sender o receiver = auth.uid(), con verifica link attivo tramite `has_active_pro_link` o `has_active_client_link`
- UPDATE (solo read_at): receiver = auth.uid()

### Frontend
- **`ProClientMessagesPage.tsx`** (`/pro/client/:clientId/messages`): Chat view con lista messaggi, input in basso, badge messaggi non letti
- **`UserMessagesPage.tsx`** (`/messages`): Chat col proprio nutrizionista, stessa UI ma lato cliente
- **Bottone "Chat"** nel `ProClientDetailPage.tsx` (griglia quick actions)
- **Indicatore non letti** nella bottom nav del professionista (tab "Note" diventa "Chat") e nella bottom nav utente (nuovo tab o badge su Profilo)
- Route aggiunte in `App.tsx`

### UI
Stile Cibarius: bolle messaggi con `bg-primary/10` (proprio) e `bg-secondary` (altro), bordi arrotondati `rounded-2xl`, timestamp discreti

---

## 2. Lista della spesa dal piano alimentare

### Nessuna tabella nuova
La lista viene generata client-side dal piano attivo + ricette suggerite, senza persistenza DB (piu' semplice, no migration).

### Frontend
- **`ShoppingListPage.tsx`** (`/shopping-list`): Pagina accessibile dall'utente
  - Legge `diet_plan_meal_targets` + `generated_recipes` (ingredienti) del piano attivo
  - Raggruppa ingredienti per categoria, somma quantita' duplicate
  - Checkbox per spuntare acquisti (stato locale, `localStorage`)
  - Pulsante "Condividi" (Web Share API) per inviare la lista
- **Bottone** nella `UserDietPage.tsx`: Card "Lista della spesa" con icona ShoppingCart
- Route in `App.tsx` sotto UserLayout

---

## 3. Calendario appuntamenti

### Database
Nuova tabella `appointments`:
- `id` (uuid, PK)
- `professional_id` (uuid)
- `client_user_id` (uuid)
- `title` (text, default 'Visita')
- `starts_at` (timestamptz)
- `ends_at` (timestamptz, nullable)
- `notes` (text, nullable)
- `status` (text, default 'scheduled') -- scheduled, completed, cancelled
- `created_at` (timestamptz, default now())

Trigger di validazione per status.

RLS:
- Pro ALL: `professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id)`
- Client SELECT: `client_user_id = auth.uid()`
- Admin ALL

### Frontend
- **`ProAppointmentsPage.tsx`** (`/pro/appointments`): Vista settimanale/lista con card appuntamenti, pulsante "+ Nuovo", datepicker per selezionare data/ora, select per scegliere il cliente
- **Accesso dalla dashboard Pro** (`ProPage.tsx`): Nuova card "Appuntamenti" nella griglia
- **Lato utente** (`UserDietPage.tsx`): Card "Prossimo appuntamento" con data e orario, visibile solo se esiste un appuntamento futuro
- **Bottom nav Pro**: Tab "Note" rimpiazzato da "Chat" (vedi punto 1), appuntamenti accessibili dalla dashboard
- Route in `App.tsx`

---

## 4. PDF del piano alimentare

### Nessuna tabella nuova
Generazione client-side con l'API nativa del browser (print-to-PDF).

### Frontend
- **Componente `PlanPdfView.tsx`**: Layout ottimizzato per stampa con:
  - Header: logo Cibarius, nome professionista, data
  - Riepilogo macro giornalieri in tabella
  - Tabella posologia per pasto (kcal, proteine, carbo, grassi)
  - Note del piano
  - Footer con "Generato da Cibarius"
- **Pagina `ProClientPlanPdfPage.tsx`** (`/pro/client/:clientId/plan-pdf`): Carica il piano attivo e renderizza `PlanPdfView`, con pulsante "Scarica PDF" che chiama `window.print()`
- **Stile `@media print`** in `index.css`: Nasconde header, nav, mostra solo il contenuto del piano
- **Bottone "PDF"** nel `ProClientDetailPage.tsx` accanto a "Modifica piano"

---

## Riepilogo file

### Nuovi file (7)
- `src/pages/pro/ProClientMessagesPage.tsx`
- `src/pages/UserMessagesPage.tsx`
- `src/pages/ShoppingListPage.tsx`
- `src/pages/pro/ProAppointmentsPage.tsx`
- `src/pages/pro/ProClientPlanPdfPage.tsx`
- `src/components/PlanPdfView.tsx`
- Migration SQL (messages + appointments)

### File modificati (5)
- `src/App.tsx` -- 4 nuove route
- `src/pages/pro/ProPage.tsx` -- card Appuntamenti + Chat
- `src/pages/pro/ProClientDetailPage.tsx` -- bottoni Chat + PDF
- `src/pages/UserDietPage.tsx` -- card Lista spesa + prossimo appuntamento
- `src/components/BottomNav.tsx` -- tab Chat per pro, badge non letti
- `src/index.css` -- stili `@media print`
- `src/integrations/supabase/types.ts` -- auto-aggiornato

### Ordine di implementazione
1. Migration DB (messages + appointments)
2. Messaggistica (tabelle gia' pronte)
3. Calendario appuntamenti
4. Lista della spesa (no DB)
5. PDF piano (no DB)

Tutto coerente con la palette Cibarius, nessuna libreria esterna aggiuntiva.

