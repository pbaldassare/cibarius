

## Cache server-side nell'edge function + contatore AI risparmiate in admin

### 1. Tabella `ai_cache` per cache server-side

Creare una nuova tabella `ai_cache` che memorizza i risultati dell'analisi AI per barcode/nome prodotto. Quando l'edge function riceve una richiesta, controlla prima questa tabella prima di chiamare Gemini.

```sql
CREATE TABLE public.ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,  -- hash di barcode o nome normalizzato
  result jsonb NOT NULL,
  hit_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TTL: 30 giorni, pulizia periodica opzionale
CREATE INDEX idx_ai_cache_key ON public.ai_cache(cache_key);
CREATE INDEX idx_ai_cache_updated ON public.ai_cache(updated_at);
```

RLS: accesso solo da service_role (edge function), nessuna policy pubblica necessaria.

### 2. Tabella `ai_usage_log` per tracciamento

Traccia ogni chiamata AI (hit cache vs chiamata reale) per il contatore admin.

```sql
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL,  -- 'ai_call' | 'server_cache' | 'db_enrichment'
  function_name text DEFAULT 'analyze-food-photos',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_created ON public.ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_source ON public.ai_usage_log(source);
```

### 3. Modificare `analyze-food-photos/index.ts`

Flusso aggiornato:
1. Ricevi immagini → genera `cache_key` dal contenuto (hash SHA-256 dei base64 delle immagini)
2. Controlla `ai_cache` per match → se trovato, incrementa `hit_count`, logga `source: 'server_cache'`, restituisci risultato
3. Se non in cache → chiama Gemini come ora
4. Dopo risposta AI → salva in `ai_cache` con il `cache_key`
5. Logga `source: 'ai_call'` nel `ai_usage_log`
6. Arricchisci con DB come già implementato

Il cache_key sarà un hash SHA-256 delle immagini concatenate (primi 1000 char di ogni base64) per evitare collisioni ma restare performante.

### 4. Contatore nella pagina admin `AdminStatsPage.tsx`

Aggiungere due card:
- **Chiamate IA totali**: count da `ai_usage_log` dove `source = 'ai_call'`
- **Chiamate IA risparmiate**: count da `ai_usage_log` dove `source IN ('server_cache', 'db_enrichment')`
- **Tasso di risparmio**: percentuale risparmiata

### File modificati
- **Migrazione SQL**: crea `ai_cache` + `ai_usage_log`
- **`supabase/functions/analyze-food-photos/index.ts`**: cache lookup/write + logging
- **`src/pages/admin/AdminStatsPage.tsx`**: nuove card con contatori AI
- **`src/lib/ai-food.ts`**: loggare `db_enrichment` anche dal client (opzionale, o delegare all'edge function)

