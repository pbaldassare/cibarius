
CREATE TABLE public.daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_date date NOT NULL,
  plan_id uuid REFERENCES public.diet_plans(id) ON DELETE SET NULL,
  kcal_target numeric NOT NULL DEFAULT 0,
  kcal_actual numeric NOT NULL DEFAULT 0,
  protein_target numeric DEFAULT 0,
  protein_actual numeric DEFAULT 0,
  carbs_target numeric DEFAULT 0,
  carbs_actual numeric DEFAULT 0,
  fats_target numeric DEFAULT 0,
  fats_actual numeric DEFAULT 0,
  compliance_pct numeric DEFAULT 0,
  meals_logged jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_date)
);

ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User owns daily_progress"
  ON public.daily_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Pro reads client daily_progress"
  ON public.daily_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM client_links cl
    WHERE cl.professional_id = auth.uid()
      AND cl.client_user_id = daily_progress.user_id
      AND cl.status = 'active'
  ));

CREATE POLICY "Admin daily_progress"
  ON public.daily_progress FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
