
-- Auto-log product usage when an inventory item is inserted
CREATE OR REPLACE FUNCTION public.log_product_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    INSERT INTO public.product_usage_log (user_id, product_id)
    VALUES (NEW.owner_user_id, NEW.product_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_product_usage
  AFTER INSERT ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_product_usage();
