-- restaurant_documents dava agli admin accesso completo ("Admin full access on
-- restaurant_documents"), haccp_documents solo lettura. Ora che le bolle vivono
-- qui, senza questa policy l'admin non puo' piu' inserire/cancellare i documenti
-- demo dal seed (AdminSeedPage) sui ristoranti di cui non e' membro.
CREATE POLICY "Admin full access on haccp_documents"
  ON public.haccp_documents
  FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
