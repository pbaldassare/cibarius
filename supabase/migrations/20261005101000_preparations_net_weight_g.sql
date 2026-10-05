ALTER TABLE public.preparations
  ADD COLUMN IF NOT EXISTS net_weight_g numeric;

COMMENT ON COLUMN public.preparations.net_weight_g IS
  'Peso netto totale della produzione in grammi, non il peso di una porzione.';
