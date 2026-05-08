
-- ===== HACCP Preparation Labels =====
CREATE TABLE public.haccp_preparation_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  preparation_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE NOT NULL,
  conservation_type TEXT NOT NULL DEFAULT 'frigo',
  internal_lot_code TEXT NOT NULL,
  operator_user_id UUID,
  operator_name TEXT,
  notes TEXT,
  allergens TEXT[] DEFAULT '{}',
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  status TEXT NOT NULL DEFAULT 'draft',
  cancel_reason TEXT,
  created_by UUID,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, internal_lot_code)
);

CREATE INDEX idx_haccp_labels_restaurant ON public.haccp_preparation_labels(restaurant_id);
CREATE INDEX idx_haccp_labels_status ON public.haccp_preparation_labels(status);
CREATE INDEX idx_haccp_labels_qr_token ON public.haccp_preparation_labels(qr_token);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_haccp_label_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','finalized','cancelled') THEN
    RAISE EXCEPTION 'Invalid haccp label status: %', NEW.status;
  END IF;
  IF NEW.conservation_type NOT IN ('ambiente','frigo','freezer','sottovuoto','altro') THEN
    RAISE EXCEPTION 'Invalid conservation_type: %', NEW.conservation_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_haccp_label_status
BEFORE INSERT OR UPDATE ON public.haccp_preparation_labels
FOR EACH ROW EXECUTE FUNCTION public.validate_haccp_label_status();

