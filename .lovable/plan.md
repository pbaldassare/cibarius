

# Fix: Salvataggio barcode in database

Il problema principale e' che la scansione barcode mostra correttamente i dati (da OpenFoodFacts), ma il salvataggio in database fallisce silenziosamente a causa di policy RLS e mancanza di error handling.

---

## Problemi identificati

### 1. RLS `Products update by admin`
La tabella `products` ha una policy UPDATE solo per admin. Quando un utente normale scansiona un barcode gia' presente, l'update fallisce silenziosamente e `productId` non viene impostato.

### 2. Nessun error handling nel barcode handler
Le chiamate Supabase in `handleBarcode` (righe 307-331) non controllano gli errori. Se l'insert o update fallisce, il flusso continua come se tutto fosse ok.

### 3. Conflitto barcode duplicato
Se il prodotto esiste gia' con quel barcode ma l'utente non puo' fare update, il successivo insert in `handleSave` potrebbe creare un duplicato o fallire.

---

## Soluzione

### File: `src/components/AddFoodFlow.tsx`

**handleBarcode** (righe 298-351):
- Aggiungere error handling su tutte le chiamate Supabase
- Se l'update fallisce per RLS, usare comunque l'`id` del prodotto esistente (il prodotto e' gia' nel DB, non serve aggiornarlo per poterlo usare)
- Loggare errori in console per debug

**handleSave** (righe 511+):
- Nella sezione "Ensure product exists", aggiungere gestione del caso in cui il prodotto con quel barcode esiste gia' ma non e' stato trovato prima
- Usare `upsert` o catch duplicati

### File: Migration SQL (opzionale ma consigliata)
- Aggiungere policy `Products update by creator`: permettere a qualsiasi utente autenticato di aggiornare i prodotti (dato che non c'e' un `created_by` sulla tabella, la soluzione piu' semplice e' aprire l'update a tutti gli autenticati, come gia' fatto per insert/select)

```sql
DROP POLICY IF EXISTS "Products update by admin" ON public.products;
CREATE POLICY "Products update by authenticated"
  ON public.products FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Riepilogo modifiche

### File modificati (2)
- `src/components/AddFoodFlow.tsx` -- error handling in handleBarcode + handleSelectSearchProduct + handleSave
- Migration SQL -- policy update prodotti aperta agli autenticati

### Ordine
1. Migration SQL (sblocca l'update prodotti)
2. Error handling nel codice (previene fallimenti silenziosi)
