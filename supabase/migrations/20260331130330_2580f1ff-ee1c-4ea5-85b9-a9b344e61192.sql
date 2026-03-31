
-- Add data_completeness to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS data_completeness text NOT NULL DEFAULT 'basic';

-- Add photo_type to inventory_item_photos for categorization
ALTER TABLE public.inventory_item_photos ADD COLUMN IF NOT EXISTS photo_type text NOT NULL DEFAULT 'product';
-- photo_type values: 'product', 'nutrition_label', 'ingredients', 'other'

-- Add ai_analysis_pending for future AI photo analysis
ALTER TABLE public.inventory_item_photos ADD COLUMN IF NOT EXISTS ai_analysis_pending boolean NOT NULL DEFAULT false;
