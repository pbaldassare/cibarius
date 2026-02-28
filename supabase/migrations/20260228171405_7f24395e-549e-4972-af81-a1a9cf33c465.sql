
-- Templates for reusable diet plans
CREATE TABLE public.diet_plan_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Template',
  kcal_day numeric NOT NULL,
  protein_g_day numeric NOT NULL,
  carbs_g_day numeric NOT NULL,
  fats_g_day numeric NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro manages own templates"
  ON public.diet_plan_templates
  FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Admin templates"
  ON public.diet_plan_templates
  FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Meal targets within templates
CREATE TABLE public.diet_plan_template_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.diet_plan_templates(id) ON DELETE CASCADE,
  meal_type text NOT NULL,
  kcal_target numeric NOT NULL,
  protein_g numeric NOT NULL,
  carbs_g numeric NOT NULL,
  fats_g numeric NOT NULL
);

ALTER TABLE public.diet_plan_template_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template meals follow template access"
  ON public.diet_plan_template_meals
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.diet_plan_templates t WHERE t.id = template_id AND t.professional_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diet_plan_templates t WHERE t.id = template_id AND t.professional_id = auth.uid()));

CREATE POLICY "Admin template meals"
  ON public.diet_plan_template_meals
  FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
