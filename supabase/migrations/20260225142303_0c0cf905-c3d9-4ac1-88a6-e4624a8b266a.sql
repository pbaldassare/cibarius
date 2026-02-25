-- Add label_code column to preparations table
ALTER TABLE public.preparations ADD COLUMN label_code text UNIQUE;

-- Create index for fast lookup
CREATE INDEX idx_preparations_label_code ON public.preparations(label_code) WHERE label_code IS NOT NULL;