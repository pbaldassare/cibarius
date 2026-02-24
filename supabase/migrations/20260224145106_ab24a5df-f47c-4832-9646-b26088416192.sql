
-- Add serving_size_g to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS serving_size_g numeric;

-- Add macros_total to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS macros_total jsonb;
