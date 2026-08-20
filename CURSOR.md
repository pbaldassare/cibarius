# CURSOR.md — Guida al progetto Cibarius per AI agent esterni

> Questo documento è pensato per un AI agent (Cursor, Copilot, altri LLM) che deve leggere, modificare o estendere il codice di **Cibarius**. Fornisce contesto sufficiente per intervenire senza rompere convenzioni, sicurezza o architettura.

---

## 1. Cos'è Cibarius

Cibarius è una **web app PWA** che copre due mondi:

- **Consumer (User App)** — gestione dispensa, scadenze, diario alimentare, macro, anti-spreco, piani alimentari da nutrizionista.
- **Ristorante (Restaurant App)** — inventario operativo, HACCP (task ricorrenti, temperature, etichette di preparazione con QR di tracciabilità), gestione DDT/fornitori, ricette pubbliche.

Ruoli supportati (`app_role` enum in DB):

| Ruolo | Home | Descrizione |
|---|---|---|
| `user` | `/` | Utente consumer |
| `restaurant_owner` | `/restaurant` | Titolare/staff ristorante |
| `professional` | `/pro` | Nutrizionista / dietologo |
| `supplier` | `/supplier` | Fornitore |
| `admin` | `/admin` | Backoffice (solo browser desktop) |

Redirect post-login: `getRoleHomePath(role)` in `src/hooks/useRole.ts`.

---

## 2. Stack tecnico

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui (Radix), React Router v6, TanStack Query.
- **Package manager**: `bun` (lockfile committato).
- **Backend**: **Supabase esterno** (progetto ref `dqhzopbjhxyhgcpedskl`) — Postgres + Auth + Storage + Edge Functions (Deno).
- **Pagamenti**: Stripe (checkout + webhook firmato).
- **AI**: Lovable AI Gateway (Gemini / GPT), USDA + OpenFoodFacts per nutrizione.
- **PWA**: `public/sw.js` + `public/manifest.json`, install prompt custom (`PwaInstallProvider`).
- **PDF/immagini**: `jspdf`, `html2canvas`, `qrcode`.

Non è un progetto Next/Angular/Vue. Non aggiungere framework alternativi.

---

## 3. Struttura del repo

```
src/
  App.tsx                    # Routing principale + guard
  main.tsx
  index.css                  # Design tokens (HSL) + regole print
  components/
    ui/                      # shadcn primitives (non modificare la libreria, estendi)
    UserLayout.tsx, RestaurantLayout.tsx, MobileLayout.tsx, AdminLayout.tsx
    RoleGuard.tsx, ProtectedRoute.tsx, RestaurantGuard.tsx, AdminPwaGuard.tsx
    HaccpLabelPrintView.tsx, RestaurantAddFlow.tsx, AddFoodFlow.tsx, ...
  pages/
    auth/                    # login, signup, callback, reset
    admin/                   # backoffice
    restaurant/              # app ristorante operativa
    restaurant-admin/        # backoffice ristorante (staff, report, HACCP control)
    pro/                     # suite nutrizionista
    supplier/                # portale fornitore
    (root)                   # user app: Index, ExpiryPage, ScanPage, ...
  hooks/
    useAuth.tsx, useRole.ts, useRestaurant.ts, useSubscription.ts,
    usePwaInstall.tsx, useDebounce.ts, ...
  integrations/supabase/
    client.ts                # istanza supabase (usa anon key)
    types.ts                 # AUTOGENERATO — NON MODIFICARE
  lib/                       # utility: nutrition, barcode, product-dedup, ...
supabase/
  config.toml                # UN SOLO file, gestisce verify_jwt per ogni function
  functions/<name>/index.ts  # Edge Functions Deno
  migrations/                # SQL migrations — NON editare a mano, usare il tool
public/
  sw.js, manifest.json, icons/
```

---

## 4. Routing e guard (vedi `src/App.tsx`)

Tutte le route protette vivono dentro `<ProtectedRoute />`. Sopra ci sono le route pubbliche:
`/auth/*`, `/reset-password`, `/join/:code`, `/n/:slug`, `/haccp/label/:token`.

Guard disponibili:

