
-- 1. Create media bucket (public for easy image display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true);

-- 2. Storage policies for media bucket
CREATE POLICY "Authenticated users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[1] = 'restaurants'
    )
  );

CREATE POLICY "Authenticated users can read media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[1] = 'restaurants'
    )
  );

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[1] = 'restaurants'
    )
  );

-- 3. Attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Validate entity_type
CREATE OR REPLACE FUNCTION public.validate_attachment_entity_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type NOT IN ('product', 'inventory_item', 'recipe', 'profile') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', NEW.entity_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_attachment_entity_type_trigger
  BEFORE INSERT OR UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.validate_attachment_entity_type();

-- Attachments RLS
CREATE POLICY "Attachments select own or restaurant or admin" ON public.attachments
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurant_members rm WHERE rm.restaurant_id = attachments.restaurant_id AND rm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = attachments.restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Attachments insert own or restaurant owner or admin" ON public.attachments
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = attachments.restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Attachments update own or restaurant owner or admin" ON public.attachments
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = attachments.restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );

CREATE POLICY "Attachments delete own or restaurant owner or admin" ON public.attachments
  FOR DELETE USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = attachments.restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  );
