
-- Create restaurant_documents table for bolle/fatture
CREATE TABLE public.restaurant_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'bolla',
  supplier_name TEXT,
  doc_date DATE,
  file_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for doc_type
CREATE OR REPLACE FUNCTION public.validate_doc_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.doc_type NOT IN ('bolla', 'fattura', 'altro') THEN
    RAISE EXCEPTION 'Invalid doc_type: %', NEW.doc_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_doc_type
  BEFORE INSERT OR UPDATE ON public.restaurant_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_doc_type();

-- Enable RLS
ALTER TABLE public.restaurant_documents ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Restaurant owner full access"
  ON public.restaurant_documents
  FOR ALL
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

-- Members can read
CREATE POLICY "Restaurant members can read"
  ON public.restaurant_documents
  FOR SELECT
  USING (public.is_restaurant_accessible(restaurant_id));

-- Admin full access
CREATE POLICY "Admin full access on restaurant_documents"
  ON public.restaurant_documents
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
