

## Correzione logica pagina Piani (UserDietPage)

### Problema attuale
- "Collega un professionista" richiede Plus, ma cercare e contattare un nutrizionista dovrebbe essere gratuito
- Il pulsante "Contatta" nella lista coach porta a `/invite` senza contesto
- "Crea il tuo piano personalizzato" e "Cerca nutrizionista" non sono ben separati

### Modifiche

**File: `src/pages/UserDietPage.tsx`** (sezione "no plan", righe ~640-722)

1. **"Crea il tuo piano personalizzato"** — resta con gate Plus → porta a `/subscription` se non Plus (già corretto)

2. **"Cerca un nutrizionista"** — rimuovere il gate Plus dal pulsante "Collega un professionista". Chiunque può cercare e inviare richiesta gratuitamente. Il gate Plus si applica solo quando il nutrizionista crea il piano.
   - Cambiare il pulsante da:
     ```
     if (!plusActive) { navigate("/subscription"); return; }
     navigate("/invite");
     ```
     a semplicemente:
     ```
     navigate("/invite");
     ```
   - Rimuovere badge "Plus" e icona Crown dal pulsante

3. **Pulsante "Contatta" nella card coach** — passare il `user_id` del coach come parametro: `navigate("/invite?pro=" + coach.user_id)` così la pagina Invite pre-seleziona quel professionista

4. **Testo più chiaro** — Sostituire "Collega un professionista" con "Cerca un nutrizionista tra i nostri professionisti"

### Riepilogo flusso corretto
- **Gratis**: scegliere template standard, cercare nutrizionista, inviare richiesta di collegamento, chattare
- **Plus**: creare piano personalizzato da zero, modificare macro liberamente, ricevere piano dal nutrizionista

### File modificati
| File | Modifica |
|------|----------|
| `src/pages/UserDietPage.tsx` | Rimuovere gate Plus da "Cerca nutrizionista", migliorare testi, passare user_id coach |

