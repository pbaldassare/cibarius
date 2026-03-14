

## Espansione completa dei tour Ristoratore e Nutrizionista

### Obiettivo
Espandere entrambi i tour da ~12 step a ~25-30 step ciascuno, navigando nelle pagine reali e spiegando ogni funzionalità nel dettaglio. Dove non è possibile navigare (es. dettaglio cliente senza ID reale), spiegare le funzionalità sugli elementi visibili nella pagina corrente.

### Tour Ristoratore (~25 step)

```text
Dashboard (/restaurant)
 1. Benvenuto — panoramica generale
 2. Profilo e Backoffice — link rapidi
 3. Card HACCP — controlli di oggi, progresso, alert
 4. Quick Actions — celle frigo, forni, cappe, scadenze
 5. Card Scadenze — contatori scaduti/in scadenza/senza data
 6. Card Produzione — preparazioni e semilavorati
 7. Card Bolle — documenti fornitori

HACCP (/restaurant/haccp)
 8. Navigazione → Pagina HACCP checklist giornaliera
 9. Come completare un controllo (stato, note, foto)
10. Registrazione temperature con soglie automatiche
11. Calendario settimanale — storico controlli

Setup HACCP (/restaurant/haccp/setup)
12. Navigazione → Configurazione attività HACCP
13. Aggiungere attività personalizzate e frequenze
14. Configurare attrezzature (celle, frigoriferi, freezer)

Scadenze (/restaurant/products)
15. Navigazione → Lista prodotti con scadenze
16. Filtri per stato e tipo di conservazione
17. Aggiunta prodotti (foto AI, barcode, scontrino, manuale)
18. Gestione scadenze — smaltimento, consumo, donazione

Preparazioni (/restaurant/preparations)
19. Navigazione → Lista preparazioni
20. Creare una preparazione (ingredienti, allergeni, porzioni)
21. Etichette stampabili 2x3cm con QR code e lotto

Bolle (/restaurant/invoices)
22. Navigazione → Documenti fornitori
23. Upload foto bolla — estrazione AI automatica
24. Archivio documenti e dettagli estratti

Bottom Nav
25. Tabs di navigazione — Home, HACCP, Scadenze, Preparaz., Bolle

Finale
26. Messaggio di chiusura → ritorno alla dashboard
```

### Tour Nutrizionista (~28 step)

```text
Dashboard (/pro)
 1. Benvenuto — panoramica piattaforma Pro
 2. Card Clienti attivi — numero e accesso rapido
 3. Card Report settimanale — monitoraggio globale
 4. Azioni rapide — clienti, template, appuntamenti, coupon
 5. Note recenti — ultime annotazioni sui clienti

Clienti (/pro/clients)
 6. Navigazione → Lista clienti
 7. Generare un codice invito per nuovi clienti
 8. Richieste di collegamento — approvazione utenti
 9. Scheda cliente — Piano, Monitor, Chat, Dispensa, Ricette
10. Badge "Piano attivo" / "No piano" per ogni cliente

Dettaglio cliente (spiegato su /pro/clients)
11. Piano obiettivi — kcal, macro giornalieri in 3 step
12. Piano settimanale — 7 giorni x 6 pasti con autocomplete
13. Monitor — aderenza giornaliera, alert, confronto macro
14. Chat in tempo reale — messaggistica Realtime con il cliente
15. Misurazioni — peso, misure corporee, trend
16. Suggerisci pasto — AI consiglia in base alla dispensa
17. Dispensa e ricette — vedi cosa ha il cliente a casa
18. Storico piani e export PDF

Template (/pro/templates)
19. Navigazione → Libreria template
20. Creare un template da zero con macro personalizzati
21. Importare template da file e duplicare esistenti
22. Applicare un template al piano di un cliente

Appuntamenti (/pro/appointments)
23. Navigazione → Calendario appuntamenti
24. Creare un appuntamento — data, ora, cliente, note

Report e Coupon
25. Report settimanale — aderenza globale dei clienti
26. Guadagni Coupon — tracciamento sconti e commissioni

Bottom Nav
27. Tabs di navigazione — Clienti, Report, Note, Profilo

Finale
28. Messaggio di chiusura → ritorno alla dashboard
```

### File da modificare

**`src/components/AppTourContext.tsx`**
- Sostituire `RESTAURANT_TOUR_STEPS` (12 → 26 step) e `PRO_TOUR_STEPS` (11 → 28 step) con le versioni espanse

**`src/pages/restaurant/RestaurantPage.tsx`**
- Aggiungere `data-tour` su: profilo/backoffice bar, quick actions container

**`src/pages/restaurant/RestaurantHaccpPage.tsx`**
- Aggiungere `data-tour` su: checklist container, singolo controllo, calendario, dialog temperatura

**`src/pages/restaurant/RestaurantHaccpSetupPage.tsx`**
- Aggiungere `data-tour` su: lista attività, form aggiunta, sezione attrezzature

**`src/pages/restaurant/RestaurantProductsPage.tsx`**
- Aggiungere `data-tour` wrapper (già presente)

**`src/pages/PreparationsPage.tsx`**
- Aggiungere `data-tour` su: lista preparazioni, bottone crea

**`src/pages/restaurant/RestaurantInvoicesPage.tsx`**
- Aggiungere `data-tour` su: upload section, lista documenti

**`src/pages/pro/ProClientsPage.tsx`**
- Aggiungere `data-tour` su: bottone genera invito, sezione richieste, singola card cliente (bottoni azione)

**`src/pages/pro/ProTemplatesPage.tsx`**
- Aggiungere `data-tour` su: lista template, bottone crea

**`src/pages/pro/ProAppointmentsPage.tsx`**
- Aggiungere `data-tour` su: lista appuntamenti, bottone crea

**`src/pages/pro/ProPage.tsx`**
- Aggiungere `data-tour` su sezioni già presenti (verificare completezza)

### Note tecniche
- Ogni step che naviga verso una nuova pagina usa `action: { type: "navigate", target: "/path", delay: 500 }`
- Gli step che descrivono sotto-funzionalità non raggiungibili (es. dettaglio cliente) puntano a elementi sulla pagina clienti con descrizioni dettagliate di cosa succede quando si clicca
- Le durate vengono calcolate automaticamente dal testo (25ms/char, min 2500ms) — i testi più lunghi avranno più tempo di lettura

