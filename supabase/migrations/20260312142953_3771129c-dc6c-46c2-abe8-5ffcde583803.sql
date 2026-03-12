
-- HACCP templates (preconfigured per business type)
CREATE TABLE IF NOT EXISTS public.haccp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.haccp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active templates" ON public.haccp_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages templates" ON public.haccp_templates
  FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- HACCP template tasks
CREATE TABLE IF NOT EXISTS public.haccp_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.haccp_templates(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  category text NOT NULL DEFAULT 'pulizia',
  frequency_type text NOT NULL DEFAULT 'giornaliera',
  default_area_type text,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.haccp_template_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads template tasks" ON public.haccp_template_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages template tasks" ON public.haccp_template_tasks
  FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- Add applied_template_id to restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS haccp_template_id uuid REFERENCES public.haccp_templates(id);
