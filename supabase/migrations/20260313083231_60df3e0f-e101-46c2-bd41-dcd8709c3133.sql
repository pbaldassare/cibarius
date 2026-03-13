-- Add extended macro columns to diet_plans
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS sugars_g_day numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fiber_g_day numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saturated_fats_g_day numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unsaturated_fats_g_day numeric DEFAULT NULL;

-- Add extended macro columns to diet_plan_meal_targets
ALTER TABLE public.diet_plan_meal_targets
  ADD COLUMN IF NOT EXISTS fiber_g numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saturated_fats_g numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unsaturated_fats_g numeric DEFAULT NULL;

-- Add extended macro columns to diet_plan_items
ALTER TABLE public.diet_plan_items
  ADD COLUMN IF NOT EXISTS fiber_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saturated_fats_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unsaturated_fats_g numeric DEFAULT 0;

-- Add extended macro columns to diet_plan_templates
ALTER TABLE public.diet_plan_templates
  ADD COLUMN IF NOT EXISTS sugars_g_day numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fiber_g_day numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saturated_fats_g_day numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unsaturated_fats_g_day numeric DEFAULT NULL;

-- Add extended macro columns to diet_plan_template_meals
ALTER TABLE public.diet_plan_template_meals
  ADD COLUMN IF NOT EXISTS fiber_g numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saturated_fats_g numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unsaturated_fats_g numeric DEFAULT NULL;

-- Add extended macro columns to nutrition_targets
ALTER TABLE public.nutrition_targets
  ADD COLUMN IF NOT EXISTS fiber_g numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saturated_fats_g numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unsaturated_fats_g numeric DEFAULT NULL;