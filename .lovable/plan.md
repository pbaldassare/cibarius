

## Tour Interattivo dell'App Cibarius

### Cosa costruiremo
Un componente `AppTour` che simula un tour guidato interattivo con:
- Un **cursore animato** che si sposta verso gli elementi dell'interfaccia
- **Fumetti/tooltip** che spiegano ogni funzionalità
- **Navigazione tra pagine** (Home → Scadenze → Piano → Pasti → Progressi → Profilo)
- **Highlight** dell'elemento corrente con overlay scuro sul resto
- Pulsanti Avanti/Indietro/Salta

### Comportamento
1. **Prima login**: mostra un dialog di benvenuto ("Vuoi fare un tour dell'app?") con opzioni Sì / No + checkbox "Non mostrare più"
2. **Flag localStorage**: `cibarius_tour_done` — se presente, non mostra il prompt
3. **Nelle impostazioni** (ProfiloPage): aggiungere un pulsante "Rivedi il tour" che riattiva il tour

### Step del tour (utente consumer, ~20 step)

**Homepage:**
1. Header Cibarius — "Questa è la tua home. Qui trovi tutto a colpo d'occhio"
2. Icona Cerca — "Cerca rapidamente tra i tuoi prodotti"
3. Sezione Attenzione oggi — "Qui vedi i prodotti in scadenza o scaduti"
4. Azioni rapide: Scansiona — "Scansiona il barcode di un prodotto per aggiungerlo"
5. Azioni rapide: Aggiungi — "Aggiungi un prodotto manualmente o con foto AI"
6. Azioni rapide: Svuota frigo — "Trova ricette per consumare ciò che sta scadendo"
7. Azioni rapide: Cosa mangio? — "L'AI ti suggerisce cosa cucinare con quello che hai"
8. La tua dispensa — "Panoramica di tutti i tuoi prodotti"
9. Ricette anti-spreco — "Ricette suggerite in base a ciò che hai in casa"
10. I tuoi pasti di oggi — "Registra colazione, pranzo e cena per monitorare la tua alimentazione"
11. FAB (+) — "Premi qui in qualsiasi momento per aggiungere un prodotto"

**Bottom Nav (navigazione tra pagine):**
12. Tab Scadenze — "Vai alla lista completa delle scadenze, filtra e gestisci"
13. Tab Piano — "Il tuo piano alimentare dal nutrizionista"
14. Tab Pasti — "Il diario alimentare completo con foto e macro"
15. Tab Progressi — "Monitora peso, misurazioni e aderenza al piano"
16. Tab Profilo — "Impostazioni, collegamento nutrizionista e supporto"

### Implementazione tecnica

| File | Modifica |
|------|----------|
| `src/components/AppTour.tsx` | **Nuovo** — Componente tour con overlay, cursore animato, tooltip e step |
| `src/components/AppTourPrompt.tsx` | **Nuovo** — Dialog di benvenuto al primo accesso con "Fai il tour" / "Salta" |
| `src/pages/Index.tsx` | Aggiungere `data-tour="..."` attributes ai componenti chiave + montare `AppTourPrompt` |
| `src/pages/ProfiloPage.tsx` | Aggiungere pulsante "Rivedi il tour dell'app" nella sezione impostazioni |
| `src/components/UserLayout.tsx` | Montare `AppTour` a livello di layout (per poter navigare tra pagine) |

### Meccanismo tecnico
- Ogni step ha: `selector` (data-tour attribute), `title`, `description`, `page` (route opzionale)
- Se lo step richiede una pagina diversa, il tour naviga con `navigate()`, attende il render, poi evidenzia l'elemento
- L'overlay usa un "spotlight" CSS (box-shadow enorme semi-trasparente) sull'elemento target
- Il cursore è un `div` animato con `transition` che si sposta verso il target
- Il tooltip si posiziona sopra/sotto l'elemento con una freccia
- Stato gestito con Context per condividerlo tra layout e pagine
- localStorage `cibarius_tour_done` per il flag "non mostrare più"
- localStorage `cibarius_tour_active` per gestire il tour attivo tra navigazioni

