

# Fix: Bottone Foto AI in AddFoodFlow → naviga a MealPhotoPage

## Problema

L'utente apre "Aggiungi alimento" (AddFoodFlow) e vede l'opzione "Foto AI", ma questa usa il vecchio flow interno di AddFoodFlow (pensato per scansione prodotti). La nuova pagina dedicata `MealPhotoPage` (`/meals/photo`) con analisi piatto, ingredienti e macro non e' raggiungibile da li'.

## Soluzione

Quando il contesto e' `meal`, il click su "Foto AI" in AddFoodFlow deve:
1. Chiudere lo sheet
2. Navigare a `/meals/photo`

Cosi' l'utente accede direttamente alla pagina dedicata con breakdown ingredienti, scaling porzione e salvataggio nel diario.

## File coinvolti

| File | Modifica |
|------|----------|
| `src/components/AddFoodFlow.tsx` | Nel click handler di "Foto AI" (riga ~836), se `context === "meal"`, chiudere sheet e `navigate("/meals/photo")` invece di `selectMethod("photo_ai")` |

Una modifica di ~4 righe.

