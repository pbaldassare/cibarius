
-- 1) Create professional_profiles table
CREATE TABLE public.professional_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  specialization text NOT NULL DEFAULT '',
  city text,
  bio text,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: pro reads/updates own profile
CREATE POLICY "Pro manages own professional_profile"
  ON public.professional_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: admin full access
CREATE POLICY "Admin manages professional_profiles"
  ON public.professional_profiles FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- RLS: clients with active link can read their pro's profile
CREATE POLICY "Client reads linked pro profile"
  ON public.professional_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_links cl
    WHERE cl.professional_id = professional_profiles.user_id
      AND cl.client_user_id = auth.uid()
      AND cl.status = 'active'
  ));

-- 2) Replace handle_new_user to accept role + phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _phone text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  -- Only allow these roles from signup
  IF _role NOT IN ('user', 'restaurant_owner', 'professional') THEN
    _role := 'user';
  END IF;
  
  _phone := NEW.raw_user_meta_data->>'phone';

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _phone,
    _role
  );

  -- Auto-create professional_profiles if professional
  IF _role = 'professional' THEN
    INSERT INTO public.professional_profiles (user_id, display_name, specialization, city, bio)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'specialization', ''),
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'bio'
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

  RETURN NEW;
END;
$function$;

-- 3) Drop existing permissive update policy for users and replace with one that blocks role changes
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users update own profile no role change"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));
