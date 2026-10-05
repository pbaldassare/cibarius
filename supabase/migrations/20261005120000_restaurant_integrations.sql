-- Integrazioni carico magazzino (Fase 1): chiavi API per ristorante, idempotenza, log run.

CREATE TABLE public.restaurant_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  scopes text[] NOT NULL DEFAULT '{ingest:write}',
  UNIQUE (key_hash)
);

CREATE INDEX restaurant_api_keys_restaurant_idx ON public.restaurant_api_keys (restaurant_id);

ALTER TABLE public.restaurant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners manage api keys"
  ON public.restaurant_api_keys
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE TABLE public.integration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  connector_type text NOT NULL DEFAULT 'rest_api',
  status text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped')),
  idempotency_key text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX integration_runs_restaurant_created_idx
  ON public.integration_runs (restaurant_id, created_at DESC);

ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners read integration runs"
  ON public.integration_runs
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id));

CREATE TABLE public.integration_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  run_id uuid REFERENCES public.integration_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, idempotency_key)
);

CREATE INDEX integration_idempotency_restaurant_idx
  ON public.integration_idempotency (restaurant_id);

ALTER TABLE public.integration_idempotency ENABLE ROW LEVEL SECURITY;
-- Nessuna policy client: scrittura solo via service role (edge function).

COMMENT ON TABLE public.restaurant_api_keys IS 'Chiavi API scoped per ristorante (ingest magazzino).';
COMMENT ON TABLE public.integration_runs IS 'Log esecuzioni connettori di carico automatico.';
COMMENT ON TABLE public.integration_idempotency IS 'Evita doppi carichi per stessa chiave logica.';
