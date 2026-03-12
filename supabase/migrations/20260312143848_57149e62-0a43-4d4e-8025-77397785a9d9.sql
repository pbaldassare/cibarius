
-- HACCP task photos
CREATE TABLE public.haccp_task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  task_log_id uuid NOT NULL REFERENCES public.haccp_logs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_by_user_id uuid NOT NULL,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.haccp_task_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant accessible photos" ON public.haccp_task_photos
  FOR SELECT TO authenticated USING (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Restaurant member inserts photos" ON public.haccp_task_photos
  FOR INSERT TO authenticated WITH CHECK (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Admin photos" ON public.haccp_task_photos
  FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- HACCP temperature logs
CREATE TABLE public.haccp_temperature_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  task_log_id uuid NOT NULL REFERENCES public.haccp_logs(id) ON DELETE CASCADE,
  equipment_type text NOT NULL CHECK (equipment_type IN ('fridge', 'cold_room', 'freezer')),
  equipment_name text NOT NULL,
  temperature_value numeric NOT NULL,
  recorded_by_user_id uuid NOT NULL,
  recorded_by_name text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.haccp_temperature_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant accessible temps" ON public.haccp_temperature_logs
  FOR SELECT TO authenticated USING (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Restaurant member inserts temps" ON public.haccp_temperature_logs
  FOR INSERT TO authenticated WITH CHECK (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Admin temps" ON public.haccp_temperature_logs
  FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
