
# Piano nutrizionale dettagliato: alimenti specifici per pasto + zuccheri

## Panoramica

Attualmente il piano alimentare gestisce solo target macro per pasto (kcal, proteine, carbo, grassi). Come nell'esempio reale (stile Nutrium), un piano vero include **alimenti specifici con quantita'** per ogni pasto. Questa implementazione aggiunge:

1. **Alimenti specifici nel piano**: ogni pasto del piano conterra' una lista di cibi con nome, quantita', unita' e valori nutrizionali
2. **Zuccheri (sugars)**: nuovo macro tracciato come sottoinsieme dei carboidrati, ovunque compaiano i macro
3. **Ricerca coach**: se l'utente non ha un coach collegato, puo' cercare tra i professionisti disponibili
4. **Creazione piano autonoma**: l'utente senza coach puo' creare un proprio piano semplificato

## Modifiche al database

### Nuova tabella `diet_plan_items`

Contiene gli alimenti prescritti per ogni pasto del piano:

```text
diet_plan_items
  id              uuid PK
  diet_plan_id    uuid FK -> diet_plans
  meal_type       text (colazione, pranzo, cena, spuntino)
  food_name       text
  quantity        numeric
  unit            text (g, ml, pezzi, porzioni)
  calories        numeric
  protein_g       numeric
  carbs_g         numeric
  sugars_g        numeric (nuovo - sottoinsieme dei carbo)
  fats_g          numeric
  notes           text (es. "senza condimento", "integrale")
  sort_order      int
  created_at      timestamptz
```

### Aggiunta colonna `sugars_g` alle tabelle macro esistenti

- `diet_plan_meal_targets`: aggiungere `sugars_g numeric default 0`
- `diet_plan_template_meals`: aggiungere `sugars_g numeric default 0`
- `food_templates`: aggiungere `sugars_100g numeric default 0`

### RLS
- Professionista: CRUD completo sui `diet_plan_items` dei propri piani
- Cliente: lettura dei propri piani
- Utente senza coach: CRUD sui propri piani (dove `professional_id = user_id`)

## Modifiche frontend

### 1. `src/pages/pro/ProClientPlanPage.tsx` -- Aggiunta alimenti al piano

**Step 2 potenziato**: oltre ai target macro per pasto, il nutrizionista puo' aggiungere alimenti specifici sotto ogni pasto:
- Bottone "+ Aggiungi alimento" sotto ogni card pasto
- Ricerca inline tra `food_templates` e `products` del sistema
- Per ogni alimento: nome, quantita', unita', macro (inclusi zuccheri)
- I macro del pasto si ricalcolano automaticamente dalla somma degli alimenti inseriti
- Drag/reorder degli alimenti (sort_order)
- L'alimento mostra: nome, qty, kcal, P/C(Z)/G in una riga compatta

**Step 2 UI per singolo pasto**:
```text
  ☀️ Colazione — 450 / 450 kcal
  ┌─────────────────────────────────────┐
  │ 🥛 Latte p.s.    200ml   90 kcal   │
  │ 🍞 Fette bisc.   40g    160 kcal   │
  │ 🍯 Marmellata     20g    50 kcal   │
  │ + Aggiungi alimento                 │
  └─────────────────────────────────────┘
  P: 15g  C: 60g (Z: 25g)  G: 10g
```

### 2. `src/pages/UserDietPage.tsx` -- Vista piano con alimenti

L'utente vede il piano completo con gli alimenti prescritti per ogni pasto:
- Sotto ogni card pasto: lista degli alimenti con quantita' e macro
- Collapsible per non sovraccaricare la vista
- Per ogni alimento: nome, quantita', calorie, e un dettaglio macro espandibile
- Aggiunta degli zuccheri nella vista macro (es. "C: 60g di cui Z: 25g")

### 3. `src/pages/PastiPage.tsx` -- Zuccheri nel tracciamento

- Mostrare zuccheri nel riepilogo macro di ogni pasto (se presenti nei macros JSON)
- Nella preview modifica alimento, mostrare anche gli zuccheri stimati

### 4. `src/pages/MealsTargetsPage.tsx` -- Target zuccheri

- Aggiungere campo "Zuccheri (g)" agli obiettivi nutrizionali personali

### 5. Nuova sezione: Cerca un professionista (se non collegato)

Nella `UserDietPage.tsx`, quando non c'e' un piano attivo:
- Oltre al bottone "Collega un professionista", mostrare una lista dei professionisti disponibili
- Query su `professional_profiles` (quelli con `is_visible = true` o simile)
- Card per ogni coach: nome, specializzazione, citta', bio (troncata)
- Bottone "Contatta" che naviga alla pagina invito o apre un dialog

### 6. Creazione piano autonomo

Se l'utente non ha un coach, puo' creare un piano semplice da solo:
- Bottone "Crea il tuo piano" nella pagina dieta quando non c'e' un piano attivo
- Wizard semplificato (come ProClientPlanPage ma con `professional_id = user_id`)
- Include aggiunta alimenti specifici per pasto

## Dettagli tecnici

### File coinvolti: 6 + migration

| File | Modifica |
|------|----------|
| Migration SQL | Tabella `diet_plan_items` + `sugars_g` su tabelle esistenti |
| `src/pages/pro/ProClientPlanPage.tsx` | Step 2: alimenti per pasto con ricerca + zuccheri |
| `src/pages/UserDietPage.tsx` | Vista alimenti piano + ricerca coach + piano autonomo |
| `src/pages/PastiPage.tsx` | Zuccheri nel tracciamento |
| `src/pages/MealsTargetsPage.tsx` | Campo zuccheri |
| `src/integrations/supabase/types.ts` | Aggiornamento automatico tipi |

### Ricerca alimenti nel piano

Riutilizzare la logica di ricerca gia' presente in `AddFoodFlow` (search-food.ts + food_templates) per trovare alimenti da aggiungere al piano. Quando il pro seleziona un alimento, i macro vengono pre-compilati dal template e la quantita' e' editabile.

### Zuccheri nei macros JSON

Per i `meal_items`, i macros sono salvati come JSON (`{protein, carbs, fats}`). Aggiungere `sugars` a questo oggetto dove disponibile, senza rompere i dati esistenti. Il codice leggera' `m.sugars ?? 0` con fallback a 0.
