

# Template PDF/CSV, profilo pro editabile, template dietetici avanzati

## 3 interventi richiesti

### 1. Importazione template da PDF (oltre a CSV)

Nella pagina `ProTemplatesPage`, aggiungere un bottone "Importa" che permetta di:
- Caricare un file PDF o CSV con un piano alimentare
- Per il PDF: inviare il file a una edge function (`extract-diet-template`) che usa l'API di OpenAI (o simile) per estrarre i dati strutturati (pasti, alimenti, quantita', macro)
- Mostrare una preview dei dati estratti in una tabella editabile
- Confermare e salvare come template in `diet_plan_templates` + `diet_plan_template_meals`
- Per il CSV: parsing lato client con le colonne pasto, alimento, quantita', kcal, proteine, carbo, grassi

**File coinvolti:**
- `supabase/functions/extract-diet-template/index.ts` (nuova edge function)
- `src/pages/pro/ProTemplatesPage.tsx` (bottone importa + dialog + parsing)

### 2. Correzione modifica profilo professionale

Il dialog di modifica esiste gia' nel codice ma potrebbe non aprirsi se `myProProfile` e' null (es. il record non esiste nel DB o la query fallisce). Interventi:
- Aggiungere un fallback: se il profilo professionale non esiste, mostrare un bottone "Crea profilo" che inserisce un record vuoto e poi apre il dialog
- Verificare che la query `.maybeSingle()` restituisca correttamente i dati
- Aggiungere gestione errori esplicita nel caricamento del profilo
- Aggiungere un bottone "Crea template" rapido direttamente dalla pagina template (senza dover passare da un piano cliente)

**File coinvolti:**
- `src/pages/ProfiloPage.tsx` (gestione caso profilo mancante + creazione automatica)

### 3. Template di base: Ketogenica, Digiuno intermittente, differenziati per genere

Aggiungere template pre-compilati che il professionista puo' usare come punto di partenza. I template vengono inseriti via migration SQL nella tabella `diet_plan_templates` con un `professional_id` di sistema (`00000000-0000-0000-0000-000000000000`).

**Template proposti:**

| Template | Kcal | Prot | Carbo | Grassi | Note |
|----------|------|------|-------|--------|------|
| Ketogenica - Uomo | 2000 | 125 | 30 | 155 | Rapporto grassi/carbo 5:1 |
| Ketogenica - Donna | 1600 | 100 | 25 | 120 | Rapporto grassi/carbo 5:1 |
| Digiuno intermittente 16:8 - Uomo | 2200 | 130 | 260 | 75 | Solo pranzo+cena+spuntino |
| Digiuno intermittente 16:8 - Donna | 1700 | 100 | 200 | 60 | Solo pranzo+cena+spuntino |
| Mediterranea equilibrata - Uomo | 2200 | 110 | 275 | 75 | |
| Mediterranea equilibrata - Donna | 1800 | 90 | 220 | 65 | |
| Massa muscolare - Uomo | 2800 | 180 | 340 | 90 | |
| Massa muscolare - Donna | 2200 | 140 | 260 | 70 | |
| Dimagrimento moderato - Uomo | 1800 | 120 | 180 | 65 | |
| Dimagrimento moderato - Donna | 1500 | 100 | 150 | 55 | |

Ogni template include la ripartizione per pasto in `diet_plan_template_meals` (per il digiuno intermittente: solo pranzo, cena e spuntino, senza colazione).

**Modifiche DB e RLS:**
- Aggiungere policy SELECT su `diet_plan_templates` per leggere i template di sistema (`professional_id = '00000000-...'`)
- Aggiungere policy SELECT su `diet_plan_template_meals` per i template di sistema
- Insert dei template seed via migration

**Modifiche UI:**
- In `ProTemplatesPage`: mostrare i template di sistema in una sezione separata "Template di base" in sola lettura, con possibilita' di duplicarli nel proprio account
- In `UserDietPage`: bottone "Usa template" nel wizard self-plan per applicare un template di base

**File coinvolti:**
- Migration SQL (policy + seed data)
- `src/pages/pro/ProTemplatesPage.tsx` (sezione template di base + bottone crea + bottone importa)
- `src/pages/UserDietPage.tsx` (bottone "Usa template" nel wizard)
- `src/integrations/supabase/types.ts` (aggiornamento automatico tipi)

## Dettagli tecnici

### Edge function `extract-diet-template`

Riceve un file PDF via FormData, lo converte in testo e usa un LLM per estrarre:
```json
{
  "title": "...",
  "kcal_day": 2000,
  "protein_g_day": 100,
  "carbs_g_day": 250,
  "fats_g_day": 70,
  "meals": [
    { "meal_type": "colazione", "kcal_target": 400, "protein_g": 20, "carbs_g": 50, "fats_g": 15 }
  ]
}
```

### RLS per template di sistema

```sql
-- Tutti possono leggere i template di sistema
CREATE POLICY "Read system templates"
  ON diet_plan_templates FOR SELECT
  USING (professional_id = '00000000-0000-0000-0000-000000000000' AND auth.uid() IS NOT NULL);

CREATE POLICY "Read system template meals"
  ON diet_plan_template_meals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM diet_plan_templates t
    WHERE t.id = template_id
    AND t.professional_id = '00000000-0000-0000-0000-000000000000'
  ) AND auth.uid() IS NOT NULL);
```

### Fix profilo professionale

Nel `useEffect` che carica `myProProfile`, se il risultato e' null, creare automaticamente un record vuoto:
```typescript
if (!data && user) {
  const { data: newProfile } = await supabase
    .from("professional_profiles")
    .insert({ user_id: user.id, display_name: profile.full_name || "Professionista", specialization: "" })
    .select()
    .single();
  if (newProfile) setMyProProfile(newProfile);
}
```

