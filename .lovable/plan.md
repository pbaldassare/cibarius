

## Tour Interattivo Avanzato — Rifacimento completo

### Problema attuale
Il tour si limita a evidenziare elementi con tooltip statici. Non apre modali, non naviga tra pagine, non mostra l'interno delle funzionalità. L'utente vuole un tour che **agisca** sull'interfaccia: apra il modale "+", mostri le opzioni dentro, navighi nelle pagine Scadenze/Pasti/Profilo e spieghi cosa si vede.

### Nuovo approccio
Ogni step del tour avrà un campo opzionale `action` che viene eseguito **prima** di mostrare il tooltip. Le azioni possono essere:
- `click` — clicca programmaticamente sull'elemento target (es. apre il FAB, apre un modale)
- `open-sheet` — imposta uno stato per aprire un bottom sheet (AddFoodFlow)
- `navigate` — naviga a una pagina e poi evidenzia un elemento
- `scroll` — scrolla fino a una sezione specifica
- `close` — chiude modali/sheet aperti prima di proseguire

### Nuova struttura degli step (~25 step)

**Fase 1 — Homepage (step 1-4)**
1. Saluto — evidenzia il greeting, spiega la home
2. Cerca — evidenzia l'icona cerca, spiega la ricerca
3. Attenzione oggi — evidenzia la sezione scadenze
4. Azioni rapide — evidenzia la griglia 4 pulsanti, spiega ogni azione

**Fase 2 — Apertura modale "+" (step 5-10)**
5. FAB — evidenzia il pulsante "+", **action: click** → apre `AddFoodFlow`
6. Dentro il modale: Foto AI — evidenzia il pulsante "Foto AI", spiega
7. Dentro il modale: Scontrino — evidenzia la sezione scontrino
8. Dentro il modale: Scansiona barcode — evidenzia il pulsante
9. Dentro il modale: Cerca prodotto — evidenzia il pulsante  
10. Chiudi modale — **action: close-sheet**, prosegui

**Fase 3 — Dispensa & Ricette (step 11-12)**
11. La tua dispensa — scrolla e evidenzia la sezione
12. Ricette anti-spreco — evidenzia le ricette suggerite

**Fase 4 — Pasti di oggi (step 13)**
13. I tuoi pasti — evidenzia la sezione pasti

**Fase 5 — Navigazione tra pagine (step 14-20)**
14. Tab Scadenze — **action: navigate** a `/expiry`, spiega la pagina
15. Tab Piano — **action: navigate** a `/plan`, spiega il piano alimentare
16. Tab Pasti — **action: navigate** a `/meals`, spiega il diario
17. Tab Progressi — **action: navigate** a `/progress`, spiega i grafici
18. Tab Profilo — **action: navigate** a `/profile`, spiega impostazioni
19. Torna alla home — **action: navigate** a `/`

**Fase 6 — Chiusura (step 20)**
20. Tour completato — messaggio finale con "Buon appetito!"

### Modifiche tecniche

| File | Modifica |
|------|----------|
| `src/components/AppTourContext.tsx` | Aggiungere campo `action` a `TourStep` (`{ type: "click" \| "open-add-food" \| "close-add-food" \| "navigate", target?: string }`). Nuovi step dettagliati. Esporre `setAddFoodOpen` dal context per controllare il modale. |
| `src/components/AppTour.tsx` | Prima di evidenziare, eseguire `step.action`: click su elementi, aprire/chiudere sheet, navigare. Aggiungere `data-tour` ai pulsanti dentro AddFoodFlow. Gestire il timing (attendere che modale/pagina si apra prima di cercare il target). |
| `src/components/AddFoodFlow.tsx` | Aggiungere `data-tour` attributes ai pulsanti metodo: `data-tour="add-photo-ai"`, `add-scan"`, `add-search"`, `add-manual"`, `add-receipt"` |
| `src/pages/Index.tsx` | Esporre `setAddFoodOpen` al tour context. Passare una ref o callback per il controllo del modale dal tour. |
| `src/pages/ExpiryPage.tsx` | Aggiungere `data-tour="expiry-page"` al container principale |
| `src/pages/PastiPage.tsx` | Aggiungere `data-tour="meals-page"` al container principale |
| `src/pages/ProfiloPage.tsx` | Aggiungere `data-tour="profile-page"` al container principale |

### Meccanismo azioni nel tour
```text
step.action = {
  type: "open-add-food"  → chiama setAddFoodOpen(true) dal context
  type: "close-add-food" → chiama setAddFoodOpen(false)
  type: "navigate"       → usa navigate(step.page)
  type: "click"          → el.click() sull'elemento target
}

Sequenza per ogni step:
1. Esegui action (se presente)
2. Attendi render (setTimeout ~500ms per modali, ~300ms per navigate)
3. Trova elemento con data-tour
4. Anima cursore + spotlight
5. Mostra tooltip
```

### Gestione stato modale dal tour
Il `TourProvider` esporrà una callback `registerAddFoodControl(open, close)` che `Index.tsx` chiamerà al mount. Quando il tour deve aprire il modale, usa questa callback. Questo evita prop drilling complessi.

