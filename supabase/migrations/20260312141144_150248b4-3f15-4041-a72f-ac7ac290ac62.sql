
-- HACCP task definitions (configured per restaurant)
CREATE TABLE public.haccp_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'pulizia',
  frequency text NOT NULL DEFAULT 'giornaliera',
  custom_interval_days integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- HACCP completion logs
CREATE TABLE public.haccp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.haccp_tasks(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  completed_by uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'completata',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Restaurant equipment config (fridges, freezers, cold rooms)
CREATE TABLE public.haccp_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  equipment_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, equipment_type)
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_haccp_frequency()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.frequency NOT IN ('giornaliera', 'settimanale', 'mensile', 'personalizzata') THEN
    RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_haccp_frequency
  BEFORE INSERT OR UPDATE ON public.haccp_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_haccp_frequency();

CREATE OR REPLACE FUNCTION public.validate_haccp_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('completata', 'non_controllata', 'in_ritardo') THEN
    RAISE EXCEPTION 'Invalid haccp_log status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_haccp_log_status
  BEFORE INSERT OR UPDATE ON public.haccp_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_haccp_log_status();

CREATE OR REPLACE FUNCTION public.validate_haccp_equipment_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.equipment_type NOT IN ('cella_frigorifera', 'frigorifero', 'freezer') THEN
    RAISE EXCEPTION 'Invalid equipment_type: %', NEW.equipment_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_haccp_equipment_type
  BEFORE INSERT OR UPDATE ON public.haccp_equipment
  FOR EACH ROW EXECUTE FUNCTION public.validate_haccp_equipment_type();

-- RLS
ALTER TABLE public.haccp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_equipment ENABLE ROW LEVEL SECURITY;

-- haccp_tasks policies
CREATE POLICY "Restaurant owner manages haccp_tasks"
  ON public.haccp_tasks FOR ALL TO authenticated
  USING (is_restaurant_accessible(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Admin haccp_tasks"
  ON public.haccp_tasks FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- haccp_logs policies
CREATE POLICY "Restaurant accessible haccp_logs"
  ON public.haccp_logs FOR SELECT TO authenticated
  USING (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Restaurant member inserts haccp_logs"
  ON public.haccp_logs FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Restaurant owner manages haccp_logs"
  ON public.haccp_logs FOR ALL TO authenticated
  USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Admin haccp_logs"
  ON public.haccp_logs FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- haccp_equipment policies
CREATE POLICY "Restaurant owner manages haccp_equipment"
  ON public.haccp_equipment FOR ALL TO authenticated
  USING (is_restaurant_accessible(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Admin haccp_equipment"
  ON public.haccp_equipment FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Indexes
CREATE INDEX idx_haccp_tasks_restaurant ON public.haccp_tasks(restaurant_id);
CREATE INDEX idx_haccp_logs_restaurant_date ON public.haccp_logs(restaurant_id, log_date);
CREATE INDEX idx_haccp_logs_task ON public.haccp_logs(task_id);
