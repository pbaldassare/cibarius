
INSERT INTO public.template_recipes (title, meal_type, diet_category, instructions, prep_time_min, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female) VALUES

-- COLAZIONE MEDITERRANEA (10)
('Yogurt greco con muesli e frutta', 'colazione', 'mediterranea', 'Versare il muesli sullo yogurt, aggiungere frutta fresca a pezzi.', 5,
 '[{"name":"Yogurt greco 0%","grams":170,"kcal":97,"protein_g":17,"carbs_g":6,"fats_g":0},{"name":"Muesli integrale","grams":40,"kcal":148,"protein_g":4,"carbs_g":24,"fats_g":4},{"name":"Banana","grams":80,"kcal":72,"protein_g":1,"carbs_g":16,"fats_g":0}]',
 317, 22, 46, 4, 0.85),

('Pane integrale con ricotta e miele', 'colazione', 'mediterranea', 'Spalmare la ricotta sulle fette di pane, aggiungere un filo di miele.', 5,
 '[{"name":"Pane integrale","grams":60,"kcal":140,"protein_g":5,"carbs_g":26,"fats_g":2},{"name":"Ricotta vaccina","grams":80,"kcal":115,"protein_g":7,"carbs_g":3,"fats_g":8},{"name":"Miele","grams":10,"kcal":30,"protein_g":0,"carbs_g":8,"fats_g":0}]',
 285, 12, 37, 10, 0.85),

('Porridge con banana e burro d''arachidi', 'colazione', 'mediterranea', 'Cuocere i fiocchi d''avena con il latte, servire con banana a rondelle e burro d''arachidi.', 10,
 '[{"name":"Fiocchi d''avena","grams":50,"kcal":185,"protein_g":7,"carbs_g":30,"fats_g":4},{"name":"Latte parzialmente scremato","grams":150,"kcal":69,"protein_g":5,"carbs_g":7,"fats_g":2},{"name":"Banana","grams":80,"kcal":72,"protein_g":1,"carbs_g":16,"fats_g":0},{"name":"Burro d''arachidi","grams":15,"kcal":88,"protein_g":4,"carbs_g":2,"fats_g":8}]',
 414, 17, 55, 14, 0.75),

