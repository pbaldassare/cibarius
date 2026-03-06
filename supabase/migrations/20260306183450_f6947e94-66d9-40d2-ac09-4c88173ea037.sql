
-- =============================================
-- MASSA: +7 colazione
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Frullato avena banana e proteine', 'colazione', 'massa',
 '[{"name":"Latte intero","grams":250,"kcal":158,"protein_g":8.3,"carbs_g":12,"fats_g":8.8},{"name":"Fiocchi d''avena","grams":50,"kcal":189,"protein_g":6.7,"carbs_g":33,"fats_g":3.5},{"name":"Banana","grams":120,"kcal":107,"protein_g":1.3,"carbs_g":25.2,"fats_g":0.4},{"name":"Proteine in polvere","grams":30,"kcal":120,"protein_g":24,"carbs_g":3,"fats_g":1.5}]',
 574, 40.3, 73.2, 14.2, 0.7, 'Frullare tutti gli ingredienti insieme.', 5),

('Toast con uova e avocado', 'colazione', 'massa',
 '[{"name":"Pane integrale","grams":80,"kcal":184,"protein_g":7.2,"carbs_g":32,"fats_g":2.4},{"name":"Uova","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Avocado","grams":60,"kcal":96,"protein_g":1.2,"carbs_g":1,"fats_g":9},{"name":"Pomodoro","grams":50,"kcal":9,"protein_g":0.5,"carbs_g":1.9,"fats_g":0.1}]',
 433, 21.5, 35.7, 21.5, 0.7, 'Tostare il pane, cuocere le uova strapazzate, aggiungere avocado a fette e pomodoro.', 10),

('Bowl di ricotta con granola', 'colazione', 'massa',
 '[{"name":"Ricotta","grams":150,"kcal":219,"protein_g":13.5,"carbs_g":6,"fats_g":15.8},{"name":"Granola","grams":40,"kcal":180,"protein_g":3.2,"carbs_g":28,"fats_g":6.4},{"name":"Miele","grams":15,"kcal":48,"protein_g":0.1,"carbs_g":12.3,"fats_g":0},{"name":"Frutti di bosco","grams":50,"kcal":22,"protein_g":0.5,"carbs_g":4.8,"fats_g":0.2}]',
 469, 17.3, 51.1, 22.4, 0.7, 'Mettere ricotta nella bowl, aggiungere granola, frutti di bosco e miele.', 5),

('Pancake proteici', 'colazione', 'massa',
 '[{"name":"Farina d''avena","grams":50,"kcal":189,"protein_g":6.7,"carbs_g":33,"fats_g":3.5},{"name":"Uova","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Banana","grams":80,"kcal":71,"protein_g":0.9,"carbs_g":16.8,"fats_g":0.3},{"name":"Proteine in polvere","grams":20,"kcal":80,"protein_g":16,"carbs_g":2,"fats_g":1},{"name":"Miele","grams":15,"kcal":48,"protein_g":0.1,"carbs_g":12.3,"fats_g":0}]',
 532, 36.3, 64.9, 14.8, 0.7, 'Frullare tutti gli ingredienti, cuocere come pancake in padella antiaderente. Servire con miele.', 15),

('Latte con cereali e frutta secca', 'colazione', 'massa',
 '[{"name":"Latte intero","grams":300,"kcal":189,"protein_g":9.9,"carbs_g":14.4,"fats_g":10.5},{"name":"Cereali integrali","grams":60,"kcal":228,"protein_g":6,"carbs_g":42,"fats_g":3.6},{"name":"Mandorle","grams":20,"kcal":116,"protein_g":4.2,"carbs_g":0.8,"fats_g":10.4},{"name":"Uvetta","grams":15,"kcal":44,"protein_g":0.5,"carbs_g":10.5,"fats_g":0}]',
 577, 20.6, 67.7, 24.5, 0.7, 'Versare latte sui cereali, aggiungere mandorle e uvetta.', 3),

