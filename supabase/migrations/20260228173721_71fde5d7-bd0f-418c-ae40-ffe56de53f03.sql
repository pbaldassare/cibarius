
CREATE TABLE public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  waist_cm numeric,
  hips_cm numeric,
  chest_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  body_fat_pct numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own measurements"
  ON public.body_measurements FOR ALL
  USING (user_id = auth.uid() OR current_user_is_admin())
  WITH CHECK (user_id = auth.uid() OR current_user_is_admin());

CREATE POLICY "Pro reads client measurements"
  ON public.body_measurements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_links cl
    WHERE cl.professional_id = auth.uid()
      AND cl.client_user_id = body_measurements.user_id
      AND cl.status = 'active'
  ));
