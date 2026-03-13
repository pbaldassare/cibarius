-- Function to check if a pending link request exists between pro and user
CREATE OR REPLACE FUNCTION public.has_pending_link_request(_pro_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professional_link_requests
    WHERE professional_id = _pro_id
      AND user_id = _user_id
      AND status = 'pending'
  );
$$;

-- Update messages INSERT policy to also allow messaging with pending link requests
DROP POLICY "Messages insert own" ON public.messages;
CREATE POLICY "Messages insert own" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      has_active_pro_link(auth.uid(), receiver_id)
      OR has_active_client_link(receiver_id, auth.uid())
      OR has_pending_link_request(auth.uid(), receiver_id)
      OR has_pending_link_request(receiver_id, auth.uid())
      OR current_user_is_admin()
    )
  );

-- Update messages SELECT policy similarly
DROP POLICY "Messages select own" ON public.messages;
CREATE POLICY "Messages select own" ON public.messages FOR SELECT TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid()) AND (
      has_active_pro_link(auth.uid(), CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END)
      OR has_active_client_link(CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END, auth.uid())
      OR has_pending_link_request(auth.uid(), CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END)
      OR has_pending_link_request(CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END, auth.uid())
      OR current_user_is_admin()
    )
  );