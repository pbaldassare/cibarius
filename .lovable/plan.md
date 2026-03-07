

# Piano: Scansione QR code scontrini supermercato

## Cosa costruire

Quando l'utente scansiona un QR code dalla fotocamera e il contenuto non è un barcode prodotto (EAN/UPC numerico), ma un URL o testo strutturato (tipico degli scontrini digitali), il sistema:

1. Riconosce che è un QR da scontrino (contiene URL o testo non numerico)
2. Invia il contenuto a un edge function AI che estrae la lista prodotti
3. Mostra la lista prodotti estratta con nome, quantità e prezzo
4. L'utente può selezionare quali prodotti aggiungere all'inventario in batch

## Modifiche

### 1. Edge Function `supabase/functions/parse-receipt-qr/index.ts`

Nuova edge function che:
- Riceve `{ qr_content: string }` (URL o testo raw dal QR)
- Se è un URL, fa fetch della pagina e ne estrae il contenuto testuale
- Invia il contenuto all'AI (Lovable Gateway, gemini-3-flash) con tool calling per estrarre un array strutturato di prodotti:
  ```
  { name, quantity, unit, price, category }
  ```
- Restituisce `{ products: [...] }`

### 2. `src/components/BarcodeScanner.tsx` — Nessuna modifica

Il componente già rileva sia barcode che QR code tramite `html5-qrcode`. La callback `onDetected` restituisce il testo decodificato qualunque esso sia.

### 3. `src/components/AddFoodFlow.tsx` — Gestire QR scontrino

Nel callback `handleBarcode`:
- **Detectare** se il codice scansionato è un URL (inizia con `http`) o testo non numerico → è un QR scontrino
- Se è un QR scontrino:
  - Nuovo step `"receipt"` aggiunto al tipo `Step`
  - Chiamare `parse-receipt-qr` edge function
  - Mostrare la lista prodotti estratta con checkbox per selezionare quali aggiungere
  - Bottone "Aggiungi selezionati" che per ogni prodotto selezionato:
    - Cerca/crea il `product` nel DB
    - Crea un `inventory_item` con `storage_type` scelto dall'utente
  - Se il QR non produce risultati utili, fallback al flusso manuale

### 4. `supabase/config.toml` — Registrare la funzione

Aggiungere:
```toml
[functions.parse-receipt-qr]
verify_jwt = false
```

## Flusso utente

1. Utente va in Scadenze o Aggiungi → sceglie "Scansiona barcode"
2. Inquadra il QR dello scontrino → il sistema riconosce che non è un barcode
3. Mostra spinner "Analizzo scontrino..."
4. Appare la lista prodotti con checkbox + scelta conservazione (frigo/dispensa/freezer)
5. Un tap "Aggiungi tutti" o selezione singola → prodotti aggiunti all'inventario

## File coinvolti

| File | Azione |
|---|---|
| `supabase/functions/parse-receipt-qr/index.ts` | Creare edge function AI per parsing scontrino |
| `supabase/config.toml` | Registrare funzione |
| `src/components/AddFoodFlow.tsx` | Aggiungere step "receipt", logica detect QR scontrino, UI lista prodotti |

