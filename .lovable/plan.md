

# Piano: Ricette varianti per template nutrizionali

## Schema DB

Nuova tabella `template_recipes` per le varianti di ricette collegate ai template:

```sql
CREATE TABLE template_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meal_type text NOT NULL,           -- colazione/pranzo/cena/spuntino
  diet_category text NOT NULL,       -- mediterranea/keto/digiuno/massa/dimagrimento
  instructions text,
  prep_time_min int DEFAULT 10,
  ingredients jsonb NOT NULL DEFAULT '[]',
  -- ogni ingrediente: {name, grams, kcal, protein_g, carbs_g, fats_g}
  kcal_total numeric NOT NULL DEFAULT 0,
  protein_total numeric NOT NULL DEFAULT 0,
  carbs_total numeric NOT NULL DEFAULT 0,
  fats_total numeric NOT NULL DEFAULT 0,
  portion_scale_female numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now()
);
```

**Logica chiave**: le ricette sono per *categoria* (mediterranea, keto, ecc.), non per singolo template. Le versioni uomo/donna usano la stessa ricetta con `portion_scale_female` (es. 0.8 = 80% della porzione uomo). Questo dimezza il numero di ricette necessarie.

### Categorie e mapping template

| diet_category | Template Uomo | Template Donna |
|---|---|---|
| mediterranea | Mediterranea equilibrata - Uomo | Mediterranea equilibrata - Donna |
| keto | Ketogenica - Uomo | Ketogenica - Donna |
| digiuno | Digiuno intermittente - Uomo | Digiuno intermittente - Donna |
| massa | Massa muscolare - Uomo | Massa muscolare - Donna |
| dimagrimento | Dimagrimento moderato - Uomo | Dimagrimento moderato - Donna |

### Ricette per categoria (80 totali)

Le ricette saranno semplici, con ingredienti da supermercato, macro calcolati. Esempi per tipo:

**Colazione (10 varianti)** - condivise tra mediterranea/dimagrimento, adattate per keto/massa:
- Yogurt greco con muesli e frutta fresca
- Pane integrale con ricotta e miele
- Porridge con banana e burro d'arachidi
- Uova strapazzate con pane tostato
- Smoothie proteico con latte e avena
- Pancake integrali con frutti di bosco
- Fette biscottate con marmellata e yogurt
- Toast avocado e uovo
- Cornetto integrale con spremuta
- Overnight oats con semi di chia

**Pranzo e Cena (30 varianti ciascuno)** - pasta, riso, proteine, verdure:
- Pasta al pomodoro con parmigiano
- Riso basmati con petto di pollo e verdure
- Insalata di tonno con fagioli
- Piadina con prosciutto e mozzarella
- Salmone al forno con patate
- ecc.

**Spuntino (10 varianti)**:
- Yogurt greco con frutta secca
- Barretta proteica con mandorle
- Frutta fresca con cioccolato fondente
- ecc.

Per **keto**: ricette specifiche senza cereali (uova, avocado, salmone, formaggio, noci).
Per **digiuno**: no colazione, ricette pranzo/cena/spuntino più caloriche.
Per **massa**: porzioni maggiori, focus proteine.

## Modifiche ai file

### 1. Migrazione SQL
- Crea tabella `template_recipes` con RLS (lettura per autenticati)
- INSERT di ~80 ricette con ingredienti JSON e macro calcolati
- Mapping `diet_category` al template tramite query nel frontend

### 2. `src/pages/UserActivePlanPage.tsx`
- Nella card di ogni pasto, mostrare le ricette suggerite per quel `meal_type` + `diet_category`
- Bottone "Vedi alternative" che espande/mostra un carousel/lista di ricette
- Ogni ricetta mostra: titolo, tempo, kcal, macro, ingredienti espandibili

### 3. Nuovo componente `src/components/MealRecipeCard.tsx`
- Card compatta per una ricetta: titolo, prep_time, macro bar, lista ingredienti collassabile
- Bottone "Registra" per aggiungere al diario come meal_items

### 4. `src/pages/UserDietPage.tsx`
- Mapping `diet_category` dal titolo del template attivo per passarlo alla pagina /plan

## Dettagli tecnici

- **Ingredienti JSON**: ogni ingrediente ha `name`, `grams`, `kcal`, `protein_g`, `carbs_g`, `fats_g` — pre-calcolati nella migrazione
- **Porzioni donna**: `portion_scale_female` (default 0.8) moltiplica grammi e macro al volo nel frontend
- **Riuso ricette**: mediterranea e dimagrimento condividono ~70% delle ricette (stessa `diet_category` o query su più categorie)
- **Collegamento spesa**: gli ingredienti hanno nomi standard che matchano `products`/`food_templates`, permettendo futuro collegamento alla lista della spesa

