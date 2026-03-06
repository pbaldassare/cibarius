
-- =============================================
-- DIGIUNO: +8 pranzo (porzioni più grandi, no colazione)
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Pasta con ragù ricco', 'pranzo', 'digiuno',
 '[{"name":"Rigatoni","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Macinato di manzo","grams":120,"kcal":180,"protein_g":24,"carbs_g":0,"fats_g":9.6},{"name":"Passata","grams":100,"kcal":25,"protein_g":1,"carbs_g":4.5,"fats_g":0.2},{"name":"Carota","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.8,"fats_g":0},{"name":"Cipolla","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.9,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2}]',
 723, 43.1, 78.2, 26, 0.8, 'Preparare ragù con macinato, passata e soffritto. Condire la pasta, aggiungere parmigiano.', 30),

('Bowl di pollo teriyaki', 'pranzo', 'digiuno',
 '[{"name":"Riso basmati","grams":100,"kcal":360,"protein_g":7,"carbs_g":78,"fats_g":0.7},{"name":"Petto di pollo","grams":160,"kcal":166,"protein_g":36.8,"carbs_g":0,"fats_g":1.6},{"name":"Salsa di soia","grams":15,"kcal":8,"protein_g":1.2,"carbs_g":0.6,"fats_g":0},{"name":"Miele","grams":10,"kcal":32,"protein_g":0.1,"carbs_g":8.2,"fats_g":0},{"name":"Edamame","grams":40,"kcal":49,"protein_g":4.4,"carbs_g":3.2,"fats_g":2.2},{"name":"Olio di sesamo","grams":5,"kcal":44,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 659, 49.5, 90, 9.5, 0.8, 'Cuocere riso, glassare pollo con soia e miele, servire con edamame.', 20),

('Risotto ai frutti di mare', 'pranzo', 'digiuno',
 '[{"name":"Riso carnaroli","grams":100,"kcal":350,"protein_g":7,"carbs_g":78,"fats_g":1},{"name":"Mix frutti di mare","grams":150,"kcal":120,"protein_g":24,"carbs_g":3,"fats_g":1.5},{"name":"Vino bianco","grams":30,"kcal":24,"protein_g":0,"carbs_g":0.9,"fats_g":0},{"name":"Aglio","grams":3,"kcal":4,"protein_g":0.2,"carbs_g":0.9,"fats_g":0},{"name":"Prezzemolo","grams":5,"kcal":2,"protein_g":0.1,"carbs_g":0.3,"fats_g":0},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 606, 31.3, 83.1, 14.5, 0.8, 'Tostare riso, sfumare con vino, aggiungere brodo e frutti di mare a fine cottura.', 30),

('Piadina farcita', 'pranzo', 'digiuno',
 '[{"name":"Piadina","grams":100,"kcal":305,"protein_g":7.5,"carbs_g":48,"fats_g":9.5},{"name":"Prosciutto crudo","grams":40,"kcal":92,"protein_g":10.4,"carbs_g":0,"fats_g":5.6},{"name":"Stracchino","grams":50,"kcal":150,"protein_g":9,"carbs_g":0,"fats_g":12.5},{"name":"Rucola","grams":20,"kcal":5,"protein_g":0.5,"carbs_g":0.8,"fats_g":0.2},{"name":"Pomodorini","grams":40,"kcal":8,"protein_g":0.3,"carbs_g":1.6,"fats_g":0.1}]',
 560, 27.7, 50.4, 27.9, 0.8, 'Scaldare la piadina, farcire con stracchino, prosciutto, rucola e pomodorini.', 5),

('Pasta alla norma', 'pranzo', 'digiuno',
 '[{"name":"Penne","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Melanzane","grams":150,"kcal":37,"protein_g":1.5,"carbs_g":6.6,"fats_g":0.3},{"name":"Passata","grams":100,"kcal":25,"protein_g":1,"carbs_g":4.5,"fats_g":0.2},{"name":"Ricotta salata","grams":20,"kcal":68,"protein_g":3.6,"carbs_g":0.6,"fats_g":5.6},{"name":"Olio EVO","grams":15,"kcal":132,"protein_g":0,"carbs_g":0,"fats_g":15},{"name":"Basilico","grams":3,"kcal":1,"protein_g":0.1,"carbs_g":0.1,"fats_g":0}]',
 618, 18.7, 81.8, 23.1, 0.8, 'Friggere le melanzane, cuocere passata con basilico, condire la pasta e aggiungere ricotta grattugiata.', 20),

('Riso con curry di pollo', 'pranzo', 'digiuno',
 '[{"name":"Riso basmati","grams":90,"kcal":324,"protein_g":6.3,"carbs_g":70.2,"fats_g":0.6},{"name":"Petto di pollo","grams":150,"kcal":156,"protein_g":34.5,"carbs_g":0,"fats_g":1.5},{"name":"Latte di cocco","grams":50,"kcal":100,"protein_g":1,"carbs_g":1.5,"fats_g":10.5},{"name":"Curry","grams":5,"kcal":16,"protein_g":0.7,"carbs_g":2.5,"fats_g":0.4},{"name":"Cipolla","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 678, 42.8, 77, 21, 0.8, 'Saltare pollo e cipolla, aggiungere curry e latte di cocco. Servire con riso.', 20),

('Insalatona proteica', 'pranzo', 'digiuno',
 '[{"name":"Lattuga","grams":60,"kcal":8,"protein_g":0.5,"carbs_g":1.5,"fats_g":0.1},{"name":"Tonno al naturale","grams":80,"kcal":88,"protein_g":20,"carbs_g":0,"fats_g":0.8},{"name":"Uova sode","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Mais","grams":40,"kcal":39,"protein_g":1.2,"carbs_g":7.2,"fats_g":0.5},{"name":"Mozzarella","grams":50,"kcal":125,"protein_g":9.3,"carbs_g":0.3,"fats_g":9.5},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12},{"name":"Pane","grams":50,"kcal":130,"protein_g":4.5,"carbs_g":25,"fats_g":0.8}]',
 640, 48.1, 34.8, 33.7, 0.8, 'Comporre l''insalata con tutti gli ingredienti, condire con olio. Pane a parte.', 10),

('Gnocchi al pesto con pollo', 'pranzo', 'digiuno',
 '[{"name":"Gnocchi","grams":200,"kcal":320,"protein_g":6,"carbs_g":66,"fats_g":2},{"name":"Pesto genovese","grams":25,"kcal":125,"protein_g":1.5,"carbs_g":1.5,"fats_g":12.5},{"name":"Petto di pollo","grams":100,"kcal":104,"protein_g":23,"carbs_g":0,"fats_g":1},{"name":"Parmigiano","grams":10,"kcal":39,"protein_g":3.5,"carbs_g":0,"fats_g":2.8}]',
 588, 34, 67.5, 18.3, 0.8, 'Cuocere gnocchi, grigliare pollo a fette, condire gnocchi con pesto e servire con pollo.', 15);

-- =============================================
-- DIGIUNO: +8 cena
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Bistecca con contorno misto', 'cena', 'digiuno',
 '[{"name":"Bistecca di manzo","grams":200,"kcal":260,"protein_g":40,"carbs_g":0,"fats_g":10},{"name":"Patate al forno","grams":150,"kcal":129,"protein_g":3,"carbs_g":28.5,"fats_g":0.2},{"name":"Insalata mista","grams":60,"kcal":11,"protein_g":0.8,"carbs_g":1.5,"fats_g":0.2},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 506, 43.8, 30, 22.4, 0.8, 'Grigliare la bistecca, servire con patate al forno e insalata.', 25),

('Pasta al forno', 'cena', 'digiuno',
 '[{"name":"Penne","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Ragù di carne","grams":120,"kcal":150,"protein_g":12,"carbs_g":4.8,"fats_g":9.6},{"name":"Besciamella","grams":50,"kcal":65,"protein_g":1.5,"carbs_g":4.5,"fats_g":4.5},{"name":"Mozzarella","grams":50,"kcal":125,"protein_g":9.3,"carbs_g":0.3,"fats_g":9.5},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2}]',
 754, 40.5, 79.6, 29.8, 0.8, 'Condire pasta con ragù, alternare con besciamella e formaggi. Forno 200° per 20 min.', 30),

('Pesce con patate al forno', 'cena', 'digiuno',
 '[{"name":"Orata filetti","grams":200,"kcal":190,"protein_g":38,"carbs_g":0,"fats_g":4},{"name":"Patate","grams":200,"kcal":172,"protein_g":4,"carbs_g":38,"fats_g":0.2},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Olive","grams":15,"kcal":22,"protein_g":0.2,"carbs_g":0.3,"fats_g":2.3},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 502, 42.7, 40.7, 18.6, 0.8, 'Mettere pesce e patate in teglia con pomodorini e olive. Forno 200° per 30 min.', 35),

('Tagliata con rucola', 'cena', 'digiuno',
 '[{"name":"Controfiletto","grams":180,"kcal":234,"protein_g":36,"carbs_g":0,"fats_g":9},{"name":"Rucola","grams":40,"kcal":10,"protein_g":1,"carbs_g":1.5,"fats_g":0.3},{"name":"Parmigiano scaglie","grams":20,"kcal":78,"protein_g":6.9,"carbs_g":0,"fats_g":5.6},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Pane","grams":50,"kcal":130,"protein_g":4.5,"carbs_g":25,"fats_g":0.8}]',
 540, 48.4, 26.5, 25.7, 0.8, 'Grigliare al sangue, affettare e servire con rucola, parmigiano e pane.', 10),

('Risotto con salsiccia', 'cena', 'digiuno',
 '[{"name":"Riso carnaroli","grams":90,"kcal":315,"protein_g":6.3,"carbs_g":70,"fats_g":0.9},{"name":"Salsiccia","grams":80,"kcal":256,"protein_g":12.8,"carbs_g":0.8,"fats_g":22.4},{"name":"Cipolla","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.9,"fats_g":0},{"name":"Vino bianco","grams":20,"kcal":16,"protein_g":0,"carbs_g":0.6,"fats_g":0},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2}]',
 654, 24.5, 73.3, 27.5, 0.8, 'Sbricciolare salsiccia, rosolare con cipolla, tostare riso, sfumare e cuocere aggiungendo brodo. Mantecare con parmigiano.', 25),

('Frittata sostanziosa', 'cena', 'digiuno',
 '[{"name":"Uova","grams":200,"kcal":288,"protein_g":25.2,"carbs_g":1.6,"fats_g":20},{"name":"Patate","grams":120,"kcal":103,"protein_g":2.4,"carbs_g":22.8,"fats_g":0.1},{"name":"Cipolla","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.8,"fats_g":0},{"name":"Prosciutto cotto","grams":40,"kcal":52,"protein_g":7.6,"carbs_g":0.4,"fats_g":2.4},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Pane","grams":40,"kcal":104,"protein_g":3.6,"carbs_g":20,"fats_g":0.6}]',
 647, 39.1, 47.6, 33.1, 0.8, 'Cuocere patate a cubetti, aggiungere cipolla e prosciutto, versare uova e cuocere la frittata. Pane a parte.', 20),

('Polpette con verdure', 'cena', 'digiuno',
 '[{"name":"Macinato misto","grams":150,"kcal":255,"protein_g":22.5,"carbs_g":0,"fats_g":18.8},{"name":"Pangrattato","grams":20,"kcal":73,"protein_g":2.2,"carbs_g":14,"fats_g":1},{"name":"Uovo","grams":50,"kcal":72,"protein_g":6.3,"carbs_g":0.4,"fats_g":5},{"name":"Passata","grams":100,"kcal":25,"protein_g":1,"carbs_g":4.5,"fats_g":0.2},{"name":"Zucchine","grams":100,"kcal":16,"protein_g":1.2,"carbs_g":2.5,"fats_g":0.3},{"name":"Pane","grams":50,"kcal":130,"protein_g":4.5,"carbs_g":25,"fats_g":0.8}]',
 571, 37.7, 46.4, 26.1, 0.8, 'Formare polpette, rosolare e cuocere nella passata. Zucchine grigliate a parte. Pane per accompagnare.', 25),

('Salmone con quinoa', 'cena', 'digiuno',
 '[{"name":"Salmone filetto","grams":160,"kcal":294,"protein_g":32,"carbs_g":0,"fats_g":17.6},{"name":"Quinoa","grams":70,"kcal":256,"protein_g":9.8,"carbs_g":44.8,"fats_g":4.2},{"name":"Spinaci","grams":80,"kcal":18,"protein_g":2.3,"carbs_g":2,"fats_g":0.3},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 638, 44.1, 46.8, 30.1, 0.8, 'Cuocere quinoa, grigliare salmone, saltare spinaci. Comporre il piatto.', 20);

-- =============================================
-- DIGIUNO: +9 spuntino (finestra alimentare, quindi spuntino sostanzioso)
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Yogurt con granola', 'spuntino', 'digiuno',
 '[{"name":"Yogurt greco","grams":150,"kcal":144,"protein_g":9,"carbs_g":6,"fats_g":9},{"name":"Granola","grams":30,"kcal":135,"protein_g":2.4,"carbs_g":21,"fats_g":4.8}]',
 279, 11.4, 27, 13.8, 0.8, 'Versare granola sullo yogurt.', 2),

('Pane con burro d''arachidi', 'spuntino', 'digiuno',
 '[{"name":"Pane integrale","grams":40,"kcal":92,"protein_g":3.6,"carbs_g":16,"fats_g":1.2},{"name":"Burro di arachidi","grams":20,"kcal":118,"protein_g":5,"carbs_g":2.8,"fats_g":10}]',
 210, 8.6, 18.8, 11.2, 0.8, 'Spalmare burro di arachidi sul pane.', 2),

('Barretta energetica', 'spuntino', 'digiuno',
 '[{"name":"Barretta ai cereali","grams":35,"kcal":140,"protein_g":2.5,"carbs_g":22,"fats_g":4.9},{"name":"Banana","grams":80,"kcal":71,"protein_g":0.9,"carbs_g":16.8,"fats_g":0.3}]',
 211, 3.4, 38.8, 5.2, 0.8, 'Gustare la barretta con una banana.', 1),

('Frutta e cioccolato fondente', 'spuntino', 'digiuno',
 '[{"name":"Mela","grams":120,"kcal":62,"protein_g":0.3,"carbs_g":14.4,"fats_g":0.2},{"name":"Cioccolato fondente 70%","grams":20,"kcal":108,"protein_g":1.5,"carbs_g":10,"fats_g":7.1}]',
 170, 1.8, 24.4, 7.3, 0.8, 'Tagliare la mela a fette, accompagnare con quadretti di cioccolato.', 2),

('Shake proteico', 'spuntino', 'digiuno',
 '[{"name":"Latte parzialmente scremato","grams":200,"kcal":92,"protein_g":6.4,"carbs_g":9.6,"fats_g":3.2},{"name":"Proteine in polvere","grams":30,"kcal":120,"protein_g":24,"carbs_g":3,"fats_g":1.5},{"name":"Banana","grams":60,"kcal":53,"protein_g":0.7,"carbs_g":12.6,"fats_g":0.2}]',
 265, 31.1, 25.2, 4.9, 0.8, 'Frullare latte, proteine e banana.', 3),

('Pane con crema proteica', 'spuntino', 'digiuno',
 '[{"name":"Pane integrale","grams":40,"kcal":92,"protein_g":3.6,"carbs_g":16,"fats_g":1.2},{"name":"Crema di nocciole proteica","grams":20,"kcal":96,"protein_g":4,"carbs_g":6,"fats_g":6}]',
 188, 7.6, 22, 7.2, 0.8, 'Spalmare crema proteica sul pane.', 2),

('Mix frutta secca e cocco', 'spuntino', 'digiuno',
 '[{"name":"Mandorle","grams":15,"kcal":87,"protein_g":3.2,"carbs_g":0.6,"fats_g":7.8},{"name":"Anacardi","grams":10,"kcal":55,"protein_g":1.8,"carbs_g":2.7,"fats_g":4.4},{"name":"Cocco disidratato","grams":10,"kcal":65,"protein_g":0.7,"carbs_g":0.6,"fats_g":6.5},{"name":"Uvetta","grams":10,"kcal":30,"protein_g":0.3,"carbs_g":7,"fats_g":0}]',
 237, 6, 10.9, 18.7, 0.8, 'Mescolare tutti gli ingredienti.', 1),

('Gallette con avocado', 'spuntino', 'digiuno',
 '[{"name":"Gallette di riso","grams":20,"kcal":77,"protein_g":1.4,"carbs_g":16.4,"fats_g":0.6},{"name":"Avocado","grams":60,"kcal":96,"protein_g":1.2,"carbs_g":1,"fats_g":9},{"name":"Sale rosa","grams":1,"kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0}]',
 173, 2.6, 17.4, 9.6, 0.8, 'Schiacciare avocado sulle gallette, aggiungere un pizzico di sale.', 3),

('Banana con mandorle', 'spuntino', 'digiuno',
 '[{"name":"Banana","grams":120,"kcal":107,"protein_g":1.3,"carbs_g":25.2,"fats_g":0.4},{"name":"Mandorle","grams":20,"kcal":116,"protein_g":4.2,"carbs_g":0.8,"fats_g":10.4}]',
 223, 5.5, 26, 10.8, 0.8, 'Gustare la banana con mandorle.', 1);
