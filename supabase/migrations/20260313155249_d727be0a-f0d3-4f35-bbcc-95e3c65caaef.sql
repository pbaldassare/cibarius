
-- Table for link requests from users to professionals
CREATE TABLE public.professional_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(user_id, professional_id)
);

-- Validate status
CREATE OR REPLACE FUNCTION public.validate_link_request_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid link_request status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_link_request_status
  BEFORE INSERT OR UPDATE ON public.professional_link_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_link_request_status();

-- In-app notifications table
CREATE TABLE public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for professional_link_requests
ALTER TABLE public.professional_link_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own link requests"
  ON public.professional_link_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Professionals can see requests sent to them
CREATE POLICY "Professionals can view requests to them"
  ON public.professional_link_requests FOR SELECT TO authenticated
  USING (auth.uid() = professional_id);

-- Users can create requests
CREATE POLICY "Users can create link requests"
  ON public.professional_link_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Professionals can update requests (approve/reject)
CREATE POLICY "Professionals can update requests to them"
  ON public.professional_link_requests FOR UPDATE TO authenticated
  USING (auth.uid() = professional_id);

-- RLS for in_app_notifications
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.in_app_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.in_app_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role or security definer functions)
CREATE POLICY "Authenticated can insert notifications"
  ON public.in_app_notifications FOR INSERT TO authenticated
  WITH CHECK (true);