- **`ProtectedRoute`** — richiede sessione Supabase valida.
- **`RoleGuard allowedRoles={[...]}`** (alias `<RG>`) — filtra per ruolo.
- **`RestaurantGuard`** — richiede che l'utente abbia un ristorante configurato, altrimenti redirect a `/restaurant/onboarding`.
- **`AdminPwaGuard`** — blocca le route `/admin/*` quando l'app gira come PWA installata (backoffice desktop only).

Layout per contesto:

- `UserLayout` — bottom nav 6 tab, `max-w-lg`.
- `RestaurantLayout` — bottom nav operativa, `max-w-2xl`.
- `MobileLayout` — layout generico (pro, supplier, onboarding).
- `AdminLayout` / `RestaurantAdminLayout` — sidebar desktop, sfondo primario.

Quando aggiungi una route: inseriscila nel blocco del layout corretto in `src/App.tsx` e avvolgila nel `RoleGuard` giusto.

---

## 5. Auth e ruoli

- **Provider**: Supabase Auth, email/password, **senza email confirmation** (vedi memoria `auth/signup-flow-v2`).
- Callback centralizzato: `/auth/callback` gestisce PKCE (`code` + `token_hash`).
- Hook chiave:
  - `useAuth()` → `{ user, session, loading, signIn, signUp, signOut }`.
  - `useRole()` → `{ role, profile, isLoading }` (legge `profiles`).
  - `useSubscription(planType)` → `{ isActive, isLoading, ... }`.
  - `useRestaurant()` → ristorante corrente per `restaurant_owner`.

**Ruoli in tabella separata**: `user_roles` con enum `app_role`. Controllo via funzione SECURITY DEFINER `public.has_role(_user_id, _role)`. **Mai** salvare il ruolo su `profiles` per RLS (prevenire privilege escalation).

---

## 6. Design system

Regole non negoziabili (memoria `Core`):

- **Sfondo app**: `#F5F7FA`.
- **Primary**: `BrandGradient` blu 135° `#22B6F2 → #0B7DBE`.
- **Card**: borderless, `rounded-[18px]`, `shadow-card`.
- **Arancione SOLO per alert/scadenze**. Mai come colore decorativo.
- **Tipografia**: display `Fredoka` / `Baloo 2`, body `Inter` / `Nunito Sans`. **Mai** serif.
- **Tutti i colori sono token HSL** dichiarati in `src/index.css` e mappati in `tailwind.config.ts`. **Vietato** hardcodare `text-white`, `bg-black`, `bg-[#xxx]` nei componenti — rompono il theming.
- Sidebar admin/pro = blu primario pieno.
- Bottom nav utente = 6 tab.

Prima di introdurre un colore nuovo: aggiungilo come token in `index.css` (variante light + dark) e come classe utility in `tailwind.config.ts`.

---

## 7. Database (Supabase)

~90 tabelle nel schema `public`. Domini principali:

- **Inventario / prodotti**: `products`, `inventory_items`, `inventory_item_photos`, `inventory_item_allergens`, `product_submissions`, `user_product_favorites`.
- **HACCP**: `haccp_templates`, `haccp_template_tasks`, `haccp_tasks`, `haccp_logs`, `haccp_equipment`, `haccp_temperature_logs`, `haccp_task_photos`, `haccp_audit_log`, `haccp_documents`, `haccp_preparation_labels`, `haccp_preparation_ingredients`, `haccp_preparation_documents`, `haccp_label_audit_log`.
- **Preparazioni & ricette**: `preparations`, `preparation_ingredients`, `preparation_allergens`, `recipes`, `recipe_ingredients`, `recipe_allergens`, `template_recipes`.
- **Diario / nutrizione**: `meals`, `meal_items`, `meal_days`, `meal_logs`, `meal_log_ingredients`, `daily_progress`, `nutrition_targets`, `quick_day_logs`, `user_favorite_meals`, `favorite_meal_items`, `food_templates`, `ingredients`.
- **Piani**: `diet_plans`, `diet_plan_items`, `diet_plan_meal_targets`, `diet_plan_templates`, `diet_plan_template_meals`, `nutrition_plans`, `nutrition_plan_weeks/days/meals`.
- **Professional**: `professional_profiles`, `client_links`, `professional_link_requests`, `professional_notes`, `pro_suggestions`, `pro_meal_text_suggestions`, `appointments`, `messages`, `nutritionist_coupons`, `nutritionist_commissions`.
- **Ristorante / fornitore**: `restaurants`, `restaurant_members`, `restaurant_documents`, `suppliers`, `supplier_products`, `supplier_restaurants`, `supplier_orders`, `supplier_invites`.
- **Subscription / pagamenti**: `subscription_plans`, `subscriptions`, `subscription_payments`, `stripe_payments`, `stripe_settings`, `custom_coupons`, `manual_subscription_overrides`.
- **Admin / sistema**: `admin_audit_log`, `ai_cache`, `ai_usage_log`, `api_keys`, `email_notifications_log`, `email_preferences`, `in_app_notifications`, `support_requests`, `attachments`, `product_usage_log`, `waste_savings`.

