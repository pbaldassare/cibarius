
-- Table for manual product submissions pending admin review
CREATE TABLE public.product_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  brand text,
  image_url text,
  calories_100g numeric,
  macros_100g jsonb,
  barcode text,
  serving_size_g numeric,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_submission_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid submission status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_submission_status
  BEFORE INSERT OR UPDATE ON public.product_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_submission_status();

-- RLS
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own submissions
CREATE POLICY "Users insert own submissions"
  ON public.product_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own submissions
CREATE POLICY "Users read own submissions"
  ON public.product_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin manages submissions"
  ON public.product_submissions FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
