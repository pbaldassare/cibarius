
-- Weight goals table for tracking height, starting weight, target weight
CREATE TABLE public.weight_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  height_cm numeric(5,1),
  starting_weight_kg numeric(5,1),
  current_weight_kg numeric(5,1),
  target_weight_kg numeric(5,1),
  started_at date DEFAULT CURRENT_DATE,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own goals
CREATE POLICY "Users can manage own weight goals"
  ON public.weight_goals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Professionals can read client goals via active link
CREATE POLICY "Pros can read client weight goals"
  ON public.weight_goals FOR SELECT TO authenticated
  USING (
    public.has_active_client_link(auth.uid(), user_id)
  );

-- Admins can read all
CREATE POLICY "Admins can read all weight goals"
  ON public.weight_goals FOR SELECT TO authenticated
  USING (public.current_user_is_admin());
