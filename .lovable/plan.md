## Obiettivo

Nella Home, gli item nella sezione "⚠️ Attenzione oggi" attualmente non rispondono al tap (solo swipe). Devono aprire lo stesso action sheet che si apre cliccando un item nella pagina `/expiry` (Consuma / Butta / Cambia data / Cambia conservazione).

## Approccio

Riutilizzare la logica già presente in `ExpiryPage.tsx` passando l'item da aprire tramite query param, così evitiamo di duplicare l'action sheet (~150 righe di markup + handler).

### Modifiche

**1. `src/pages/Index.tsx`**
- Avvolgere ogni urgent item dentro `SwipeableItem` con un `<button>` (o `onClick` sul div) che naviga a `/expiry?openId=<item.id>`.
- Mantenere intatto lo swipe-to-delete esistente.

**2. `src/pages/ExpiryPage.tsx`**
- Leggere `openId` da `useSearchParams`.
- In un `useEffect` (quando `items` è caricato), trovare l'item corrispondente e chiamare `setActionSheet(item)` + `setNewDate(item.expiry_date ?? "")`, poi pulire il param dall'URL per evitare re-trigger.

### Risultato

Tap su un alimento in scadenza nella Home → si apre `/expiry` con l'action sheet già aperto sull'item, comportamento identico al click dalla pagina scadenze.