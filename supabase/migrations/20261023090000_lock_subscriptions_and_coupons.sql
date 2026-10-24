-- Un utente poteva aggiornare il proprio abbonamento (es. status = 'active')
-- e crearne uno in qualunque stato: l'accesso a pagamento si regalava da solo.
-- Gli stati veri li scrive il webhook Stripe con la service role; dal browser
-- resta solo la prova di 30 giorni che l'onboarding del ristorante crea, una
-- volta sola per utente.
DROP POLICY IF EXISTS "User updates own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "System inserts subscriptions" ON public.subscriptions;

CREATE POLICY "User starts own restaurant trial" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND plan_type = 'restaurant'
    AND status = 'trial'
    AND trial_end_date <= now() + interval '31 days'
    AND is_free_override = false
    AND stripe_customer_id IS NULL
    AND stripe_subscription_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid() AND s.plan_type = 'restaurant'
    )
  );

-- I codici sconto si validano nella edge function con la service role: la
-- lettura diretta permetteva a ogni utente di elencarli tutti.
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.custom_coupons;
