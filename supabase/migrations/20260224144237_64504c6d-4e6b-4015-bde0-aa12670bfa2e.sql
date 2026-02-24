
-- Allow any authenticated user to insert products (needed when adding inventory items with new products)
DROP POLICY "Products insert by admin" ON public.products;
CREATE POLICY "Products insert by authenticated" ON public.products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
