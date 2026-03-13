-- Create nutrition_plans table
CREATE TABLE public.nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Piano nutrizionale',
  plan_mode text NOT NULL DEFAULT 'targets_only',
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  calories_target integer,
  protein_target integer,
  carbs_target integer,
  fat_target integer,
  notes_general text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validate plan_mode
CREATE OR REPLACE FUNCTION public.validate_nutrition_plan_mode()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.plan_mode NOT IN ('targets_only', 'weekly_meal_plan') THEN
    RAISE EXCEPTION 'Invalid plan_mode: %', NEW.plan_mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_nutrition_plan_mode
  BEFORE INSERT OR UPDATE ON public.nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_nutrition_plan_mode();

-- Create nutrition_plan_weeks table
CREATE TABLE public.nutrition_plan_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  week_title text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create nutrition_plan_days table
CREATE TABLE public.nutrition_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.nutrition_plan_weeks(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create nutrition_plan_meals table
CREATE TABLE public.nutrition_plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.nutrition_plan_days(id) ON DELETE CASCADE,
  meal_type text NOT NULL,
  meal_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validate meal_type for nutrition_plan_meals
CREATE OR REPLACE FUNCTION public.validate_np_meal_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.meal_type NOT IN ('colazione', 'spuntino_mattina', 'pranzo', 'spuntino_pomeriggio', 'cena', 'extra') THEN
    RAISE EXCEPTION 'Invalid meal_type: %', NEW.meal_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_np_meal_type
  BEFORE INSERT OR UPDATE ON public.nutrition_plan_meals
  FOR EACH ROW EXECUTE FUNCTION public.validate_np_meal_type();

-- RLS
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_meals ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.owns_nutrition_plan(_plan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nutrition_plans
    WHERE id = _plan_id
    AND (nutritionist_user_id = auth.uid() OR client_user_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_np_week(_week_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nutrition_plan_weeks w
    JOIN public.nutrition_plans p ON p.id = w.plan_id
    WHERE w.id = _week_id
    AND (p.nutritionist_user_id = auth.uid() OR p.client_user_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_np_day(_day_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nutrition_plan_days d
    JOIN public.nutrition_plan_weeks w ON w.id = d.week_id
    JOIN public.nutrition_plans p ON p.id = w.plan_id
    WHERE d.id = _day_id
    AND (p.nutritionist_user_id = auth.uid() OR p.client_user_id = auth.uid())
  );
$$;

-- Policies for nutrition_plans
CREATE POLICY "Nutritionists manage own plans" ON public.nutrition_plans
  FOR ALL TO authenticated
  USING (nutritionist_user_id = auth.uid() OR client_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (nutritionist_user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Policies for nutrition_plan_weeks
CREATE POLICY "Access via plan ownership" ON public.nutrition_plan_weeks
  FOR ALL TO authenticated
  USING (public.owns_nutrition_plan(plan_id))
  WITH CHECK (public.owns_nutrition_plan(plan_id));

-- Policies for nutrition_plan_days
CREATE POLICY "Access via week ownership" ON public.nutrition_plan_days
  FOR ALL TO authenticated
  USING (public.owns_np_week(week_id))
  WITH CHECK (public.owns_np_week(week_id));

-- Policies for nutrition_plan_meals
CREATE POLICY "Access via day ownership" ON public.nutrition_plan_meals
  FOR ALL TO authenticated
  USING (public.owns_np_day(day_id))
  WITH CHECK (public.owns_np_day(day_id));

-- Indexes
CREATE INDEX idx_nutrition_plans_nutritionist ON public.nutrition_plans(nutritionist_user_id);
CREATE INDEX idx_nutrition_plans_client ON public.nutrition_plans(client_user_id);
CREATE INDEX idx_np_weeks_plan ON public.nutrition_plan_weeks(plan_id);
CREATE INDEX idx_np_days_week ON public.nutrition_plan_days(week_id);
CREATE INDEX idx_np_meals_day ON public.nutrition_plan_meals(day_id);