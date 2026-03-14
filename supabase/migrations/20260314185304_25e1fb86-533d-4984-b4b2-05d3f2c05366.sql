
-- Server-side AI cache table
CREATE TABLE public.ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  result jsonb NOT NULL,
  hit_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_cache_key ON public.ai_cache(cache_key);
CREATE INDEX idx_ai_cache_updated ON public.ai_cache(updated_at);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- AI usage log table
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL,
  function_name text DEFAULT 'analyze-food-photos',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_created ON public.ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_source ON public.ai_usage_log(source);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Admin read policy for ai_usage_log
CREATE POLICY "Admins can read ai_usage_log"
ON public.ai_usage_log FOR SELECT
TO authenticated
USING (public.current_user_is_admin());
