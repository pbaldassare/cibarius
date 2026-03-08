

# Piano: Foto scontrino per estrarre lista prodotti

## Cosa costruire

Aggiungere la possibilità di fotografare uno scontrino fisico (come nella foto condivisa) e usare l'AI vision per estrarre la lista prodotti. Il flusso riusa la stessa UI "receipt" già costruita per i QR code.

## Modifiche

### 1. Edge Function `parse-receipt-qr/index.ts` — Supporto immagini

Aggiungere un parametro opzionale `receipt_image` (base64 + mime_type). Se presente, inviare l'immagine all'AI come content multimodale (testo + immagine) anziché solo testo. Il prompt resta identico. La funzione accetta ora sia `qr_content` che `receipt_image`, almeno uno dei due deve essere presente.

### 2. `AddFoodFlow.tsx` — Nuovo metodo "Foto scontrino"

- Aggiungere un bottone nella schermata "method" (dopo "Scansiona barcode"): **"📋 Foto scontrino"** con descrizione "Fotografa lo scontrino e carica tutto"
- Nuovo step `"receipt_photo"` (o riuso di `"receipt"` direttamente) con:
  - Input fotocamera per scattare/scegliere foto dello scontrino
  - Al click "Analizza", inviare la foto base64 a `parse-receipt-qr` con campo `receipt_image`
  - Mostrare lo spinner "Analizzo scontrino..."
  - Poi passare allo step `"receipt"` con la stessa UI di selezione prodotti, checkbox, conservazione e "Aggiungi selezionati"

Il flusso diventa:
1. Utente sceglie "Foto scontrino" dal menu metodi
2. Scatta/seleziona foto → pulsante "Analizza"
3. AI estrae prodotti → lista con checkbox (stesso UI del QR receipt)
4. Seleziona e salva in batch

### Dettaglio tecnico

**Edge function** - aggiungere al body del messaggio user un blocco `image_url` quando `receipt_image` è fornito:
```typescript
const userContent = receipt_image
  ? [
      { type: "text", text: `Ecco la foto dello scontrino:` },
      { type: "image_url", image_url: { url: `data:${receipt_image.mime_type};base64,${receipt_image.base64}` } }
    ]
  : `Ecco il contenuto dello scontrino:\n\n${textContent}`;
```

**AddFoodFlow** - nuovo state `receiptPhoto` (ImageFile | null), un ref per l'input, e logica per invocare la funzione con `receipt_image` poi settare `receiptProducts` e passare allo step `receipt`.

## File coinvolti

| File | Azione |
|---|---|
| `supabase/functions/parse-receipt-qr/index.ts` | Supporto input immagine base64 multimodale |
| `src/components/AddFoodFlow.tsx` | Bottone "Foto scontrino" + step cattura foto + invio a edge function |

