
-- =============================================
-- Stripe integration: extend existing tables + new tables
-- =============================================

-- 1. Extend subscription_plans with missing columns
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS local_price numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Rename plan_name to name if needed (keep plan_name too for compat)
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS name text;
UPDATE public.subscription_plans SET name = plan_name WHERE name IS NULL;

-- Clear existing seed data and re-seed with proper plans
DELETE FROM public.subscription_plans;
INSERT INTO public.subscription_plans (plan_name, name, role_type, billing_interval, local_price, monthly_price, stripe_product_id, trial_days, is_active) VALUES
  ('Restaurant Monthly', 'Restaurant Monthly', 'restaurant', 'monthly', 19.90, 19.90, 'prod_U8R7BfSC5jv1nb', 30, true),
  ('Restaurant Yearly', 'Restaurant Yearly', 'restaurant', 'yearly', 199.00, 199.00, 'prod_U8R7BfSC5jv1nb', 30, true),
  ('User Plus Monthly', 'User Plus Monthly', 'user_plus', 'monthly', 2.49, 2.49, 'prod_U8R6VrHT9xOK2p', 0, true),
  ('User Plus Yearly', 'User Plus Yearly', 'user_plus', 'yearly', 19.90, 19.90, 'prod_U8R6VrHT9xOK2p', 0, true);

-- 2. Extend subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS is_free_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_override_reason text,
  ADD COLUMN IF NOT EXISTS granted_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. stripe_payments table
CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on stripe_payments" ON public.stripe_payments FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "User can read own payments" ON public.stripe_payments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. stripe_settings
CREATE TABLE IF NOT EXISTS public.stripe_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  publishable_key_masked text,
  secret_key_masked text,
  webhook_secret_masked text,
  environment text NOT NULL DEFAULT 'live',
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on stripe_settings" ON public.stripe_settings FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

INSERT INTO public.stripe_settings (publishable_key_masked, secret_key_masked, webhook_secret_masked, environment) VALUES
  ('pk_live_...T0Ia', 'sk_live_...Vsp', '', 'live');

-- 5. custom_coupons
CREATE TABLE IF NOT EXISTS public.custom_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  applies_to_role_type text,
  applies_to_plan_id uuid REFERENCES public.subscription_plans(id),
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on custom_coupons" ON public.custom_coupons FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Anyone can read active coupons" ON public.custom_coupons FOR SELECT TO authenticated USING (is_active = true);

-- 6. manual_subscription_overrides
CREATE TABLE IF NOT EXISTS public.manual_subscription_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_type text NOT NULL,
  override_type text NOT NULL DEFAULT 'free',
  reason text,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  granted_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_subscription_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on overrides" ON public.manual_subscription_overrides FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "User can read own overrides" ON public.manual_subscription_overrides FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 7. admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on audit_log" ON public.admin_audit_log FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- Add read policy for subscription_plans for all authenticated
CREATE POLICY "Anyone can read active plans" ON public.subscription_plans FOR SELECT TO authenticated USING (is_active = true);
