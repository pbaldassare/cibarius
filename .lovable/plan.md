

## Piano: Riordinare e migliorare la schermata "Aggiungi alimento"

### Modifiche richieste

**File:** `src/components/AddFoodFlow.tsx` (sezione `step === "method"`, righe ~1157-1289)

#### 1. Nuovo ordine dei metodi
1. **Scansiona barcode** (primo, con descrizione chiara)
2. **Gruppo Scontrino** (foto + QR)
3. **Foto AI** (spostata dopo scontrino)
4. **Cerca prodotto**
5. **Inserisci manualmente**
6. Ricette dal piano / Crea Preparazione (invariati)

#### 2. Descrizioni più chiare e semplici

| Metodo | Descrizione attuale | Nuova descrizione |
|--------|-------------------|-------------------|
| Scansiona barcode | "Usa la fotocamera" | "Inquadra il codice a barre sulla confezione del prodotto. Lo trovi di solito sul retro o sul fondo." |
| Foto AI | "Scatta 1-5 foto e l'AI legge tutto" | "Scatta foto del prodotto (fronte, retro, scadenza) e l'AI riconosce tutto automaticamente" |
| Cerca prodotto | "Cerca nel database" | "Scrivi il nome del prodotto per cercarlo nel nostro archivio" |
| Inserisci manualmente | "Scrivi nome e valori" | "Inserisci a mano nome, quantità e valori nutrizionali" |
| Foto scontrino | "Fotografa lo scontrino cartaceo" | "Fotografa lo scontrino della spesa per aggiungere tutti i prodotti insieme" |
| QR Scontrino | "Scansiona il QR code dello scontrino" | "Inquadra il QR code stampato sullo scontrino" |

#### 3. Barcode → dopo scansione, possibilità di aggiungere foto scadenza

Dopo che il barcode è stato trovato e si arriva al summary, l'utente può già fotografare la scadenza (il flusso OCR scadenza esiste già nel summary step). Nessuna modifica necessaria qui — il bottone "📷 Leggi scadenza" è già presente nel summary.

#### 4. Barcode diventa il primo elemento con stile evidenziato

Il barcode avrà lo stile `border-2 border-primary/30 bg-primary/5` (attualmente usato da Foto AI) e il badge "consigliato". Foto AI diventerà un bottone standard.

### File coinvolti

| File | Modifica |
|------|----------|
| `src/components/AddFoodFlow.tsx` | Riordinare metodi, aggiornare descrizioni, spostare stile "consigliato" al barcode |

