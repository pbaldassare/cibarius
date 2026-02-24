
-- 1. Products catalog
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  unit TEXT,
  barcode TEXT,
  image_url TEXT,
  calories_100g NUMERIC,
  macros_100g JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  storage_type TEXT NOT NULL DEFAULT 'frigo',
  expiry_date DATE,
  notes TEXT,
  calories_total NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation: storage_type
CREATE OR REPLACE FUNCTION public.validate_storage_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.storage_type NOT IN ('frigo', 'freezer', 'ambiente') THEN
    RAISE EXCEPTION 'Invalid storage_type: %', NEW.storage_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_storage_type_trigger
  BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_storage_type();

-- Validation: owner_user_id or restaurant_id must be set
CREATE OR REPLACE FUNCTION public.validate_inventory_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_user_id IS NULL AND NEW.restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Either owner_user_id or restaurant_id must be set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_inventory_owner_trigger
  BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_owner();

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Products: SELECT for all logged in
CREATE POLICY "Products readable by authenticated" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Products: INSERT/UPDATE only admin
CREATE POLICY "Products insert by admin" ON public.products
  FOR INSERT WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Products update by admin" ON public.products
  FOR UPDATE USING (public.current_user_is_admin());

-- Inventory: SELECT
CREATE POLICY "Inventory select own or restaurant member or admin" ON public.inventory_items
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.restaurant_members rm
      WHERE rm.restaurant_id = inventory_items.restaurant_id AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = inventory_items.restaurant_id AND r.owner_id = auth.uid()
    )
    OR public.current_user_is_admin()
  );

-- Inventory: INSERT
CREATE POLICY "Inventory insert own or restaurant owner or admin" ON public.inventory_items
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = inventory_items.restaurant_id AND r.owner_id = auth.uid()
    )
    OR public.current_user_is_admin()
  );

-- Inventory: UPDATE
CREATE POLICY "Inventory update own or restaurant owner or admin" ON public.inventory_items
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = inventory_items.restaurant_id AND r.owner_id = auth.uid()
    )
    OR public.current_user_is_admin()
  );

-- Inventory: DELETE
CREATE POLICY "Inventory delete own or restaurant owner or admin" ON public.inventory_items
  FOR DELETE USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = inventory_items.restaurant_id AND r.owner_id = auth.uid()
    )
    OR public.current_user_is_admin()
  );
