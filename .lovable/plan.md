

# Piano: Aggiungere opzione "Ricette dal piano" nel flusso Aggiungi Alimento

## Obiettivo
Quando l'utente ha un piano nutrizionale attivo e sta aggiungendo un pasto (`context === "meal"`), mostrare un'opzione aggiuntiva "Ricette dal piano" nella schermata di scelta metodo. Al click, mostra le ricette (`template_recipes`) filtrate per:
1. **Categoria dieta** — ricavata dal titolo del piano attivo (stessa logica `detectDietCategory` di `UserActivePlanPage`)
2. **Tipo di pasto** — il `selectedMealType` già scelto dall'utente (colazione/pranzo/cena/spuntino)

Selezionando una ricetta, gli ingredienti vengono registrati come pasto (stessa logica di `handleRegisterRecipe` in `UserActivePlanPage`).

## Modifiche su `src/components/AddFoodFlow.tsx`

### 1. Nuovo step e stato
- Aggiungere `"recipes"` al tipo `Step`
- Nuovi state: `planRecipes` (array ricette), `recipesLoading`, `activePlanTitle` (per scale female)
- Al mount (quando `open && context === "meal"`), fetch piano attivo e ricette template corrispondenti

### 2. Nuovo bottone nel metodo selector
- Dopo "Foto AI" e prima di "Scansiona barcode", aggiungere un bottone "Ricette dal piano" (icona `UtensilsCrossed` o `ChefHat`) con stile simile al bottone Foto AI ma con bordo verde/secondario
- Visibile solo se `context === "meal"` E ci sono ricette disponibili (`planRecipes.length > 0`)
- Richiede che `selectedMealType` sia già selezionato (stessa validazione degli altri metodi)

### 3. Nuovo step "recipes"
- Mostra le ricette filtrate per `selectedMealType` usando `MealRecipeCard` (già esistente)
- Applica `portionScale` se il piano è per donna (stessa logica `detectIsFemale`)
- Il bottone "Registra pasto" su ogni card chiama la logica di salvataggio:
  - Crea `meal_day` + `meal` se necessario
  - Inserisce ogni ingrediente come `meal_item` con macro scalati
  - Chiude il flow e chiama `onComplete`

### 4. Logica di salvataggio ricetta
Riutilizza la stessa logica di `handleRegisterRecipe` da `UserActivePlanPage`: per ogni ingrediente della ricetta, crea un `meal_item` con `source_type: "custom"`, `custom_name`, `calories`, `macros`, `quantity`.

## File coinvolti

| File | Azione |
|---|---|
| `src/components/AddFoodFlow.tsx` | Aggiungere step ricette, bottone nel metodo, fetch piano+ricette, salvataggio |

