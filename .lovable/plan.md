

# Ricerca progressiva e priorita' prodotti italiani

## Problema attuale

La funzione `searchFood` aspetta che **tutte** le fonti (DB locale, OpenFoodFacts, USDA) rispondano prima di mostrare qualsiasi risultato. Questo rende la ricerca lenta perche' l'utente deve attendere anche le API esterne.

## Soluzione

Trasformare la ricerca in un sistema **progressivo a 3 fasi** con feedback visivo per l'utente.

### Fasi di ricerca

```text
Fase 1 (istantanea): Database locale Cibarius --> risultati in ~100ms
Fase 2 (1-2s):       OpenFoodFacts Europa     --> risultati aggiunti dinamicamente
Fase 3 (1-3s):       USDA (se disponibile)    --> risultati aggiunti dinamicamente
```

### Priorita' prodotti italiani in OFF

Nell'edge function, la ricerca OFF usera' prima `it.openfoodfacts.org` (solo prodotti italiani), poi integrera' con `world.openfoodfacts.org`. I risultati italiani appariranno in cima.

### Feedback visivo

Sotto la barra di ricerca, un indicatore di stato mostra in tempo reale la fase corrente:
- "Ricerca nel catalogo Cibarius..." 
- "Ricerca prodotti italiani..."
- "Ricerca database internazionale..."
- "Ricerca completata" (con check verde)

---

## Dettagli tecnici

### File: `src/lib/search-food.ts`

Sostituire `searchFood` (che ritorna una Promise unica) con `searchFoodProgressive` che accetta un callback `onResults(results, phase, done)`:

- **Fase 1**: chiama `searchLocal()`, invia subito i risultati con `onResults(localResults, "local", false)`
- **Fase 2**: chiama l'edge function per OFF (italiano + mondo), invia con `onResults(merged, "off", false)`
- **Fase 3**: chiama USDA, invia con `onResults(merged, "usda", true)`

Il caching resta invariato ma applicato ai risultati finali completi.

Mantenere anche `searchFood` come wrapper async per retrocompatibilita'.

### File: `supabase/functions/search-food/index.ts`

Separare OFF in due chiamate:
1. `it.openfoodfacts.org` (prodotti italiani/venduti in Italia) con tag `countries_tags_it:italy`
2. `world.openfoodfacts.org` (globale, gia' esistente)

Aggiungere un campo `country_priority` ai risultati italiani per ordinarli prima. Restituire un campo `source_detail` ("off_it" vs "off_world") per distinguerli.

### File: `src/components/AddFoodFlow.tsx`

Nell'`useEffect` di ricerca (riga 188-217):
- Usare `searchFoodProgressive` invece di `searchFood`
- Aggiungere stato `searchPhase` ("local" | "off" | "usda" | "done")
- Aggiornare `searchResults` incrementalmente ad ogni callback
- Mostrare sotto la search bar un indicatore con l'icona Loader2 e il testo della fase corrente

### File coinvolti: 3
- `src/lib/search-food.ts` -- nuova funzione progressiva
- `supabase/functions/search-food/index.ts` -- priorita' Italia + deploy
- `src/components/AddFoodFlow.tsx` -- UI progressiva con indicatore fase

