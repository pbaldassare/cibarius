-- A check for a past day could be recorded days later and looked identical to
-- one done on time ("completata", only the time of day shown). Now:
--   - completed_at is always the server time of the insert and can't be edited;
--   - a check recorded after its day (Europe/Rome) is stored as 'in_ritardo';
--   - log_date can't be moved and a status can only change to 'annullata'
--     (except by admins), so the mark can't be removed afterwards.
CREATE OR REPLACE FUNCTION public.haccp_log_registration_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.completed_at := now();
    NEW.created_at := now();
    IF NEW.log_date > _today THEN
      RAISE EXCEPTION 'Non si puo'' registrare un controllo per un giorno futuro (%)', NEW.log_date;
    END IF;
    IF NEW.status = 'completata' AND NEW.log_date < _today THEN
      NEW.status := 'in_ritardo';
    END IF;
    RETURN NEW;
  END IF;

  NEW.completed_at := OLD.completed_at;
  NEW.created_at := OLD.created_at;
  NEW.log_date := OLD.log_date;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'annullata'
     AND NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Lo stato di un controllo HACCP si puo'' solo annullare';
  END IF;
  RETURN NEW;
END;
$$;

-- Existing checks recorded after their day get the mark they should have had;
-- their timestamps are untouched, so the change is verifiable.
UPDATE public.haccp_logs
SET status = 'in_ritardo'
WHERE status = 'completata'
  AND (completed_at AT TIME ZONE 'Europe/Rome')::date > log_date;

DROP TRIGGER IF EXISTS haccp_log_registration_rules ON public.haccp_logs;
CREATE TRIGGER haccp_log_registration_rules
  BEFORE INSERT OR UPDATE ON public.haccp_logs
  FOR EACH ROW EXECUTE FUNCTION public.haccp_log_registration_rules();
