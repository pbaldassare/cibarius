
-- Add public_slug to professional_profiles
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_professional_profiles_public_slug ON public.professional_profiles (public_slug) WHERE public_slug IS NOT NULL;

-- Allow anonymous users to read public professional profiles
CREATE POLICY "Anyone reads public profiles"
  ON public.professional_profiles
  FOR SELECT
  TO anon
  USING (is_visible = true AND public_slug IS NOT NULL);
