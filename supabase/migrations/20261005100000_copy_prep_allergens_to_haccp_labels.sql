-- Quando si crea una preparazione, l'etichetta HACCP automatica deve
-- ereditare allergeni e ingredienti, altrimenti il PDF pubblico resta vuoto.

CREATE OR REPLACE FUNCTION public.auto_create_haccp_label_for_preparation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cons text;
  _label_id uuid;
  _allergen_names text[];
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
  )
  RETURNING id INTO _label_id;

  SELECT COALESCE(array_agg(a.name ORDER BY a.name), '{}')
  INTO _allergen_names
  FROM public.preparation_allergens pa
  JOIN public.allergens a ON a.id = pa.allergen_id
  WHERE pa.preparation_id = NEW.id;

  IF _allergen_names IS NOT NULL AND array_length(_allergen_names, 1) > 0 THEN
    UPDATE public.haccp_preparation_labels
    SET allergens = _allergen_names
    WHERE id = _label_id;
  END IF;

  INSERT INTO public.haccp_preparation_ingredients (
    preparation_label_id, ingredient_name, quantity_used, unit
  )
  SELECT
    _label_id,
    COALESCE(NULLIF(pi.custom_name, ''), p.name, 'Ingrediente'),
    pi.quantity,
    pi.unit
  FROM public.preparation_ingredients pi
  LEFT JOIN public.products p ON p.id = pi.product_id
  WHERE pi.preparation_id = NEW.id;

  RETURN NEW;
END;
$$;

UPDATE public.haccp_preparation_labels l
SET allergens = sub.names
FROM (
  SELECT pa.preparation_id, array_agg(a.name ORDER BY a.name) AS names
  FROM public.preparation_allergens pa
  JOIN public.allergens a ON a.id = pa.allergen_id
  GROUP BY pa.preparation_id
) sub
WHERE l.source_preparation_id = sub.preparation_id
  AND (l.allergens IS NULL OR COALESCE(array_length(l.allergens, 1), 0) = 0);

INSERT INTO public.haccp_preparation_ingredients (
  preparation_label_id, ingredient_name, quantity_used, unit
)
SELECT
  l.id,
  COALESCE(NULLIF(pi.custom_name, ''), p.name, 'Ingrediente'),
  pi.quantity,
  pi.unit
FROM public.haccp_preparation_labels l
JOIN public.preparation_ingredients pi ON pi.preparation_id = l.source_preparation_id
LEFT JOIN public.products p ON p.id = pi.product_id
WHERE l.source_preparation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.haccp_preparation_ingredients i
    WHERE i.preparation_label_id = l.id
  );
