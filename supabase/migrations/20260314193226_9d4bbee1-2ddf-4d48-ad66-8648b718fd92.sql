-- Add unique constraint on barcode (only non-null values) for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique ON public.products (barcode) WHERE barcode IS NOT NULL;
-- Drop the old non-unique index since the unique one covers it
DROP INDEX IF EXISTS idx_products_barcode;