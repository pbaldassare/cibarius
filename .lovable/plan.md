

# Piano: Preferiti su prodotti e ricette con accesso rapido nei Pasti

## Cosa costruire

Un sistema di "preferiti" (cuoricino) su **prodotti** e **ricette template** che l'utente può salvare. Ogni preferito è associato a uno o più tipi di pasto (colazione/pranzo/cena/spuntino). Nella pagina Pasti, i preferiti appaiono come suggerimenti rapidi per registrare velocemente un alimento.

## Database

Nuova tabella `user_favorites`:

```sql
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL, -- 'product' | 'template_recipe'
  item_id uuid NOT NULL,
  meal_types jsonb NOT NULL DEFAULT '[]', -- es. ["colazione","pranzo"]
  item_snapshot jsonb DEFAULT '{}', -- nome, kcal, macro cached
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User owns favorites"
  ON public.user_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- `item_snapshot` salva nome/kcal/macro per visualizzazione veloce senza join
- `meal_types` è un array JSON con i tipi di pasto associati

## Modifiche UI

### 1. `MealRecipeCard.tsx` — Aggiungere cuoricino
- Nuova prop opzionale: `isFavorite`, `onToggleFavorite`
- Icona Heart (piena se preferito, vuota se no) nel header della card accanto al titolo
- Al click, toggle nel DB

### 2. `UserActivePlanPage.tsx` — Cuoricino sulle ricette suggerite
- Fetch `user_favorites` dell'utente al mount (dove `item_type = 'template_recipe'`)
- Passare `isFavorite` e `onToggleFavorite` a ogni `MealRecipeCard`
- Al toggle: upsert/delete su `user_favorites` con `meal_types` = [meal_type corrente della ricetta]

### 3. `ProductCard.tsx` — Aggiungere cuoricino (opzionale)
- Nuova prop `isFavorite`, `onToggleFavorite`
- Heart icon accanto allo score

### 4. `PastiPage.tsx` — Sezione "Preferiti" per ogni pasto
- Fetch `user_favorites` dell'utente
- Per ogni meal_type, sotto il bottone "+ Aggiungi", mostrare i preferiti filtrati per quel `meal_type` in `meal_types`
- Card compatte con nome, kcal, bottone "+" per registrare istantaneamente (crea meal_item con i dati dallo snapshot)
- Distinguere visivamente prodotti vs ricette (icona diversa)

### 5. `AddFoodFlow.tsx` — Cuoricino nella summary
- Nella schermata di riepilogo prodotto (step "summary"), aggiungere un cuoricino per salvare come preferito
- Mostrare un mini-selector dei meal_types associati

## Flusso utente

1. L'utente vede una ricetta nel Piano → clicca il cuoricino → diventa preferita per quel tipo di pasto
2. Va nella pagina Pasti → sotto ogni pasto vede i suoi preferiti → un tap per registrare
3. Può anche marcare come preferito un prodotto durante l'aggiunta alimento

## File coinvolti

| File | Azione |
|---|---|
| Migration SQL | Creare tabella `user_favorites` con RLS |
| `src/components/MealRecipeCard.tsx` | Aggiungere Heart icon con props favorite |
| `src/components/ProductCard.tsx` | Aggiungere Heart icon con props favorite |
| `src/pages/UserActivePlanPage.tsx` | Fetch favorites, passare props a MealRecipeCard |
| `src/pages/PastiPage.tsx` | Fetch favorites, mostrare sezione preferiti per meal_type |
| `src/components/AddFoodFlow.tsx` | Cuoricino nella summary step |

