-- Lettura della chiave Resend da Vault, solo per service_role.
-- Le Edge Function send-email e auth-email-hook la usano se il secret
-- RESEND_API_KEY dell'ambiente non e' aggiornabile da qui.
CREATE OR REPLACE FUNCTION public.get_resend_api_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'RESEND_API_KEY'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_resend_api_key() IS
  'Restituisce la chiave Resend da Vault. Eseguibile solo da service_role.';

REVOKE ALL ON FUNCTION public.get_resend_api_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_resend_api_key() FROM anon;
REVOKE ALL ON FUNCTION public.get_resend_api_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_resend_api_key() TO service_role;
