
INSERT INTO public.template_recipes (title, meal_type, diet_category, instructions, prep_time_min, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female) VALUES

-- SPUNTINO KETO (5)
('Noci e formaggio', 'spuntino', 'keto', 'Accompagnare noci con cubetti di formaggio stagionato.', 2,
 '[{"name":"Noci","grams":20,"kcal":131,"protein_g":3,"carbs_g":1,"fats_g":13},{"name":"Parmigiano","grams":30,"kcal":118,"protein_g":10,"carbs_g":0,"fats_g":9}]',
 249, 13, 1, 22, 0.8),

('Uovo sodo con olive', 'spuntino', 'keto', 'Servire uova sode con olive nere.', 12,
 '[{"name":"Uova sode","grams":120,"kcal":172,"protein_g":15,"carbs_g":1,"fats_g":12},{"name":"Olive nere","grams":20,"kcal":29,"protein_g":0,"carbs_g":1,"fats_g":3}]',
 201, 15, 2, 15, 0.8),

('Sedano con crema di formaggio', 'spuntino', 'keto', 'Farcire i gambi di sedano con formaggio cremoso.', 3,
 '[{"name":"Sedano","grams":100,"kcal":16,"protein_g":1,"carbs_g":3,"fats_g":0},{"name":"Formaggio cremoso","grams":40,"kcal":140,"protein_g":3,"carbs_g":1,"fats_g":14}]',
 156, 4, 4, 14, 0.85),

('Avocado con salmone affumicato', 'spuntino', 'keto', 'Tagliare l''avocado a meta, farcire con salmone affumicato.', 3,
 '[{"name":"Avocado","grams":60,"kcal":96,"protein_g":1,"carbs_g":1,"fats_g":9},{"name":"Salmone affumicato","grams":40,"kcal":68,"protein_g":9,"carbs_g":0,"fats_g":4}]',
 164, 10, 1, 13, 0.85),

('Cioccolato fondente 85% con mandorle', 'spuntino', 'keto', 'Spezzare il cioccolato fondente e accompagnare con mandorle.', 1,
 '[{"name":"Cioccolato fondente 85%","grams":20,"kcal":108,"protein_g":2,"carbs_g":4,"fats_g":10},{"name":"Mandorle","grams":15,"kcal":87,"protein_g":3,"carbs_g":1,"fats_g":8}]',
 195, 5, 5, 18, 0.85),

-- SPUNTINO MASSA (5)
('Shake proteico con banana e latte', 'spuntino', 'massa', 'Frullare proteine con banana e latte.', 3,
 '[{"name":"Proteine whey","grams":30,"kcal":120,"protein_g":24,"carbs_g":3,"fats_g":1},{"name":"Banana","grams":100,"kcal":89,"protein_g":1,"carbs_g":20,"fats_g":0},{"name":"Latte intero","grams":200,"kcal":128,"protein_g":6,"carbs_g":10,"fats_g":7}]',
 337, 31, 33, 8, 0.75),

('Pane con prosciutto e formaggio', 'spuntino', 'massa', 'Farcire il panino con prosciutto e formaggio.', 3,
 '[{"name":"Pane integrale","grams":60,"kcal":140,"protein_g":5,"carbs_g":26,"fats_g":2},{"name":"Prosciutto crudo","grams":40,"kcal":88,"protein_g":11,"carbs_g":0,"fats_g":5},{"name":"Emmental","grams":20,"kcal":72,"protein_g":5,"carbs_g":0,"fats_g":6}]',
 300, 21, 26, 13, 0.75),

('Yogurt greco con miele e frutta secca', 'spuntino', 'massa', 'Mescolare yogurt con miele, noci e mandorle.', 3,
 '[{"name":"Yogurt greco intero","grams":200,"kcal":192,"protein_g":12,"carbs_g":8,"fats_g":12},{"name":"Miele","grams":15,"kcal":45,"protein_g":0,"carbs_g":12,"fats_g":0},{"name":"Noci e mandorle","grams":20,"kcal":118,"protein_g":4,"carbs_g":2,"fats_g":10}]',
 355, 16, 22, 22, 0.75),

('Gallette con burro d''arachidi e banana', 'spuntino', 'massa', 'Spalmare burro d''arachidi sulle gallette, aggiungere banana a rondelle.', 3,
 '[{"name":"Gallette di riso","grams":30,"kcal":114,"protein_g":3,"carbs_g":24,"fats_g":0},{"name":"Burro d''arachidi","grams":25,"kcal":147,"protein_g":6,"carbs_g":4,"fats_g":13},{"name":"Banana","grams":80,"kcal":71,"protein_g":1,"carbs_g":16,"fats_g":0}]',
 332, 10, 44, 13, 0.75),

('Barretta proteica fatta in casa', 'spuntino', 'massa', 'Barretta proteica confezionata ricca di proteine.', 1,
 '[{"name":"Barretta proteica","grams":60,"kcal":240,"protein_g":20,"carbs_g":22,"fats_g":8}]',
 240, 20, 22, 8, 0.8),

