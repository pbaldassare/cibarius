
-- Add default portion columns to ingredients
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS default_portion_g numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS default_portion_label text DEFAULT '100 g';
