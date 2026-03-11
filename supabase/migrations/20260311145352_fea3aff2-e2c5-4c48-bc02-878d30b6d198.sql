
-- Allow anonymous users to read active coupons (only needed for public nutritionist pages)
CREATE POLICY "Anon reads active coupons" ON public.nutritionist_coupons
  FOR SELECT TO anon
  USING (is_active = true);
