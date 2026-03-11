
-- Waste savings tracking
CREATE TABLE public.waste_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  weight_g numeric DEFAULT 0,
  estimated_price numeric DEFAULT 0,
  saved_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'consumed' -- 'consumed', 'cooked'
);

ALTER TABLE public.waste_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own waste_savings"
  ON public.waste_savings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for monthly aggregations
CREATE INDEX idx_waste_savings_user_month ON public.waste_savings (user_id, saved_at);
