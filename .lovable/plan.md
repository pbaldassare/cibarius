# Documentazione per Cursor

Creo un file `CURSOR.md` nella root del progetto, pensato come guida completa per un AI agent esterno (es. Cursor) che deve lavorare sul codice di Cibarius.

## Contenuto del file

1. **Overview del prodotto** — cos'è Cibarius, ruoli supportati (user, restaurant_owner, professional, supplier, admin), app separate (User / Restaurant / Pro / Supplier / Admin).
2. **Stack tecnico** — React 18 + Vite 5 + TypeScript 5, Tailwind v3, shadcn/ui, React Router, TanStack Query, Supabase (progetto esterno `dqhzopbjhxyhgcpedskl`), Stripe, Edge Functions Deno.
3. **Struttura cartelle** — `src/pages`, `src/components`, `src/hooks`, `src/integrations/supabase`, `supabase/functions`, `supabase/migrations`.
4. **Routing e guard** — mappa completa da `src/App.tsx`: `ProtectedRoute`, `RoleGuard`, `RestaurantGuard`, `PlusGuard`, `PlanProgressGuard`, `AdminPwaGuard`. Layout per ruolo (`UserLayout`, `RestaurantLayout`, `MobileLayout`, `AdminLayout`).
5. **Auth e ruoli** — Supabase Auth senza conferma email, tabella `profiles` con enum ruolo, redirect dinamico via `getRoleHomePath`, hook `useAuth` / `useRole` / `useSubscription`.
6. **Design system** — token in `src/index.css` + `tailwind.config.ts`, BrandGradient blu, card borderless radius 18, tipografia Fredoka/Inter, regola "arancione solo per alert", divieto di colori hardcoded.
7. **Database** — elenco tabelle principali per dominio (inventory, HACCP, diet plans, professional, supplier, subscriptions), pattern RLS con `has_role` SECURITY DEFINER, obbligo di `GRANT` esplicito su ogni tabella `public`.
8. **Business logic chiave** — flusso spesa/scadenze, HACCP preparation labels + QR pubblico + timeline audit, diet plans e meal tracking, referral nutrizionista, anti-waste, offline sync via IndexedDB.
9. **Edge Functions** — elenco con scopo (extract-expiry, extract-invoice, analyze-*, get-haccp-label, stripe-webhook, create-checkout-session, send-*, ecc.) e note su `verify_jwt` in `supabase/config.toml`.
10. **Integrazioni esterne** — Stripe (checkout + webhook firmato), Lovable AI Gateway, USDA/OpenFoodFacts per nutrizione.
11. **Convenzioni di sviluppo** — no service_role in frontend, secrets via `Deno.env`, mai editare `src/integrations/supabase/types.ts`, migrazioni solo tramite tool, realtime dentro `useEffect` con cleanup.
12. **Comandi utili** — `bun install`, `bun run dev`, `bunx vitest run`, `tsgo`.
13. **Note per AI agent esterno** — file da leggere per prima cosa (`AGENT.md`, `README.md`, `src/App.tsx`, `src/index.css`, `tailwind.config.ts`), come cercare pattern, come proporre migrazioni SQL, cosa NON toccare (schemi `auth`/`storage`, tipi Supabase, config Lovable).

## File toccati

- **Nuovo**: `CURSOR.md` (root del repo).

Nessuna altra modifica al codice.
