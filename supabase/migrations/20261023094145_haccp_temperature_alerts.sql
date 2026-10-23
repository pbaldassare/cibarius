-- An out-of-range temperature was only shown as a toast to whoever recorded it:
-- the owner never knew. Every new reading above its limit now creates an in-app
-- notification for the restaurant owner and asks send-temperature-alert to email
-- them. Limits mirror TEMP_THRESHOLDS in RestaurantHaccpPage.tsx.
CREATE OR REPLACE FUNCTION public.haccp_temperature_max(_equipment_type text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _equipment_type
    WHEN 'freezer' THEN -18
    WHEN 'fridge' THEN 4
    WHEN 'cold_room' THEN 4
  END::numeric;
$$;

CREATE OR REPLACE FUNCTION public.notify_haccp_temperature_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max numeric := public.haccp_temperature_max(NEW.equipment_type);
  _owner uuid;
  _restaurant_name text;
BEGIN
  IF _max IS NULL OR NEW.temperature_value <= _max THEN
    RETURN NEW;
  END IF;

  SELECT owner_id, name INTO _owner, _restaurant_name
  FROM public.restaurants WHERE id = NEW.restaurant_id;
  IF _owner IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.in_app_notifications (user_id, type, title, body, metadata)
  VALUES (
    _owner,
    'temperature_alert',
    'Temperatura fuori soglia: ' || NEW.equipment_name,
    format('%s: %s °C (massimo %s °C), registrata da %s.',
      _restaurant_name, NEW.temperature_value, _max, coalesce(NEW.recorded_by_name, 'staff')),
    jsonb_build_object('restaurant_id', NEW.restaurant_id, 'temperature_log_id', NEW.id)
  );

  -- The email is best effort: a pg_net failure must never block the HACCP record.
  BEGIN
    PERFORM net.http_post(
      url := 'https://dqhzopbjhxyhgcpedskl.supabase.co/functions/v1/send-temperature-alert',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('temperature_log_id', NEW.id)
    );
  EXCEPTION WHEN others THEN
    RAISE WARNING 'send-temperature-alert not queued: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_haccp_temperature_alert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS haccp_temperature_alert ON public.haccp_temperature_logs;
CREATE TRIGGER haccp_temperature_alert
  AFTER INSERT ON public.haccp_temperature_logs
  FOR EACH ROW EXECUTE FUNCTION public.notify_haccp_temperature_alert();
