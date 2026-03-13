
-- Allow professionals to insert/update body_measurements for linked clients
CREATE POLICY "Pro manages client measurements"
  ON public.body_measurements FOR ALL TO authenticated
  USING (public.has_active_client_link(auth.uid(), user_id))
  WITH CHECK (public.has_active_client_link(auth.uid(), user_id));

-- Allow professionals to insert/update weight_goals for linked clients
CREATE POLICY "Pro manages client weight goals"
  ON public.weight_goals FOR ALL TO authenticated
  USING (public.has_active_client_link(auth.uid(), user_id))
  WITH CHECK (public.has_active_client_link(auth.uid(), user_id));
