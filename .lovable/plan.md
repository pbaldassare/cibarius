

# Fix: Infinite recursion in profiles RLS policy

## Problem
The policy `Users update own profile no role change` has this WITH CHECK:
```sql
(auth.uid() = id) AND (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()))
```
This subquery on `profiles` triggers the same policy again, causing infinite recursion when updating the profile (e.g., uploading avatar).

## Solution

### 1. Create a SECURITY DEFINER function to get user's current role
```sql
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;
```

### 2. Replace the recursive policy
Drop `Users update own profile no role change` and recreate it using the function:
```sql
DROP POLICY "Users update own profile no role change" ON public.profiles;
CREATE POLICY "Users update own profile no role change"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.get_user_role(auth.uid()));
```

## Files
| File | Action |
|------|--------|
| SQL Migration | Create `get_user_role` function + replace policy |

