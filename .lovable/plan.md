

## Spostare sezione nutrizionista nel Piano + Disattivazione piano

### Problema
1. La sezione "Il tuo nutrizionista" / "Collega un nutrizionista" è nel Profilo ma dovrebbe stare nella pagina Piano (`UserDietPage`)
2. Non c'è modo di disattivare il piano attivo per sceglierne un altro

### Modifiche

**File 1: `src/pages/ProfiloPage.tsx`**
- Rimuovere l'intero blocco "Nutrizionista card" (righe ~504-586) — la sezione con "Il tuo nutrizionista", il coach collegato, "Collega un nutrizionista", "Revoca accesso", "Passa a Plus"
- Rimuovere lo state e la logica collegata (`proLink`, `proProfile`, `proProfessionalProfile`, `loadingPro`, `hasPlan`, `proCoupon`, `coachDialogOpen`, `revokeAccess`, `loadProLink`) che non serve più altrove nella pagina

**File 2: `src/pages/UserDietPage.tsx`**
- **Nella vista con piano attivo** (dopo il Professional Card, riga ~1037): aggiungere un pulsante "Disattiva piano" che apre un `AlertDialog` di conferma
  - Testo: "Vuoi disattivare il piano attuale? Potrai sceglierne uno nuovo."
  - Su conferma: `UPDATE diet_plans SET is_active = false WHERE id = plan.id`, poi `loadData()` per tornare alla selezione template
- **Nella vista con piano attivo (self-plan)**: mostrare anche lì il pulsante disattiva sotto i template
- **Aggiungere sezione "Collega un nutrizionista"** visibile sia con piano attivo che senza, sotto i template/azioni — card semplice con link a `/invite` (già presente nella vista senza piano, va aggiunta anche nella vista con piano attivo)

### Flusso risultante
- Piano attivo → l'utente vede il piano + pulsante "Disattiva piano" → popup conferma → disattiva → torna alla selezione template
- Sezione nutrizionista sempre visibile nella pagina Piano, non più nel Profilo