('Uova strapazzate con pane tostato', 'colazione', 'mediterranea', 'Sbattere le uova, cuocere in padella antiaderente. Servire con pane tostato.', 10,
 '[{"name":"Uova intere","grams":120,"kcal":172,"protein_g":15,"carbs_g":1,"fats_g":12},{"name":"Pane integrale tostato","grams":50,"kcal":117,"protein_g":4,"carbs_g":22,"fats_g":1},{"name":"Olio extravergine","grams":5,"kcal":45,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 334, 19, 23, 18, 0.8),

('Smoothie proteico con latte e avena', 'colazione', 'mediterranea', 'Frullare tutti gli ingredienti fino ad ottenere un composto liscio.', 5,
 '[{"name":"Latte parzialmente scremato","grams":200,"kcal":92,"protein_g":6,"carbs_g":10,"fats_g":3},{"name":"Fiocchi d''avena","grams":30,"kcal":111,"protein_g":4,"carbs_g":18,"fats_g":2},{"name":"Banana","grams":100,"kcal":89,"protein_g":1,"carbs_g":20,"fats_g":0},{"name":"Miele","grams":10,"kcal":30,"protein_g":0,"carbs_g":8,"fats_g":0}]',
 322, 11, 56, 5, 0.85),

('Pancake integrali con frutti di bosco', 'colazione', 'mediterranea', 'Mescolare farina, uovo e latte. Cuocere in padella antiaderente. Servire con frutti di bosco.', 15,
 '[{"name":"Farina integrale","grams":50,"kcal":160,"protein_g":6,"carbs_g":30,"fats_g":1},{"name":"Uovo","grams":60,"kcal":86,"protein_g":8,"carbs_g":0,"fats_g":6},{"name":"Latte parzialmente scremato","grams":80,"kcal":37,"protein_g":3,"carbs_g":4,"fats_g":1},{"name":"Frutti di bosco","grams":80,"kcal":36,"protein_g":1,"carbs_g":7,"fats_g":0}]',
 319, 18, 41, 8, 0.8),

('Fette biscottate con marmellata e yogurt', 'colazione', 'mediterranea', 'Spalmare la marmellata sulle fette biscottate, accompagnare con yogurt.', 3,
 '[{"name":"Fette biscottate integrali","grams":40,"kcal":156,"protein_g":4,"carbs_g":28,"fats_g":3},{"name":"Marmellata senza zucchero","grams":20,"kcal":28,"protein_g":0,"carbs_g":7,"fats_g":0},{"name":"Yogurt bianco","grams":125,"kcal":75,"protein_g":4,"carbs_g":6,"fats_g":4}]',
 259, 8, 41, 7, 0.85),

('Toast avocado e uovo', 'colazione', 'mediterranea', 'Tostare il pane, schiacciare l''avocado sopra, aggiungere l''uovo in camicia o sodo.', 10,
 '[{"name":"Pane integrale","grams":50,"kcal":117,"protein_g":4,"carbs_g":22,"fats_g":1},{"name":"Avocado","grams":60,"kcal":96,"protein_g":1,"carbs_g":1,"fats_g":9},{"name":"Uovo sodo","grams":60,"kcal":86,"protein_g":8,"carbs_g":0,"fats_g":6}]',
 299, 13, 23, 16, 0.8),

('Cornetto integrale con spremuta', 'colazione', 'mediterranea', 'Cornetto integrale dal forno con spremuta d''arancia fresca.', 5,
 '[{"name":"Cornetto integrale","grams":50,"kcal":185,"protein_g":4,"carbs_g":25,"fats_g":8},{"name":"Spremuta d''arancia","grams":200,"kcal":86,"protein_g":1,"carbs_g":20,"fats_g":0}]',
 271, 5, 45, 8, 0.85),

('Overnight oats con semi di chia', 'colazione', 'mediterranea', 'La sera: mescolare avena, latte, chia e miele in un barattolo. Lasciare in frigo tutta la notte.', 5,
 '[{"name":"Fiocchi d''avena","grams":45,"kcal":167,"protein_g":6,"carbs_g":27,"fats_g":3},{"name":"Latte parzialmente scremato","grams":150,"kcal":69,"protein_g":5,"carbs_g":7,"fats_g":2},{"name":"Semi di chia","grams":10,"kcal":49,"protein_g":2,"carbs_g":1,"fats_g":3},{"name":"Miele","grams":10,"kcal":30,"protein_g":0,"carbs_g":8,"fats_g":0}]',
 315, 13, 43, 8, 0.85),

-- COLAZIONE KETO (5)
('Uova al tegamino con avocado e formaggio', 'colazione', 'keto', 'Cuocere le uova al tegamino con olio, servire con avocado e formaggio a scaglie.', 8,
 '[{"name":"Uova intere","grams":120,"kcal":172,"protein_g":15,"carbs_g":1,"fats_g":12},{"name":"Avocado","grams":80,"kcal":128,"protein_g":2,"carbs_g":1,"fats_g":12},{"name":"Grana Padano","grams":20,"kcal":78,"protein_g":7,"carbs_g":0,"fats_g":6},{"name":"Olio extravergine","grams":5,"kcal":45,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 423, 24, 2, 35, 0.8),

('Omelette con spinaci e feta', 'colazione', 'keto', 'Sbattere le uova, aggiungere spinaci saltati e feta sbriciolata. Cuocere in padella.', 10,
 '[{"name":"Uova intere","grams":120,"kcal":172,"protein_g":15,"carbs_g":1,"fats_g":12},{"name":"Spinaci freschi","grams":80,"kcal":19,"protein_g":2,"carbs_g":1,"fats_g":0},{"name":"Feta","grams":40,"kcal":106,"protein_g":6,"carbs_g":1,"fats_g":9},{"name":"Burro","grams":10,"kcal":72,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 369, 23, 3, 29, 0.8),

('Yogurt greco intero con noci e cocco', 'colazione', 'keto', 'Versare le noci tritate e il cocco rape sullo yogurt.', 3,
 '[{"name":"Yogurt greco intero","grams":170,"kcal":163,"protein_g":10,"carbs_g":7,"fats_g":10},{"name":"Noci sgusciate","grams":25,"kcal":163,"protein_g":4,"carbs_g":2,"fats_g":16},{"name":"Cocco rape","grams":10,"kcal":60,"protein_g":1,"carbs_g":1,"fats_g":6}]',
 386, 15, 10, 32, 0.8),

('Pancake proteici keto al cocco', 'colazione', 'keto', 'Mescolare uova, farina di cocco e formaggio cremoso. Cuocere in padella come piccoli pancake.', 12,
 '[{"name":"Uova","grams":120,"kcal":172,"protein_g":15,"carbs_g":1,"fats_g":12},{"name":"Farina di cocco","grams":20,"kcal":80,"protein_g":3,"carbs_g":3,"fats_g":6},{"name":"Formaggio cremoso","grams":30,"kcal":105,"protein_g":2,"carbs_g":1,"fats_g":10}]',
 357, 20, 5, 28, 0.8),

('Salmone affumicato con crema di avocado', 'colazione', 'keto', 'Schiacciare l''avocado con limone e pepe, servire con fette di salmone affumicato.', 5,
 '[{"name":"Salmone affumicato","grams":80,"kcal":136,"protein_g":18,"carbs_g":0,"fats_g":7},{"name":"Avocado","grams":80,"kcal":128,"protein_g":2,"carbs_g":1,"fats_g":12},{"name":"Olio extravergine","grams":5,"kcal":45,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 309, 20, 1, 24, 0.8),

-- COLAZIONE MASSA (3)
('Porridge proteico con banana e proteine', 'colazione', 'massa', 'Cuocere avena con latte, aggiungere proteine in polvere e banana.', 10,
 '[{"name":"Fiocchi d''avena","grams":80,"kcal":296,"protein_g":11,"carbs_g":48,"fats_g":6},{"name":"Latte intero","grams":200,"kcal":128,"protein_g":6,"carbs_g":10,"fats_g":7},{"name":"Proteine whey","grams":30,"kcal":120,"protein_g":24,"carbs_g":3,"fats_g":1},{"name":"Banana","grams":120,"kcal":107,"protein_g":1,"carbs_g":24,"fats_g":0}]',
 651, 42, 85, 14, 0.7),

('Uova strapazzate con pane e prosciutto', 'colazione', 'massa', 'Strapazzare le uova, tostare il pane, servire con prosciutto cotto.', 10,
 '[{"name":"Uova intere","grams":180,"kcal":258,"protein_g":22,"carbs_g":2,"fats_g":18},{"name":"Pane integrale","grams":80,"kcal":187,"protein_g":7,"carbs_g":35,"fats_g":2},{"name":"Prosciutto cotto","grams":50,"kcal":66,"protein_g":9,"carbs_g":1,"fats_g":3}]',
 511, 38, 38, 23, 0.7),

('Pancake proteici con burro d''arachidi', 'colazione', 'massa', 'Mescolare farina, uova, latte e proteine. Cuocere in padella. Servire con burro d''arachidi.', 15,
 '[{"name":"Farina integrale","grams":60,"kcal":192,"protein_g":7,"carbs_g":36,"fats_g":1},{"name":"Uova","grams":120,"kcal":172,"protein_g":15,"carbs_g":1,"fats_g":12},{"name":"Latte","grams":100,"kcal":46,"protein_g":3,"carbs_g":5,"fats_g":2},{"name":"Proteine whey","grams":20,"kcal":80,"protein_g":16,"carbs_g":2,"fats_g":1},{"name":"Burro d''arachidi","grams":20,"kcal":118,"protein_g":5,"carbs_g":3,"fats_g":10}]',
 608, 46, 47, 26, 0.7),

-- SPUNTINO MEDITERRANEA/DIMAGRIMENTO (10)
('Yogurt greco con frutta secca', 'spuntino', 'mediterranea', 'Aggiungere frutta secca tritata allo yogurt greco.', 3,
 '[{"name":"Yogurt greco 0%","grams":150,"kcal":86,"protein_g":15,"carbs_g":5,"fats_g":0},{"name":"Mandorle","grams":15,"kcal":87,"protein_g":3,"carbs_g":1,"fats_g":8}]',
 173, 18, 6, 8, 0.85),

('Frutta fresca con cioccolato fondente', 'spuntino', 'mediterranea', 'Tagliare la frutta a pezzi e accompagnare con quadratini di cioccolato fondente.', 3,
 '[{"name":"Mela","grams":150,"kcal":78,"protein_g":0,"carbs_g":18,"fats_g":0},{"name":"Cioccolato fondente 70%","grams":15,"kcal":81,"protein_g":1,"carbs_g":6,"fats_g":6}]',
 159, 1, 24, 6, 0.9),

('Crackers integrali con hummus', 'spuntino', 'mediterranea', 'Spalmare l''hummus sui crackers.', 3,
 '[{"name":"Crackers integrali","grams":30,"kcal":120,"protein_g":3,"carbs_g":18,"fats_g":4},{"name":"Hummus","grams":40,"kcal":66,"protein_g":3,"carbs_g":4,"fats_g":4}]',
 186, 6, 22, 8, 0.85),

('Banana con burro d''arachidi', 'spuntino', 'mediterranea', 'Tagliare la banana a rondelle e spalmare un po'' di burro d''arachidi.', 3,
 '[{"name":"Banana","grams":100,"kcal":89,"protein_g":1,"carbs_g":20,"fats_g":0},{"name":"Burro d''arachidi","grams":15,"kcal":88,"protein_g":4,"carbs_g":2,"fats_g":8}]',
 177, 5, 22, 8, 0.85),

('Parmigiano con noci', 'spuntino', 'mediterranea', 'Tagliare il parmigiano a scaglie, accompagnare con noci.', 2,
 '[{"name":"Parmigiano Reggiano","grams":30,"kcal":118,"protein_g":10,"carbs_g":0,"fats_g":9},{"name":"Noci","grams":15,"kcal":98,"protein_g":2,"carbs_g":1,"fats_g":10}]',
 216, 12, 1, 19, 0.8),

('Gallette di riso con ricotta e miele', 'spuntino', 'mediterranea', 'Spalmare ricotta sulle gallette, aggiungere un goccio di miele.', 3,
 '[{"name":"Gallette di riso","grams":20,"kcal":76,"protein_g":2,"carbs_g":16,"fats_g":0},{"name":"Ricotta","grams":50,"kcal":72,"protein_g":5,"carbs_g":2,"fats_g":5},{"name":"Miele","grams":5,"kcal":15,"protein_g":0,"carbs_g":4,"fats_g":0}]',
 163, 7, 22, 5, 0.85),

('Frullato di frutta con latte', 'spuntino', 'mediterranea', 'Frullare frutta con latte freddo.', 5,
 '[{"name":"Fragole","grams":100,"kcal":33,"protein_g":1,"carbs_g":6,"fats_g":0},{"name":"Banana","grams":60,"kcal":53,"protein_g":1,"carbs_g":12,"fats_g":0},{"name":"Latte parzialmente scremato","grams":150,"kcal":69,"protein_g":5,"carbs_g":7,"fats_g":2}]',
 155, 7, 25, 2, 0.9),

('Fiocchi di latte con pomodorini', 'spuntino', 'mediterranea', 'Servire i fiocchi di latte con pomodorini tagliati e un filo d''olio.', 3,
 '[{"name":"Fiocchi di latte","grams":100,"kcal":98,"protein_g":12,"carbs_g":3,"fats_g":4},{"name":"Pomodorini","grams":80,"kcal":15,"protein_g":1,"carbs_g":3,"fats_g":0},{"name":"Olio extravergine","grams":3,"kcal":27,"protein_g":0,"carbs_g":0,"fats_g":3}]',
 140, 13, 6, 7, 0.85),

('Barretta ai cereali e frutta', 'spuntino', 'mediterranea', 'Barretta confezionata ai cereali con frutta secca.', 1,
 '[{"name":"Barretta cereali e frutta","grams":35,"kcal":140,"protein_g":3,"carbs_g":22,"fats_g":5}]',
 140, 3, 22, 5, 0.9),

('Toast con prosciutto crudo', 'spuntino', 'mediterranea', 'Farcire il pane tostato con prosciutto crudo.', 3,
 '[{"name":"Pane integrale","grams":30,"kcal":70,"protein_g":2,"carbs_g":13,"fats_g":1},{"name":"Prosciutto crudo","grams":30,"kcal":66,"protein_g":8,"carbs_g":0,"fats_g":4}]',
 136, 10, 13, 5, 0.85);
