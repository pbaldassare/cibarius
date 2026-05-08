-- Link HACCP labels back to preparation source
ALTER TABLE public.haccp_preparation_labels
  ADD COLUMN IF NOT EXISTS source_preparation_id uuid REFERENCES public.preparations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_haccp_labels_source_prep
  ON public.haccp_preparation_labels(source_preparation_id);

-- Auto-create a draft HACCP label whenever a restaurant preparation is inserted
CREATE OR REPLACE FUNCTION public.auto_create_haccp_label_for_preparation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cons text;
BEGIN
  IF NEW.restaurant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Already linked? skip
  IF EXISTS (SELECT 1 FROM public.haccp_preparation_labels WHERE source_preparation_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  _cons := CASE WHEN NEW.storage_type IN ('frigo','freezer','ambiente') THEN NEW.storage_type ELSE 'frigo' END;

  INSERT INTO public.haccp_preparation_labels (
    restaurant_id, preparation_name, production_date, expiration_date,
    conservation_type, quantity, unit, notes, status,
    created_by, source_preparation_id
  )
  VALUES (
    NEW.restaurant_id,
    NEW.name,
    COALESCE(NEW.production_date, NEW.prepared_at::date, CURRENT_DATE),
    COALESCE(NEW.use_by_date, CURRENT_DATE + INTERVAL '3 days'),
    _cons,
    COALESCE(NEW.portions, 1)::numeric,
    'pz',
    NEW.notes,
    'draft',
    NEW.owner_user_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_haccp_label_for_prep ON public.preparations;
CREATE TRIGGER trg_auto_haccp_label_for_prep
AFTER INSERT ON public.preparations
FOR EACH ROW EXECUTE FUNCTION public.auto_create_haccp_label_for_preparation();

-- Backfill: create draft labels for existing restaurant preparations without one
INSERT INTO public.haccp_preparation_labels (
  restaurant_id, preparation_name, production_date, expiration_date,
  conservation_type, quantity, unit, notes, status,
  created_by, source_preparation_id
)
SELECT
  p.restaurant_id,
  p.name,
  COALESCE(p.production_date, p.prepared_at::date, CURRENT_DATE),
  COALESCE(p.use_by_date, CURRENT_DATE + INTERVAL '3 days'),
  CASE WHEN p.storage_type IN ('frigo','freezer','ambiente') THEN p.storage_type ELSE 'frigo' END,
  COALESCE(p.portions, 1)::numeric,
  'pz',
  p.notes,
  'draft',
  p.owner_user_id,
  p.id
FROM public.preparations p
WHERE p.restaurant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.haccp_preparation_labels l WHERE l.source_preparation_id = p.id
  );