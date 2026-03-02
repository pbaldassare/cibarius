
-- Add new columns to professional_profiles
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS additional_roles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workplace text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS works_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS works_in_person boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Policy for public coach search: any authenticated user can read visible profiles
CREATE POLICY "Authenticated reads visible profiles"
  ON public.professional_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_visible = true);
