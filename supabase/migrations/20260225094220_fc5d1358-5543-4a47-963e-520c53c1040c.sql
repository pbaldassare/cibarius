
-- =============================================
-- PREPARATIONS MODULE
-- =============================================

-- A) preparations table
CREATE TABLE public.preparations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  storage_type TEXT NOT NULL DEFAULT 'frigo',
  use_by_date DATE NOT NULL,
  portions INT DEFAULT 1,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation: either owner_user_id or restaurant_id must be set
CREATE OR REPLACE FUNCTION public.validate_preparation_owner()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL AND NEW.restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Either owner_user_id or restaurant_id must be set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_preparation_owner
  BEFORE INSERT OR UPDATE ON public.preparations
  FOR EACH ROW EXECUTE FUNCTION public.validate_preparation_owner();

-- Validation: storage_type
CREATE OR REPLACE FUNCTION public.validate_preparation_storage()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.storage_type NOT IN ('frigo', 'freezer', 'ambiente') THEN
    RAISE EXCEPTION 'Invalid storage_type: %', NEW.storage_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_preparation_storage
  BEFORE INSERT OR UPDATE ON public.preparations
  FOR EACH ROW EXECUTE FUNCTION public.validate_preparation_storage();

-- RLS
ALTER TABLE public.preparations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User CRUD own preparations"
  ON public.preparations FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Restaurant owner CRUD preparations"
  ON public.preparations FOR ALL
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Restaurant members read preparations"
  ON public.preparations FOR SELECT
  USING (public.is_restaurant_accessible(restaurant_id));

CREATE POLICY "Admin full access preparations"
  ON public.preparations FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- B) preparation_ingredients table
CREATE TABLE public.preparation_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_id UUID NOT NULL REFERENCES public.preparations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  custom_name TEXT,
  quantity NUMERIC,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.preparation_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ingredients follow preparation access"
  ON public.preparation_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.preparations p
      WHERE p.id = preparation_id
      AND (
        p.owner_user_id = auth.uid()
        OR public.is_restaurant_owner(p.restaurant_id)
        OR public.is_restaurant_accessible(p.restaurant_id)
        OR public.current_user_is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.preparations p
      WHERE p.id = preparation_id
      AND (
        p.owner_user_id = auth.uid()
        OR public.is_restaurant_owner(p.restaurant_id)
        OR public.current_user_is_admin()
      )
    )
  );

-- C) preparation_allergens table
CREATE TABLE public.preparation_allergens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_id UUID NOT NULL REFERENCES public.preparations(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES public.allergens(id),
  UNIQUE(preparation_id, allergen_id)
);

ALTER TABLE public.preparation_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allergens follow preparation access"
  ON public.preparation_allergens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.preparations p
      WHERE p.id = preparation_id
      AND (
        p.owner_user_id = auth.uid()
        OR public.is_restaurant_owner(p.restaurant_id)
        OR public.is_restaurant_accessible(p.restaurant_id)
        OR public.current_user_is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.preparations p
      WHERE p.id = preparation_id
      AND (
        p.owner_user_id = auth.uid()
        OR public.is_restaurant_owner(p.restaurant_id)
        OR public.current_user_is_admin()
      )
    )
  );
