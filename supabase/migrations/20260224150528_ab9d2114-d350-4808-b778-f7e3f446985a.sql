
-- 1) recipes
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  difficulty text,
  prep_time_minutes int,
  cook_time_minutes int,
  servings int DEFAULT 1,
  is_public boolean DEFAULT false,
  instructions text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Helper: owns recipe's restaurant
CREATE OR REPLACE FUNCTION public.owns_recipe_restaurant(_recipe_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recipes r
    JOIN public.restaurants rest ON rest.id = r.restaurant_id
    WHERE r.id = _recipe_id AND rest.owner_id = auth.uid()
  );
$$;

-- RLS for recipes
CREATE POLICY "Restaurant owner manages recipes" ON public.recipes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = recipes.restaurant_id AND r.owner_id = auth.uid())
    OR current_user_is_admin()
  );
CREATE POLICY "Anyone reads public recipes" ON public.recipes
  FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

-- 2) recipe_ingredients
CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages recipe ingredients" ON public.recipe_ingredients
  FOR ALL USING (owns_recipe_restaurant(recipe_id) OR current_user_is_admin());
CREATE POLICY "Read public recipe ingredients" ON public.recipe_ingredients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.is_public = true)
    AND auth.uid() IS NOT NULL
  );

-- 3) allergens (reference table)
CREATE TABLE public.allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE
);
ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads allergens" ON public.allergens
  FOR SELECT USING (true);
CREATE POLICY "Admin manages allergens" ON public.allergens
  FOR ALL USING (current_user_is_admin());

-- Seed common allergens
INSERT INTO public.allergens (name, code) VALUES
  ('Glutine', 'gluten'),
  ('Crostacei', 'crustaceans'),
  ('Uova', 'eggs'),
  ('Pesce', 'fish'),
  ('Arachidi', 'peanuts'),
  ('Soia', 'soy'),
  ('Latte e derivati', 'milk'),
  ('Frutta a guscio', 'tree_nuts'),
  ('Sedano', 'celery'),
  ('Senape', 'mustard'),
  ('Semi di sesamo', 'sesame'),
  ('Anidride solforosa e solfiti', 'sulphites'),
  ('Lupini', 'lupins'),
  ('Molluschi', 'molluscs');

-- 4) recipe_allergens
CREATE TABLE public.recipe_allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES public.allergens(id),
  UNIQUE(recipe_id, allergen_id)
);
ALTER TABLE public.recipe_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages recipe allergens" ON public.recipe_allergens
  FOR ALL USING (owns_recipe_restaurant(recipe_id) OR current_user_is_admin());
CREATE POLICY "Read public recipe allergens" ON public.recipe_allergens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_allergens.recipe_id AND r.is_public = true)
    AND auth.uid() IS NOT NULL
  );

-- Allow reading restaurant info for public recipes
CREATE POLICY "Read restaurant info for public recipes" ON public.restaurants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.restaurant_id = restaurants.id AND r.is_public = true)
    AND auth.uid() IS NOT NULL
  );
