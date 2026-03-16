
INSERT INTO public.ingredients (name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, default_portion_g, default_portion_label)
VALUES
('mix proteico vegano alla vaniglia', 360, 72, 12, 5, 'integratori', 30, '1 misurino'),
('burro chiarificato', 876, 0, 0, 99, 'condimenti', 5, '1 cucchiaino')
ON CONFLICT (name) DO NOTHING;
