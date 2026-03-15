

## Piano: Tab default intelligente nella pagina Scadenze

### Problema
Il tab attivo di default è sempre "Scaduti" (`expired`), anche quando non ci sono prodotti scaduti. L'utente vuole che il default sia "In scadenza" (`expiring`), e solo se ci sono prodotti scaduti allora mostrare "Scaduti".

### Soluzione
Aggiungere un `useEffect` in `src/pages/ExpiryPage.tsx` che, dopo il caricamento degli items, imposta `activeTab` su `"expired"` solo se ci sono prodotti scaduti, altrimenti su `"expiring"`.

### Dettagli tecnici

**File:** `src/pages/ExpiryPage.tsx`

1. Cambiare il valore iniziale di `activeTab` da `"expired"` a `"expiring"` (riga 72)
2. Aggiungere un `useEffect` dopo `tabCounts` (dopo riga 166) che, quando `items` cambia:
   - Se `tabCounts.expired > 0` → `setActiveTab("expired")`
   - Altrimenti → `setActiveTab("expiring")`
   - Eseguito solo al primo caricamento (con un ref `initialTabSet`)

Questo garantisce che l'utente veda subito i prodotti più rilevanti.

