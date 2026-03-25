
-- 1. Add ingredients column to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS ingredients text;

-- 2. Create inventory_item_photos table
CREATE TABLE public.inventory_item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_type text NOT NULL DEFAULT 'inventory',
  photo_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.inventory_item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant members can view item photos"
  ON public.inventory_item_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN restaurant_members rm ON rm.restaurant_id = ii.restaurant_id
      WHERE ii.id = inventory_item_photos.item_id
        AND inventory_item_photos.item_type = 'inventory'
        AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM preparations p
      JOIN restaurant_members rm ON rm.restaurant_id = p.restaurant_id
      WHERE p.id = inventory_item_photos.item_id
        AND inventory_item_photos.item_type = 'preparation'
        AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant members can insert item photos"
  ON public.inventory_item_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN restaurant_members rm ON rm.restaurant_id = ii.restaurant_id
      WHERE ii.id = inventory_item_photos.item_id
        AND inventory_item_photos.item_type = 'inventory'
        AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM preparations p
      JOIN restaurant_members rm ON rm.restaurant_id = p.restaurant_id
      WHERE p.id = inventory_item_photos.item_id
        AND inventory_item_photos.item_type = 'preparation'
        AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant members can delete item photos"
  ON public.inventory_item_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN restaurant_members rm ON rm.restaurant_id = ii.restaurant_id
      WHERE ii.id = inventory_item_photos.item_id
        AND inventory_item_photos.item_type = 'inventory'
        AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM preparations p
      JOIN restaurant_members rm ON rm.restaurant_id = p.restaurant_id
      WHERE p.id = inventory_item_photos.item_id
        AND inventory_item_photos.item_type = 'preparation'
        AND rm.user_id = auth.uid()
    )
  );

-- 3. Create inventory_item_allergens table
CREATE TABLE public.inventory_item_allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
  UNIQUE(inventory_item_id, allergen_id)
);

ALTER TABLE public.inventory_item_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant members can view inventory allergens"
  ON public.inventory_item_allergens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN restaurant_members rm ON rm.restaurant_id = ii.restaurant_id
      WHERE ii.id = inventory_item_allergens.inventory_item_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant members can insert inventory allergens"
  ON public.inventory_item_allergens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN restaurant_members rm ON rm.restaurant_id = ii.restaurant_id
      WHERE ii.id = inventory_item_allergens.inventory_item_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant members can delete inventory allergens"
  ON public.inventory_item_allergens FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN restaurant_members rm ON rm.restaurant_id = ii.restaurant_id
      WHERE ii.id = inventory_item_allergens.inventory_item_id AND rm.user_id = auth.uid()
    )
  );

-- 4. Create item-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view item photos" ON storage.objects FOR SELECT USING (bucket_id = 'item-photos');
CREATE POLICY "Authenticated users can upload item photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'item-photos');
CREATE POLICY "Authenticated users can delete item photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'item-photos');
