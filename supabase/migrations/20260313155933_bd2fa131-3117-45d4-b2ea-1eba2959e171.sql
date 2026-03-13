-- Allow professionals to read profiles of users who sent them link requests
CREATE POLICY "Pro reads link request profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_link_requests plr
      WHERE plr.professional_id = auth.uid()
        AND plr.user_id = profiles.id
        AND plr.status = 'pending'
    )
  );