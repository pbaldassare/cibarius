
-- Create template_recipes table
CREATE TABLE public.template_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meal_type text NOT NULL,
  diet_category text NOT NULL,
  instructions text,
  prep_time_min int DEFAULT 10,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  kcal_total numeric NOT NULL DEFAULT 0,
  protein_total numeric NOT NULL DEFAULT 0,
  carbs_total numeric NOT NULL DEFAULT 0,
  fats_total numeric NOT NULL DEFAULT 0,
  portion_scale_female numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now()
);

-- Validation trigger for meal_type
CREATE OR REPLACE FUNCTION public.validate_template_recipe_meal_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.meal_type NOT IN ('colazione', 'pranzo', 'cena', 'spuntino') THEN
    RAISE EXCEPTION 'Invalid meal_type: %', NEW.meal_type;
  END IF;
  IF NEW.diet_category NOT IN ('mediterranea', 'keto', 'digiuno', 'massa', 'dimagrimento') THEN
    RAISE EXCEPTION 'Invalid diet_category: %', NEW.diet_category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_template_recipe
  BEFORE INSERT OR UPDATE ON public.template_recipes
  FOR EACH ROW EXECUTE FUNCTION public.validate_template_recipe_meal_type();

-- RLS
ALTER TABLE public.template_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads template_recipes"
  ON public.template_recipes FOR SELECT
  USING (true);

CREATE POLICY "Admin manages template_recipes"
  ON public.template_recipes FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
