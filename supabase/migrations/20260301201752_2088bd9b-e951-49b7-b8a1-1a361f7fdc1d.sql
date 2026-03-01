
-- 1. New table: diet_plan_items (specific foods per meal in a plan)
CREATE TABLE public.diet_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id uuid NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  meal_type text NOT NULL,
  food_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 100,
  unit text NOT NULL DEFAULT 'g',
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  sugars_g numeric NOT NULL DEFAULT 0,
  fats_g numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validate meal_type
CREATE OR REPLACE FUNCTION public.validate_diet_plan_item_meal_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.meal_type NOT IN ('colazione', 'pranzo', 'cena', 'spuntino') THEN
    RAISE EXCEPTION 'Invalid meal_type: %', NEW.meal_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_diet_plan_item_meal_type
  BEFORE INSERT OR UPDATE ON public.diet_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_diet_plan_item_meal_type();

-- RLS
ALTER TABLE public.diet_plan_items ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin diet_plan_items"
  ON public.diet_plan_items FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Pro manages items for their plans with active link
CREATE POLICY "Pro manages diet_plan_items"
  ON public.diet_plan_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_items.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND has_active_pro_link(auth.uid(), dp.client_user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_items.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND has_active_pro_link(auth.uid(), dp.client_user_id)
  ));

-- Client reads own plan items
CREATE POLICY "Client reads own diet_plan_items"
  ON public.diet_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_items.diet_plan_id
      AND dp.client_user_id = auth.uid()
  ));

-- Self-plan: user manages items where professional_id = client_user_id = auth.uid()
CREATE POLICY "Self plan diet_plan_items"
  ON public.diet_plan_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_items.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND dp.client_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_items.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND dp.client_user_id = auth.uid()
  ));

-- 2. Add sugars_g to existing tables
ALTER TABLE public.diet_plan_meal_targets ADD COLUMN IF NOT EXISTS sugars_g numeric NOT NULL DEFAULT 0;
ALTER TABLE public.diet_plan_template_meals ADD COLUMN IF NOT EXISTS sugars_g numeric NOT NULL DEFAULT 0;
ALTER TABLE public.food_templates ADD COLUMN IF NOT EXISTS sugars_100g numeric NOT NULL DEFAULT 0;

-- 3. Add sugars_g to nutrition_targets
ALTER TABLE public.nutrition_targets ADD COLUMN IF NOT EXISTS sugars_g numeric DEFAULT 0;

-- 4. Self-plan RLS on diet_plans: user can create/manage plans where professional_id = user_id
CREATE POLICY "Self plan diet_plans"
  ON public.diet_plans FOR ALL
  USING (professional_id = auth.uid() AND client_user_id = auth.uid())
  WITH CHECK (professional_id = auth.uid() AND client_user_id = auth.uid());

-- 5. Self-plan RLS on diet_plan_meal_targets
CREATE POLICY "Self plan meal_targets"
  ON public.diet_plan_meal_targets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meal_targets.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND dp.client_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meal_targets.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND dp.client_user_id = auth.uid()
  ));
