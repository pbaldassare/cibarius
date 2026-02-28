
DROP POLICY IF EXISTS "Products update by admin" ON public.products;
CREATE POLICY "Products update by authenticated"
  ON public.products FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
