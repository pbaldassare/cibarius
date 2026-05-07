## 1. Riordino navbar utente (sposta "Pasti" accanto a "Scadenze")

**File:** `src/components/UserBottomNav.tsx`

Nuovo ordine dei 6 tab:
```
Home · Scadenze · Pasti · Piano · Progressi · Profilo
```

Modifica solo l'array `tabs[]` (e relativo `tourIds`). Nessun altro impatto.

## 2. Paywall Piano + Progressi (€2,99/mese · €29,90/anno · 7 gg gratis)

### Logica accesso
Un utente vede `/plan` e `/progress` se **almeno una** è vera:
- ha una `subscription` con `plan_type = 'user_plus'` e `status IN ('trial','active')`
- ha un `manual_subscription_overrides` valido (admin-grant)
- è collegato a un nutrizionista attivo (`user_nutritionist_links.is_active = true` come `client_user_id`)

Altrimenti viene mostrato un **popup CTA** (modale a tutta pagina, non dismissibile) con:
- titolo "Piani alimentari, controllo calorie e progressi"
- elenco benefici
- prezzo €2,99/mese o €29,90/anno
- badge "7 giorni gratis"
- bottone "Inizia 7 giorni gratis" → naviga a `/subscription`
- bottone "Torna indietro"

### Implementazione

**Nuovo file** `src/components/PlanProgressGuard.tsx`
- Usa `useSubscription("user_plus")` + nuovo hook leggero `useNutritionistLink()` che fa `select id from user_nutritionist_links where client_user_id=auth.uid() and is_active=true limit 1`.
- Se uno dei due è attivo → render `children`.
- Altrimenti → render `<UpgradeScreen planType="user_plus" />` (aggiornato).

**File** `src/App.tsx` — wrappare le due route:
```tsx
<Route path="/plan" element={<PlanProgressGuard><UserActivePlanPage /></PlanProgressGuard>} />
<Route path="/progress" element={<PlanProgressGuard><UserProgressPage /></PlanProgressGuard>} />
```

Tutte le sotto-route attualmente PlusGuard (`/measurements`) restano col guard esistente. La pagina `/diet` (UserDietPage) già ha il check `plusActive` interno; rimane invariata.

**File** `src/components/UpgradeScreen.tsx` — aggiornare blocco `user_plus`:
- price: `Da €2,99/mese`
- trial: `7 giorni gratis`
- titolo: `Sblocca Piano e Progressi`
- features: aggiungere "Monitoraggio progressi e misurazioni"

## 3. Database — aggiornamento prezzi e trial

Migration:
```sql
UPDATE public.subscription_plans
SET local_price = 2.99, monthly_price = 2.99, trial_days = 7
WHERE plan_name = 'User Plus Monthly';

UPDATE public.subscription_plans
SET local_price = 29.90, monthly_price = 29.90, trial_days = 7
WHERE plan_name = 'User Plus Yearly';
```

Nessun nuovo schema: `subscriptions`, `subscription_payments`, `manual_subscription_overrides` esistono già. Lato admin `AdminSubscriptionsPage` continua a mostrare tutto (filtra per `plan_type = 'user_plus'` + restaurant) — nessuna modifica richiesta.

## 4. Stripe

Secret `STRIPE_SECRET_KEY` già presente. Edge function `create-checkout-session` e `stripe-webhook` già attive. Manca solo il `stripe_price_id` per il piano Yearly nel DB; lo lasciamo `NULL` per ora — quando l'utente avrà il Price ID lo aggiorneremo manualmente. Il flusso già supporta entrambi i casi (passa `plan_id` al checkout).

## File modificati / creati
- `src/components/UserBottomNav.tsx` (riordino tab)
- `src/components/PlanProgressGuard.tsx` (nuovo)
- `src/components/UpgradeScreen.tsx` (testi/prezzi)
- `src/App.tsx` (wrap delle due route)
- migration SQL su `subscription_plans`

## Cosa NON cambia
- Schema DB (tabelle già esistono).
- Edge functions Stripe.
- Admin pages.
- Logica di `PlusGuard` esistente.
