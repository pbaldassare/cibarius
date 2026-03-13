ALTER TABLE public.products 
ADD COLUMN data_source text NOT NULL DEFAULT 'unknown';

COMMENT ON COLUMN public.products.data_source IS 'How product was created: barcode, ai_photo, manual, receipt, unknown';

-- Mark existing products with barcode as barcode-sourced
UPDATE public.products SET data_source = 'barcode' WHERE barcode IS NOT NULL AND barcode != '';
-- Rest remain unknown (legacy)