
-- Set slug for existing professional
UPDATE professional_profiles 
SET public_slug = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]', '-', 'g'))
WHERE public_slug IS NULL AND is_visible = true;
