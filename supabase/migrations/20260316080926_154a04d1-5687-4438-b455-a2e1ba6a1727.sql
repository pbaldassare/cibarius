
INSERT INTO public.ingredients (name, name_en, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, source)
VALUES
-- Fagioli cotti e in scatola (molto meno calorici dei secchi)
('fagioli borlotti in scatola', 'canned borlotti beans', 92, 6.9, 13, 0.5, 'legumi', 'crea'),
('fagioli borlotti cotti', 'cooked borlotti beans', 125, 8.7, 19, 0.5, 'legumi', 'crea'),
('fagioli cannellini in scatola', 'canned cannellini beans', 91, 6.7, 13, 0.4, 'legumi', 'crea'),
('fagioli cannellini cotti', 'cooked cannellini beans', 118, 8.2, 18, 0.5, 'legumi', 'crea'),
('fagioli bianchi di spagna in scatola', 'canned butter beans', 89, 5.5, 14, 0.3, 'legumi', 'crea'),
('fagioli bianchi di spagna cotti', 'cooked butter beans', 114, 7.8, 17, 0.4, 'legumi', 'crea'),
('fagioli neri in scatola', 'canned black beans', 91, 6.6, 13, 0.4, 'legumi', 'crea'),
('fagioli neri cotti', 'cooked black beans', 132, 8.9, 20, 0.5, 'legumi', 'crea'),
('fagioli rossi in scatola', 'canned red kidney beans', 93, 6.9, 14, 0.4, 'legumi', 'crea'),
('fagioli rossi cotti', 'cooked red kidney beans', 127, 8.7, 19, 0.5, 'legumi', 'crea'),
('ceci in scatola', 'canned chickpeas already exists but just in case', 120, 7.3, 16, 2.6, 'legumi', 'crea'),
('ceci cotti', 'cooked chickpeas', 164, 8.9, 24, 2.6, 'legumi', 'crea'),
('lenticchie cotte', 'cooked lentils', 116, 9, 20, 0.4, 'legumi', 'crea'),
('lenticchie rosse cotte', 'cooked red lentils', 116, 9, 20, 0.4, 'legumi', 'crea'),
('lenticchie in scatola', 'canned lentils', 93, 6.9, 14, 0.4, 'legumi', 'crea'),
('fave cotte', 'cooked broad beans', 62, 5.6, 7.5, 0.4, 'legumi', 'crea'),
('piselli in scatola', 'canned peas', 68, 4.4, 10, 0.4, 'legumi', 'crea'),
('piselli cotti', 'cooked peas', 84, 5.4, 14, 0.4, 'legumi', 'crea'),

-- Pane fresco varianti
('pane fresco integrale', 'fresh whole wheat bread', 247, 9, 44, 3.5, 'pasta_riso_pane', 'crea'),
('pane fresco', 'fresh white bread', 265, 8.5, 49, 3.2, 'pasta_riso_pane', 'crea'),
('pane ai cereali', 'multigrain bread', 258, 10, 44, 4.5, 'pasta_riso_pane', 'crea'),
('pane di kamut', 'kamut bread', 260, 10, 47, 3, 'pasta_riso_pane', 'crea'),
('pane di farro', 'spelt bread', 255, 9.5, 46, 3, 'pasta_riso_pane', 'crea'),
('panino integrale', 'whole wheat roll', 250, 9.2, 44, 3.5, 'pasta_riso_pane', 'crea'),
('pane tostato', 'toasted bread', 293, 9.5, 55, 4, 'pasta_riso_pane', 'crea'),
('pane senza glutine', 'gluten-free bread', 246, 3.5, 47, 4.5, 'pasta_riso_pane', 'crea'),
('pan carré', 'sandwich bread', 262, 8, 48, 4.2, 'pasta_riso_pane', 'crea'),
('pan carré integrale', 'whole wheat sandwich bread', 248, 9, 43, 4, 'pasta_riso_pane', 'crea')

ON CONFLICT (name) DO NOTHING;
