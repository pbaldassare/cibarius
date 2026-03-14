

## Modifiche richieste

### 1. Tour auto-avanzante (senza pulsanti Avanti/Indietro)
Il tour avanza automaticamente: ogni step resta visibile per un tempo proporzionale alla lunghezza del testo (~4-7 secondi), poi passa al successivo. L'utente vede solo un pulsante "Salta tour" e la progress bar. Un countdown visuale (cerchio che si svuota) indica il tempo rimanente. Cliccando sul tooltip si può mettere in pausa/riprendere.

**File: `src/components/AppTour.tsx`**
- Rimuovere pulsanti "Avanti" e "Indietro"
- Aggiungere `setTimeout(nextStep, durata)` dopo che il tooltip diventa visibile
- Durata calcolata: `Math.max(4000, step.description.length * 40)` ms
- Aggiungere animazione CSS di countdown sulla progress bar o un cerchio timer
- Aggiungere pulsante pausa/play piccolo nel tooltip
- Mantenere solo "Salta tour" e il contatore step

**File: `src/components/AppTourContext.tsx`**
- Aggiungere campo `duration` opzionale a `TourStep` per step che richiedono più tempo (es. apertura modale)
- Nessuna modifica strutturale

### 2. OG meta tags migliorati
I tag `og:title`, `og:description`, `og:image` e `twitter:*` sono **già presenti** in `index.html`. Aggiungo solo il tag `og:url` mancante per completezza.

**File: `index.html`**
- Aggiungere `<meta property="og:url" content="https://simple-blue-frame.lovable.app">` per il link canonico

