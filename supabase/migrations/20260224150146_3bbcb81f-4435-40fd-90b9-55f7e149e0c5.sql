
-- 1) suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  vat_number text,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Helper: owns supplier
CREATE OR REPLACE FUNCTION public.owns_supplier(_supplier_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.suppliers WHERE id = _supplier_id AND owner_user_id = auth.uid());
$$;

CREATE POLICY "Supplier select own" ON public.suppliers
  FOR SELECT USING (owner_user_id = auth.uid() OR current_user_is_admin());
CREATE POLICY "Supplier insert own" ON public.suppliers
  FOR INSERT WITH CHECK (owner_user_id = auth.uid() OR current_user_is_admin());
CREATE POLICY "Supplier update own" ON public.suppliers
  FOR UPDATE USING (owner_user_id = auth.uid() OR current_user_is_admin());

-- 2) supplier_invites
CREATE TABLE public.supplier_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_supplier_invite_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'used', 'disabled') THEN
    RAISE EXCEPTION 'Invalid supplier invite status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_supplier_invite_status BEFORE INSERT OR UPDATE ON public.supplier_invites
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_invite_status();

CREATE POLICY "Supplier manages own invites" ON public.supplier_invites
  FOR ALL USING (owns_supplier(supplier_id) OR current_user_is_admin());
CREATE POLICY "Auth users read active supplier invites" ON public.supplier_invites
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

-- 3) supplier_restaurants
CREATE TABLE public.supplier_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  invite_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, restaurant_id)
);
ALTER TABLE public.supplier_restaurants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_supplier_restaurant_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'revoked') THEN
    RAISE EXCEPTION 'Invalid supplier_restaurant status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_supplier_restaurant_status BEFORE INSERT OR UPDATE ON public.supplier_restaurants
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_restaurant_status();

-- Supplier sees own links
CREATE POLICY "Supplier sees own restaurant links" ON public.supplier_restaurants
  FOR SELECT USING (owns_supplier(supplier_id) OR current_user_is_admin());
-- Restaurant owner sees links to their restaurant
CREATE POLICY "Restaurant owner sees supplier links" ON public.supplier_restaurants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = supplier_restaurants.restaurant_id AND r.owner_id = auth.uid())
  );
-- Restaurant owner inserts (accepts invite)
CREATE POLICY "Restaurant owner inserts supplier link" ON public.supplier_restaurants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = supplier_restaurants.restaurant_id AND r.owner_id = auth.uid())
  );
-- Both can update (revoke)
CREATE POLICY "Supplier or restaurant updates link" ON public.supplier_restaurants
  FOR UPDATE USING (
    owns_supplier(supplier_id)
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = supplier_restaurants.restaurant_id AND r.owner_id = auth.uid())
    OR current_user_is_admin()
  );

-- 4) supplier_products (catalog/pricing)
CREATE TABLE public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  currency text DEFAULT 'EUR',
  unit text,
  availability text DEFAULT 'available',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, product_id)
);
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier manages own catalog" ON public.supplier_products
  FOR ALL USING (owns_supplier(supplier_id) OR current_user_is_admin());
-- Restaurant owner reads catalog of active linked suppliers
CREATE POLICY "Restaurant reads linked supplier catalog" ON public.supplier_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supplier_restaurants sr
      JOIN public.restaurants r ON r.id = sr.restaurant_id
      WHERE sr.supplier_id = supplier_products.supplier_id
        AND sr.status = 'active'
        AND r.owner_id = auth.uid()
    )
  );

-- 5) supplier_orders placeholder
CREATE TABLE public.supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  total numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supplier sees own orders" ON public.supplier_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_orders.supplier_id AND s.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = supplier_orders.restaurant_id AND r.owner_id = auth.uid())
    OR current_user_is_admin()
  );

-- Allow suppliers to read restaurant names for linked restaurants
CREATE POLICY "Supplier reads linked restaurants" ON public.restaurants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supplier_restaurants sr
      JOIN public.suppliers s ON s.id = sr.supplier_id
      WHERE sr.restaurant_id = restaurants.id
        AND s.owner_user_id = auth.uid()
        AND sr.status = 'active'
    )
  );
