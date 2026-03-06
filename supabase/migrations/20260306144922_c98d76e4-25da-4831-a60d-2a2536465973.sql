
-- 1. Create SECURITY DEFINER function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_user_role FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;

-- 2. Drop the recursive policy and recreate using the function
DROP POLICY IF EXISTS "Users update own profile no role change" ON public.profiles;
CREATE POLICY "Users update own profile no role change"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.get_user_role(auth.uid()));
