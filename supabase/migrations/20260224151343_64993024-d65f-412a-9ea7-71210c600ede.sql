-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_owner ON public.inventory_items (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_restaurant ON public.inventory_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry ON public.inventory_items (expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON public.recipes (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_public ON public.recipes (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_meal_days_user_date ON public.meal_days (user_id, day_date);