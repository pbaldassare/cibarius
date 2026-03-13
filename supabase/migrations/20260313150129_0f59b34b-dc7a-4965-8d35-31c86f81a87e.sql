CREATE TABLE public.pro_meal_text_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type text NOT NULL,
  meal_text text NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id, meal_type, meal_text)
);

ALTER TABLE public.pro_meal_text_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pros manage own meal suggestions"
  ON public.pro_meal_text_suggestions
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE INDEX idx_meal_suggestions_pro_type ON public.pro_meal_text_suggestions(professional_id, meal_type);
CREATE INDEX idx_meal_suggestions_usage ON public.pro_meal_text_suggestions(professional_id, usage_count DESC);