
-- 1) nutrition_targets
CREATE TABLE public.nutrition_targets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kcal_day NUMERIC NOT NULL DEFAULT 2000,
  protein_g NUMERIC DEFAULT 120,
  carbs_g NUMERIC DEFAULT 220,
  fats_g NUMERIC DEFAULT 70,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own targets" ON public.nutrition_targets FOR ALL USING (user_id = auth.uid() OR public.current_user_is_admin());

-- 2) meal_days
CREATE TABLE public.meal_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_date)
);
ALTER TABLE public.meal_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own meal_days" ON public.meal_days FOR ALL USING (user_id = auth.uid() OR public.current_user_is_admin());

-- 3) meals
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_day_id UUID NOT NULL REFERENCES public.meal_days(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Helper to check meal_day ownership
CREATE OR REPLACE FUNCTION public.owns_meal_day(_meal_day_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.meal_days WHERE id = _meal_day_id AND user_id = auth.uid());
$$;

CREATE POLICY "Users own meals" ON public.meals FOR ALL USING (public.owns_meal_day(meal_day_id) OR public.current_user_is_admin());

-- Validate meal_type
CREATE OR REPLACE FUNCTION public.validate_meal_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.meal_type NOT IN ('colazione', 'pranzo', 'cena', 'spuntino') THEN
    RAISE EXCEPTION 'Invalid meal_type: %', NEW.meal_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_meal_type_trigger
  BEFORE INSERT OR UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.validate_meal_type();

-- 4) meal_items
CREATE TABLE public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  custom_name TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  calories NUMERIC,
  macros JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

-- Helper to check meal ownership via meal->meal_day
CREATE OR REPLACE FUNCTION public.owns_meal(_meal_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meals m
    JOIN public.meal_days md ON md.id = m.meal_day_id
    WHERE m.id = _meal_id AND md.user_id = auth.uid()
  );
$$;

CREATE POLICY "Users own meal_items" ON public.meal_items FOR ALL USING (public.owns_meal(meal_id) OR public.current_user_is_admin());

-- Validate source_type
CREATE OR REPLACE FUNCTION public.validate_meal_item_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type NOT IN ('product', 'inventory_item', 'custom') THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_meal_item_source_trigger
  BEFORE INSERT OR UPDATE ON public.meal_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_meal_item_source();
