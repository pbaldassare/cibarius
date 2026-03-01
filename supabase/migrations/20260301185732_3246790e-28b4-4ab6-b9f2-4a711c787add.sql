
-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create support_requests table
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'problema',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Validation trigger for support_requests type
CREATE OR REPLACE FUNCTION public.validate_support_request_type()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('problema', 'suggerimento', 'delete_account') THEN
    RAISE EXCEPTION 'Invalid support request type: %', NEW.type;
  END IF;
  IF NEW.status NOT IN ('open', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid support request status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_support_request
  BEFORE INSERT OR UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_support_request_type();

-- RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own support requests"
  ON public.support_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own support requests"
  ON public.support_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin manages all support requests"
  ON public.support_requests FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read avatars
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can update their own avatar
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own avatar
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);
