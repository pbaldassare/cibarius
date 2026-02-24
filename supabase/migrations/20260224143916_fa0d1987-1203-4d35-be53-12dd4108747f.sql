
-- Step 1: Create both tables first
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

-- Step 2: Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

-- Step 3: Helper function
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Step 4: Validation trigger
CREATE OR REPLACE FUNCTION public.validate_member_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_role NOT IN ('owner', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid member_role: %', NEW.member_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_member_role_trigger
  BEFORE INSERT OR UPDATE ON public.restaurant_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_member_role();

-- Step 5: restaurants policies
CREATE POLICY "Restaurant visible to owner, members, admin" ON public.restaurants
  FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurant_members rm WHERE rm.restaurant_id = id AND rm.user_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Restaurant update by owner or admin" ON public.restaurants
  FOR UPDATE USING (owner_id = auth.uid() OR public.current_user_is_admin());

CREATE POLICY "Restaurant insert by owner or admin" ON public.restaurants
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR public.current_user_is_admin());

-- Step 6: restaurant_members policies
CREATE POLICY "Members visible to self, owner, admin" ON public.restaurant_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Members insert by owner or admin" ON public.restaurant_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Members update by owner or admin" ON public.restaurant_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Members delete by owner or admin" ON public.restaurant_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );
