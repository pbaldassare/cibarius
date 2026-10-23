-- Users could update their own subscription (e.g. set status 'active') and insert
-- arbitrary rows; only Stripe webhooks (service role) and admins may do that now.
-- A user may only start their own restaurant trial, once.
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

-- Coupon codes were readable by every logged-in user; checkout validates them
-- server-side with the service role, so only admins need to read the table.
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.custom_coupons;
