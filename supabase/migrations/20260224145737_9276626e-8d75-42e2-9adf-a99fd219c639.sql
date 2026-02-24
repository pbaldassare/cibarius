
-- Create client_links table first (needed by has_active_client_link function)
CREATE TABLE public.client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  invite_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE(professional_id, client_user_id)
);
ALTER TABLE public.client_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_client_link_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'revoked') THEN
    RAISE EXCEPTION 'Invalid client_link status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_client_link_status BEFORE INSERT OR UPDATE ON public.client_links
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_link_status();

CREATE POLICY "Pro sees own links" ON public.client_links
  FOR SELECT USING (professional_id = auth.uid() OR client_user_id = auth.uid() OR current_user_is_admin());
CREATE POLICY "Client inserts link" ON public.client_links
  FOR INSERT WITH CHECK (client_user_id = auth.uid());
CREATE POLICY "Pro or client updates link" ON public.client_links
  FOR UPDATE USING (professional_id = auth.uid() OR client_user_id = auth.uid() OR current_user_is_admin());

-- Now create helper function
CREATE OR REPLACE FUNCTION public.has_active_client_link(_pro_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_links
    WHERE professional_id = _pro_id AND client_user_id = _client_id AND status = 'active'
  );
$$;

-- professional_invites
CREATE TABLE public.professional_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.professional_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_invite_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'used', 'disabled') THEN
    RAISE EXCEPTION 'Invalid invite status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_invite_status BEFORE INSERT OR UPDATE ON public.professional_invites
  FOR EACH ROW EXECUTE FUNCTION public.validate_invite_status();

CREATE POLICY "Pro manage own invites" ON public.professional_invites
  FOR ALL USING (professional_id = auth.uid() OR current_user_is_admin());
CREATE POLICY "Auth users can read active invites" ON public.professional_invites
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

-- professional_notes
CREATE TABLE public.professional_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.professional_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro manages notes for active clients" ON public.professional_notes
  FOR ALL USING (
    (professional_id = auth.uid() AND has_active_client_link(auth.uid(), client_user_id))
    OR current_user_is_admin()
  );
CREATE POLICY "Client reads own notes" ON public.professional_notes
  FOR SELECT USING (client_user_id = auth.uid());

-- RLS: Pro reads client meal_days
CREATE POLICY "Pro reads client meal_days" ON public.meal_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_links cl
      WHERE cl.professional_id = auth.uid()
        AND cl.client_user_id = meal_days.user_id
        AND cl.status = 'active'
    )
  );

-- RLS: Pro reads client meals
CREATE POLICY "Pro reads client meals" ON public.meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meal_days md
      JOIN public.client_links cl ON cl.client_user_id = md.user_id
      WHERE md.id = meals.meal_day_id
        AND cl.professional_id = auth.uid()
        AND cl.status = 'active'
    )
  );

-- RLS: Pro reads client meal_items
CREATE POLICY "Pro reads client meal_items" ON public.meal_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meals m
      JOIN public.meal_days md ON md.id = m.meal_day_id
      JOIN public.client_links cl ON cl.client_user_id = md.user_id
      WHERE m.id = meal_items.meal_id
        AND cl.professional_id = auth.uid()
        AND cl.status = 'active'
    )
  );

-- RLS: Pro reads client nutrition_targets
CREATE POLICY "Pro reads client targets" ON public.nutrition_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_links cl
      WHERE cl.professional_id = auth.uid()
        AND cl.client_user_id = nutrition_targets.user_id
        AND cl.status = 'active'
    )
  );

-- RLS: Pro reads client profiles
CREATE POLICY "Pro reads client profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_links cl
      WHERE cl.professional_id = auth.uid()
        AND cl.client_user_id = profiles.id
        AND cl.status = 'active'
    )
  );
