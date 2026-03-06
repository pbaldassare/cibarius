

# Piano: Sostituire "Senza data" con "Totale prodotti"

## Modifica

Nel contatore compatto della Home page, sostituire il chip "Senza data" con il numero totale di prodotti inseriti dall'utente (inventory items + preparazioni).

### File: `src/pages/Index.tsx`

1. **Aggiornare `counts`** (riga 229): aggiungere un campo `allItems` che conta TUTTI gli items, non solo quelli urgenti:
   ```ts
   return { expired, expiring, allItems: items.length + prepItems.length, total: expired + expiring };
   ```

2. **Aggiornare il chip** (riga 397): cambiare da `nodate`/`"Senza data"` a `allItems`/`"Totale"` con colore neutro (es. blu `hsl(215,50%,55%)`):
   ```ts
   { n: counts.allItems, label: "Totale", color: "hsl(215,50%,55%)" },
   ```

Nessun altro file coinvolto.

