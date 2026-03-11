
-- 1. nutritionist_coupons
CREATE TABLE public.nutritionist_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_user_id uuid NOT NULL,
  coupon_code text NOT NULL UNIQUE,
  client_discount_percent numeric NOT NULL DEFAULT 10,
  nutritionist_commission_percent numeric NOT NULL DEFAULT 20,
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutritionist_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionist reads own coupons" ON public.nutritionist_coupons
  FOR SELECT TO authenticated
  USING (nutritionist_user_id = auth.uid());

CREATE POLICY "Admin manages all coupons" ON public.nutritionist_coupons
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Authenticated validates coupons" ON public.nutritionist_coupons
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 2. user_nutritionist_links
CREATE TABLE public.user_nutritionist_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  nutritionist_user_id uuid NOT NULL,
  coupon_id uuid REFERENCES public.nutritionist_coupons(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  link_source text NOT NULL DEFAULT 'coupon',
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(client_user_id, nutritionist_user_id)
);

ALTER TABLE public.user_nutritionist_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client reads own links" ON public.user_nutritionist_links
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

CREATE POLICY "Nutritionist reads own links" ON public.user_nutritionist_links
  FOR SELECT TO authenticated
  USING (nutritionist_user_id = auth.uid());

CREATE POLICY "Admin manages links" ON public.user_nutritionist_links
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "System inserts links" ON public.user_nutritionist_links
  FOR INSERT TO authenticated
  WITH CHECK (client_user_id = auth.uid());

-- 3. subscription_payments
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_amount numeric NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL,
  coupon_id uuid REFERENCES public.nutritionist_coupons(id),
  coupon_code text,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own payments" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin manages payments" ON public.subscription_payments
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "User inserts own payments" ON public.subscription_payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. nutritionist_commissions
CREATE TABLE public.nutritionist_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_user_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  payment_id uuid REFERENCES public.subscription_payments(id),
  coupon_id uuid REFERENCES public.nutritionist_coupons(id),
  original_amount numeric NOT NULL,
  final_paid_amount numeric NOT NULL,
  commission_percent numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.nutritionist_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionist reads own commissions" ON public.nutritionist_commissions
  FOR SELECT TO authenticated
  USING (nutritionist_user_id = auth.uid());

CREATE POLICY "Admin manages commissions" ON public.nutritionist_commissions
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- 5. Validation triggers
CREATE OR REPLACE FUNCTION public.validate_payment_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.payment_status NOT IN ('pending', 'completed', 'refunded', 'failed') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_status
  BEFORE INSERT OR UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_status();

CREATE OR REPLACE FUNCTION public.validate_commission_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'paid', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid commission status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_commission_status
  BEFORE INSERT OR UPDATE ON public.nutritionist_commissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_commission_status();

-- 6. Auto-generate coupon for professionals
CREATE OR REPLACE FUNCTION public.auto_create_nutritionist_coupon()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _name text;
  _code text;
  _suffix text;
  _attempts int := 0;
BEGIN
  -- Only for professionals
  IF NEW.role != 'professional' THEN
    RETURN NEW;
  END IF;

  -- Build code from name
  _name := UPPER(COALESCE(SPLIT_PART(NEW.full_name, ' ', 1), 'PRO'));
  _name := REGEXP_REPLACE(_name, '[^A-Z0-9]', '', 'g');
  IF LENGTH(_name) < 2 THEN _name := 'PRO'; END IF;
  _name := LEFT(_name, 8);

  LOOP
    _suffix := UPPER(SUBSTR(MD5(RANDOM()::text), 1, 3));
    _code := _name || _suffix;
    _attempts := _attempts + 1;

    BEGIN
      INSERT INTO public.nutritionist_coupons (nutritionist_user_id, coupon_code)
      VALUES (NEW.id, _code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF _attempts > 10 THEN
        _code := _name || UPPER(SUBSTR(MD5(RANDOM()::text), 1, 6));
        INSERT INTO public.nutritionist_coupons (nutritionist_user_id, coupon_code)
        VALUES (NEW.id, _code);
        EXIT;
      END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_nutritionist_coupon
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_nutritionist_coupon();
