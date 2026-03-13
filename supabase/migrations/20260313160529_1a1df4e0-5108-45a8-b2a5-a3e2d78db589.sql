-- Allow professionals to insert client_links (for approval flow)
DROP POLICY "Client inserts link" ON public.client_links;
CREATE POLICY "Client or pro inserts link" ON public.client_links FOR INSERT TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    OR professional_id = auth.uid()
  );