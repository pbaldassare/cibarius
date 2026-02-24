
-- Drop the problematic policy that causes circular recursion
DROP POLICY IF EXISTS "Read restaurant info for public recipes" ON public.restaurants;

-- Fix the restaurant_members bug too (rm.restaurant_id = rm.id should be rm.restaurant_id = restaurants.id)
DROP POLICY IF EXISTS "Restaurant visible to owner, members, admin" ON public.restaurants;

-- Recreate: owner, members, or admin can see restaurants
CREATE POLICY "Restaurant visible to owner, members, admin"
  ON public.restaurants FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM restaurant_members rm
      WHERE rm.restaurant_id = restaurants.id AND rm.user_id = auth.uid()
    )
    OR current_user_is_admin()
  );

-- Allow anyone authenticated to read restaurant name/info when they need it (for public recipes display)
-- This avoids the circular dependency by not referencing the recipes table
CREATE POLICY "Authenticated users can read basic restaurant info"
  ON public.restaurants FOR SELECT
  USING (auth.uid() IS NOT NULL);
