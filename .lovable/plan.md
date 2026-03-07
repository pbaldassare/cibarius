

# Piano: Spostare il salvataggio giornata nella pagina Piano

## Problema
Il salvataggio della giornata (pasti completati, compliance, note) è attualmente nella pagina Progressi. L'utente vuole che sia nella pagina Piano (`UserActivePlanPage.tsx`), sotto il bottone "Cambia piano". La pagina Progressi deve mostrare solo i miglioramenti (grafici, streak, storico).

## Modifiche

### 1. `src/pages/UserActivePlanPage.tsx` — Aggiungere sezione "Salva giornata"

Sotto il bottone "Cambia piano", aggiungere una card con:
- **Pasti completati**: 4 checkbox (colazione/pranzo/spuntino/cena), auto-populate dalle `todayMeals` già caricate
- **Slider compliance**: percentuale di rispetto del piano (auto-calcolata dal rapporto kcal consumate/target)
- **Note del giorno**: textarea
- **Bottone "Salva giornata"**: upsert su `daily_progress` con i dati del piano attivo + pasti loggati + compliance + note

La logica di salvataggio è identica a quella attuale in `UserProgressPage` (upsert su `daily_progress` con `onConflict: "user_id,day_date"`), ma i dati `kcal_actual`, `protein_actual`, ecc. vengono popolati dai `todayTotals` già calcolati nella pagina.

Nuovi state: `mealsLogged`, `manualCompliance`, `dayNotes`, `saving`.
Auto-init: al load, se esiste già una riga `daily_progress` per oggi, pre-popola i campi. Altrimenti, auto-popola `mealsLogged` dalle `todayMeals` e calcola compliance da `kcalPct`.

### 2. `src/pages/UserProgressPage.tsx` — Rimuovere il form di salvataggio

Rimuovere la card "Oggi" con checkbox, slider, textarea e bottone "Salva giornata" (righe ~310-375). Rimuovere gli state correlati (`mealsLogged`, `manualCompliance`, `notes`, `saving`, `saveToday`).

Mantenere: header, week overview, stats cards, grafico 30 giorni, storico recente. La pagina diventa read-only per visualizzare i progressi.

## File coinvolti

| File | Azione |
|---|---|
| `src/pages/UserActivePlanPage.tsx` | Aggiungere form salvataggio giornata sotto "Cambia piano" |
| `src/pages/UserProgressPage.tsx` | Rimuovere form salvataggio, mantenere solo visualizzazione |

