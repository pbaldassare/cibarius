
CREATE OR REPLACE FUNCTION public.has_active_pro_link(_pro_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_links
    WHERE professional_id = _pro_id
      AND client_user_id = _client_id
      AND status = 'active'
  );
$$;
