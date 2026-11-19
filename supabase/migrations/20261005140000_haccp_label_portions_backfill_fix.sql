-- Backfill porzioni HACCP rispettando protect_finalized_haccp_label:
-- su finalized/cancelled non si possono modificare quantity, unit, date, ecc.

ALTER TABLE public.haccp_preparation_labels
  ADD COLUMN IF NOT EXISTS portions integer;

-- Allinea alle preparazioni collegate (solo colonna portions)
UPDATE public.haccp_preparation_labels l
SET portions = p.portions
FROM public.preparations p
WHERE l.source_preparation_id = p.id
  AND l.portions IS NULL
  AND p.portions IS NOT NULL
  AND l.status <> 'cancelled';

-- Legacy pz in bozza: sposta porzioni fuori da quantity/unit
UPDATE public.haccp_preparation_labels
SET portions = GREATEST(1, quantity::integer),
    quantity = NULL,
    unit = NULL
WHERE portions IS NULL
  AND status = 'draft'
  AND quantity IS NOT NULL
  AND COALESCE(unit, 'pz') IN ('pz', 'porz.', 'porzioni');

-- Legacy pz su etichette finalizzate: imposta solo portions (quantity/unit immutabili)
UPDATE public.haccp_preparation_labels
SET portions = GREATEST(1, quantity::integer)
WHERE portions IS NULL
  AND status = 'finalized'
  AND quantity IS NOT NULL
  AND COALESCE(unit, 'pz') IN ('pz', 'porz.', 'porzioni');

-- Etichette finalizzate con unità peso: default porzioni senza toccare quantity
UPDATE public.haccp_preparation_labels
SET portions = 1
WHERE portions IS NULL
  AND status = 'finalized';

-- Bozze rimanenti senza porzioni
UPDATE public.haccp_preparation_labels
SET portions = 1
WHERE portions IS NULL
  AND status = 'draft';
