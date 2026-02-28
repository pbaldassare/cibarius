
# 3 Nuove Funzionalita' per Cibarius

Tracking misurazioni corporee, card prossimo appuntamento, e badge messaggi non letti nella bottom nav.

---

## 1. [COMPLETATA] Tracking misurazioni corporee con grafici

### Database
Nuova tabella `body_measurements`:
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, NOT NULL)
- `measured_at` (date, NOT NULL, default CURRENT_DATE)
- `weight_kg` (numeric, nullable)
- `waist_cm` (numeric, nullable)
- `hips_cm` (numeric, nullable)
- `chest_cm` (numeric, nullable)
- `arm_cm` (numeric, nullable)
- `thigh_cm` (numeric, nullable)
- `body_fat_pct` (numeric, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())

RLS:
- User ALL: `user_id = auth.uid() OR current_user_is_admin()`
- Pro SELECT: via `client_links` (attivo)

### Frontend

**Nuova pagina `UserMeasurementsPage.tsx`** (`/measurements`):
- Form per inserire nuova misurazione (peso, circonferenze, body fat)
- Lista delle misurazioni passate (ultime 20)
- Grafici di trend con recharts (LineChart): peso nel tempo, circonferenze nel tempo
- Toggle per selezionare quali metriche visualizzare nel grafico

**Nuova pagina `ProClientMeasurementsPage.tsx`** (`/pro/client/:clientId/measurements`):
- Stessa vista grafici ma per il professionista (sola lettura)
- Il nutrizionista vede l'andamento del cliente

**Modifiche esistenti**:
- `App.tsx`: 2 nuove route
- `UserDietPage.tsx`: nuova card "Misurazioni" nella griglia (accanto a Lista spesa / Chat)
- `ProClientDetailPage.tsx`: nuovo bottone "Misurazioni" nella griglia quick actions

---

## 2. [COMPLETATA] Card "Prossimo appuntamento" nella UserDietPage

### Nessuna tabella nuova
Usa la tabella `appointments` gia' esistente.

### Frontend
**Modifica `UserDietPage.tsx`**:
- Query per il prossimo appuntamento con status `scheduled` e `starts_at > now()`
- Nuova card con icona CalendarDays, titolo appuntamento, data/ora formattata in italiano
- Stile: `border-primary/20 bg-primary/5`
- Visibile SOLO se esiste un appuntamento futuro

---

## 3. [COMPLETATA] Badge messaggi non letti nella UserBottomNav

### Nessuna tabella nuova
Usa la tabella `messages` gia' esistente.

### Frontend
**Modifica `UserBottomNav.tsx`**:
- Conteggio messaggi non letti con query `messages WHERE receiver_id = user.id AND read_at IS NULL`
- Sottoscrizione realtime su `messages` per aggiornamento live
- Badge rosso sovrapposto all'icona "Profilo"
- Visibile solo se `unreadCount > 0`

---

## Stato

Tutte e 3 le feature sono state implementate e deployate.
- Migration DB body_measurements: deployata
- Pagine UserMeasurementsPage + ProClientMeasurementsPage: create
- Card prossimo appuntamento in UserDietPage: aggiunta
- Badge non letti in UserBottomNav: aggiunto con realtime subscription
- Route e navigazione in App.tsx: aggiornate
