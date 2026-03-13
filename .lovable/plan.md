

# Piano: Distinzione prodotti con/senza macronutrienti

## Panoramica

Aggiungere un campo calcolato `nutrition_available` ai prodotti per distinguere quelli utilizzabili nelle funzioni nutrizionali (con macro) da quelli utilizzabili solo per scadenze/dispensa/anti-spreco (senza macro).

## Modifiche al Database

**Migration SQL:**
- Aggiungere colonna `nutrition_available boolean NOT NULL DEFAULT false` alla tabella `products`
- Creare un trigger che imposta automaticamente `nutrition_available = true` quando `calories_100g IS NOT NULL AND calories_100g > 0`
- Aggiornare i prodotti esistenti: `UPDATE products SET nutrition_available = true WHERE calories_100g IS NOT NULL AND calories_100g > 0`

## Modifiche Frontend

### 1. Form inserimento manuale (`src/components/InventoryList.tsx`)
- I campi macro restano **facoltativi** (già lo sono)
- Dopo il salvataggio di un prodotto senza macro, mostrare un toast informativo: *"Prodotto salvato per scadenze e anti-spreco. Non sarà usato nei calcoli nutrizionali finché non avrà valori nutrizionali."*

### 2. Form AddFoodFlow (`src/components/AddFoodFlow.tsx`)
- Nel salvataggio prodotto (sia `products` che `product_submissions`), impostare `nutrition_available` in base alla presenza di `calories100g`
- Nel contesto **meal**: se il prodotto non ha macro, mostrare un avviso giallo prima del salvataggio: *"Questo prodotto non ha valori nutrizionali. Non verrà conteggiato nei macro del pasto."*
- Permettere comunque il salvataggio (non bloccante)

### 3. Visualizzazione nell'inventario (`src/components/InventoryList.tsx`)
- Aggiungere un badge "⚠️ No macro" (grigio/muted) accanto ai prodotti con `nutrition_available = false`, complementare al badge "✏️ Manuale" esistente

### 4. Filtri nelle logiche nutrizionali

**File da aggiornare per escludere prodotti senza macro:**

| File | Logica |
|------|--------|
| `src/hooks/useDietCompatibility.ts` | Già filtra su `meal_items` con calorie — nessun cambio necessario |
| `src/components/AddMealSheet.tsx` | Aggiungere filtro `.eq("nutrition_available", true)` nella ricerca prodotti per pasti |
| `src/lib/search-food.ts` | Aggiungere parametro opzionale `requireNutrition` per filtrare nella ricerca progressiva |
| `src/pages/pro/ProClientSuggestPage.tsx` | Filtrare prodotti con `nutrition_available = true` nei suggerimenti nutrizionali |

**File che NON devono filtrare** (anti-spreco / dispensa):

| File | Motivo |
|------|--------|
| `src/pages/AntiWastePage.tsx` | Anti-spreco: tutti i prodotti inclusi |
| `src/pages/UserPantryRecipesPage.tsx` | Ricette da dispensa: tutti i prodotti |
| `src/pages/ExpiryPage.tsx` | Gestione scadenze: tutti i prodotti |
| `supabase/functions/suggest-meal/index.ts` | Suggerimenti "svuota frigo": tutti i prodotti |
| `src/components/InventoryList.tsx` | Lista inventario: tutti i prodotti |

### 5. Aggiornamento tipi TypeScript
- Il file `src/integrations/supabase/types.ts` si aggiornerà automaticamente dopo la migration

## Riepilogo modifiche file

1. **Migration SQL** — aggiunta colonna + trigger + update dati esistenti
2. **`src/components/InventoryList.tsx`** — badge "No macro" + toast informativo al salvataggio manuale
3. **`src/components/AddFoodFlow.tsx`** — impostare `nutrition_available`, avviso nel contesto meal
4. **`src/components/AddMealSheet.tsx`** — filtro `.eq("nutrition_available", true)`
5. **`src/lib/search-food.ts`** — parametro opzionale per filtrare prodotti con macro
6. **`src/pages/pro/ProClientSuggestPage.tsx`** — filtro nella ricerca prodotti

