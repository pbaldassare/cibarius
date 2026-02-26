
-- ═══ 1) diet_plans ═══
CREATE TABLE public.diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Piano nutrizionale',
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  kcal_day numeric NOT NULL,
  protein_g_day numeric NOT NULL,
  carbs_g_day numeric NOT NULL,
  fats_g_day numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: only 1 active plan per (professional, client) pair
CREATE UNIQUE INDEX idx_diet_plans_active_unique
  ON public.diet_plans (professional_id, client_user_id)
  WHERE (is_active = true);

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;

-- Helper function to check active client link
CREATE OR REPLACE FUNCTION public.has_active_pro_link(_pro_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_links
    WHERE professional_id = _pro_id
      AND client_user_id = _client_id
      AND status = 'active'
  );
$$;

-- Pro CRUD on diet_plans (only if active link exists)
CREATE POLICY "Pro manages diet_plans"
  ON public.diet_plans FOR ALL
  USING (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id))
  WITH CHECK (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id));

-- Client reads own active plan
CREATE POLICY "Client reads own diet_plans"
  ON public.diet_plans FOR SELECT
  USING (client_user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin diet_plans"
  ON public.diet_plans FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- ═══ 2) diet_plan_meal_targets ═══
CREATE TABLE public.diet_plan_meal_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id uuid NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  meal_type text NOT NULL,
  kcal_target numeric NOT NULL,
  protein_g numeric NOT NULL,
  carbs_g numeric NOT NULL,
  fats_g numeric NOT NULL,
  UNIQUE(diet_plan_id, meal_type)
);

ALTER TABLE public.diet_plan_meal_targets ENABLE ROW LEVEL SECURITY;

-- Pro CRUD through diet_plan access
CREATE POLICY "Pro manages meal_targets"
  ON public.diet_plan_meal_targets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.diet_plans dp
    WHERE dp.id = diet_plan_meal_targets.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND has_active_pro_link(auth.uid(), dp.client_user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.diet_plans dp
    WHERE dp.id = diet_plan_meal_targets.diet_plan_id
      AND dp.professional_id = auth.uid()
      AND has_active_pro_link(auth.uid(), dp.client_user_id)
  ));

-- Client reads own targets
CREATE POLICY "Client reads own meal_targets"
  ON public.diet_plan_meal_targets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.diet_plans dp
    WHERE dp.id = diet_plan_meal_targets.diet_plan_id
      AND dp.client_user_id = auth.uid()
  ));

-- Admin
CREATE POLICY "Admin meal_targets"
  ON public.diet_plan_meal_targets FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- ═══ 3) pro_suggestions ═══
CREATE TABLE public.pro_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  type text NOT NULL, -- 'food', 'recipe', 'message'
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);

ALTER TABLE public.pro_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro manages suggestions"
  ON public.pro_suggestions FOR ALL
  USING (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id))
  WITH CHECK (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id));

CREATE POLICY "Client reads own suggestions"
  ON public.pro_suggestions FOR SELECT
  USING (client_user_id = auth.uid());

CREATE POLICY "Client updates own suggestions"
  ON public.pro_suggestions FOR UPDATE
  USING (client_user_id = auth.uid());

CREATE POLICY "Admin suggestions"
  ON public.pro_suggestions FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- ═══ 4) generated_recipes ═══
CREATE TABLE public.generated_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  meal_type text,
  title text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]',
  instructions text,
  kcal_total numeric,
  macros jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro manages generated_recipes"
  ON public.generated_recipes FOR ALL
  USING (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id))
  WITH CHECK (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id));

CREATE POLICY "Client reads own generated_recipes"
  ON public.generated_recipes FOR SELECT
  USING (client_user_id = auth.uid());

CREATE POLICY "Admin generated_recipes"
  ON public.generated_recipes FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- ═══ 5) RLS for inventory_items: let pro read client's inventory ═══
CREATE POLICY "Pro reads client inventory"
  ON public.inventory_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_links cl
    WHERE cl.professional_id = auth.uid()
      AND cl.client_user_id = inventory_items.owner_user_id
      AND cl.status = 'active'
  ));
