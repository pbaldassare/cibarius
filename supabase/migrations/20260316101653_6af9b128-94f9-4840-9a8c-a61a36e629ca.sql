
INSERT INTO public.ingredients (name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, default_portion_g, default_portion_label)
VALUES
('bevanda proteica RTD', 60, 10, 3, 1, 'bevande', 300, '1 bottiglia'),
('barretta proteica low carb', 320, 35, 20, 12, 'snack', 40, '1 barretta'),
('crema di arachidi 100%', 600, 25, 12, 52, 'condimenti', 15, '1 cucchiaio'),
('noci brasiliane', 660, 14, 12, 67, 'frutta secca', 10, '2 noci'),
('semi di zucca tostati', 560, 30, 15, 49, 'frutta secca', 15, '1 cucchiaio'),
('semi di girasole tostati', 580, 21, 20, 51, 'frutta secca', 15, '1 cucchiaio'),
('mix di frutta secca e semi', 550, 18, 22, 46, 'frutta secca', 30, '1 manciata')
ON CONFLICT (name) DO NOTHING;
