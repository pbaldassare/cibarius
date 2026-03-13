
-- Add nutrition_available column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS nutrition_available boolean NOT NULL DEFAULT false;

-- Update existing products
UPDATE public.products SET nutrition_available = true WHERE calories_100g IS NOT NULL AND calories_100g > 0;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.set_nutrition_available()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.nutrition_available := (NEW.calories_100g IS NOT NULL AND NEW.calories_100g > 0);
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_set_nutrition_available
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_nutrition_available();
