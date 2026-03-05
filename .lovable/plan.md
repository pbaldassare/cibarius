

# Analisi Pasto da Foto (IA + Macro)

## Approccio generale

Riutilizzare dove possibile le strutture esistenti:
- **`food_templates`** (120+ alimenti) come database ingredienti base — ha gia' `calories_100g`, `protein_100g`, `carbs_100g`, `fats_100g`, `name`, `category`, `keywords`. Aggiungo colonna `source` e `kcal_100g` (alias di calories_100g gia' presente).
- **`meal_days` / `meals` / `meal_items`** per il salvataggio nel diario — gia' funzionante con PastiPage.
- Creo solo le tabelle nuove necessarie: `dishes` e `dish_ingredients` per la cache piatti.
- Creo una nuova edge function `analyze-meal-photo` dedicata.
- Creo una nuova pagina `MealPhotoPage` con tutto il flow UI.

---

## 1. Database — Migrazioni

### 1a. Aggiungere colonna `source` a `food_templates`
```sql
ALTER TABLE food_templates ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE food_templates ADD COLUMN IF NOT EXISTS external_ref text;
```

### 1b. Tabella `dishes` (cache piatti riconosciuti)
```sql
CREATE TABLE dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  canonical_name text,
  photo_example_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads dishes" ON dishes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated inserts dishes" ON dishes FOR INSERT TO authenticated WITH CHECK (true);
```

### 1c. Tabella `dish_ingredients` (ricetta base del piatto)
```sql
CREATE TABLE dish_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid REFERENCES dishes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES food_templates(id) ON DELETE CASCADE NOT NULL,
  grams_in_standard_portion numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dish_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads dish_ingredients" ON dish_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated inserts dish_ingredients" ON dish_ingredients FOR INSERT TO authenticated WITH CHECK (true);
```

### 1d. Aggiungere `photo_url` a `meal_items` (per salvare la foto del piatto)
```sql
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS dish_name text;
```

Non creo tabelle `meal_logs` / `meal_log_ingredients` separate — uso il sistema meal esistente che gia' funziona con PastiPage. Ogni ingrediente del piatto viene salvato come `meal_item` separato dentro lo stesso `meal`, con `dish_name` per raggrupparli.

---

## 2. Edge Function `analyze-meal-photo`

**File**: `supabase/functions/analyze-meal-photo/index.ts`

**Input**: `{ image_base64, mime_type, meal_type, notes? }`

**Logica**:
1. Chiama Lovable AI (gemini-3-flash-preview) con tool calling
2. Prompt specifico per piatti cucinati: "Riconosci il piatto, scomponi in ingredienti base con grammature"
3. Tool schema output:
   - `detected_dish_name` (string)
   - `confidence` ("high" | "medium" | "low")
   - `suggested_portion_g` (number)
   - `ingredients_suggested`: array di `{ ingredient_name, grams }`

**Non** fa lookup DB — quello lo fa il frontend/client per semplicita'. L'IA restituisce solo nomi e grammi.

**Config**: aggiungere a `supabase/config.toml`:
```toml
[functions.analyze-meal-photo]
verify_jwt = false
```

---

## 3. Pagina UI `MealPhotoPage`

**File**: `src/pages/MealPhotoPage.tsx`

**Route**: `/meals/photo` dentro UserLayout

**Flow a step**:

### Step 1 — Upload + Config
- Upload foto (camera/gallery) con preview
- Selettore pasto: colazione/pranzo/cena/spuntino (chip pills)
- Campo "Note" opzionale
- Bottone "Analizza foto" → chiama edge function

### Step 2 — Risultati (dopo analisi)
- Preview foto
- Nome piatto (editabile, input)
- Badge confidenza (alta=verde, media=giallo, bassa=rosso)
- Se bassa: warning "Controlla ingredienti e porzione prima di salvare"
- **Slider/input "Porzione totale (g)"** con default dall'IA
  - Quando cambia → scala tutti gli ingredienti proporzionalmente
- **Tabella ingredienti** (modificabile):
  - Per ogni riga: nome ingrediente (autocomplete da `food_templates`), grammi (input numerico), macro calcolati (P/C/G/kcal), bottone rimuovi
  - Bottone "Aggiungi ingrediente" in fondo
- **Sezione totali macro**: Kcal, Proteine, Carbo, Grassi — ricalcolati in tempo reale
- Bottone "Salva nel diario"

### Logica macro
- Per ogni ingrediente, cerca match in `food_templates` (fuzzy per nome/keywords)
- `macro_ingrediente = (macro_per_100g × grams) / 100`
- Totali = somma di tutti gli ingredienti
- Scaling porzione: `new_grams_i = old_grams_i × (new_portion / old_portion)`

### Salvataggio
1. Upload foto su storage `media/meals/{uid}/{timestamp}.jpg`
2. Get/create `meal_day` per oggi
3. Get/create `meal` per il tipo selezionato
4. Per ogni ingrediente → insert `meal_item` con:
   - `custom_name` = nome ingrediente
   - `source_type` = "custom"
   - `quantity` = grammi
   - `calories` = kcal calcolate
   - `macros` = { protein, carbs, fats }
   - `photo_url` = url foto (sul primo item)
   - `dish_name` = nome piatto riconosciuto
5. Upsert `dishes` + `dish_ingredients` per cache

---

## 4. Routing

**File**: `src/App.tsx` — aggiungere dentro UserLayout:
```tsx
<Route path="/meals/photo" element={<MealPhotoPage />} />
```

---

## 5. Accesso dalla UI

Aggiungere un bottone nella pagina Pasti (`PastiPage.tsx`) accanto ad "Aggiungi":
- Icona Camera + "Foto AI"
- Naviga a `/meals/photo`

---

## File coinvolti

| File | Azione |
|------|--------|
| Migrazione SQL | 4 alterazioni + 2 nuove tabelle |
| `supabase/config.toml` | Aggiungere funzione |
| `supabase/functions/analyze-meal-photo/index.ts` | Nuova edge function |
| `src/pages/MealPhotoPage.tsx` | Nuova pagina (flow completo) |
| `src/App.tsx` | Aggiungere route |
| `src/pages/PastiPage.tsx` | Aggiungere bottone "Foto AI" |

