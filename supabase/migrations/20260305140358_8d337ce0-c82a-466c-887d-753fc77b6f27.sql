
-- 1. ingredients table
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  name_en text,
  category text,
  carbs_per_100g numeric NOT NULL DEFAULT 0,
  protein_per_100g numeric NOT NULL DEFAULT 0,
  fat_per_100g numeric NOT NULL DEFAULT 0,
  kcal_per_100g numeric NOT NULL DEFAULT 0,
  usda_fdc_id text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients_read" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_insert" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ingredients_update" ON public.ingredients FOR UPDATE TO authenticated USING (true);

-- 2. ingredient_translation table
CREATE TABLE public.ingredient_translation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_it text UNIQUE NOT NULL,
  name_en text NOT NULL
);

ALTER TABLE public.ingredient_translation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_read" ON public.ingredient_translation FOR SELECT TO authenticated USING (true);

-- Seed translations
INSERT INTO public.ingredient_translation (name_it, name_en) VALUES
  ('riso', 'rice'),
  ('pasta', 'pasta'),
  ('pane', 'bread'),
  ('petto di pollo', 'chicken breast'),
  ('manzo', 'beef'),
  ('maiale', 'pork'),
  ('salmone', 'salmon'),
  ('tonno', 'tuna'),
  ('uova', 'egg'),
  ('latte', 'milk'),
  ('mozzarella', 'mozzarella cheese'),
  ('parmigiano', 'parmesan cheese'),
  ('burro', 'butter'),
  ('olio extravergine', 'olive oil'),
  ('pomodoro', 'tomato'),
  ('passata', 'tomato sauce'),
  ('patate', 'potato'),
  ('zucchine', 'zucchini'),
  ('melanzane', 'eggplant'),
  ('carote', 'carrot'),
  ('cipolla', 'onion'),
  ('aglio', 'garlic'),
  ('riso basmati', 'basmati rice');

-- 3. meal_logs table
CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_type text NOT NULL,
  dish_name text,
  portion_g numeric,
  carbs_g numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  kcal numeric DEFAULT 0,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_logs_own" ON public.meal_logs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. meal_log_ingredients table
CREATE TABLE public.meal_log_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid REFERENCES public.meal_logs(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES public.ingredients(id),
  ingredient_name text,
  grams numeric NOT NULL DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  kcal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.meal_log_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_log_ingredients_own" ON public.meal_log_ingredients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_logs ml WHERE ml.id = meal_log_id AND ml.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_logs ml WHERE ml.id = meal_log_id AND ml.user_id = auth.uid()));

-- Validate meal_type on meal_logs
CREATE OR REPLACE FUNCTION public.validate_meal_log_type()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.meal_type NOT IN ('colazione', 'pranzo', 'cena', 'spuntino') THEN
    RAISE EXCEPTION 'Invalid meal_type: %', NEW.meal_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_meal_log_type
  BEFORE INSERT OR UPDATE ON public.meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_meal_log_type();
