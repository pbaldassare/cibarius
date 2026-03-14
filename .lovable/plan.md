

## Piano: Fix hit_count + Auto-save OFF → DB

### 1. Fix hit_count nell'edge function (righe 82-90)

Il codice attuale per incrementare `hit_count` su cache hit è ridondante — fa 4 update separati di cui uno è un no-op. Va sostituito con un singolo select+update pulito.

**File:** `supabase/functions/analyze-food-photos/index.ts` (righe 82-90)

Sostituire con:
```typescript
const { data: cacheRow } = await sb.from("ai_cache").select("hit_count").eq("cache_key", cacheKey).single();
await sb.from("ai_cache").update({ 
  hit_count: (cacheRow?.hit_count ?? 0) + 1, 
  updated_at: new Date().toISOString() 
}).eq("cache_key", cacheKey);
```

### 2. Auto-save prodotti OFF nel DB

Quando `lookupBarcode()` in `src/lib/barcode.ts` recupera dati da OpenFoodFacts, fare un upsert nella tabella `products` così il dato diventa disponibile a tutti gli utenti futuri (DB-first hit).

**File:** `src/lib/barcode.ts`
- Importare `supabase` client
- Dopo riga 110 (`setCache(barcode, data)`), aggiungere upsert asincrono (fire-and-forget) su `products`:

```typescript
supabase.from("products").upsert({
  barcode,
  name: data.name,
  brand: data.brand,
  image_url: data.image_url,
  calories_100g: data.calories_100g,
  macros_100g: data.macros_100g,
  serving_size_g: data.serving_size_g,
  data_source: "openfoodfacts",
}, { onConflict: "barcode" }).then(() => {});
```

### File coinvolti

| File | Modifica |
|------|----------|
| `supabase/functions/analyze-food-photos/index.ts` | Fix hit_count (righe 82-90) |
| `src/lib/barcode.ts` | Auto-save OFF → products table |

