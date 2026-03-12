
-- Add cancelled_reason and is_rectification to haccp_logs
ALTER TABLE public.haccp_logs 
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS is_rectification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_log_id uuid REFERENCES public.haccp_logs(id),
  ADD COLUMN IF NOT EXISTS task_name text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS completed_by_name text;

-- HACCP audit log for immutable tracking
CREATE TABLE IF NOT EXISTS public.haccp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  table_name text NOT NULL DEFAULT 'haccp_logs',
  action text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  previous_value jsonb,
  new_value jsonb,
  reason text
);

ALTER TABLE public.haccp_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can see all audit logs
CREATE POLICY "Admin reads haccp_audit_log" ON public.haccp_audit_log
  FOR SELECT TO authenticated
  USING (current_user_is_admin());

-- Restaurant owner/member can see own restaurant's audit logs
CREATE POLICY "Restaurant reads own haccp_audit_log" ON public.haccp_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.haccp_logs hl
      WHERE hl.id = haccp_audit_log.record_id
        AND is_restaurant_accessible(hl.restaurant_id)
    )
  );

-- Only system (via insert from app) can insert
CREATE POLICY "Authenticated inserts haccp_audit_log" ON public.haccp_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());