### Regole tassative sulle migrazioni

1. **Usare sempre il tool di migrazione**, mai editare a mano `supabase/migrations/`.
2. **Ogni `CREATE TABLE public.X` DEVE avere subito i `GRANT`** (senza, PostgREST fallisce con permission denied):
   ```sql
   CREATE TABLE public.foo (...);
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.foo TO authenticated;
   GRANT ALL ON public.foo TO service_role;
   -- GRANT SELECT ON public.foo TO anon;  -- solo se davvero pubblica
   ALTER TABLE public.foo ENABLE ROW LEVEL SECURITY;
   CREATE POLICY ... ;
   ```
3. **RLS obbligatoria** su ogni nuova tabella. Usa `has_role(auth.uid(), 'admin')` invece di join ricorsivi su `user_roles`.
4. **Validazioni temporali** → usa trigger, **mai** `CHECK` (deve essere immutabile).
5. **Vietato** modificare gli schemi `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
6. **Vietato** editare `src/integrations/supabase/types.ts` (rigenerato dall'API).

---

## 8. Business logic chiave

- **Add flow ristorante** (`RestaurantAddFlow.tsx`): FAB `+` → scelta *Prodotto* vs *Preparazione*, poi AI (OCR/foto) o manuale.
- **HACCP Preparation Labels**: creazione preparazione → trigger DB genera etichetta draft → editor ingredienti + DDT collegati → stampa (small/medium/A4) con QR → pagina pubblica `/haccp/label/:token` con timeline audit + export PDF (jsPDF + html2canvas).
- **Scadenze**: home mostra prima le scadenze (lista `urgentList`), poi HACCP. Swipe/mass action per risolvere.
- **Diario pasti**: `meal_logs` deduce dalla dispensa (`pantry-deduction.ts`), calcola macro vs `nutrition_targets`, suggerisce ricette che completano il budget rimanente.
- **Anti-waste**: `/anti-waste` propone ricette da ingredienti in scadenza usando `ingredient_compatibility_matrix`.
- **Referral nutrizionista**: cookie 30gg su `/n/:slug`, auto-link post-signup, commission tracking.
- **Offline sync**: IndexedDB queue via `safeSupabaseOp` in `lib/offline-sync.ts`, inizializzata in `main.tsx`.
- **Subscription**: piani `user_plus`, `restaurant_pro`, `professional_pro`. Verifica server via `subscriptions` table (i guard UI `PlusGuard`/`PlanProgressGuard` sono stati rimossi perche' non piu' referenziati).

---

## 9. Edge Functions (`supabase/functions/`)

`verify_jwt` è configurato in `supabase/config.toml`. **Molte function hanno `verify_jwt = false`** perché fanno auth manuale via `supabase.auth.getUser(token)` oppure sono pubbliche.

Principali:

| Function | Scopo |
|---|---|
| `extract-expiry`, `extract-product`, `extract-invoice` | OCR + AI su foto prodotto / scontrino / fattura |
| `analyze-food-photos`, `analyze-meal-photo`, `analyze-restaurant-photos` | Analisi immagini per inventario / diario |
| `search-food`, `seed-off-products` | Ricerca nutrizionale (USDA/OFF) + seeding |
| `generate-meal-recipe`, `suggest-meal` | Ricette AI su budget macro / dispensa |
| `extract-diet-template` | Import PDF piani nutrizionista |
| `parse-receipt-qr` | Parsing QR scontrino elettronico (no SSRF: parse diretto) |
| `get-haccp-label` | Endpoint pubblico traceability etichetta HACCP |
| `create-checkout-session`, `stripe-webhook` | Stripe (webhook firma **obbligatoria**) |
| `validate-coupon`, `process-coupon-payment` | Coupon nutrizionisti |
| `send-email`, `send-expiry-alerts`, `auth-email-hook` | Email transazionali (branded, in italiano) |
| `create-user`, `delete-user` | Admin user management |

**Regole**:
- **Mai** esporre `SUPABASE_SERVICE_ROLE_KEY` al frontend. Usalo solo dentro Edge Functions via `Deno.env.get(...)`.
- Chiamate dal frontend usano sempre la anon key (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- Secrets si aggiungono via tool `add_secret`, non a codice.
- Stripe webhook verifica firma reale (no dev-mode bypass).

---

## 10. Integrazioni esterne

- **Stripe** — subscription + one-off, webhook firmato. Config in `stripe_settings`.
- **Lovable AI Gateway** — provider LLM/vision unificato per tutte le function AI.
- **USDA FoodData Central + OpenFoodFacts** — nutrition fallback multi-layer (`nutritional-fallback-system`).

---

## 11. Convenzioni di sviluppo

- **Import Supabase**: `import { supabase } from "@/integrations/supabase/client";`
- **Realtime**: sempre dentro `useEffect` con `return () => supabase.removeChannel(channel)`. Mai al top-level (leak + billing).
- **Query limit**: Supabase risponde max 1000 righe di default — usa `.range()` per pagination.
- **Nessun colore/font hardcoded** — solo token.
- **Componenti piccoli e focalizzati**. Nuovi file invece di gonfiare quelli esistenti.
- **Preferire `line_replace`** rispetto a riscritture complete per file esistenti.
- **Test**: Vitest (`bunx vitest run`), setup in `src/test/setup.ts`. Edge functions testabili con Deno (`*_test.ts` accanto a `index.ts`).
- **Typecheck**: `tsgo` (non `tsc --noEmit`).
- **Head metadata**: `index.html` deve avere `<title>` e `<meta description>` reali (no default "Lovable App"). Un solo `<h1>` per pagina.

---

## 12. Comandi utili

```bash
bun install                 # deps
bun run dev                 # Vite dev server su :8080
bun run build               # build produzione
bunx vitest run             # test unit
tsgo                        # typecheck
```

Migrations e deploy edge functions sono automatici tramite l'agent Lovable, non serve `supabase db push` manuale.

---

## 13. Note operative per un AI agent esterno

**Da leggere per primo** quando entri nel progetto:

1. `AGENT.md` — panoramica generata precedentemente (più dettagliata sui componenti).
2. `README.md` — quickstart Vite/Lovable.
3. `src/App.tsx` — mappa completa route + guard.
4. `src/index.css` + `tailwind.config.ts` — design tokens.
5. `src/integrations/supabase/types.ts` — schema DB (sola lettura).
6. `supabase/config.toml` — quali function sono pubbliche.

**Prima di modificare**:

- Cerca pattern esistenti con `rg` (es. `rg "useSubscription" src/`) prima di reinventare hook.
- Se aggiungi una tabella: crea la migration con GRANT + RLS nella stessa transazione.
- Se aggiungi una route: metti la nel `RoleGuard` giusto e nel layout corretto.
- Se aggiungi UI: usa shadcn primitives da `src/components/ui`, token di colore semantici.
- Se aggiungi una edge function: aggiorna `supabase/config.toml` (`verify_jwt`) e non introdurre SSRF (mai fare `fetch(url)` di URL arbitrari forniti dall'utente).

**Da NON toccare mai**:

- `src/integrations/supabase/types.ts` (autogenerato).
- Schemi `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- File esistenti in `supabase/migrations/` (append-only via tool).
- La libreria shadcn in `src/components/ui/*` (estendi con wrapper, non alterare l'API).
- `public/sw.js` senza motivo — bumpare la cache version se lo tocchi.

**Sicurezza**:

- Nessun secret nel repo o nel DB (usa Supabase Secrets → `Deno.env`).
- `service_role_key` **solo** server-side.
- Ogni edge function autenticata deve validare `authorization` header con `supabase.auth.getUser(token)`.
- RLS su tutto ciò che tocca dati utente.

---

_Ultima revisione: luglio 2026 — mantenere allineato quando cambia routing, ruoli o schema DB._
