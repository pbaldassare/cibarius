
-- Product favorites
CREATE TABLE public.user_product_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.user_product_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own product favorites"
  ON public.user_product_favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Product usage log for auto-suggest
CREATE TABLE public.product_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own usage log"
  ON public.product_usage_log
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_product_usage_log_user_product ON public.product_usage_log(user_id, product_id);
CREATE INDEX idx_user_product_favorites_user ON public.user_product_favorites(user_id);
