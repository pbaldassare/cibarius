ALTER TABLE public.diet_plan_templates
ADD COLUMN IF NOT EXISTS sugars_g_day numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weekly_data jsonb DEFAULT NULL;