

## Ampliare il DB con OpenFoodFacts per risparmiare sull'IA

### Stato attuale

| Flusso | Cerca nel DB locale? | Salva nel DB dopo lookup esterno? |
|--------|---------------------|----------------------------------|
| Barcode scan (`barcode.ts`) | Solo localStorage | **Si** (upsert dopo OFF) ✓ |
| Ricerca testo (`search-food` edge fn) | Si (client-side) | **No** -- i risultati OFF/USDA vengono restituiti ma non salvati |
| Analisi foto AI (`analyze-food-photos`) | Cache server-side | **Si** (ai_cache) ✓ |

### Opportunita mancanti

1. **`search-food` edge function non salva i risultati OFF/USDA nel DB** -- ogni ricerca testuale rifà le chiamate esterne. Aggiungendo un upsert fire-and-forget nella edge function, ogni ricerca arricchisce automaticamente il catalogo `products`.

2. **Nessun bulk import iniziale** -- non esiste un modo per pre-popolare il DB con i prodotti italiani piu comuni da OFF.

### Piano di implementazione

#### 1. Auto-save nella edge function `search-food`

In `supabase/functions/search-food/index.ts`, dopo aver raccolto i risultati OFF/USDA, fare un batch upsert nella tabella `products` (fire-and-forget, con service_role client). Solo per risultati con nome e calorie validi.

```text
search-food edge fn
  ├─ Cerca OFF IT + OFF World + USDA  ← gia fatto
  ├─ Dedup + rispondi al client       ← gia fatto
  └─ upsert batch → products table    ← NUOVO (fire-and-forget)
       - barcode come conflict key (se presente)
       - data_source: "openfoodfacts" o "usda"
       - solo risultati con calories_100g != null
```

#### 2. Edge function `seed-off-products` per bulk import

Nuova edge function che importa i top prodotti italiani da OFF in batch. Chiamabile dall'admin una tantum.

- Endpoint OFF: `https://it.openfoodfacts.org/api/v2/search?countries_tags=en:italy&sort_by=unique_scans_n&page_size=100&page=N`
- Itera pagine 1-50 (fino a 5000 prodotti)
- Upsert in `products` con `data_source: 'openfoodfacts'`
- Restituisce contatore prodotti importati

#### 3. Bottone admin per lanciare il bulk import

In `AdminSeedPage.tsx`, aggiungere una card dedicata "Importa prodotti OpenFoodFacts" con bottone che invoca la nuova edge function e mostra progresso.

### File coinvolti

| File | Modifica |
|------|----------|
| `supabase/functions/search-food/index.ts` | Aggiungere Supabase service client + batch upsert dopo raccolta risultati |
| `supabase/functions/seed-off-products/index.ts` | Nuova edge function per bulk import top prodotti IT |
| `supabase/config.toml` | Aggiungere config per `seed-off-products` (verify_jwt = false) |
| `src/pages/admin/AdminSeedPage.tsx` | Card + bottone "Importa da OpenFoodFacts" |

### Risultato atteso

- Ogni ricerca testuale (non solo barcode) arricchisce il DB automaticamente
- Bulk import da ~5000 prodotti italiani come base iniziale
- Piu prodotti nel DB = piu hit "local" = meno chiamate OFF/USDA/IA = costi ridotti e risposte piu veloci

