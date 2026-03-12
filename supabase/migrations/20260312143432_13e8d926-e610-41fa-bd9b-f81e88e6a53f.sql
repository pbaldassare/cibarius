
-- Subscription plans (system-defined)
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  role_type text NOT NULL,
  monthly_price numeric,
  trial_days integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages plans" ON public.subscription_plans
  FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('restaurant', 'user_plus')),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  start_date timestamptz NOT NULL DEFAULT now(),
  trial_end_date timestamptz,
  next_billing_date timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin manages subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY "System inserts subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "User updates own subscription" ON public.subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Seed plans
INSERT INTO public.subscription_plans (plan_name, role_type, monthly_price, trial_days, description) VALUES
  ('Restaurant', 'restaurant', 19, 30, 'Modulo HACCP, gestione scadenze, controlli attività, report, gestione staff, registro controlli'),
  ('User Plus', 'user', NULL, 0, 'Piani alimentari personalizzati, macro nutrienti, collegamento nutrizionista, monitoraggio avanzato');
