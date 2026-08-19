ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS source_document_id uuid
  REFERENCES public.haccp_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_source_document
  ON public.inventory_items(source_document_id);

CREATE OR REPLACE FUNCTION public.seed_francesca_biazzi()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := '718a977f-1742-40bc-9960-c61a876e1d93';
  v_prefix text := '[FB] ';
  v_pid uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RETURN 'User not found: ' || v_user_id::text;
  END IF;

  UPDATE profiles SET full_name = 'Francesca Biazzi' WHERE id = v_user_id;

  DELETE FROM inventory_items WHERE owner_user_id = v_user_id;
  DELETE FROM preparation_ingredients WHERE preparation_id IN (
    SELECT id FROM preparations WHERE owner_user_id = v_user_id
  );
  DELETE FROM preparations WHERE owner_user_id = v_user_id;
  DELETE FROM waste_savings WHERE user_id = v_user_id;
  DELETE FROM products WHERE name LIKE v_prefix || '%';

  INSERT INTO products (name, brand, category, calories_100g, macros_100g, barcode, serving_size_g, unit, data_source, nutrition_available)
  VALUES
    (v_prefix || 'Latte fresco', 'Granarolo', 'latticini', 64, '{"p":3.3,"c":4.8,"f":3.6}', '8002670001012', 100, 'g', 'manual', true),
    (v_prefix || 'Mozzarella', 'Galbani', 'latticini', 280, '{"p":18,"c":1,"f":22}', '8000430301007', 125, 'g', 'manual', true),
    (v_prefix || 'Yogurt greco 0%', 'Fage', 'latticini', 57, '{"p":10,"c":4,"f":0}', '5201360630011', 150, 'g', 'manual', true),
    (v_prefix || 'Petto di pollo', NULL, 'carne', 165, '{"p":31,"c":0,"f":3.6}', NULL, 150, 'g', 'manual', true),
    (v_prefix || 'Uova fresche', 'Ovopel', 'latticini', 143, '{"p":12.6,"c":0.7,"f":9.9}', NULL, 60, 'g', 'manual', true),
    (v_prefix || 'Parmigiano Reggiano', 'Grana Padano', 'latticini', 392, '{"p":33,"c":0,"f":28}', NULL, 30, 'g', 'manual', true),
    (v_prefix || 'Insalata mista', NULL, 'verdura', 15, '{"p":1.3,"c":1.8,"f":0.2}', NULL, 100, 'g', 'manual', true),
    (v_prefix || 'Zucchine', NULL, 'verdura', 17, '{"p":1.2,"c":2.1,"f":0.3}', NULL, 200, 'g', 'manual', true),
    (v_prefix || 'Pomodorini ciliegino', NULL, 'verdura', 18, '{"p":1,"c":3.9,"f":0.2}', NULL, 250, 'g', 'manual', true),
    (v_prefix || 'Spaghetti', 'Barilla', 'pasta', 356, '{"p":12,"c":72,"f":1.5}', '8076809513753', 80, 'g', 'manual', true),
    (v_prefix || 'Passata di pomodoro', 'Mutti', 'verdura', 24, '{"p":1,"c":4,"f":0.2}', '8005110000102', 400, 'g', 'manual', true),
    (v_prefix || 'Riso Arborio', 'Scotti', 'pasta', 345, '{"p":7,"c":78,"f":0.5}', '8001250123456', 80, 'g', 'manual', true),
    (v_prefix || 'Tonno al naturale', 'Rio Mare', 'pesce', 116, '{"p":26,"c":0,"f":1}', '8005240001234', 80, 'g', 'manual', true),
    (v_prefix || 'Farina 00', 'Caputo', 'pasta', 340, '{"p":11,"c":73,"f":1}', NULL, 100, 'g', 'manual', true),
    (v_prefix || 'Olio extravergine', 'Monini', 'condimenti', 884, '{"p":0,"c":0,"f":100}', '8005510001181', 10, 'g', 'manual', true),
    (v_prefix || 'Caffè in grani', 'Lavazza', 'bevande', 2, '{"p":0.1,"c":0,"f":0}', NULL, 7, 'g', 'manual', true),
    (v_prefix || 'Biscotti integrali', 'Misura', 'dolci', 420, '{"p":8,"c":68,"f":12}', NULL, 30, 'g', 'manual', true),
    (v_prefix || 'Spinaci surgelati', 'Findus', 'verdura', 23, '{"p":2.9,"c":2.2,"f":0.4}', NULL, 450, 'g', 'manual', true),
    (v_prefix || 'Filetti di merluzzo', 'Findus', 'pesce', 82, '{"p":18,"c":0,"f":0.7}', NULL, 100, 'g', 'manual', true),
    (v_prefix || 'Hummus', 'Citterio', 'condimenti', 166, '{"p":8,"c":14,"f":9}', NULL, 200, 'g', 'manual', true);

  -- Frigo (scadenze imminenti + uova scadute)
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE, 1, 'pz', 'full' FROM products WHERE name = v_prefix || 'Insalata mista' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 1, 1, 'l', 'full' FROM products WHERE name = v_prefix || 'Latte fresco' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 2, 400, 'g', 'full' FROM products WHERE name = v_prefix || 'Petto di pollo' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 2, 125, 'g', 'full' FROM products WHERE name = v_prefix || 'Mozzarella' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 3, 500, 'g', 'full' FROM products WHERE name = v_prefix || 'Zucchine' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 4, 250, 'g', 'full' FROM products WHERE name = v_prefix || 'Pomodorini ciliegino' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 6, 2, 'pz', 'full' FROM products WHERE name = v_prefix || 'Yogurt greco 0%' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 8, 1, 'pz', 'full' FROM products WHERE name = v_prefix || 'Hummus' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE - 2, 6, 'pz', 'full' FROM products WHERE name = v_prefix || 'Uova fresche' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'frigo', CURRENT_DATE + 25, 200, 'g', 'full' FROM products WHERE name = v_prefix || 'Parmigiano Reggiano' LIMIT 1;

  -- Dispensa
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 180, 500, 'g', 'full' FROM products WHERE name = v_prefix || 'Spaghetti' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 90, 2, 'pz', 'full' FROM products WHERE name = v_prefix || 'Passata di pomodoro' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 240, 1, 'kg', 'full' FROM products WHERE name = v_prefix || 'Riso Arborio' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 365, 3, 'pz', 'full' FROM products WHERE name = v_prefix || 'Tonno al naturale' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 120, 1, 'kg', 'full' FROM products WHERE name = v_prefix || 'Farina 00' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 300, 750, 'ml', 'full' FROM products WHERE name = v_prefix || 'Olio extravergine' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', NULL, 250, 'g', 'full' FROM products WHERE name = v_prefix || 'Caffè in grani' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'ambiente', CURRENT_DATE + 45, 1, 'pz', 'full' FROM products WHERE name = v_prefix || 'Biscotti integrali' LIMIT 1;

  -- Freezer
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'freezer', CURRENT_DATE + 120, 450, 'g', 'full' FROM products WHERE name = v_prefix || 'Spinaci surgelati' LIMIT 1;
  INSERT INTO inventory_items (product_id, owner_user_id, storage_type, expiry_date, quantity, unit, data_completeness)
  SELECT id, v_user_id, 'freezer', CURRENT_DATE + 60, 500, 'g', 'full' FROM products WHERE name = v_prefix || 'Filetti di merluzzo' LIMIT 1;

  -- Preparazioni
  INSERT INTO preparations (owner_user_id, name, description, storage_type, use_by_date, prepared_at, portions)
  VALUES (v_user_id, 'Sugo al basilico', 'Passata, basilico e olio — per pasta veloce', 'frigo', CURRENT_DATE + 2, NOW(), 2)
  RETURNING id INTO v_pid;
  INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
  SELECT v_pid, id, 200, 'g' FROM products WHERE name = v_prefix || 'Passata di pomodoro' LIMIT 1;
  INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
  SELECT v_pid, id, 10, 'g' FROM products WHERE name = v_prefix || 'Olio extravergine' LIMIT 1;

  INSERT INTO preparations (owner_user_id, name, description, storage_type, use_by_date, prepared_at, portions)
  VALUES (v_user_id, 'Minestra di verdure', 'Zucchine, carote e patate', 'frigo', CURRENT_DATE + 1, NOW(), 3)
  RETURNING id INTO v_pid;
  INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
  SELECT v_pid, id, 300, 'g' FROM products WHERE name = v_prefix || 'Zucchine' LIMIT 1;
  INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
  SELECT v_pid, id, 80, 'g' FROM products WHERE name = v_prefix || 'Riso Arborio' LIMIT 1;

  INSERT INTO waste_savings (user_id, item_name, weight_g, estimated_price, source)
  VALUES
    (v_user_id, 'Insalata mista', 120, 1.2, 'consumed'),
    (v_user_id, 'Yogurt greco', 150, 0.9, 'consumed'),
    (v_user_id, 'Zucchine', 300, 1.5, 'ai_suggestion'),
    (v_user_id, 'Pomodorini', 200, 1.8, 'cooked');

  RETURN 'Francesca Biazzi seeded OK — 20 prodotti, 20 in dispensa';
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_francesca_biazzi() TO authenticated;