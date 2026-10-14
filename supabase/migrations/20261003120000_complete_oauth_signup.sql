-- Registrazione con Google: applicare il tipo di account scelto prima del redirect.
--
-- Google restituisce soltanto nome, email e foto. Il tipo di account scelto
-- nel primo passo della registrazione non puo' quindi viaggiare dentro
-- raw_user_meta_data, e handle_new_user crea sempre un profilo 'user'.
-- Il client si ricorda la scelta e, tornato dal redirect, chiama questa
-- funzione.
--
-- La policy "Users update own profile no role change" impedisce al client di
-- toccare il proprio ruolo, da qui il SECURITY DEFINER. I controlli sotto
-- limitano la funzione a quello che il modulo di registrazione pubblico gia'
-- concede a chiunque: scegliere fra 'user', 'restaurant_owner' e
-- 'professional', una volta sola, su un account appena creato.

CREATE OR REPLACE FUNCTION public.complete_oauth_signup(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _role text;
  _full_name text;
  _phone text;
  _ref_code text;
  _coupon_record record;
  _restaurant_id uuid;
  _slug text;
  _base_slug text;
  _counter int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'complete_oauth_signup richiede una sessione attiva'
      USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'no_profile');
  END IF;

  -- Mai su un account gia' avviato: la scelta vale solo sul profilo appena
  -- creato dal trigger, finche' e' ancora al valore predefinito.
  IF _profile.role <> 'user' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'role_already_set', 'role', _profile.role);
  END IF;

  IF _profile.created_at < now() - interval '1 hour' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_a_new_account', 'role', _profile.role);
  END IF;

  _role := COALESCE(p_payload->>'role', 'user');
  IF _role NOT IN ('user', 'restaurant_owner', 'professional') THEN
    _role := 'user';
  END IF;

  _full_name := NULLIF(TRIM(COALESCE(p_payload->>'full_name', '')), '');
  _phone := NULLIF(TRIM(COALESCE(p_payload->>'phone', p_payload->>'restaurant_phone', '')), '');
  _ref_code := NULLIF(TRIM(COALESCE(p_payload->>'ref_coupon_code', '')), '');

  UPDATE public.profiles
  SET role = _role,
      full_name = COALESCE(NULLIF(full_name, ''), _full_name, ''),
      phone = COALESCE(NULLIF(phone, ''), _phone),
      ref_coupon_code = COALESCE(ref_coupon_code, _ref_code)
  WHERE id = _uid;

  IF _role = 'professional'
     AND NOT EXISTS (SELECT 1 FROM public.professional_profiles WHERE user_id = _uid) THEN
    _base_slug := LOWER(REGEXP_REPLACE(
      COALESCE(NULLIF(p_payload->>'display_name', ''), _full_name, NULLIF(_profile.full_name, ''), 'pro'),
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
      _uid,
      COALESCE(NULLIF(p_payload->>'display_name', ''), _full_name, NULLIF(_profile.full_name, ''), ''),
      COALESCE(p_payload->>'specialization', ''),
      NULLIF(p_payload->>'city', ''),
      NULLIF(p_payload->>'bio', ''),
      _slug
    );
  END IF;

  IF _role = 'restaurant_owner'
     AND NOT EXISTS (SELECT 1 FROM public.restaurants WHERE owner_id = _uid) THEN
    INSERT INTO public.restaurants (name, phone, address, owner_id)
    VALUES (
      COALESCE(NULLIF(p_payload->>'restaurant_name', ''), 'Il mio ristorante'),
      COALESCE(NULLIF(p_payload->>'restaurant_phone', ''), _phone, ''),
      NULLIF(p_payload->>'restaurant_address', ''),
      _uid
    )
    RETURNING id INTO _restaurant_id;

    INSERT INTO public.restaurant_members (restaurant_id, user_id, member_role)
    VALUES (_restaurant_id, _uid, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  IF _ref_code IS NOT NULL THEN
    SELECT * INTO _coupon_record FROM public.nutritionist_coupons
    WHERE coupon_code = _ref_code AND is_active = true
    LIMIT 1;

    IF FOUND AND _coupon_record.nutritionist_user_id <> _uid THEN
      INSERT INTO public.user_nutritionist_links (client_user_id, nutritionist_user_id, coupon_id, link_source, is_active)
      VALUES (_uid, _coupon_record.nutritionist_user_id, _coupon_record.id, 'referral_link', true)
      ON CONFLICT (client_user_id, nutritionist_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object('applied', true, 'role', _role);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_oauth_signup(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_oauth_signup(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_oauth_signup(jsonb) TO authenticated;
