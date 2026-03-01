

# Miglioramenti gestione scadenze

Tre interventi: rinominare il pulsante "Risolvi", aggiungere swipe-to-delete nella lista urgenti della Home, e aggiungere eliminazione massiva nella pagina Scadenze.

---

## 1. Rinominare "Risolvi" in "Gestisci scadenze"

Il nome "Risolvi" e' troppo generico. Cambiamo in **"Gestisci scadenze"** sia nel pulsante CTA della Home che nel titolo del flow.

### File: `src/pages/Index.tsx`
- Riga 240: `Risolvi · {counts.total}` -> `Gestisci scadenze · {counts.total}`

### File: `src/components/ResolveExpiryFlow.tsx`
- Riga 296: titolo `"Risolvi scadenze"` -> `"Gestisci scadenze"`

---

## 2. Swipe-to-delete nella lista urgenti (Home)

Nella Home, i 3 elementi urgenti potranno essere eliminati con uno swipe a sinistra. Quando l'utente trascina a sinistra, appare un bottone rosso "Elimina". Al rilascio oltre la soglia, l'elemento viene cancellato dal database con un'animazione di uscita.

### File: `src/pages/Index.tsx`
- Aggiungere stato e logica touch per ogni item urgente (touchStart, touchMove, touchEnd)
- Quando `swipeX < -80px`: mostrare sfondo rosso con icona Trash2
- Al rilascio oltre soglia: eliminare da `inventory_items` o `preparations`, poi `fetchItems()`
- Animazione di collasso (height -> 0) dopo eliminazione
- Aggiungere `type` ("inv"/"prep") gia' presente nell'urgentList per sapere quale tabella colpire

---

## 3. Eliminazione massiva nella pagina Scadenze

Nella pagina Scadenze aggiungere una modalita' "selezione multipla" per eliminare piu' elementi in blocco.

### File: `src/pages/ExpiryPage.tsx`
- Aggiungere stato `selectionMode: boolean` e `selectedIds: Set<string>`
- Nell'header, un bottone "Seleziona" che attiva la modalita' selezione
- In modalita' selezione:
  - Ogni item mostra un checkbox a sinistra (al posto del color bar)
  - Tap su item toglie/aggiunge dalla selezione (invece di aprire l'action sheet)
  - Bottone "Seleziona tutti" nel header
- Barra azioni fissa in basso con:
  - Contatore: "{n} selezionati"
  - Bottone "Elimina selezionati" (rosso, con conferma dialog)
  - Bottone "Annulla" per uscire dalla modalita'
- Al click "Elimina": eliminare tutti gli item selezionati (prodotti da `inventory_items`, preparazioni da `preparations`), poi `fetchItems()`

---

## Riepilogo file

### Modificati (3)
- `src/pages/Index.tsx` -- rinomina CTA + swipe-to-delete urgenti
- `src/pages/ExpiryPage.tsx` -- selezione multipla + eliminazione massiva
- `src/components/ResolveExpiryFlow.tsx` -- rinomina titolo

