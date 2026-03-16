
INSERT INTO public.ingredients (name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, default_portion_g, default_portion_label)
VALUES
('trail mix energetico', 480, 14, 42, 30, 'snack', 40, '1 manciata'),
('chips di mela essiccata', 250, 1, 64, 0, 'snack', 20, '5 chips'),
('crema di sesamo nero', 590, 17, 22, 53, 'condimenti', 15, '1 cucchiaio'),
('topping croccante per yogurt', 420, 8, 55, 20, 'snack', 20, '1 cucchiaio')
ON CONFLICT (name) DO NOTHING;
