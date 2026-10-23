-- HACCP proof photos were uploaded to the public "media" bucket: anyone with
-- the link could open them. They now go to a private bucket, one folder per
-- restaurant (<restaurant_id>/<task_log_id>/<file>), readable and writable only
-- by who can access that restaurant. haccp_task_photos.photo_url now stores the
-- object path; the app opens it through a signed URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('haccp-photos', 'haccp-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE SET public = false;

-- CASE guards the uuid cast: a malformed folder name must deny, not error.
CREATE POLICY "Restaurant reads HACCP photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'haccp-photos'
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_restaurant_accessible(((storage.foldername(name))[1])::uuid)
      ELSE false END
  );

CREATE POLICY "Restaurant uploads HACCP photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'haccp-photos'
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_restaurant_accessible(((storage.foldername(name))[1])::uuid)
      ELSE false END
  );

-- Proof photos are part of the HACCP record: only admins may replace or remove them.
CREATE POLICY "Admin manages HACCP photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'haccp-photos' AND public.current_user_is_admin())
  WITH CHECK (bucket_id = 'haccp-photos' AND public.current_user_is_admin());
