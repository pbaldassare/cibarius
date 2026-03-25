

## Etichetta HACCP Professionale con Galleria Foto e Export PDF

### Cosa faremo

Miglioriamo l'etichetta HACCP del ristorante per renderla simile a quella fisica nella foto: compatta, con tutti i dati HACCP obbligatori (nome, ingredienti, allergeni, date, lotto, conservazione, QR code). Il QR code punterà alla pagina di dettaglio che includerà anche una galleria di foto. Si potra visualizzare un'anteprima e stampare/scaricare come PDF.

### Modifiche al Database

1. **Nuova tabella `inventory_item_photos`** — galleria immagini per prodotti e preparazioni:
   - `id`, `item_id` (uuid), `item_type` (text: 'inventory' | 'preparation'), `photo_url` (text), `uploaded_at` (timestamptz), `uploaded_by` (uuid)
   - RLS: accesso basato sul ristorante proprietario

2. **Nuova tabella `inventory_item_allergens`** — allergeni per inventory_items (già esiste per preparations ma non per prodotti in inventario):
   - `id`, `inventory_item_id` (uuid FK → inventory_items), `allergen_id` (uuid FK → allergens)
   - RLS: stesse policy degli inventory_items

3. **Colonna `ingredients` su `inventory_items`** — per salvare gli ingredienti testuali del prodotto

4. **Storage bucket `item-photos`** — per le foto caricate

### Modifiche Frontend

**1. `RestaurantLabel.tsx` — Etichetta ridisegnata**
- Layout simile alla foto: nome prodotto in alto a sinistra, nome ristorante in alto a destra
- "INGREDIENTI:" sotto il nome
- Allergeni in grassetto integrati negli ingredienti
- DATA PRODUZIONE e DATA SCADENZA con formato gg/mm/aaaa
- CONSERVAZIONE (Ambiente/Frigo/Congelatore)
- Lotto in basso a destra vicino al QR
- QR code più grande, in basso a destra
- Aggiunta proprietà `allergens` e `restaurantName` a `LabelData`
- Funzione "Stampa" che apre finestra con layout identico ottimizzato per stampa su etichette piccole
- Nuovo bottone "Scarica PDF" che genera il PDF dell'etichetta

**2. `RestaurantAddFlow.tsx` — Salvataggio allergeni per prodotti**
- Quando si salva un prodotto (non solo preparazione), salvare anche gli allergeni nella nuova tabella `inventory_item_allergens`
- Salvare gli ingredienti nel campo `ingredients`
- Passare allergeni e ingredienti ai dati dell'etichetta
- Aggiungere possibilità di caricare foto durante l'inserimento che vanno in `item-photos`

**3. `RestaurantItemPage.tsx` — Pagina dettaglio con galleria**
- Caricare foto dalla tabella `inventory_item_photos` 
- Mostrare galleria immagini scorrevole
- Caricare allergeni anche per inventory_items (non solo preparations)
- Bottone per aggiungere nuove foto
- Anteprima etichetta migliorata con tutti i dati

**4. Generazione PDF etichetta**
- Utilizzo di `window.print()` con CSS `@page` ottimizzato per dimensioni etichetta (es. 62mm x 40mm, formato comune per etichettatrici)
- Anteprima fedele in-app prima della stampa

### Dettagli Tecnici

- Le foto vengono caricate su Supabase Storage (bucket `item-photos`) e il URL pubblico salvato in `inventory_item_photos`
- Il QR code nella pagina dettaglio punta a `/restaurant/item/{type}-{id}` che già esiste e mostrerà anche la galleria
- L'etichetta stampata usa CSS print media queries per dimensioni fisiche precise (mm)
- Gli allergeni vengono evidenziati in grassetto nell'elenco ingredienti come da normativa EU 1169/2011

