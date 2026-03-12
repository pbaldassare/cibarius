
-- Email notifications log
CREATE TABLE public.email_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  metadata jsonb
);

ALTER TABLE public.email_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
  ON public.email_notifications_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Email preferences table
CREATE TABLE public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  receive_verification boolean NOT NULL DEFAULT true,
  receive_password_reset boolean NOT NULL DEFAULT true,
  receive_expiry_alerts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email prefs"
  ON public.email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own email prefs"
  ON public.email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email prefs"
  ON public.email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-create email_preferences on new user
CREATE OR REPLACE FUNCTION public.handle_new_email_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_email_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_email_prefs();

-- Index for cron job queries
CREATE INDEX idx_email_log_user_type_date ON public.email_notifications_log (user_id, email_type, sent_at);
CREATE INDEX idx_inventory_expiry ON public.inventory_items (owner_user_id, expiry_date) WHERE expiry_date IS NOT NULL;
