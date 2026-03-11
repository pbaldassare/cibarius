
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _phone text;
  _ref_code text;
  _coupon_record record;
  _slug text;
  _base_slug text;
  _counter int := 0;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  IF _role NOT IN ('user', 'restaurant_owner', 'professional') THEN
    _role := 'user';
  END IF;
  
  _phone := NEW.raw_user_meta_data->>'phone';
  _ref_code := NEW.raw_user_meta_data->>'ref_coupon_code';

  INSERT INTO public.profiles (id, email, full_name, phone, role, ref_coupon_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _phone,
    _role,
    _ref_code
  );

  -- Auto-create professional_profiles if professional
  IF _role = 'professional' THEN
    -- Generate unique slug from display_name/full_name
    _base_slug := LOWER(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'pro'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ));
    _base_slug := TRIM(BOTH '-' FROM _base_slug);
    IF _base_slug = '' THEN _base_slug := 'pro'; END IF;

    _slug := _base_slug;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.professional_profiles WHERE public_slug = _slug);
      _counter := _counter + 1;
      _slug := _base_slug || '-' || _counter;
    END LOOP;

    INSERT INTO public.professional_profiles (user_id, display_name, specialization, city, bio, public_slug)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'specialization', ''),
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'bio',
      _slug
    );
  END IF;

  -- Auto-create restaurant + member if restaurant_owner
  IF _role = 'restaurant_owner' THEN
    INSERT INTO public.restaurants (name, phone, address, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Il mio ristorante'),
      COALESCE(NEW.raw_user_meta_data->>'restaurant_phone', _phone, ''),
      NEW.raw_user_meta_data->>'restaurant_address',
      NEW.id
    );
    
    INSERT INTO public.restaurant_members (restaurant_id, user_id, member_role)
    VALUES (
      (SELECT id FROM public.restaurants WHERE owner_id = NEW.id ORDER BY created_at DESC LIMIT 1),
      NEW.id,
      'owner'
    );
  END IF;

  -- Auto-link to nutritionist if referral code exists
  IF _ref_code IS NOT NULL AND _ref_code != '' THEN
    SELECT * INTO _coupon_record FROM public.nutritionist_coupons
    WHERE coupon_code = _ref_code AND is_active = true
    LIMIT 1;

    IF _coupon_record IS NOT NULL AND _coupon_record.nutritionist_user_id != NEW.id THEN
      INSERT INTO public.user_nutritionist_links (client_user_id, nutritionist_user_id, coupon_id, link_source, is_active)
      VALUES (NEW.id, _coupon_record.nutritionist_user_id, _coupon_record.id, 'referral_link', true)
      ON CONFLICT (client_user_id, nutritionist_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
