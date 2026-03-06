

# Piano: Mostrare i template anche quando c'è un piano attivo

## Problema
La galleria dei template è dentro il blocco `if (!plan)` (riga 514), quindi chi ha già un piano attivo non la vede mai.

## Soluzione

### File: `src/pages/UserDietPage.tsx`

Aggiungere una sezione **"Cambia piano"** nella vista con piano attivo (dopo la sezione "Posologia per pasto", prima del footer). Mostra gli stessi `systemTemplates` come card cliccabili. Al click:

1. Disattiva il piano corrente (`is_active = false`)
2. Chiama `saveTemplateAsPlan(tmpl)` per creare il nuovo piano
3. Reload pagina

La sezione avrà:
- Header: "Esplora altri piani" con sottotitolo "Cambia piano quando vuoi, è gratuito!"
- Stessa griglia di card con titolo, kcal, macro P/C/F
- Evidenzia il piano attuale (match per titolo) con bordo primario e badge "Attivo"

Modifica alla funzione `saveTemplateAsPlan`: prima di inserire il nuovo piano, disattivare eventuali piani attivi esistenti con:
```sql
UPDATE diet_plans SET is_active = false WHERE client_user_id = user.id AND is_active = true
```

