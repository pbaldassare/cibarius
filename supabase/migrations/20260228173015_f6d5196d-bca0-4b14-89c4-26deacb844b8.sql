
-- ═══ MESSAGES TABLE ═══
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: sender or receiver, with active link check
CREATE POLICY "Messages select own" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND (
      has_active_pro_link(auth.uid(), CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END)
      OR has_active_client_link(CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END, auth.uid())
      OR current_user_is_admin()
    )
  );

-- INSERT: sender = auth.uid(), with active link
CREATE POLICY "Messages insert own" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      has_active_pro_link(auth.uid(), receiver_id)
      OR has_active_client_link(receiver_id, auth.uid())
      OR current_user_is_admin()
    )
  );

-- UPDATE: only receiver can mark read_at
CREATE POLICY "Messages update read" ON public.messages
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Admin full access
CREATE POLICY "Messages admin" ON public.messages
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- ═══ APPOINTMENTS TABLE ═══
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Visita',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_appointment_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('scheduled', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid appointment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_appointment_status
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_status();

-- Pro manages appointments for active clients
CREATE POLICY "Pro manages appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id))
  WITH CHECK (professional_id = auth.uid() AND has_active_pro_link(auth.uid(), client_user_id));

-- Client reads own appointments
CREATE POLICY "Client reads appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Indexes
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_appointments_pro ON public.appointments(professional_id);
CREATE INDEX idx_appointments_client ON public.appointments(client_user_id);
CREATE INDEX idx_appointments_starts ON public.appointments(starts_at);
