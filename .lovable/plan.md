

# Piano: Popolare 300 traduzioni + Prompt IA preciso + Logica DB-first

## Stato attuale
- `ingredient_translation` ha solo 23 righe (il seed iniziale)
- L'edge function `analyze-meal-photo` usa un prompt generico e non ha logica "dishes cache first"

## Cosa fare

### 1. Inserire ~260 nuove traduzioni in `ingredient_translation`

Useremo una migrazione SQL con `INSERT ... ON CONFLICT DO NOTHING` per aggiungere tutte le righe del CSV fornito senza duplicare quelle gia' presenti. La tabella ha `name_it` UNIQUE, quindi i conflitti vengono gestiti automaticamente.

### 2. Aggiornare il prompt IA nell'edge function

Sostituire il `systemPrompt` attuale (generico) con il prompt dettagliato fornito dall'utente, che include:
- Regole per pizza (base, salsa, mozzarella, olio, extra visibili)
- Regole per pasta (tipo pasta, condimento, formaggio)
- Regole per risotto (riso, soffritto, brodo, burro/parmigiano, ingrediente principale)
- Output JSON obbligatorio con `name_it` e `notes`

### 3. Aggiungere logica DB-first (dishes cache)

Prima di chiamare l'IA, la funzione controllera' se un piatto simile esiste gia' in `dishes` + `dish_ingredients`:
1. Se trovato → carica ingredienti dalla cache, calcola macro, restituisci subito (NO IA, NO USDA)
2. Se non trovato → chiama IA vision → arricchisci con USDA → salva in `dishes`/`dish_ingredients` per le prossime volte

Questo richiede una modifica strutturale all'handler principale dell'edge function, aggiungendo un blocco di cache lookup prima della chiamata AI e un blocco di cache write dopo l'analisi.

## File coinvolti

| File | Azione |
|------|--------|
| Migrazione SQL | INSERT ~260 righe in `ingredient_translation` |
| `supabase/functions/analyze-meal-photo/index.ts` | Nuovo prompt + logica dishes cache |

