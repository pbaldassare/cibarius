

## Aggiungere Peso Netto all'etichetta HACCP

### Cosa faremo

Aggiungiamo il campo "Peso netto" (obbligatorio per normativa EU 1169/2011) all'etichetta HACCP. Il dato verrà salvato in database, inserito durante il flusso di aggiunta prodotto, e visualizzato sull'etichetta stampata.

### Modifiche

**1. Database — nuova colonna `net_weight_g` su `inventory_items`**
- Migrazione: `ALTER TABLE inventory_items ADD COLUMN net_weight_g numeric;`
- Tipo numeric per gestire grammi con decimali (es. 250, 1500, 0.5)

**2. `RestaurantLabel.tsx` — mostrare peso netto sull'etichetta**
- Aggiungere `netWeightG?: number` a `LabelData`
- In `buildLabelHtml`, aggiungere riga "PESO NETTO: Xg" (o kg se ≥1000g) nel footer, prima del lotto
- Formattazione automatica: <1000g → "250 g", ≥1000g → "1,5 kg"

**3. `RestaurantAddFlow.tsx` — campo input peso netto**
- Aggiungere campo numerico "Peso netto (g)" nel form di modifica prodotto (step "edit")
- Salvare il valore in `net_weight_g` durante l'insert su `inventory_items`
- Passare il valore a `LabelData` per l'anteprima etichetta

**4. `RestaurantItemPage.tsx` — mostrare peso netto nel dettaglio**
- Leggere `net_weight_g` dalla query e passarlo a `LabelData`

### File modificati
- `supabase/migrations/` — nuova migrazione per colonna `net_weight_g`
- `src/components/RestaurantLabel.tsx`
- `src/components/RestaurantAddFlow.tsx`
- `src/pages/restaurant/RestaurantItemPage.tsx`

