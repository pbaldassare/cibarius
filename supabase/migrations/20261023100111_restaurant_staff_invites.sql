-- Staff access to the restaurant app, limited to HACCP.
--
-- The owner creates an invite link (single use, 7 days, revocable); whoever
-- opens it while logged in becomes a 'staff' member of the restaurant through
-- accept_restaurant_invite. Members already pass is_restaurant_accessible, so
-- they can record checks, temperatures, photos and labels; the app only shows
-- them the HACCP pages.

CREATE TABLE public.restaurant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  -- 244 random bits, hex: safe in a URL and not guessable.
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX restaurant_invites_restaurant_idx ON public.restaurant_invites (restaurant_id);

ALTER TABLE public.restaurant_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages restaurant invites" ON public.restaurant_invites
  FOR ALL TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

-- What the invite page shows before login: only the restaurant name and state.
CREATE OR REPLACE FUNCTION public.restaurant_invite_preview(_token text)
RETURNS TABLE (restaurant_name text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name,
    CASE
      WHEN i.revoked_at IS NOT NULL THEN 'revoked'
      WHEN i.used_at IS NOT NULL THEN 'used'
      WHEN i.expires_at < now() THEN 'expired'
      ELSE 'valid'
    END
  FROM public.restaurant_invites i
  JOIN public.restaurants r ON r.id = i.restaurant_id
  WHERE i.token = _token;
$$;

REVOKE ALL ON FUNCTION public.restaurant_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_invite_preview(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_restaurant_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.restaurant_invites;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Accedi per accettare l''invito';
  END IF;

  SELECT * INTO _inv FROM public.restaurant_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND OR _inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invito non valido';
  END IF;

  -- Already in: opening the link again just brings them to the kitchen.
  IF EXISTS (SELECT 1 FROM public.restaurant_members WHERE restaurant_id = _inv.restaurant_id AND user_id = _uid) THEN
    RETURN _inv.restaurant_id;
  END IF;

  IF _inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Questo invito è già stato usato';
  END IF;
  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Questo invito è scaduto';
  END IF;
  -- The app resolves an owner to their own restaurant first: as staff
  -- elsewhere they would never see it.
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE owner_id = _uid) THEN
    RAISE EXCEPTION 'Questo account ha già un ristorante: usa un altro account per lo staff';
  END IF;

  INSERT INTO public.restaurant_members (restaurant_id, user_id, member_role)
  VALUES (_inv.restaurant_id, _uid, 'staff');

  UPDATE public.restaurant_invites SET used_by = _uid, used_at = now() WHERE id = _inv.id;

  RETURN _inv.restaurant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_restaurant_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_restaurant_invite(text) TO authenticated;

-- The owner sees name and email of their team on the Staff page.
CREATE POLICY "Restaurant owner reads member profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.restaurant_members rm
    JOIN public.restaurants r ON r.id = rm.restaurant_id
    WHERE rm.user_id = profiles.id AND r.owner_id = auth.uid()
  ));

-- HACCP configuration stays with the owner. The previous ALL policies checked
-- the owner only on the new row, so a member could still delete tasks and
-- equipment.
DROP POLICY IF EXISTS "Restaurant owner manages haccp_tasks" ON public.haccp_tasks;
CREATE POLICY "Restaurant reads haccp_tasks" ON public.haccp_tasks
  FOR SELECT TO authenticated USING (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "Restaurant owner inserts haccp_tasks" ON public.haccp_tasks
  FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Restaurant owner updates haccp_tasks" ON public.haccp_tasks
  FOR UPDATE TO authenticated USING (public.is_restaurant_owner(restaurant_id)) WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Restaurant owner deletes haccp_tasks" ON public.haccp_tasks
  FOR DELETE TO authenticated USING (public.is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "Restaurant owner manages haccp_equipment" ON public.haccp_equipment;
CREATE POLICY "Restaurant reads haccp_equipment" ON public.haccp_equipment
  FOR SELECT TO authenticated USING (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "Restaurant owner inserts haccp_equipment" ON public.haccp_equipment
  FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Restaurant owner updates haccp_equipment" ON public.haccp_equipment
  FOR UPDATE TO authenticated USING (public.is_restaurant_owner(restaurant_id)) WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Restaurant owner deletes haccp_equipment" ON public.haccp_equipment
  FOR DELETE TO authenticated USING (public.is_restaurant_owner(restaurant_id));