('Pane con prosciutto e formaggio', 'colazione', 'massa',
 '[{"name":"Pane casereccio","grams":100,"kcal":260,"protein_g":9,"carbs_g":50,"fats_g":1.5},{"name":"Prosciutto cotto","grams":50,"kcal":65,"protein_g":9.5,"carbs_g":0.5,"fats_g":3},{"name":"Emmental","grams":30,"kcal":114,"protein_g":8.4,"carbs_g":0.3,"fats_g":9},{"name":"Pomodoro","grams":40,"kcal":7,"protein_g":0.4,"carbs_g":1.5,"fats_g":0.1}]',
 446, 27.3, 52.3, 13.6, 0.7, 'Farcire il pane con prosciutto, formaggio e pomodoro. Scaldare se desiderato.', 5),

('French toast proteico', 'colazione', 'massa',
 '[{"name":"Pan carré","grams":80,"kcal":224,"protein_g":7.2,"carbs_g":40,"fats_g":4},{"name":"Uova","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Latte","grams":50,"kcal":32,"protein_g":1.7,"carbs_g":2.4,"fats_g":1.8},{"name":"Cannella","grams":2,"kcal":5,"protein_g":0.1,"carbs_g":1.2,"fats_g":0.1},{"name":"Miele","grams":15,"kcal":48,"protein_g":0.1,"carbs_g":12.3,"fats_g":0},{"name":"Burro","grams":8,"kcal":60,"protein_g":0,"carbs_g":0,"fats_g":6.6}]',
 513, 21.7, 56.7, 22.5, 0.7, 'Intingere le fette nel mix di uova, latte e cannella. Cuocere nel burro. Servire con miele.', 10);

-- =============================================
-- MASSA: +10 pranzo
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Pasta carbonara', 'pranzo', 'massa',
 '[{"name":"Spaghetti","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Guanciale","grams":40,"kcal":168,"protein_g":5.2,"carbs_g":0,"fats_g":16.8},{"name":"Uova","grams":75,"kcal":108,"protein_g":9.5,"carbs_g":0.6,"fats_g":7.5},{"name":"Pecorino","grams":25,"kcal":99,"protein_g":6.5,"carbs_g":0.5,"fats_g":8.3},{"name":"Pepe nero","grams":1,"kcal":3,"protein_g":0.1,"carbs_g":0.6,"fats_g":0}]',
 733, 33.8, 71.7, 34.6, 0.7, 'Rosolare guanciale, cuocere pasta, mantecare fuori dal fuoco con uova e pecorino.', 15),