-- DIGIUNO: copie di pranzo/cena/spuntino con porzioni piu caloriche
('Pasta al ragu abbondante', 'pranzo', 'digiuno', 'Cuocere pasta con ragu di carne ricco.', 25,
 '[{"name":"Pasta di semola","grams":100,"kcal":352,"protein_g":12,"carbs_g":70,"fats_g":2},{"name":"Carne macinata","grams":100,"kcal":150,"protein_g":20,"carbs_g":0,"fats_g":8},{"name":"Passata pomodoro","grams":80,"kcal":19,"protein_g":1,"carbs_g":3,"fats_g":0},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5,"carbs_g":0,"fats_g":4},{"name":"Olio extravergine","grams":10,"kcal":90,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 670, 38, 73, 24, 0.8),

('Riso con salmone e avocado bowl', 'pranzo', 'digiuno', 'Comporre bowl con riso, salmone, avocado ed edamame.', 15,
 '[{"name":"Riso basmati","grams":90,"kcal":315,"protein_g":6,"carbs_g":69,"fats_g":1},{"name":"Salmone fresco","grams":120,"kcal":221,"protein_g":24,"carbs_g":0,"fats_g":14},{"name":"Avocado","grams":60,"kcal":96,"protein_g":1,"carbs_g":1,"fats_g":9},{"name":"Edamame","grams":50,"kcal":63,"protein_g":6,"carbs_g":4,"fats_g":3}]',
 695, 37, 74, 27, 0.8),

('Pollo con patate e verdure al forno', 'cena', 'digiuno', 'Infornare pollo con patate e verdure miste.', 35,
 '[{"name":"Coscia di pollo","grams":200,"kcal":254,"protein_g":30,"carbs_g":0,"fats_g":15},{"name":"Patate","grams":180,"kcal":139,"protein_g":3,"carbs_g":30,"fats_g":0},{"name":"Zucchine","grams":100,"kcal":17,"protein_g":1,"carbs_g":2,"fats_g":0},{"name":"Olio extravergine","grams":10,"kcal":90,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 500, 34, 32, 25, 0.8),

('Salmone con purè e spinaci', 'cena', 'digiuno', 'Cuocere salmone in padella, preparare pure e saltare spinaci.', 25,
 '[{"name":"Filetto di salmone","grams":180,"kcal":331,"protein_g":36,"carbs_g":0,"fats_g":20},{"name":"Patate","grams":150,"kcal":116,"protein_g":3,"carbs_g":26,"fats_g":0},{"name":"Latte","grams":30,"kcal":14,"protein_g":1,"carbs_g":1,"fats_g":1},{"name":"Spinaci","grams":100,"kcal":23,"protein_g":3,"carbs_g":1,"fats_g":0},{"name":"Olio extravergine","grams":8,"kcal":72,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 556, 43, 28, 29, 0.8),

('Frutta secca mista energetica', 'spuntino', 'digiuno', 'Mix di frutta secca e disidratata per spuntino calorico.', 1,
 '[{"name":"Mandorle","grams":20,"kcal":116,"protein_g":4,"carbs_g":2,"fats_g":10},{"name":"Noci","grams":15,"kcal":98,"protein_g":2,"carbs_g":1,"fats_g":10},{"name":"Datteri","grams":20,"kcal":56,"protein_g":0,"carbs_g":14,"fats_g":0},{"name":"Uvetta","grams":15,"kcal":45,"protein_g":0,"carbs_g":12,"fats_g":0}]',
 315, 6, 29, 20, 0.85),

-- DIMAGRIMENTO extra spuntini
('Yogurt magro con cannella', 'spuntino', 'dimagrimento', 'Yogurt bianco magro con una spolverata di cannella.', 2,
 '[{"name":"Yogurt bianco 0%","grams":150,"kcal":57,"protein_g":10,"carbs_g":6,"fats_g":0}]',
 57, 10, 6, 0, 0.95),

('Carote e hummus', 'spuntino', 'dimagrimento', 'Tagliare le carote a bastoncini e intingere nell''hummus.', 3,
 '[{"name":"Carote","grams":120,"kcal":49,"protein_g":1,"carbs_g":10,"fats_g":0},{"name":"Hummus","grams":30,"kcal":50,"protein_g":2,"carbs_g":3,"fats_g":3}]',
 99, 3, 13, 3, 0.9),

('Mela verde con mandorle', 'spuntino', 'dimagrimento', 'Tagliare la mela a fette, accompagnare con mandorle.', 2,
 '[{"name":"Mela verde","grams":150,"kcal":78,"protein_g":0,"carbs_g":18,"fats_g":0},{"name":"Mandorle","grams":10,"kcal":58,"protein_g":2,"carbs_g":1,"fats_g":5}]',
 136, 2, 19, 5, 0.9);
