## 1. Conteggi card Home (Frigo / Congelatore / Dispensa)

### Stato attuale
- `Index.tsx` già fa `setItems(...)` dentro `fetchItems()` e i conteggi nelle 3 card (`items.filter(i => i.storage_type === key).length`) sono derivati da `items` via render diretto.
- Aggiornamento attivo per due vie:
  - `<AddFoodFlow ... onComplete={fetchItems} />` → al salvataggio richiama `fetchItems()`.
  - Subscription Realtime su `inventory_items` filtrata per `owner_user_id` → richiama anch'essa `fetchItems()`.

### Conclusione
La logica c'è già. I conteggi si aggiornano senza ricarica. Per renderlo visibile e robusto:
- Aggiungere un piccolo `transition` sulle card per evidenziare il cambio numero (visivo).
- Aggiungere un fallback: dopo il `onComplete` di `AddFoodFlow` chiamare `fetchItems()` con `await` (oggi non è awaited) — in pratica già funziona, ma garantisce che, in caso il realtime sia lento, l'utente veda subito il nuovo numero senza dover aspettare il debounce di Postgres changes.

Nessuna ulteriore modifica necessaria in DB o logica.

## 2. Swipe per eliminare in /expiry (navbar Scadenze)

### Problema
La pagina `ExpiryPage.tsx` mostra ogni elemento come `<button>` (riga ~398-456). Non c'è gesto swipe. Solo il "selection mode" multi-select con bulk delete è disponibile.

### Soluzione
Riusare il pattern `SwipeableItem` già presente in `Index.tsx` (riga 75-115) estraendolo in un componente condiviso e applicandolo ai card item della lista in `ExpiryPage.tsx`.

Passi:
1. **Estrarre** `SwipeableItem` in `src/components/SwipeableItem.tsx` (touch + mouse pointer events per supportare anche desktop trackpad/click-drag).
2. **Aggiornare** `Index.tsx` per importarlo dal nuovo file (rimuovere copia locale).
3. **Avvolgere** in `ExpiryPage.tsx` ogni `<button>` item (riga 398-456) con `<SwipeableItem itemKey onDelete={...}>`. La `onDelete` chiama:
   ```ts
   await supabase.from("inventory_items").delete().eq("id", item.id);
   toast({ title: "Eliminato ✓" });
   fetchItems();
   ```
4. Disabilitare lo swipe quando `selectionMode === true` (passare prop `disabled`).
5. Lo sfondo rosso con icona Trash2 viene già mostrato dal componente.

### File modificati
- `src/components/SwipeableItem.tsx` (nuovo)
- `src/pages/Index.tsx` (importa, niente più copia inline)
- `src/pages/ExpiryPage.tsx` (wrap items + handler delete)

### Nessun cambio DB
RLS già permette delete su `inventory_items` per `owner_user_id = auth.uid()`.
