

# Piano: Pagina "I miei progressi" con diario giornaliero e statistiche

## Obiettivo
Creare una pagina dedicata `/progress` che mostri il diario giornaliero dell'utente con le percentuali di rispetto del piano, statistiche settimanali/mensili, e la possibilità di compilare manualmente i pasti non ancora registrati.

## Schema DB

Nuova tabella `daily_progress` per salvare il riepilogo giornaliero:

```sql
CREATE TABLE public.daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_date date NOT NULL,
  plan_id uuid REFERENCES public.diet_plans(id),
  kcal_target numeric NOT NULL DEFAULT 0,
  kcal_actual numeric NOT NULL DEFAULT 0,
  protein_target numeric DEFAULT 0,
  protein_actual numeric DEFAULT 0,
  carbs_target numeric DEFAULT 0,
  carbs_actual numeric DEFAULT 0,
  fats_target numeric DEFAULT 0,
  fats_actual numeric DEFAULT 0,
  compliance_pct numeric DEFAULT 0,  -- % rispetto del piano (0-100)
  meals_logged jsonb DEFAULT '{}',   -- {colazione: true, pranzo: false, ...}
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_date)
);
-- RLS: user owns own data
```

## Pagina `/progress` - Struttura

```text
┌──────────────────────────────┐
│  📊 I miei progressi         │
├──────────────────────────────┤
│  Questa settimana            │
│  ████████░░ 78% rispetto     │
│  Lun ✅ Mar ✅ Mer ⚠️ Gio ❌ │
│  Ven - Sab - Dom -          │
├──────────────────────────────┤
│  Oggi - 6 Mar 2026           │
│  Compila i pasti:            │
│  ☀️ Colazione  [✅ registrato]│
│  🌤️ Pranzo    [Seleziona...] │
│  🍎 Spuntino  [Seleziona...] │
│  🌙 Cena      [Seleziona...] │
│  Note: ___________           │
│  [💾 Salva giornata]         │
├──────────────────────────────┤
│  Storico (ultimi 30 giorni)  │
│  📈 Grafico compliance       │
│  Media: 72% | Giorni: 18/30 │
├──────────────────────────────┤
│  Dettaglio giorni precedenti │
│  5 Mar - 85% ✅              │
│  4 Mar - 62% ⚠️              │
│  3 Mar - 91% ✅              │
└──────────────────────────────┘
```

## Funzionalità chiave

1. **Auto-calcolo**: se l'utente ha già registrato pasti in `meal_days/meals/meal_items`, il progresso viene calcolato automaticamente e salvato in `daily_progress`
2. **Compilazione manuale**: per i pasti non registrati, l'utente può segnare se ha rispettato il piano (checkbox) o inserire una % manuale di compliance
3. **Statistiche**: grafico recharts con compliance degli ultimi 30 giorni, media settimanale, streak di giorni consecutivi
4. **Salvataggio**: ogni giornata viene salvata/aggiornata in `daily_progress` con upsert su `(user_id, day_date)`

## File coinvolti

| File | Azione |
|---|---|
| Migrazione SQL | Crea `daily_progress` con RLS |
| `src/pages/UserProgressPage.tsx` | Nuova pagina con diario + statistiche + grafico |
| `src/App.tsx` | Aggiungere route `/progress` |
| `src/components/UserBottomNav.tsx` | Aggiungere tab "Progressi" (sostituire o aggiungere) |
| `src/pages/UserActivePlanPage.tsx` | Link rapido a `/progress` |

## Navigazione
La bottom nav ha 5 tab. Per aggiungere "Progressi" senza sovraccaricare, si può:
- Sostituire "Scadenze" con "Progressi" nella nav (scadenze resta accessibile dalla home)
- Oppure aggiungere un link prominente nella pagina `/plan`

Il tab "Progressi" con icona `TrendingUp` al posto di "Scadenze" è la soluzione più pulita dato che i progressi sono più centrali per il flusso dieta.

