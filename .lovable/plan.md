

## Ristrutturare la pagina Piano: enfasi e ordine corretto

### Struttura attuale (problematica)
La pagina mostra prima i template, poi in fondo "Crea il tuo piano personalizzato" e "Cerca un nutrizionista" come azioni secondarie. L'utente non li vede subito.

### Nuova struttura della pagina (vista senza piano attivo)

```text
┌─────────────────────────────┐
│  Header "Il mio piano"      │
├─────────────────────────────┤
│  ★ CREA IL TUO PIANO       │  ← Card grande, gradient primary
│    PERSONALIZZATO           │     con Crown, badge Plus,
│    Descrizione + CTA        │     bottone prominente
├─────────────────────────────┤
│  🔍 CERCA UN NUTRIZIONISTA  │  ← Sezione con input di ricerca
│  [___ricerca per nome___]   │     filtra i coach in tempo reale
│  Coach card 1               │     pulsante "Contatta"
│  Coach card 2               │
├─────────────────────────────┤
│  📋 Piani standard          │  ← Titolo sezione
│  Template card 1            │     I template gratuiti restano
│  Template card 2            │     sotto come opzione base
│  ...                        │
└─────────────────────────────┘
```

### Modifiche — `src/pages/UserDietPage.tsx`

**1. Riordinare le sezioni** (righe ~600-738):
- **Prima**: Card "Crea il tuo piano personalizzato" — grande, con gradient `bg-gradient-to-br from-primary/10 to-primary/5`, bordo primary, icona Crown grande, testo descrittivo ("Personalizza calorie e macro, aggiungi i tuoi alimenti preferiti"), bottone pieno `variant="default"` con "Inizia ora" + badge Plus se non abbonato
- **Seconda**: Sezione "Cerca un nutrizionista" — aggiungere un `<Input>` di ricerca (filtra `coaches` per `display_name` o `specialization` o `city`) sopra la lista coach esistente. Rimuovere il bottone ghost separato "Cerca un nutrizionista tra i nostri professionisti" (il link a `/invite` non serve più, la ricerca è inline)
- **Terza**: Sezione "Piani standard gratuiti" con i template cards già esistenti

**2. Aggiungere filtro ricerca coach**:
- Nuovo state `coachSearch` (stringa)
- Filtrare `coaches` client-side per nome, specializzazione o città
- Input con icona Search dentro la sezione coach

**3. Rimuovere** il vecchio blocco "Secondary actions" (righe 660-673) — le due azioni sono ora integrate nelle sezioni sopra

