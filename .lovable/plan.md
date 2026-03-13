

## Piano: Scansione QR code scontrino

### Situazione attuale
Il barcode scanner già rileva automaticamente i QR code e li invia a `parse-receipt-qr`, ma l'utente non ha modo di saperlo — il pulsante dice solo "Scansiona barcode". Serve un'opzione esplicita per la scansione QR dello scontrino.

### Cosa cambia

**File: `src/components/AddFoodFlow.tsx`**

1. **Nuovo pulsante "QR Scontrino"** nella schermata metodo (accanto a "Foto scontrino", solo per context `inventory`):
   - Icona `ScanLine` con label "📱 QR Scontrino" e descrizione "Scansiona il QR code dello scontrino"
   - Cliccando, apre direttamente lo scanner (step `scan`) ma in modalità QR-receipt: quando rileva un codice, va automaticamente al flusso receipt

2. **Raggruppamento "Scontrino"**: unire foto e QR in un piccolo gruppo visivo con label "Scontrino" che mostra due sotto-opzioni (foto e QR) così l'utente capisce subito che ha entrambe le possibilità.

3. **Nessuna modifica al backend**: la edge function `parse-receipt-qr` gestisce già sia testo QR che immagini. Il barcode scanner (`BarcodeScanner.tsx`) già legge QR code nativamente via `html5-qrcode`.

### Dettaglio tecnico
- Aggiungere `"receipt_qr"` come Step possibile
- Il nuovo step `receipt_qr` renderizza il `BarcodeScanner` component con `onDetected` che chiama direttamente il flusso receipt (come già fa `handleBarcode` per i QR)
- Se il codice scansionato è numerico (barcode prodotto), mostrare un toast "Questo è un barcode prodotto, usa 'Scansiona barcode'" e ignorarlo
- Aggiungere reset di `receipt_qr` step nel cleanup `useEffect`

