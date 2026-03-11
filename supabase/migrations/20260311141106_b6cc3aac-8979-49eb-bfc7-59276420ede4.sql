
-- Favorite meal combos
CREATE TABLE public.user_favorite_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_favorite_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own favorite_meals"
  ON public.user_favorite_meals FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Favorite meal items
CREATE TABLE public.favorite_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  favorite_meal_id uuid NOT NULL REFERENCES public.user_favorite_meals(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  ingredient_id uuid REFERENCES public.ingredients(id),
  grams numeric NOT NULL DEFAULT 100,
  kcal numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fats_g numeric DEFAULT 0
);

ALTER TABLE public.favorite_meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Favorite meal items follow parent"
  ON public.favorite_meal_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_favorite_meals fm
    WHERE fm.id = favorite_meal_items.favorite_meal_id AND fm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_favorite_meals fm
    WHERE fm.id = favorite_meal_items.favorite_meal_id AND fm.user_id = auth.uid()
  ));

-- Quick day logs
CREATE TABLE public.quick_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_date date NOT NULL DEFAULT CURRENT_DATE,
  day_type text NOT NULL, -- 'equilibrato', 'leggero', 'abbondante'
  estimated_kcal numeric NOT NULL DEFAULT 0,
  estimated_protein numeric DEFAULT 0,
  estimated_carbs numeric DEFAULT 0,
  estimated_fats numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_date)
);

ALTER TABLE public.quick_day_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own quick_day_logs"
  ON public.quick_day_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
