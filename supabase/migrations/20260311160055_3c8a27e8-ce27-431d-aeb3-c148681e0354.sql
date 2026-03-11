
-- 1. Ingredient categories table
CREATE TABLE public.ingredient_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  UNIQUE(ingredient_name)
);

ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads ingredient_categories"
  ON public.ingredient_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manages ingredient_categories"
  ON public.ingredient_categories FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- 2. Compatibility matrix table
CREATE TABLE public.ingredient_compatibility_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_a text NOT NULL,
  category_b text NOT NULL,
  is_compatible boolean NOT NULL DEFAULT true,
  UNIQUE(category_a, category_b)
);

ALTER TABLE public.ingredient_compatibility_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads compatibility_matrix"
  ON public.ingredient_compatibility_matrix FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manages compatibility_matrix"
  ON public.ingredient_compatibility_matrix FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
