

# 3 Nuove Funzionalita' per Cibarius

Tracking misurazioni corporee, card prossimo appuntamento, e badge messaggi non letti nella bottom nav.

---

## 1. Tracking misurazioni corporee con grafici

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
- `ProClientDetailPage.tsx`: nuovo bottone "Misurazioni" nella griglia quick actions (sostituendo la griglia 5 colonne con 6, o aggiungendo una seconda riga)

---

## 2. Card "Prossimo appuntamento" nella UserDietPage

### Nessuna tabella nuova
Usa la tabella `appointments` gia' esistente.

### Frontend
**Modifica `UserDietPage.tsx`**:
- Nel `useEffect` di caricamento, aggiungere query per il prossimo appuntamento:
  ```
  appointments WHERE client_user_id = user.id AND status = 'scheduled' AND starts_at > now()
  ORDER BY starts_at ASC LIMIT 1
  ```
- Nuova card tra la sezione "Professional card" e "Today's progress":
  - Icona CalendarDays, titolo appuntamento, data/ora formattata in italiano
  - Stile: `border-primary/20 bg-primary/5`
  - Visibile SOLO se esiste un appuntamento futuro

---

## 3. Badge messaggi non letti nella UserBottomNav

### Nessuna tabella nuova
Usa la tabella `messages` gia' esistente.

### Frontend
**Modifica `UserBottomNav.tsx`**:
- Aggiungere stato per conteggio messaggi non letti
- `useEffect` con query: `messages WHERE receiver_id = user.id AND read_at IS NULL` + count
- Sottoscrizione realtime su `messages` per aggiornamento live
- Badge rosso (pallino con numero) sovrapposto all'icona "Profilo" (o al tab che si preferisce)
- Il badge appare solo se `unreadCount > 0`
- Pallino rosso piccolo (h-4 w-4) posizionato con `absolute -top-1 -right-1` rispetto all'icona

**Dipendenze**: Necessario importare `useAuth` e `supabase` nel componente bottom nav.

---

## Riepilogo file

### Nuovi file (2)
- `src/pages/UserMeasurementsPage.tsx`
- `src/pages/pro/ProClientMeasurementsPage.tsx`
- Migration SQL (body_measurements)

### File modificati (4)
- `src/App.tsx` -- 2 nuove route (measurements)
- `src/pages/UserDietPage.tsx` -- card misurazioni + card prossimo appuntamento
- `src/pages/pro/ProClientDetailPage.tsx` -- bottone Misurazioni
- `src/components/UserBottomNav.tsx` -- badge messaggi non letti

### Ordine di implementazione
1. Migration DB (body_measurements)
2. UserMeasurementsPage + ProClientMeasurementsPage (grafici con recharts, gia' installato)
3. Card prossimo appuntamento in UserDietPage
4. Badge non letti in UserBottomNav
5. Route e navigazione in App.tsx + pagine esistenti
