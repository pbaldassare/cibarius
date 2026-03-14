

## Rendere il pulsante "Disattiva piano" visibile nella card del piano

### Problema
Il pulsante "Disattiva piano attuale" c'è già nella pagina, ma è nascosto in fondo dopo tutti i pasti e i template. L'utente non lo vede perché deve scrollare troppo.

### Soluzione
Spostare il pulsante "Disattiva piano" dentro la card del piano attivo in alto (vicino al badge "Attivo"), così è immediatamente visibile e logicamente collegato al piano.

### Modifiche

**File: `src/pages/UserDietPage.tsx`**

1. **Aggiungere un pulsante "Disattiva" nella card del piano attivo** (sezione header con titolo piano, badge "Attivo", kcal/macro) — un piccolo bottone o link sotto la riga macro, tipo `<Button size="sm" variant="ghost" className="text-destructive">Disattiva piano</Button>` che apre lo stesso `AlertDialog` di conferma già presente

2. **Rimuovere il pulsante duplicato** dalla sezione in fondo (righe ~1300-1312) oppure lasciarlo anche lì come ridondanza — ma il punto principale è averlo visibile in alto

Il dialog di conferma e la logica `handleDeactivatePlan` restano invariati, cambia solo la posizione del trigger.

