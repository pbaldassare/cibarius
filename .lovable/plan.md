

# Stato attuale e piano

## Gia' implementato

Tutto il motore nutrizionale e' gia' in place:

- **Tabelle DB**: `ingredients`, `ingredient_translation` (con 23 mapping), `meal_logs`, `meal_log_ingredients` -- tutte create con RLS
- **Edge function `analyze-meal-photo`**: AI vision + lookup DB locale + traduzione IT→EN + USDA API fallback + cache in `ingredients` + calcolo macro
- **Frontend `MealPhotoPage`**: salva su `meal_logs` + `meal_log_ingredients` + backward compat su `meal_items`
- **`IngredientAutocomplete`**: cerca in `food_templates` + `ingredients`

## Cosa resta da fare

1. **Aggiornare il secret `USDA_API_KEY`** con il valore che hai fornito (`GNz6xq20Ov72IwQpscHEOkf2nfIvbtLVv3C4XpcD`). Il secret esiste gia' ma potrebbe non avere il valore corretto.

2. **Re-deploy dell'edge function** `analyze-meal-photo` per assicurarsi che usi l'ultima versione del codice (con USDA lookup).

Nessuna modifica al codice necessaria -- solo configurazione secrets e deploy.