('Riso con manzo e verdure', 'pranzo', 'massa',
 '[{"name":"Riso basmati","grams":90,"kcal":324,"protein_g":6.3,"carbs_g":70.2,"fats_g":0.6},{"name":"Manzo macinato magro","grams":120,"kcal":144,"protein_g":24,"carbs_g":0,"fats_g":6},{"name":"Zucchine","grams":80,"kcal":13,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Carota","grams":50,"kcal":20,"protein_g":0.5,"carbs_g":4.5,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 589, 31.8, 76.7, 16.8, 0.7, 'Cuocere il riso, saltare il manzo con verdure in padella, unire tutto.', 20),

('Bowl di quinoa e pollo', 'pranzo', 'massa',
 '[{"name":"Quinoa","grams":80,"kcal":293,"protein_g":11.2,"carbs_g":51.2,"fats_g":4.8},{"name":"Petto di pollo","grams":150,"kcal":156,"protein_g":34.5,"carbs_g":0,"fats_g":1.5},{"name":"Avocado","grams":50,"kcal":80,"protein_g":1,"carbs_g":0.9,"fats_g":7.5},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 611, 47.2, 54.5, 21.9, 0.7, 'Cuocere quinoa e pollo separatamente, comporre la bowl con avocado e pomodorini.', 20),

('Pasta al salmone', 'pranzo', 'massa',
 '[{"name":"Fusilli","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Salmone fresco","grams":100,"kcal":184,"protein_g":20,"carbs_g":0,"fats_g":11},{"name":"Panna leggera","grams":30,"kcal":57,"protein_g":0.8,"carbs_g":1.2,"fats_g":5.4},{"name":"Aneto","grams":2,"kcal":1,"protein_g":0,"carbs_g":0.1,"fats_g":0}]',
 597, 33.3, 71.3, 18.4, 0.7, 'Saltare il salmone a cubetti, aggiungere panna, condire la pasta.', 15),

('Hamburger con patate', 'pranzo', 'massa',
 '[{"name":"Macinato di manzo","grams":150,"kcal":225,"protein_g":30,"carbs_g":0,"fats_g":12},{"name":"Panino hamburger","grams":70,"kcal":189,"protein_g":5.6,"carbs_g":34,"fats_g":3.5},{"name":"Patate","grams":150,"kcal":129,"protein_g":3,"carbs_g":28.5,"fats_g":0.2},{"name":"Ketchup","grams":15,"kcal":17,"protein_g":0.2,"carbs_g":4.2,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 648, 38.8, 66.7, 25.7, 0.7, 'Formare hamburger, cuocere alla griglia. Patate al forno a spicchi con olio.', 25),

('Wrap gigante con pollo', 'pranzo', 'massa',
 '[{"name":"Tortilla grande","grams":80,"kcal":240,"protein_g":6.4,"carbs_g":38.4,"fats_g":7.2},{"name":"Petto di pollo","grams":150,"kcal":156,"protein_g":34.5,"carbs_g":0,"fats_g":1.5},{"name":"Lattuga","grams":30,"kcal":4,"protein_g":0.4,"carbs_g":0.7,"fats_g":0.1},{"name":"Pomodoro","grams":50,"kcal":9,"protein_g":0.5,"carbs_g":1.9,"fats_g":0.1},{"name":"Maionese","grams":15,"kcal":105,"protein_g":0.2,"carbs_g":0.5,"fats_g":11.6}]',
 514, 42, 41.5, 20.5, 0.7, 'Grigliare il pollo, affettare, farcire la tortilla con tutti gli ingredienti e arrotolare.', 15),

('Pasta con salsiccia e broccoli', 'pranzo', 'massa',
 '[{"name":"Orecchiette","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Salsiccia","grams":80,"kcal":256,"protein_g":12.8,"carbs_g":0.8,"fats_g":22.4},{"name":"Broccoli","grams":100,"kcal":34,"protein_g":2.8,"carbs_g":5.5,"fats_g":0.4},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 715, 28.1, 76.3, 32.8, 0.7, 'Sbricciolare salsiccia, rosolare, aggiungere broccoli lessati, condire la pasta.', 15),

('Gnocchi con ragù', 'pranzo', 'massa',
 '[{"name":"Gnocchi di patate","grams":250,"kcal":400,"protein_g":7.5,"carbs_g":82.5,"fats_g":2.5},{"name":"Macinato di manzo","grams":100,"kcal":150,"protein_g":20,"carbs_g":0,"fats_g":8},{"name":"Passata","grams":100,"kcal":25,"protein_g":1,"carbs_g":4.5,"fats_g":0.2},{"name":"Carota","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2}]',
 712, 33.9, 88.8, 22.9, 0.7, 'Preparare il ragù con macinato, passata e carota. Cuocere gnocchi, condire con ragù e parmigiano.', 30),

('Risotto con gamberetti', 'pranzo', 'massa',
 '[{"name":"Riso carnaroli","grams":90,"kcal":315,"protein_g":6.3,"carbs_g":70,"fats_g":0.9},{"name":"Gamberetti sgusciati","grams":120,"kcal":102,"protein_g":21.6,"carbs_g":1.1,"fats_g":0.7},{"name":"Zucchine","grams":60,"kcal":10,"protein_g":0.7,"carbs_g":1.5,"fats_g":0.2},{"name":"Burro","grams":10,"kcal":75,"protein_g":0.1,"carbs_g":0,"fats_g":8.3},{"name":"Vino bianco","grams":20,"kcal":16,"protein_g":0,"carbs_g":0.6,"fats_g":0}]',
 518, 28.7, 73.2, 10.1, 0.7, 'Tostare riso, sfumare con vino, aggiungere brodo e zucchine. A fine cottura mantecare con gamberetti e burro.', 25),

('Insalata proteica con uova', 'pranzo', 'massa',
 '[{"name":"Uova sode","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Tonno al naturale","grams":80,"kcal":88,"protein_g":20,"carbs_g":0,"fats_g":0.8},{"name":"Fagioli cannellini","grams":100,"kcal":91,"protein_g":6.7,"carbs_g":12.7,"fats_g":0.5},{"name":"Mais","grams":40,"kcal":39,"protein_g":1.2,"carbs_g":7.2,"fats_g":0.5},{"name":"Insalata mista","grams":60,"kcal":11,"protein_g":0.8,"carbs_g":1.5,"fats_g":0.2},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12},{"name":"Pane","grams":50,"kcal":130,"protein_g":4.5,"carbs_g":25,"fats_g":0.8}]',
 609, 45.8, 47.2, 24.8, 0.7, 'Tagliare uova sode a spicchi, comporre l''insalata con tutti gli ingredienti.', 10);

-- =============================================
-- MASSA: +10 cena
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Pollo arrosto con patate', 'cena', 'massa',
 '[{"name":"Coscia di pollo","grams":200,"kcal":246,"protein_g":36,"carbs_g":0,"fats_g":10.8},{"name":"Patate","grams":200,"kcal":172,"protein_g":4,"carbs_g":38,"fats_g":0.2},{"name":"Rosmarino","grams":3,"kcal":4,"protein_g":0.1,"carbs_g":0.7,"fats_g":0.1},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 528, 40.1, 38.7, 23.1, 0.7, 'Cuocere pollo e patate in forno a 200° con rosmarino e olio per 40 min.', 50),

('Pasta con tonno e pomodorini', 'cena', 'massa',
 '[{"name":"Penne","grams":100,"kcal":355,"protein_g":12.5,"carbs_g":70,"fats_g":2},{"name":"Tonno al naturale","grams":100,"kcal":110,"protein_g":25,"carbs_g":0,"fats_g":1},{"name":"Pomodorini","grams":80,"kcal":16,"protein_g":0.6,"carbs_g":3.2,"fats_g":0.2},{"name":"Olive","grams":15,"kcal":22,"protein_g":0.2,"carbs_g":0.3,"fats_g":2.3},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 591, 38.3, 73.5, 15.5, 0.7, 'Saltare pomodorini con olio, aggiungere tonno sgocciolato e olive. Condire la pasta.', 15),

('Stufato di manzo con verdure', 'cena', 'massa',
 '[{"name":"Manzo per stufato","grams":180,"kcal":252,"protein_g":36,"carbs_g":0,"fats_g":12.6},{"name":"Patate","grams":120,"kcal":103,"protein_g":2.4,"carbs_g":22.8,"fats_g":0.1},{"name":"Carota","grams":60,"kcal":24,"protein_g":0.6,"carbs_g":5.4,"fats_g":0},{"name":"Piselli","grams":50,"kcal":41,"protein_g":2.8,"carbs_g":6.5,"fats_g":0.2},{"name":"Passata","grams":80,"kcal":20,"protein_g":0.8,"carbs_g":3.6,"fats_g":0.1},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 510, 42.6, 38.3, 21, 0.7, 'Rosolare il manzo, aggiungere verdure e passata. Cuocere coperto a fuoco basso per 1.5h.', 100),

('Filetto di maiale con riso', 'cena', 'massa',
 '[{"name":"Filetto di maiale","grams":180,"kcal":216,"protein_g":37.8,"carbs_g":0,"fats_g":7.2},{"name":"Riso basmati","grams":80,"kcal":288,"protein_g":5.6,"carbs_g":63.2,"fats_g":0.6},{"name":"Verdure miste","grams":100,"kcal":30,"protein_g":1.5,"carbs_g":5,"fats_g":0.3},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 622, 44.9, 68.2, 18.1, 0.7, 'Cuocere il filetto in padella, servire con riso e verdure saltate.', 20),

('Lasagna di carne', 'cena', 'massa',
 '[{"name":"Sfoglia per lasagna","grams":80,"kcal":272,"protein_g":9.6,"carbs_g":52,"fats_g":2.4},{"name":"Ragù di carne","grams":150,"kcal":188,"protein_g":15,"carbs_g":6,"fats_g":12},{"name":"Besciamella","grams":60,"kcal":78,"protein_g":1.8,"carbs_g":5.4,"fats_g":5.4},{"name":"Parmigiano","grams":20,"kcal":78,"protein_g":6.9,"carbs_g":0,"fats_g":5.6}]',
 616, 33.3, 63.4, 25.4, 0.7, 'Alternare strati di sfoglia, ragù, besciamella e parmigiano. Forno 180° per 30 min.', 40),

('Polpettone con purè', 'cena', 'massa',
 '[{"name":"Macinato misto","grams":180,"kcal":306,"protein_g":27,"carbs_g":0,"fats_g":22.5},{"name":"Pangrattato","grams":20,"kcal":73,"protein_g":2.2,"carbs_g":14,"fats_g":1},{"name":"Uovo","grams":50,"kcal":72,"protein_g":6.3,"carbs_g":0.4,"fats_g":5},{"name":"Patate","grams":200,"kcal":172,"protein_g":4,"carbs_g":38,"fats_g":0.2},{"name":"Latte","grams":40,"kcal":26,"protein_g":1.3,"carbs_g":1.9,"fats_g":1.4},{"name":"Burro","grams":10,"kcal":75,"protein_g":0.1,"carbs_g":0,"fats_g":8.3}]',
 724, 40.9, 54.3, 38.4, 0.7, 'Impastare macinato con pangrattato e uovo, cuocere in forno. Preparare purè con patate, latte e burro.', 50),

('Pizza proteica', 'cena', 'massa',
 '[{"name":"Impasto pizza","grams":200,"kcal":540,"protein_g":16,"carbs_g":100,"fats_g":6},{"name":"Mozzarella","grams":80,"kcal":200,"protein_g":14.8,"carbs_g":0.5,"fats_g":15.2},{"name":"Prosciutto cotto","grams":40,"kcal":52,"protein_g":7.6,"carbs_g":0.4,"fats_g":2.4},{"name":"Passata","grams":60,"kcal":15,"protein_g":0.6,"carbs_g":2.7,"fats_g":0.1}]',
 807, 39, 103.6, 23.7, 0.7, 'Stendere impasto, condire con passata e mozzarella, aggiungere prosciutto. Forno 250° per 10 min.', 15),

('Merluzzo impanato con riso', 'cena', 'massa',
 '[{"name":"Merluzzo","grams":180,"kcal":146,"protein_g":32.4,"carbs_g":0,"fats_g":1.4},{"name":"Pangrattato","grams":25,"kcal":92,"protein_g":2.7,"carbs_g":17.5,"fats_g":1.3},{"name":"Uovo","grams":30,"kcal":43,"protein_g":3.8,"carbs_g":0.2,"fats_g":3},{"name":"Riso","grams":80,"kcal":288,"protein_g":5.6,"carbs_g":63.2,"fats_g":0.6},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 675, 44.5, 80.9, 18.3, 0.7, 'Passare il merluzzo nell''uovo e pangrattato, cuocere in forno. Servire con riso.', 25),

('Petto di pollo alla parmigiana', 'cena', 'massa',
 '[{"name":"Petto di pollo","grams":180,"kcal":187,"protein_g":41.4,"carbs_g":0,"fats_g":1.8},{"name":"Passata","grams":80,"kcal":20,"protein_g":0.8,"carbs_g":3.6,"fats_g":0.1},{"name":"Mozzarella","grams":50,"kcal":125,"protein_g":9.3,"carbs_g":0.3,"fats_g":9.5},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2},{"name":"Pane","grams":50,"kcal":130,"protein_g":4.5,"carbs_g":25,"fats_g":0.8}]',
 521, 61.2, 28.9, 16.4, 0.7, 'Grigliare pollo, coprire con passata, mozzarella e parmigiano. Gratinare in forno. Pane a parte.', 20),

('Bowl di riso e salmone teriyaki', 'cena', 'massa',
 '[{"name":"Riso basmati","grams":90,"kcal":324,"protein_g":6.3,"carbs_g":70.2,"fats_g":0.6},{"name":"Salmone","grams":140,"kcal":258,"protein_g":28,"carbs_g":0,"fats_g":15.4},{"name":"Salsa di soia","grams":15,"kcal":8,"protein_g":1.2,"carbs_g":0.6,"fats_g":0},{"name":"Miele","grams":10,"kcal":32,"protein_g":0.1,"carbs_g":8.2,"fats_g":0},{"name":"Edamame","grams":40,"kcal":49,"protein_g":4.4,"carbs_g":3.2,"fats_g":2.2},{"name":"Avocado","grams":40,"kcal":64,"protein_g":0.8,"carbs_g":0.7,"fats_g":6}]',
 735, 40.8, 82.9, 24.2, 0.7, 'Cuocere riso, glassare salmone con soia e miele, comporre bowl con edamame e avocado.', 20);

-- =============================================
-- MASSA: +5 spuntino
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Budino proteico', 'spuntino', 'massa',
 '[{"name":"Latte","grams":200,"kcal":126,"protein_g":6.6,"carbs_g":9.6,"fats_g":7},{"name":"Proteine in polvere","grams":30,"kcal":120,"protein_g":24,"carbs_g":3,"fats_g":1.5},{"name":"Cacao amaro","grams":5,"kcal":12,"protein_g":1,"carbs_g":0.8,"fats_g":0.6}]',
 258, 31.6, 13.4, 9.1, 0.7, 'Scaldare latte, sciogliere proteine e cacao, versare in coppetta e lasciare in frigo 1h.', 5),

('Ricotta con miele e noci', 'spuntino', 'massa',
 '[{"name":"Ricotta","grams":120,"kcal":175,"protein_g":10.8,"carbs_g":4.8,"fats_g":12.6},{"name":"Miele","grams":15,"kcal":48,"protein_g":0.1,"carbs_g":12.3,"fats_g":0},{"name":"Noci","grams":15,"kcal":98,"protein_g":2.3,"carbs_g":1,"fats_g":9.8}]',
 321, 13.2, 18.1, 22.4, 0.7, 'Servire ricotta con miele e noci spezzate sopra.', 3),

('Panino con tonno', 'spuntino', 'massa',
 '[{"name":"Panino integrale","grams":60,"kcal":138,"protein_g":5.4,"carbs_g":24,"fats_g":1.8},{"name":"Tonno al naturale","grams":60,"kcal":66,"protein_g":15,"carbs_g":0,"fats_g":0.6},{"name":"Maionese","grams":10,"kcal":70,"protein_g":0.1,"carbs_g":0.3,"fats_g":7.7},{"name":"Pomodoro","grams":30,"kcal":5,"protein_g":0.3,"carbs_g":1.1,"fats_g":0.1}]',
 279, 20.8, 25.4, 10.2, 0.7, 'Farcire il panino con tonno, maionese e pomodoro.', 5),

('Banana con burro d''arachidi', 'spuntino', 'massa',
 '[{"name":"Banana","grams":120,"kcal":107,"protein_g":1.3,"carbs_g":25.2,"fats_g":0.4},{"name":"Burro di arachidi","grams":20,"kcal":118,"protein_g":5,"carbs_g":2.8,"fats_g":10}]',
 225, 6.3, 28, 10.4, 0.7, 'Spalmare burro di arachidi su fette di banana.', 3),

('Trail mix energetico', 'spuntino', 'massa',
 '[{"name":"Mandorle","grams":15,"kcal":87,"protein_g":3.2,"carbs_g":0.6,"fats_g":7.8},{"name":"Noci","grams":10,"kcal":65,"protein_g":1.5,"carbs_g":0.7,"fats_g":6.5},{"name":"Uvetta","grams":15,"kcal":44,"protein_g":0.5,"carbs_g":10.5,"fats_g":0},{"name":"Cioccolato fondente","grams":15,"kcal":81,"protein_g":1.1,"carbs_g":7.5,"fats_g":5.3}]',
 277, 6.3, 19.3, 19.6, 0.7, 'Mescolare tutti gli ingredienti in una ciotola.', 2);
