

## Tour guidato per ruolo: ristoratore e nutrizionista

### Situazione attuale
- `TOUR_STEPS` in `AppTourContext.tsx` contiene solo gli step per utente consumer
- `AppTour` e `AppTourPrompt` sono montati solo in `UserLayout`
- Il ristoratore usa `RestaurantLayout` e il professionista usa `MobileLayout` — nessuno dei due ha il tour
- I `data-tour` selectors non esistono nelle pagine restaurant/pro

### Piano

**1. Rendere `TOUR_STEPS` role-aware in `AppTourContext.tsx`**
- Creare 3 array separati: `USER_TOUR_STEPS`, `RESTAURANT_TOUR_STEPS`, `PRO_TOUR_STEPS`
- Aggiungere al context uno state `tourRole` e un metodo `startTour(role)` che seleziona gli step giusti
- Esportare una funzione `getTourSteps(role)` per accesso esterno
- `AppTour.tsx` leggerà gli step dal context dinamicamente invece che dalla costante

**2. Creare `RESTAURANT_TOUR_STEPS` (~8-10 step)**
Percorso: Dashboard → Scadenze → HACCP → Preparazioni → Bolle → Profilo
- Benvenuto nel ristorante
- Dashboard: panoramica scadenze, HACCP, preparazioni
- Aggiunta prodotti (scansione/foto)
- Scadenze e alert automatici
- Checklist HACCP e temperature
- Preparazioni ed etichette
- Bolle/fatture fornitori
- Bottom nav tabs
- Messaggio finale

**3. Creare `PRO_TOUR_STEPS` (~8-10 step)**
Percorso: Dashboard → Clienti → Report → Note → Profilo
- Benvenuto nella piattaforma Pro
- Dashboard: clienti attivi e note recenti
- Lista clienti e invito
- Dettaglio cliente: piano, monitoraggio, messaggi
- Creazione piano alimentare
- Report settimanali
- Note professionali
- Bottom nav tabs
- Messaggio finale

**4. Aggiungere `data-tour` selectors nelle pagine chiave**
- `RestaurantPage.tsx`: greeting, scadenze card, HACCP card, preparazioni card
- `RestaurantBottomNav.tsx`: tabs con data-tour
- `ProPage.tsx`: greeting, clienti card, report card
- `BottomNav.tsx`: aggiungere data-tour per i tab pro/restaurant (il componente già gestisce i ruoli)

**5. Montare `AppTour` + `AppTourPrompt` nei layout mancanti**
- `RestaurantLayout.tsx`: aggiungere `<AppTour />` e `<AppTourPrompt />`
- `MobileLayout.tsx`: aggiungere `<AppTour />` e `<AppTourPrompt />` (usato dal pro)
- Il prompt di avvio automatico controllerà il ruolo per mostrare il testo corretto

**6. Aggiornare `AppTourPrompt.tsx`**
- Passare il ruolo corrente (da `useRole`) a `startTour(role)`
- Il testo del prompt resta generico ("Vuoi fare un tour?")

**7. Aggiornare "Rivedi il tour" in `ProfiloPage.tsx`**
- Già presente per tutti i ruoli — aggiornare per passare il ruolo a `startTour(role)` così ogni ruolo rivede il proprio tour

### File modificati
- `src/components/AppTourContext.tsx` — step per ruolo, `startTour(role)`
- `src/components/AppTour.tsx` — leggere step dinamici dal context
- `src/components/AppTourPrompt.tsx` — passare ruolo
- `src/components/RestaurantLayout.tsx` — montare tour
- `src/components/MobileLayout.tsx` — montare tour
- `src/components/BottomNav.tsx` — aggiungere `data-tour` ai tab
- `src/components/RestaurantBottomNav.tsx` — aggiungere `data-tour`
- `src/pages/restaurant/RestaurantPage.tsx` — aggiungere `data-tour` selectors
- `src/pages/pro/ProPage.tsx` — aggiungere `data-tour` selectors
- `src/pages/ProfiloPage.tsx` — passare ruolo a `startTour`

