

# Freccia indietro su tutte le pagine

## Situazione attuale

La maggior parte delle pagine usa `MobileHeader` che ha gia' `showBack={true}` di default — quindi la freccia indietro c'e'.

Le pagine che **non** hanno la freccia indietro su mobile sono:

1. **RestaurantAdminLayout** (4 pagine: Panoramica, Settings, Staff, Report) — l'header mobile mostra solo logo e nome ristorante, senza freccia indietro
2. **AdminLayout** (4 pagine: Dashboard, Users, Settings, Seed) — stesso problema
3. **Home utente** (`Index.tsx`) — `showBack={false}` intenzionalmente (e' la pagina iniziale, non c'e' dove tornare)

## Interventi

### 1. `RestaurantAdminLayout` — aggiungere freccia indietro nell'header mobile

Nell'header mobile (riga 79-82), aggiungere un bottone con `ChevronLeft` che chiama `navigate(-1)`. Posizionato a sinistra del logo.

### 2. `AdminLayout` — aggiungere freccia indietro nell'header mobile

Stessa modifica: aggiungere freccia indietro nell'header mobile dell'admin.

### 3. Home — lasciare com'e'

La Home e' il punto di partenza, la freccia indietro non ha senso li'.

## File coinvolti

| File | Modifica |
|------|----------|
| `src/components/RestaurantAdminLayout.tsx` | Aggiungere bottone back nell'header mobile |
| `src/components/AdminLayout.tsx` | Aggiungere bottone back nell'header mobile |

