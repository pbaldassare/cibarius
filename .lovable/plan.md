

# Compatibilita' prodotto con piano alimentare

Aggiunta di una card informativa nello step "summary" di AddFoodFlow che mostra se il prodotto e' compatibile con il piano nutrizionale attivo dell'utente (tolleranza 10%).

---

## Comportamento

Quando l'utente arriva allo step summary e ha un piano nutrizionale attivo (`diet_plans` con `is_active = true`):

1. Il sistema carica i target giornalieri dal piano + i `diet_plan_meal_targets` per il pasto selezionato
2. Calcola quanto l'utente ha gia' consumato oggi (da `meal_days` -> `meals` -> `meal_items`)
3. Calcola i nutrienti rimanenti = target - consumati
4. Confronta il prodotto (alla quantita' selezionata) con i rimanenti
5. Mostra una card con verdetto:
   - **Verde "Compatibile"**: tutti i macro rientrano nel budget rimanente (+10% tolleranza)
   - **Giallo "Attenzione"**: almeno un macro sfora tra 10% e 30%
   - **Rosso "Fuori piano"**: almeno un macro sfora oltre 30%

La card si aggiorna in tempo reale quando l'utente cambia quantita'. E' solo informativa -- l'utente decide se procedere o meno.

### Esempio visivo

```text
+-------------------------------------------+
| [check verde] Compatibile col tuo piano   |
| Kcal: 320 / 450 rimanenti                 |
| Proteine: 25g / 30g  Carbo: 40g / 55g     |
+-------------------------------------------+
```

---

## Dettaglio tecnico

### Nuovo file: `src/hooks/useDietCompatibility.ts`

Hook che:
- Accetta `userId` come parametro
- Query `diet_plans` dove `client_user_id = userId` e `is_active = true` (limit 1)
- Query `diet_plan_meal_targets` per quel piano
- Query `meal_days` di oggi -> `meals` -> `meal_items` per sommare kcal/protein/carbs/fats gia' consumati
- Espone:
  - `dailyTargets: { kcal, protein, carbs, fats }` (dal piano)
  - `todayConsumed: { kcal, protein, carbs, fats }` (somma meal_items di oggi)
  - `remaining: { kcal, protein, carbs, fats }`
  - `hasPlan: boolean`
  - `loading: boolean`
  - `checkProduct(kcal, protein, carbs, fats)` -> `{ verdict: 'ok' | 'warning' | 'over', details: Array<{macro, value, remaining, over}> }`

Logica verdetto: per ogni macro, `excess = (valore - rimanente) / target_giornaliero`. Se nessun excess > 0.10 -> ok. Se qualcuno > 0.10 ma tutti < 0.30 -> warning. Se qualcuno >= 0.30 -> over.

### Modifica: `src/components/AddFoodFlow.tsx`

Nello step "summary", dopo la product hero card (riga ~1033) e prima della AI confidence indicator:
- Importare e usare `useDietCompatibility(user.id)`
- Se `hasPlan` e il prodotto ha dati nutrizionali (`computed.calories` non null), mostrare una card con:
  - Icona + verdetto colorato
  - Dettaglio per macro: valore prodotto / rimanente giornaliero
- La card usa i colori emerald (ok), amber (warning), red (over)
- Visibile per context `meal` e `inventory` (non recipe/preparation)

### Nessuna modifica al database
Usa solo tabelle esistenti: `diet_plans`, `diet_plan_meal_targets`, `meal_days`, `meals`, `meal_items`.

---

## File coinvolti

### Nuovo (1)
- `src/hooks/useDietCompatibility.ts`

### Modificato (1)
- `src/components/AddFoodFlow.tsx` -- import hook + card compatibilita' nello step summary

