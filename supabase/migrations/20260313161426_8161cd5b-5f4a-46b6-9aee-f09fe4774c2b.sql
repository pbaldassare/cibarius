-- Insert the missing client_link for Francesca Biazzi
-- This is a data fix, not a schema change, but we need write access
-- We'll use a temporary function to insert the data

CREATE OR REPLACE FUNCTION public._fix_missing_client_link()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.client_links (professional_id, client_user_id, status, invite_code, activated_at)
  VALUES ('1475bf7c-3856-434c-919d-03554ea8f641', '718a977f-1742-40bc-9960-c61a876e1d93', 'active', '58D924AX', NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT public._fix_missing_client_link();
DROP FUNCTION public._fix_missing_client_link();