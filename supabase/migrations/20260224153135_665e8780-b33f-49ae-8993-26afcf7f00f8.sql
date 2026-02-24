
-- Products
INSERT INTO public.products (id, name, brand, barcode, category, calories_100g, macros_100g, serving_size_g, unit) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Pasta Barilla Spaghetti n.5', 'Barilla', '8076802085738', 'Pasta', 356, '{"protein":12.5,"carbs":71.2,"fat":1.5}', 80, 'g'),
  ('a0000001-0000-0000-0000-000000000002', 'Passata di Pomodoro', 'Mutti', '8005110070402', 'Conserve', 24, '{"protein":1.2,"carbs":3.8,"fat":0.2}', 100, 'ml'),
  ('a0000001-0000-0000-0000-000000000003', 'Parmigiano Reggiano DOP 24 mesi', 'Parmareggio', '8002670033182', 'Latticini', 392, '{"protein":33.0,"carbs":0.0,"fat":28.4}', 30, 'g'),
  ('a0000001-0000-0000-0000-000000000004', 'Mozzarella di Bufala', 'Galbani', '8000430200102', 'Latticini', 288, '{"protein":16.7,"carbs":0.4,"fat":24.0}', 125, 'g'),
  ('a0000001-0000-0000-0000-000000000005', 'Olio Extra Vergine di Oliva', 'Monini', '8005510001136', 'Condimenti', 884, '{"protein":0.0,"carbs":0.0,"fat":100.0}', 10, 'ml'),
  ('a0000001-0000-0000-0000-000000000006', 'Prosciutto Crudo di Parma', 'Negroni', '8002430056001', 'Salumi', 271, '{"protein":25.5,"carbs":0.3,"fat":18.4}', 50, 'g'),
  ('a0000001-0000-0000-0000-000000000007', 'Pane Integrale', 'Mulino Bianco', '8076809514316', 'Panificati', 247, '{"protein":8.5,"carbs":43.0,"fat":3.5}', 50, 'g'),
  ('a0000001-0000-0000-0000-000000000008', 'Yogurt Greco Bianco 0%', 'Fage', '5201054025734', 'Latticini', 52, '{"protein":9.0,"carbs":3.0,"fat":0.0}', 170, 'g'),
  ('a0000001-0000-0000-0000-000000000009', 'Uova Fresche Bio', 'Cascina Italia', '8003550045200', 'Uova', 143, '{"protein":12.6,"carbs":0.7,"fat":9.9}', 60, 'g'),
  ('a0000001-0000-0000-0000-000000000010', 'Latte Intero Fresco', 'Granarolo', '8002670021158', 'Latticini', 64, '{"protein":3.3,"carbs":4.8,"fat":3.6}', 250, 'ml'),
  ('a0000001-0000-0000-0000-000000000011', 'Riso Arborio', 'Riso Gallo', '8001420000102', 'Cereali', 343, '{"protein":6.5,"carbs":79.0,"fat":0.6}', 80, 'g'),
  ('a0000001-0000-0000-0000-000000000012', 'Tonno all''Olio d''Oliva', 'Rio Mare', '8004030021440', 'Conserve', 198, '{"protein":29.0,"carbs":0.0,"fat":8.1}', 80, 'g'),
  ('a0000001-0000-0000-0000-000000000013', 'Spinaci Surgelati', 'Findus', '8000430100105', 'Surgelati', 23, '{"protein":2.9,"carbs":1.6,"fat":0.4}', 150, 'g'),
  ('a0000001-0000-0000-0000-000000000014', 'Petto di Pollo', null, null, 'Carne', 110, '{"protein":23.1,"carbs":0.0,"fat":1.2}', 150, 'g'),
  ('a0000001-0000-0000-0000-000000000015', 'Zucchine', null, null, 'Verdure', 17, '{"protein":1.2,"carbs":3.1,"fat":0.3}', 200, 'g'),
  ('a0000001-0000-0000-0000-000000000016', 'Pomodori Ciliegino', null, null, 'Verdure', 18, '{"protein":0.9,"carbs":3.9,"fat":0.1}', 150, 'g'),
  ('a0000001-0000-0000-0000-000000000017', 'Basilico Fresco', null, null, 'Erbe', 23, '{"protein":3.2,"carbs":2.7,"fat":0.6}', 5, 'g'),
  ('a0000001-0000-0000-0000-000000000018', 'Aglio', null, null, 'Verdure', 149, '{"protein":6.4,"carbs":33.1,"fat":0.5}', 5, 'g'),
  ('a0000001-0000-0000-0000-000000000019', 'Burro', 'Lurpak', '5740900405003', 'Latticini', 717, '{"protein":0.9,"carbs":0.1,"fat":81.0}', 10, 'g'),
  ('a0000001-0000-0000-0000-000000000020', 'Farina 00', 'Caputo', '8014601001016', 'Farine', 340, '{"protein":11.0,"carbs":70.0,"fat":1.0}', 100, 'g')
ON CONFLICT (id) DO NOTHING;

