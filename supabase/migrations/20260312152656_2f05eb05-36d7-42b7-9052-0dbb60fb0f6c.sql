-- Fix: validate_haccp_log_status must allow 'annullata' status for cancellation flow
CREATE OR REPLACE FUNCTION public.validate_haccp_log_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('completata', 'non_controllata', 'in_ritardo', 'annullata') THEN
    RAISE EXCEPTION 'Invalid haccp_log status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;