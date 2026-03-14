

## Ottimizzazione IA: DB-first e altre strategie

### Problema attuale
Ogni volta che un utente scatta foto di un prodotto, l'app chiama SEMPRE l'edge function `analyze-food-photos` (Gemini Vision) anche se quel prodotto è già stato salvato nel database `products`. Questo spreca crediti IA e rallenta l'esperienza.

### Ottimizzazioni proposte

#### 1. **DB-first per barcode (nel flusso foto AI)**
Attualmente `handleAnalyzePhotos` chiama sempre l'IA, poi `fuseWithOFF` cerca su OpenFoodFacts. Ma dopo la fusione, se l'IA trova un barcode, dovremmo **prima** controllare se quel barcode esiste già in `products`.

Modifica in `src/lib/ai-food.ts` → `fuseWithOFF()`:
- Prima di chiamare OpenFoodFacts, fare una query `supabase.from("products").select(...).eq("barcode", barcode).maybeSingle()`
- Se il prodotto esiste con dati nutrizionali completi → restituire quei dati direttamente, senza chiamare OFF

#### 2. **DB-first per barcode PRIMA dell'IA (scan → skip AI)**
Nel flusso barcode scan (`handleBarcode` in AddFoodFlow), il sistema già controlla il DB locale. Ma nel flusso foto AI, l'IA viene chiamata comunque. Possiamo aggiungere un **pre-check**: se l'IA estrae un barcode, prima controlliamo il DB.

Questo è già parzialmente gestito dalla funzione `fuseWithOFF`, ma possiamo migliorare il flow.

#### 3. **Cache prodotti per nome (fuzzy match pre-IA)**
Aggiungere un controllo nel flusso foto AI nell'edge function `analyze-food-photos`:
- Dopo che l'IA restituisce il nome del prodotto, **prima** di restituire al client, controllare in `products` se esiste già un prodotto con nome simile e nutrizione completa
- Se sì, arricchire il risultato con i dati dal DB senza bisogno di OFF

#### 4. **Skip IA per barcode noti nell'edge function**
Modificare `analyze-food-photos/index.ts` per accettare un parametro opzionale `barcode`:
- Se il client ha già un barcode (dal flusso scan), passarlo all'edge function
- L'edge function controlla prima il DB → se trovato, restituisce subito senza chiamare Gemini

#### 5. **Cache locale (localStorage) per prodotti recenti**
Espandere la cache barcode esistente in `barcode.ts` per includere anche prodotti scansionati via foto AI, evitando chiamate ripetute per lo stesso prodotto.

---

### Piano di implementazione concreto

**File: `src/lib/ai-food.ts`**
- Aggiungere `lookupProductInDB(barcode: string)` che cerca in `products` prima di OFF
- Modificare `fuseWithOFF()` per usare DB-first → OFF come fallback
- Aggiungere `lookupProductByName(name: string)` per match esatto in `products`

**File: `src/components/AddFoodFlow.tsx`**
- In `handleAnalyzePhotos`, dopo aver ricevuto il risultato AI con un barcode, controllare prima il DB locale
- Se il prodotto è trovato con nutrizione completa → usare quelli e saltare OFF

**File: `supabase/functions/analyze-food-photos/index.ts`**
- Aggiungere logica DB-first: se il risultato AI include un barcode, controllare `products` prima di restituire
- Se trovato con nutrizione → arricchire il risultato AI con i dati dal DB e segnalare `source: "db_cache"`

**File: `src/lib/barcode.ts`**
- Nella cache localStorage, salvare anche prodotti AI (non solo barcode OFF)

### Risultato atteso
- Prodotti già scansionati: **0 chiamate IA** (hit da DB/cache locale)
- Prodotti con barcode noto: **0 chiamate OFF** (hit da DB)
- Prodotti nuovi: comportamento invariato (IA + OFF + salvataggio per prossime volte)

