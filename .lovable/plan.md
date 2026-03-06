

# Piano: Mostrare template alimentari gratuiti nella pagina Piano

## Cosa cambia

Quando l'utente non ha un piano attivo, la pagina `/diet` mostrerà:
1. Un header motivazionale: **"Scegli il piano alimentare per te, collegalo alla tua spesa e alle tue abitudini!"**
2. I template di sistema (`professional_id = "00000000-..."`) come card cliccabili con macro giornalieri (kcal, proteine, carbo, grassi)
3. Al click su un template → si applica direttamente come piano personale dell'utente (professional_id = user.id, client_user_id = user.id) con i meal targets copiati dal template, e la pagina si ricarica mostrando il piano attivo
4. I pulsanti "Collega un professionista" e "Crea il tuo piano" restano come opzioni secondarie sotto i template
5. La sezione "Cerca un professionista" viene spostata in fondo

### File: `src/pages/UserDietPage.tsx`

Nel blocco `if (!plan)` (riga 461-545):

- Sostituire l'header vuoto con il messaggio motivazionale
- Aggiungere una griglia di card per `systemTemplates`, ogni card mostra: titolo, kcal, P/C/F macro, note (troncate)
- Al click di una card, chiamare una nuova funzione `saveTemplateAsPlan(tmpl)` che:
  1. Inserisce un record in `diet_plans` con `professional_id = user.id`, `client_user_id = user.id`
  2. Copia i `diet_plan_template_meals` come `diet_plan_meal_targets`
  3. Aggiorna `nutrition_targets` con i macro del template
  4. Ricarica la pagina
- Spostare "Collega un professionista" e "Crea il tuo piano" sotto i template
- Spostare la sezione coach discovery in fondo

Nessuna modifica al database necessaria: i template di sistema sono già leggibili da tutti gli utenti autenticati (RLS policy "Read system templates").

