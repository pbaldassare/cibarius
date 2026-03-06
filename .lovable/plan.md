

# Piano: Sistema etichettatura e analisi foto ristorante

## Panoramica
Creare un flusso dedicato per i ristoranti che analizza foto (singolo prodotto, DDT, elenco prodotti), cataloga i risultati come prodotti o preparati con tutti i dati operativi (lotto, chef life, allergeni, conservazione, scadenza), e genera etichette stampabili 2x3cm con QR code. Il flusso utente resta invariato.

## Cosa esiste gia
- `AddFoodFlow`: wizard per aggiungere prodotti (foto AI, scan, ricerca, manuale) - focalizzato su macro/nutrienti
- `analyze-food-photos` edge function: estrae dati nutrizionali da foto con Gemini
- `PreparationsPage`: gestione preparazioni con label_code, allergeni, ingredienti, use_by_date
- Tabelle: `inventory_items`, `preparations`, `preparation_allergens`, `preparation_ingredients`, `allergens`, `products`

## Cosa manca
- Campi `lot_number` e `chef_life_hours` su `inventory_items` e `preparations`
- Edge function dedicata ristorante che riconosce il TIPO di foto (prodotto singolo, DDT, elenco) e estrae dati operativi (no macro focus)
- Flusso UI ristorante post-analisi: decidere se prodotto o preparato, assegnare storage/scadenza/lotto/allergeni
- Generatore etichette PDF 2x3cm con QR code
- Pagina dettaglio prodotto/preparato raggiungibile da QR

---

## Modifiche DB

### Migrazione SQL
```sql
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lot_number text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS chef_life_hours integer;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS production_date date;

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS lot_number text;
ALTER TABLE preparations ADD COLUMN IF NOT EXISTS chef_life_hours integer;
ALTER TABLE preparations ADD COLUMN IF NOT EXISTS production_date date;

NOTIFY pgrst, 'reload schema';
```

---

## Nuova Edge Function: `analyze-restaurant-photos`

Prompt specifico per ristoranti che:
1. Identifica il **tipo di documento**: `single_product`, `ddt`, `product_list`
2. Per ogni prodotto trovato estrae: nome, quantita, peso, unita, lotto, scadenza, data produzione, conservazione suggerita, chef life suggerita, allergeni
3. NON si concentra su macronutrienti
4. Per DDT: estrae fornitore, data documento, lista prodotti
5. Usa tool calling per output strutturato

Schema output:
```
{
  doc_type: "single_product" | "ddt" | "product_list",
  supplier?: { name, date },
  items: [{
    name, brand?, quantity, unit, weight_g?,
    lot_number?, expiry_date?, production_date?,
    storage_hint, chef_life_hours?,
    allergens: string[],
    category?
  }]
}
```

---

## Nuovo componente: `RestaurantAddFlow`

Wizard dedicato ristorante (sostituisce `AddFoodFlow` nel contesto ristorante):

### Step 1: Foto
- Stessa UI multi-foto (1-5 foto), ma testo contestualizzato: "Scatta foto del prodotto, DDT o elenco prodotti"

### Step 2: Risultati AI
- Mostra tipo documento rilevato (badge)
- Se DDT/lista: mostra lista prodotti trovati, ognuno con checkbox per selezionare quali importare
- Se singolo prodotto: mostra direttamente il riepilogo

### Step 3: Per ogni prodotto - conferma/modifica
- **Nome** (editabile)
- **Tipo**: Prodotto o Preparato (toggle)
- **Conservazione**: Dispensa/Frigo/Congelatore
- **Scadenza** (date picker)
- **Chef Life** (ore, con suggerimenti: 24h, 48h, 72h)
- **Data produzione** (date picker)
- **Lotto** (testo, pre-compilato da AI se trovato)
- **Quantita e peso**
- **Allergeni** (multi-select dalle allergen table)

### Step 4: Etichetta
- Anteprima etichetta 2x3cm
- Pulsanti "Salva" e "Stampa PDF"

---

## Generatore etichette: `RestaurantLabel`

Componente che genera un'etichetta simile a quella nella foto:
- Dimensione: 2cm x 3cm (circa 57x85 punti a 72dpi)
- Contenuto:
  - Nome prodotto
  - Ingredienti (se preparato)
  - QR code (generato client-side con libreria JS, punta a `/restaurant/item/{id}`)
  - Data produzione
  - Data scadenza
  - Conservazione
  - Lotto
- Export PDF con layout ottimizzato per stampa (foglio A4 con griglia di etichette, o singola etichetta)
- Libreria QR: `qrcode` (da installare)

---

## Pagina dettaglio item: `/restaurant/item/:id`

Pagina raggiungibile dal QR code che mostra tutti i dettagli del prodotto/preparazione (nome, scadenza, lotto, allergeni, conservazione, chef life). Accessibile solo dal ristorante proprietario.

---

## Integrazione nello scadenziario

I prodotti e preparati creati con questo flusso vanno automaticamente nello scadenziario esistente (gia funzionante in `RestaurantPage` e `InventoryList`).

---

## File coinvolti

| File | Azione |
|------|--------|
| Migrazione SQL | `lot_number`, `chef_life_hours`, `production_date` su inventory_items e preparations |
| `supabase/functions/analyze-restaurant-photos/index.ts` | **Nuova** edge function con prompt ristorante |
| `src/components/RestaurantAddFlow.tsx` | **Nuovo** wizard dedicato ristorante |
| `src/components/RestaurantLabel.tsx` | **Nuovo** generatore etichette con QR |
| `src/pages/restaurant/RestaurantItemPage.tsx` | **Nuova** pagina dettaglio item (QR target) |
| `src/pages/restaurant/RestaurantPage.tsx` | Usare `RestaurantAddFlow` al posto di `AddFoodFlow` |
| `src/App.tsx` | Aggiungere route `/restaurant/item/:id` |
| `supabase/config.toml` | Aggiungere `analyze-restaurant-photos` |
| `package.json` | Aggiungere dipendenza `qrcode` |
| `src/integrations/supabase/types.ts` | Auto-aggiornato dopo migrazione |

---

## Dipendenza da installare

- `qrcode` + `@types/qrcode` - per generare QR code client-side nelle etichette

