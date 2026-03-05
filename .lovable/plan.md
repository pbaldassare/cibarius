

# Piano: Motore Nutrizionale con USDA API

## Stato attuale

Gia' presenti:
- `food_templates` (120+ alimenti con macro per 100g)
- `dishes` / `dish_ingredients` (cache piatti)
- `meal_days` / `meals` / `meal_items` (diario)
- Edge function `analyze-meal-photo` (solo AI vision, nessun DB lookup)
- Edge function `search-food` (gia' integra USDA API con `USDA_API_KEY` secret)
- `MealPhotoPage.tsx` con UI completa
- `IngredientAutocomplete.tsx` (cerca in `food_templates`)

## Cosa manca

1. **Tabella `ingredients`** dedicata con campi USDA (`usda_fdc_id`, `name_en`, `source`)
2. **Tabella `ingredient_translation`** per mapping IT→EN con seed data
3. **Tabelle `meal_logs` / `meal_log_ingredients`** per diario semplificato (l'utente le vuole esplicitamente separate dal sistema `meal_days/meals/meal_items`)
4. **USDA lookup automatico** nell'edge function: per ogni ingrediente suggerito dall'IA, cercare nel DB locale → se non trovato, tradurre IT→EN → chiamare USDA → salvare in `ingredients`
5. **Frontend aggiornato** per usare `ingredients` + `meal_logs`

## 1. Database — Migrazione

### Nuove tabelle

```sql
-- ingredients (alimenti base con macro e USDA)
CREATE TABLE ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  name_en text,
  category text,
  carbs_per_100g numeric NOT NULL DEFAULT 0,
  protein_per_100g numeric NOT NULL DEFAULT 0,
  fat_per_100g numeric NOT NULL DEFAULT 0,
  kcal_per_100g numeric NOT NULL DEFAULT 0,
  usda_fdc_id text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- ingredient_translation (mapping IT→EN)
CREATE TABLE ingredient_translation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_it text UNIQUE NOT NULL,
  name_en text NOT NULL
);

-- meal_logs (diario utente)
CREATE TABLE meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_type text NOT NULL,
  dish_name text,
  portion_g numeric,
  carbs_g numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  kcal numeric DEFAULT 0,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- meal_log_ingredients (snapshot ingredienti)
CREATE TABLE meal_log_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid REFERENCES meal_logs(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id),
  grams numeric NOT NULL DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  kcal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### Seed data `ingredient_translation`

23 mappings: riso→rice, pasta→pasta, pane→bread, petto di pollo→chicken breast, manzo→beef, maiale→pork, salmone→salmon, tonno→tuna, uova→egg, latte→milk, mozzarella→mozzarella cheese, parmigiano→parmesan cheese, burro→butter, olio extravergine→olive oil, pomodoro→tomato, passata→tomato sauce, patate→potato, zucchine→zucchini, melanzane→eggplant, carote→carrot, cipolla→onion, aglio→garlic, riso basmati→basmati rice.

### RLS policies

- `ingredients`: SELECT per tutti authenticated, INSERT/UPDATE per authenticated
- `ingredient_translation`: SELECT per tutti authenticated
- `meal_logs`: ALL per `user_id = auth.uid()`
- `meal_log_ingredients`: ALL tramite join su `meal_logs` con owner check

## 2. Edge Function `analyze-meal-photo` — Aggiornamento

Logica aggiornata:

1. AI vision → `dish_name`, `confidence`, `ingredients_suggested`
2. **Per ogni ingrediente suggerito:**
   - Cerca in `ingredients` per nome (ilike)
   - Se trovato → usa macro dal DB
   - Se non trovato:
     a. Cerca traduzione in `ingredient_translation`
     b. Chiama USDA API (`/fdc/v1/foods/search`) con nome inglese
     c. Estrai Protein (1003), Fat (1004), Carbs (1005), Energy (1008)
     d. Salva nuovo record in `ingredients` con `source='usda'`
     e. Se USDA fallisce, segna `source='estimated'`
3. Calcola macro per ogni ingrediente: `macro_per_100g × grams / 100`
4. Calcola totali
5. Restituisci JSON completo con macro gia' calcolati

Output arricchito:
```json
{
  "dish_name": "...",
  "confidence": "high",
  "portion_g": 350,
  "ingredients": [
    { "ingredient_id": "uuid", "name": "Pasta secca", "grams": 180, 
      "per100": { "carbs": 71, "protein": 13, "fat": 1.5, "kcal": 356 },
      "carbs": 127.8, "protein": 23.4, "fat": 2.7, "kcal": 640.8 }
  ],
  "totals": { "carbs": ..., "protein": ..., "fat": ..., "kcal": ... }
}
```

La funzione usa `createClient` di Supabase con `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` per le query DB.

## 3. Frontend `MealPhotoPage` — Aggiornamento

- Dopo analisi, i dati arrivano gia' con macro calcolati dall'edge function
- `IngredientAutocomplete` cerca ora anche in `ingredients` (oltre a `food_templates`)
- Salvataggio scrive su `meal_logs` + `meal_log_ingredients` (non piu' su `meal_items`)
- Cache dish rimane su `dishes` + `dish_ingredients`

## 4. File coinvolti

| File | Azione |
|------|--------|
| Migrazione SQL | 4 nuove tabelle + seed data + RLS |
| `supabase/functions/analyze-meal-photo/index.ts` | Aggiungere DB lookup + USDA fallback + calcolo macro |
| `src/pages/MealPhotoPage.tsx` | Usare dati arricchiti, salvare su `meal_logs` |
| `src/components/IngredientAutocomplete.tsx` | Cercare anche in `ingredients` |