-- Inventory
INSERT INTO public.inventory_items (id, product_id, owner_user_id, storage_type, quantity, unit, expiry_date, notes) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 3, 'pz', '2026-09-15', null),
  ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 2, 'pz', '2027-01-30', null),
  ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 1, 'pz', '2026-04-20', null),
  ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 2, 'pz', '2026-02-26', 'Usare presto!'),
  ('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000005', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 1, 'pz', null, null),
  ('b0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000006', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 1, 'pz', '2026-03-10', null),
  ('b0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000007', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 1, 'pz', '2026-02-22', 'Scaduto!'),
  ('b0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000008', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 4, 'pz', '2026-03-05', null),
  ('b0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000009', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 6, 'pz', '2026-03-01', null),
  ('b0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000010', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 1, 'pz', '2026-02-28', null),
  ('b0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000011', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 2, 'pz', '2027-06-01', null),
  ('b0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000012', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 3, 'pz', '2027-12-01', null),
  ('b0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000013', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'freezer', 2, 'pz', '2026-08-15', null),
  ('b0000001-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000014', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 500, 'g', '2026-02-25', 'Scade domani'),
  ('b0000001-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000015', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 3, 'pz', '2026-03-02', null),
  ('b0000001-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000019', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'frigo', 1, 'pz', '2026-05-10', null),
  ('b0000001-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000020', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'ambiente', 1, 'pz', '2026-12-01', null)
ON CONFLICT (id) DO NOTHING;

-- Restaurant
INSERT INTO public.restaurants (id, name, owner_id, phone, address) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Trattoria Test', '9deea4e8-d4bb-4e8c-b3d3-5abfe1584b49', '+39 02 1234567', 'Via Roma 1, Milano')
ON CONFLICT (id) DO NOTHING;

-- Recipes
INSERT INTO public.recipes (id, restaurant_id, title, category, difficulty, prep_time_minutes, cook_time_minutes, servings, instructions, is_public) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Spaghetti al Pomodoro e Basilico', 'Primi', 'facile', 10, 15, 4, E'1. Cuocere gli spaghetti.\n2. Scaldare olio con aglio.\n3. Aggiungere passata.\n4. Unire basilico.\n5. Saltare la pasta.\n6. Servire con Parmigiano.', true),
  ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Risotto alla Parmigiana', 'Primi', 'medio', 5, 25, 4, E'1. Tostare il riso.\n2. Sfumare con vino.\n3. Aggiungere brodo.\n4. Mantecare con Parmigiano.', true),
  ('d0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Insalata Caprese', 'Antipasti', 'facile', 10, 0, 2, E'1. Tagliare mozzarella.\n2. Alternare con pomodoro.\n3. Condire con olio e basilico.', true),
  ('d0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'Pollo alla Griglia con Zucchine', 'Secondi', 'facile', 15, 20, 2, E'1. Marinare il pollo.\n2. Grigliare 8 min per lato.\n3. Grigliare le zucchine.\n4. Servire.', true),
  ('d0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 'Frittata di Spinaci', 'Secondi', 'facile', 10, 15, 4, E'1. Sbattere le uova.\n2. Aggiungere spinaci e Parmigiano.\n3. Cuocere 7 min per lato.', true)
ON CONFLICT (id) DO NOTHING;

-- Recipe ingredients
INSERT INTO public.recipe_ingredients (recipe_id, product_id, quantity, unit) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 320, 'g'),
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 400, 'ml'),
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 50, 'g'),
  ('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000011', 320, 'g'),
  ('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', 80, 'g'),
  ('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000019', 30, 'g'),
  ('d0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000004', 250, 'g'),
  ('d0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000016', 300, 'g'),
  ('d0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000014', 400, 'g'),
  ('d0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000015', 300, 'g'),
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000009', 6, 'pz'),
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000013', 200, 'g'),
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 40, 'g');

-- Meal days
INSERT INTO public.meal_days (id, user_id, day_date) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', '2026-02-24'),
  ('e0000001-0000-0000-0000-000000000002', 'ba300bba-a56b-4cc0-9e48-24aed9bd4189', '2026-02-23')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meals (id, meal_day_id, meal_type) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'colazione'),
  ('f0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'pranzo'),
  ('f0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000001', 'cena'),
  ('f0000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000002', 'pranzo'),
  ('f0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000002', 'cena')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meal_items (meal_id, product_id, source_type, quantity, unit, calories, macros, custom_name) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'product', 170, 'g', 88, '{"protein":15.3,"carbs":5.1,"fat":0.0}', null),
  ('f0000001-0000-0000-0000-000000000001', null, 'custom', 50, 'g', 130, '{"protein":2.5,"carbs":25.0,"fat":1.5}', 'Fette biscottate integrali'),
  ('f0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'product', 80, 'g', 285, '{"protein":10.0,"carbs":57.0,"fat":1.2}', null),
  ('f0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'product', 150, 'ml', 36, '{"protein":1.8,"carbs":5.7,"fat":0.3}', null),
  ('f0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000014', 'product', 200, 'g', 220, '{"protein":46.2,"carbs":0.0,"fat":2.4}', null),
  ('f0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000015', 'product', 200, 'g', 34, '{"protein":2.4,"carbs":6.2,"fat":0.6}', null),
  ('f0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000011', 'product', 80, 'g', 274, '{"protein":5.2,"carbs":63.2,"fat":0.5}', null),
  ('f0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000012', 'product', 80, 'g', 158, '{"protein":23.2,"carbs":0.0,"fat":6.5}', null),
  ('f0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000007', 'product', 60, 'g', 148, '{"protein":5.1,"carbs":25.8,"fat":2.1}', null);

-- Nutrition targets
INSERT INTO public.nutrition_targets (user_id, kcal_day, protein_g, carbs_g, fats_g) VALUES
  ('ba300bba-a56b-4cc0-9e48-24aed9bd4189', 2000, 120, 250, 65)
ON CONFLICT (user_id) DO NOTHING;
