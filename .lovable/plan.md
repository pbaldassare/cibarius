

# Piano: Pagina dedicata "Il mio piano attivo" con dettaglio giornaliero

## Contesto
Quando l'utente attiva un template, i dati salvati sono:
- **`diet_plans`**: macro giornalieri totali (kcal, P, C, G)
- **`diet_plan_meal_targets`**: target per pasto (colazione, pranzo, cena, spuntino) con kcal e macro
- **`diet_plan_items`**: alimenti prescritti per pasto (opzionali, tipicamente vuoti per i template di sistema)

I template non hanno variazione settimanale — lo schema è lo stesso ogni giorno. La pagina mostrerà il piano giornaliero con lo spaccato per pasto.

## Modifiche

### 1. Nuova pagina: `src/pages/UserActivePlanPage.tsx`
Pagina dedicata al piano attivo con:
- **Header** con titolo del piano e badge "Attivo"
- **Card riassuntiva** con macro giornalieri totali (kcal, P, C, G) e note
- **Spaccato per pasto** (colazione → pranzo → spuntino → cena), ogni pasto mostra:
  - Nome pasto con emoji
  - Target kcal e macro (P/C/G)
  - Progresso di oggi vs target (barra + badge stato)
  - Alimenti prescritti (se presenti, espandibili)
  - Bottone "Aggiungi" che porta a `/meals`
- **Bottone "Cambia piano"** in fondo che naviga a `/diet`

### 2. Aggiornare la navbar: `src/components/UserBottomNav.tsx`
- Rinominare il tab "Piano" da `/diet` a `/plan` (pagina piano attivo)
- `/diet` resta la pagina di selezione template

### 3. Aggiornare le route: `src/App.tsx`
- Aggiungere `<Route path="/plan" element={<UserActivePlanPage />} />`
- Import della nuova pagina

### 4. Aggiornare `src/pages/UserDietPage.tsx`
- Dopo l'attivazione di un template (`saveTemplateAsPlan`), fare `navigate("/plan")` invece di restare sulla stessa pagina
- Nella pagina `/diet` (selezione template), aggiungere un link "Vedi il tuo piano attivo →" in alto se esiste un piano attivo

### 5. Struttura della nuova pagina

```text
┌─────────────────────────────┐
│  ← Il mio piano             │
├─────────────────────────────┤
│  Digiuno intermittente 16:8 │
│  - Donna              [Attivo]│
│  🔥 1700 kcal               │
│  P 100g  C 200g  G 60g     │
│  📝 Solo pranzo+cena+spunt. │
├─────────────────────────────┤
│  Progresso di oggi           │
│  ████████░░░ 68% (1156/1700) │
│  P ██░░ 45/100g             │
│  C ████░ 120/200g           │
│  G ███░░ 38/60g             │
├─────────────────────────────┤
│  🌤️ Pranzo         680 kcal │
│  ████████░░ 72%             │
│  P 40g C 80g G 24g         │
│  [+ Aggiungi]               │
├─────────────────────────────┤
│  🍎 Spuntino       170 kcal │
│  ░░░░░░░░░░ 0%              │
│  Da registrare              │
│  [+ Aggiungi]               │
├─────────────────────────────┤
│  🌙 Cena           850 kcal │
│  ░░░░░░░░░░ 0%              │
│  Da registrare              │
│  [+ Aggiungi]               │
├─────────────────────────────┤
│  [🔄 Cambia piano]          │
└─────────────────────────────┘
```

I dati vengono caricati dalle stesse tabelle già usate in `UserDietPage`: `diet_plans`, `diet_plan_meal_targets`, `diet_plan_items`, `meal_days/meals/meal_items` (per il progresso di oggi).

