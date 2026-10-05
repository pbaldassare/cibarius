-- Porzioni HACCP separate dal peso/quantità totale prodotta (kg, g, …).
ALTER TABLE public.haccp_preparation_labels
  ADD COLUMN IF NOT EXISTS portions integer;

COMMENT ON COLUMN public.haccp_preparation_labels.portions IS
  'Porzioni rimanenti da consumare (intero). Il peso totale resta in quantity + unit.';

-- Backfill dati: vedi 20261005140000_haccp_label_portions_backfill_fix.sql
-- (gli UPDATE qui fallivano su etichette finalized per protect_finalized_haccp_label)

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

  IF EXISTS (SELECT 1 FROM public.haccp_preparation_labels WHERE source_preparation_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  _cons := CASE WHEN NEW.storage_type IN ('frigo','freezer','ambiente') THEN NEW.storage_type ELSE 'frigo' END;

  INSERT INTO public.haccp_preparation_labels (
    restaurant_id, preparation_name, production_date, expiration_date,
    conservation_type, quantity, unit, portions, notes, status,
    created_by, source_preparation_id
  )
  VALUES (
    NEW.restaurant_id,
    NEW.name,
    COALESCE(NEW.production_date, NEW.prepared_at::date, CURRENT_DATE),
    COALESCE(NEW.use_by_date, CURRENT_DATE + INTERVAL '3 days'),
    _cons,
    NULL,
    NULL,
    COALESCE(NEW.portions, 1),
    NEW.notes,
    'draft',
    NEW.owner_user_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;