-- Auto-generate internal_lot_code (per restaurant) if empty
CREATE OR REPLACE FUNCTION public.gen_haccp_lot_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  _next INT;
BEGIN
  IF NEW.internal_lot_code IS NULL OR NEW.internal_lot_code = '' THEN
    SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(internal_lot_code,'[^0-9]','','g'),'')::INT),0)+1
      INTO _next
      FROM public.haccp_preparation_labels
      WHERE restaurant_id = NEW.restaurant_id;
    NEW.internal_lot_code := 'L-' || LPAD(_next::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gen_haccp_lot_code
BEFORE INSERT ON public.haccp_preparation_labels
FOR EACH ROW EXECUTE FUNCTION public.gen_haccp_lot_code();

-- Block edits after finalize (allow only status -> cancelled with reason, or reprint timestamps)
CREATE OR REPLACE FUNCTION public.protect_finalized_haccp_label()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    -- Allow only: cancellation with reason, updated_at refresh
    IF NEW.status = 'cancelled' AND NEW.cancel_reason IS NOT NULL THEN
      RETURN NEW;
    END IF;
    IF NEW.preparation_name IS DISTINCT FROM OLD.preparation_name
      OR NEW.quantity IS DISTINCT FROM OLD.quantity
      OR NEW.unit IS DISTINCT FROM OLD.unit
      OR NEW.production_date IS DISTINCT FROM OLD.production_date
      OR NEW.expiration_date IS DISTINCT FROM OLD.expiration_date
      OR NEW.conservation_type IS DISTINCT FROM OLD.conservation_type
      OR NEW.internal_lot_code IS DISTINCT FROM OLD.internal_lot_code
      OR NEW.allergens IS DISTINCT FROM OLD.allergens
      OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Cannot modify a finalized HACCP label. Cancel it (with reason) or duplicate it.';
    END IF;
  END IF;
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot modify a cancelled HACCP label.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_finalized_haccp_label
BEFORE UPDATE ON public.haccp_preparation_labels
FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_haccp_label();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_haccp_label_touch
BEFORE UPDATE ON public.haccp_preparation_labels
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.haccp_preparation_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read labels" ON public.haccp_preparation_labels FOR SELECT
  USING (public.is_restaurant_accessible(restaurant_id) OR public.current_user_is_admin());
CREATE POLICY "members insert labels" ON public.haccp_preparation_labels FOR INSERT
  WITH CHECK (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "members update labels" ON public.haccp_preparation_labels FOR UPDATE
  USING (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "members delete labels" ON public.haccp_preparation_labels FOR DELETE
  USING (public.is_restaurant_accessible(restaurant_id));

-- ===== Ingredients =====
CREATE TABLE public.haccp_preparation_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_label_id UUID NOT NULL REFERENCES public.haccp_preparation_labels(id) ON DELETE CASCADE,
  pantry_item_id UUID,
  ingredient_name TEXT NOT NULL,
  quantity_used NUMERIC,
  unit TEXT,
  source_lot_code TEXT,
  supplier_name TEXT,
  origin_document_id UUID,
  ingredient_expiration_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_haccp_ing_label ON public.haccp_preparation_ingredients(preparation_label_id);

ALTER TABLE public.haccp_preparation_ingredients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.haccp_label_accessible(_label_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.haccp_preparation_labels l
    WHERE l.id = _label_id
      AND (public.is_restaurant_accessible(l.restaurant_id) OR public.current_user_is_admin())
  );
$$;

CREATE POLICY "ing read" ON public.haccp_preparation_ingredients FOR SELECT
  USING (public.haccp_label_accessible(preparation_label_id));
CREATE POLICY "ing insert" ON public.haccp_preparation_ingredients FOR INSERT
  WITH CHECK (public.haccp_label_accessible(preparation_label_id));
CREATE POLICY "ing update" ON public.haccp_preparation_ingredients FOR UPDATE
  USING (public.haccp_label_accessible(preparation_label_id));
CREATE POLICY "ing delete" ON public.haccp_preparation_ingredients FOR DELETE
  USING (public.haccp_label_accessible(preparation_label_id));

-- ===== Documents =====
CREATE TABLE public.haccp_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'bolla',
  supplier_name TEXT,
  document_number TEXT,
  document_date DATE,
  file_url TEXT,
  photo_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_haccp_docs_restaurant ON public.haccp_documents(restaurant_id);

CREATE OR REPLACE FUNCTION public.validate_haccp_document_type()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.document_type NOT IN ('bolla','fattura','ddt','altro') THEN
    RAISE EXCEPTION 'Invalid document_type: %', NEW.document_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_haccp_doc_type
BEFORE INSERT OR UPDATE ON public.haccp_documents
FOR EACH ROW EXECUTE FUNCTION public.validate_haccp_document_type();

ALTER TABLE public.haccp_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs read" ON public.haccp_documents FOR SELECT
  USING (public.is_restaurant_accessible(restaurant_id) OR public.current_user_is_admin());
CREATE POLICY "docs insert" ON public.haccp_documents FOR INSERT
  WITH CHECK (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "docs update" ON public.haccp_documents FOR UPDATE
  USING (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "docs delete" ON public.haccp_documents FOR DELETE
  USING (public.is_restaurant_accessible(restaurant_id));

-- ===== Document <-> Label link =====
CREATE TABLE public.haccp_preparation_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_label_id UUID NOT NULL REFERENCES public.haccp_preparation_labels(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.haccp_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (preparation_label_id, document_id)
);
ALTER TABLE public.haccp_preparation_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdoc read" ON public.haccp_preparation_documents FOR SELECT
  USING (public.haccp_label_accessible(preparation_label_id));
CREATE POLICY "pdoc insert" ON public.haccp_preparation_documents FOR INSERT
  WITH CHECK (public.haccp_label_accessible(preparation_label_id));
CREATE POLICY "pdoc delete" ON public.haccp_preparation_documents FOR DELETE
  USING (public.haccp_label_accessible(preparation_label_id));

-- ===== Audit log =====
CREATE TABLE public.haccp_label_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_label_id UUID NOT NULL REFERENCES public.haccp_preparation_labels(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID,
  user_name TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_haccp_audit_label ON public.haccp_label_audit_log(preparation_label_id);

CREATE OR REPLACE FUNCTION public.validate_haccp_audit_action()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.action NOT IN ('created','finalized','printed','reprinted','cancelled','modified','duplicated') THEN
    RAISE EXCEPTION 'Invalid audit action: %', NEW.action;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_haccp_audit_action
BEFORE INSERT ON public.haccp_label_audit_log
FOR EACH ROW EXECUTE FUNCTION public.validate_haccp_audit_action();

ALTER TABLE public.haccp_label_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read" ON public.haccp_label_audit_log FOR SELECT
  USING (public.haccp_label_accessible(preparation_label_id));
CREATE POLICY "audit insert" ON public.haccp_label_audit_log FOR INSERT
  WITH CHECK (public.haccp_label_accessible(preparation_label_id));

-- ===== Storage bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('haccp-documents', 'haccp-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "haccp docs public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'haccp-documents');
CREATE POLICY "haccp docs auth upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'haccp-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "haccp docs auth update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'haccp-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "haccp docs auth delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'haccp-documents' AND auth.uid() IS NOT NULL);
