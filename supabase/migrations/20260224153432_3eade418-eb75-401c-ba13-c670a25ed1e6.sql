
-- 1. Create security definer function to check restaurant ownership/membership
CREATE OR REPLACE FUNCTION public.is_restaurant_accessible(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants WHERE id = _restaurant_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM restaurant_members WHERE restaurant_id = _restaurant_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Create function to check restaurant ownership only
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants WHERE id = _restaurant_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Fix restaurants policies - drop all SELECT policies and recreate
DROP POLICY IF EXISTS "Restaurant visible to owner, members, admin" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated users can read basic restaurant info" ON public.restaurants;
DROP POLICY IF EXISTS "Supplier reads linked restaurants" ON public.restaurants;

-- Simple: any authenticated user can read restaurants (they contain no sensitive data)
CREATE POLICY "Authenticated can read restaurants"
  ON public.restaurants FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Fix restaurant_members policies to use security definer
DROP POLICY IF EXISTS "Members visible to self, owner, admin" ON public.restaurant_members;
DROP POLICY IF EXISTS "Members update by owner or admin" ON public.restaurant_members;
DROP POLICY IF EXISTS "Members delete by owner or admin" ON public.restaurant_members;

CREATE POLICY "Members visible to self, owner, admin"
  ON public.restaurant_members FOR SELECT
  USING (user_id = auth.uid() OR is_restaurant_owner(restaurant_id));

CREATE POLICY "Members update by owner or admin"
  ON public.restaurant_members FOR UPDATE
  USING (is_restaurant_owner(restaurant_id));

CREATE POLICY "Members delete by owner or admin"
  ON public.restaurant_members FOR DELETE
  USING (is_restaurant_owner(restaurant_id));

-- 5. Fix recipes policy to use security definer
DROP POLICY IF EXISTS "Restaurant owner manages recipes" ON public.recipes;

CREATE POLICY "Restaurant owner manages recipes"
  ON public.recipes FOR ALL
  USING (is_restaurant_owner(restaurant_id));

-- 6. Fix inventory_items policies
DROP POLICY IF EXISTS "Inventory select own or restaurant member or admin" ON public.inventory_items;
DROP POLICY IF EXISTS "Inventory update own or restaurant owner or admin" ON public.inventory_items;
DROP POLICY IF EXISTS "Inventory delete own or restaurant owner or admin" ON public.inventory_items;

CREATE POLICY "Inventory select own or restaurant member or admin"
  ON public.inventory_items FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR is_restaurant_accessible(restaurant_id)
  );

CREATE POLICY "Inventory update own or restaurant owner or admin"
  ON public.inventory_items FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "Inventory delete own or restaurant owner or admin"
  ON public.inventory_items FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR is_restaurant_owner(restaurant_id)
  );

-- 7. Fix attachments policies
DROP POLICY IF EXISTS "Attachments select own or restaurant or admin" ON public.attachments;
DROP POLICY IF EXISTS "Attachments update own or restaurant owner or admin" ON public.attachments;
DROP POLICY IF EXISTS "Attachments delete own or restaurant owner or admin" ON public.attachments;

CREATE POLICY "Attachments select own or restaurant or admin"
  ON public.attachments FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR is_restaurant_accessible(restaurant_id)
  );

CREATE POLICY "Attachments update own or restaurant owner or admin"
  ON public.attachments FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "Attachments delete own or restaurant owner or admin"
  ON public.attachments FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR is_restaurant_owner(restaurant_id)
  );
