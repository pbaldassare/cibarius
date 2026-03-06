
-- =============================================
-- MEDITERRANEA: +10 pranzo
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Risotto alla milanese', 'pranzo', 'mediterranea',
 '[{"name":"Riso carnaroli","grams":90,"kcal":315,"protein_g":6.3,"carbs_g":70,"fats_g":0.9},{"name":"Brodo vegetale","grams":300,"kcal":15,"protein_g":0.5,"carbs_g":3,"fats_g":0},{"name":"Cipolla","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.8,"fats_g":0},{"name":"Burro","grams":15,"kcal":112,"protein_g":0.1,"carbs_g":0,"fats_g":12.4},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2},{"name":"Zafferano","grams":0.5,"kcal":2,"protein_g":0,"carbs_g":0.3,"fats_g":0}]',
 515, 12.4, 76.1, 17.5, 0.8, 'Soffriggere cipolla nel burro, tostare il riso, aggiungere brodo poco alla volta. A fine cottura aggiungere zafferano e parmigiano.', 25),

('Pasta cacio e pepe', 'pranzo', 'mediterranea',
 '[{"name":"Spaghetti","grams":80,"kcal":284,"protein_g":10,"carbs_g":56,"fats_g":1.6},{"name":"Pecorino romano","grams":40,"kcal":158,"protein_g":10.4,"carbs_g":0.8,"fats_g":13.2},{"name":"Pepe nero","grams":2,"kcal":5,"protein_g":0.2,"carbs_g":1.3,"fats_g":0.1}]',
 447, 20.6, 58.1, 14.9, 0.8, 'Cuocere la pasta, mantecare con pecorino grattugiato sciolto in acqua di cottura e pepe nero.', 15),

('Farro con verdure grigliate', 'pranzo', 'mediterranea',
 '[{"name":"Farro perlato","grams":80,"kcal":280,"protein_g":10.4,"carbs_g":56,"fats_g":2},{"name":"Zucchine","grams":80,"kcal":13,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Peperoni","grams":80,"kcal":25,"protein_g":0.8,"carbs_g":5,"fats_g":0.2},{"name":"Melanzane","grams":80,"kcal":20,"protein_g":0.8,"carbs_g":3.5,"fats_g":0.2},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 426, 13, 66.5, 12.6, 0.8, 'Cuocere il farro, grigliare le verdure tagliate a fette, condire con olio e sale.', 20),

('Insalata di riso con tonno', 'pranzo', 'mediterranea',
 '[{"name":"Riso parboiled","grams":80,"kcal":280,"protein_g":5.6,"carbs_g":62.4,"fats_g":0.6},{"name":"Tonno al naturale","grams":80,"kcal":88,"protein_g":20,"carbs_g":0,"fats_g":0.8},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Olive","grams":20,"kcal":30,"protein_g":0.3,"carbs_g":0.4,"fats_g":3},{"name":"Mais","grams":30,"kcal":29,"protein_g":0.9,"carbs_g":5.4,"fats_g":0.4},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 509, 27.3, 70.6, 12.9, 0.8, 'Cuocere il riso, raffreddare, aggiungere tonno sgocciolato, pomodorini, olive, mais e condire.', 15),

('Penne all''arrabbiata', 'pranzo', 'mediterranea',
 '[{"name":"Penne rigate","grams":80,"kcal":284,"protein_g":10,"carbs_g":56,"fats_g":1.6},{"name":"Passata di pomodoro","grams":120,"kcal":30,"protein_g":1.2,"carbs_g":5.4,"fats_g":0.2},{"name":"Aglio","grams":5,"kcal":7,"protein_g":0.3,"carbs_g":1.5,"fats_g":0},{"name":"Peperoncino","grams":2,"kcal":6,"protein_g":0.3,"carbs_g":1,"fats_g":0.2},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12},{"name":"Prezzemolo","grams":3,"kcal":1,"protein_g":0.1,"carbs_g":0.2,"fats_g":0}]',
 434, 11.9, 64.1, 14, 0.8, 'Soffriggere aglio e peperoncino in olio, aggiungere passata, cuocere 15 min. Condire la pasta.', 15),

('Pasta con lenticchie', 'pranzo', 'mediterranea',
 '[{"name":"Ditalini","grams":70,"kcal":248,"protein_g":8.8,"carbs_g":49,"fats_g":1.4},{"name":"Lenticchie secche","grams":60,"kcal":198,"protein_g":15,"carbs_g":30,"fats_g":0.6},{"name":"Carota","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.7,"fats_g":0},{"name":"Sedano","grams":20,"kcal":3,"protein_g":0.2,"carbs_g":0.6,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 549, 24.3, 82.3, 12, 0.8, 'Cuocere le lenticchie con carota e sedano, aggiungere la pasta e cuocere insieme. Condire con olio a crudo.', 30),

('Bruschetta pomodori e mozzarella', 'pranzo', 'mediterranea',
 '[{"name":"Pane casereccio","grams":120,"kcal":312,"protein_g":10.8,"carbs_g":60,"fats_g":1.8},{"name":"Pomodori","grams":120,"kcal":22,"protein_g":1.1,"carbs_g":4.6,"fats_g":0.2},{"name":"Mozzarella","grams":60,"kcal":150,"protein_g":11.1,"carbs_g":0.4,"fats_g":11.4},{"name":"Basilico","grams":3,"kcal":1,"protein_g":0.1,"carbs_g":0.1,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 573, 23.1, 65.1, 23.4, 0.8, 'Tostare il pane, condire con pomodoro a cubetti, mozzarella, basilico e olio.', 10),

('Polpo con patate', 'pranzo', 'mediterranea',
 '[{"name":"Polpo","grams":150,"kcal":124,"protein_g":25.4,"carbs_g":0,"fats_g":1.5},{"name":"Patate","grams":150,"kcal":129,"protein_g":3,"carbs_g":28.5,"fats_g":0.2},{"name":"Prezzemolo","grams":5,"kcal":2,"protein_g":0.1,"carbs_g":0.3,"fats_g":0},{"name":"Limone","grams":15,"kcal":4,"protein_g":0.1,"carbs_g":1.4,"fats_g":0},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 365, 28.6, 30.2, 13.7, 0.8, 'Bollire il polpo per 40 min, lessare le patate, tagliare a pezzi e condire con olio, limone e prezzemolo.', 50),

('Orzo con gamberi e zucchine', 'pranzo', 'mediterranea',
 '[{"name":"Orzo perlato","grams":80,"kcal":276,"protein_g":8.8,"carbs_g":56,"fats_g":1.6},{"name":"Gamberi sgusciati","grams":100,"kcal":85,"protein_g":18,"carbs_g":0.9,"fats_g":0.6},{"name":"Zucchine","grams":100,"kcal":16,"protein_g":1.2,"carbs_g":2.5,"fats_g":0.3},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 465, 28, 59.4, 12.5, 0.8, 'Cuocere orzo, saltare gamberi e zucchine in padella con olio, unire tutto.', 20),

('Pasta e ceci', 'pranzo', 'mediterranea',
 '[{"name":"Mezze maniche","grams":70,"kcal":248,"protein_g":8.8,"carbs_g":49,"fats_g":1.4},{"name":"Ceci cotti","grams":120,"kcal":158,"protein_g":8.4,"carbs_g":21.6,"fats_g":3.6},{"name":"Passata di pomodoro","grams":60,"kcal":15,"protein_g":0.6,"carbs_g":2.7,"fats_g":0.1},{"name":"Rosmarino","grams":2,"kcal":3,"protein_g":0.1,"carbs_g":0.5,"fats_g":0.1},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 512, 17.9, 73.8, 15.2, 0.8, 'Soffriggere rosmarino in olio, aggiungere ceci e passata, cuocere la pasta nel sugo allungato con acqua.', 25);

-- =============================================
-- MEDITERRANEA: +10 cena
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Sogliola al limone con riso', 'cena', 'mediterranea',
 '[{"name":"Sogliola","grams":180,"kcal":148,"protein_g":30,"carbs_g":0,"fats_g":2.5},{"name":"Riso basmati","grams":70,"kcal":252,"protein_g":5,"carbs_g":55,"fats_g":0.5},{"name":"Limone","grams":20,"kcal":6,"protein_g":0.1,"carbs_g":1.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 476, 35.1, 56.8, 11, 0.8, 'Cuocere la sogliola in padella con limone e olio. Servire con riso bollito.', 20),

('Straccetti di manzo con rucola', 'cena', 'mediterranea',
 '[{"name":"Manzo fettine","grams":150,"kcal":180,"protein_g":31,"carbs_g":0,"fats_g":6},{"name":"Rucola","grams":40,"kcal":10,"protein_g":1,"carbs_g":1.5,"fats_g":0.3},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Parmigiano scaglie","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Pane","grams":40,"kcal":104,"protein_g":3.6,"carbs_g":20,"fats_g":0.6}]',
 453, 41.3, 23.9, 21.2, 0.8, 'Saltare le fettine in padella calda, servire su letto di rucola con parmigiano e pomodorini.', 10),

('Caprese con pane', 'cena', 'mediterranea',
 '[{"name":"Mozzarella di bufala","grams":125,"kcal":313,"protein_g":16.3,"carbs_g":0.9,"fats_g":25},{"name":"Pomodori","grams":150,"kcal":27,"protein_g":1.4,"carbs_g":5.7,"fats_g":0.3},{"name":"Basilico","grams":5,"kcal":1,"protein_g":0.1,"carbs_g":0.1,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Pane integrale","grams":60,"kcal":138,"protein_g":5.4,"carbs_g":24,"fats_g":1.8}]',
 549, 23.2, 30.7, 35.1, 0.8, 'Tagliare mozzarella e pomodori a fette, alternare, condire con basilico e olio. Servire con pane.', 5),

('Zuppa di legumi', 'cena', 'mediterranea',
 '[{"name":"Mix legumi secchi","grams":80,"kcal":264,"protein_g":18,"carbs_g":40,"fats_g":2.4},{"name":"Carota","grams":40,"kcal":16,"protein_g":0.4,"carbs_g":3.6,"fats_g":0},{"name":"Sedano","grams":30,"kcal":5,"protein_g":0.2,"carbs_g":1,"fats_g":0},{"name":"Cipolla","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.8,"fats_g":0},{"name":"Passata","grams":60,"kcal":15,"protein_g":0.6,"carbs_g":2.7,"fats_g":0.1},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Pane tostato","grams":40,"kcal":104,"protein_g":3.6,"carbs_g":20,"fats_g":0.6}]',
 504, 23.1, 70.1, 13.1, 0.8, 'Cuocere i legumi con carota, sedano, cipolla e passata. Servire con pane tostato e olio a crudo.', 40),

('Scaloppine al limone', 'cena', 'mediterranea',
 '[{"name":"Vitello fettine","grams":150,"kcal":165,"protein_g":30,"carbs_g":0,"fats_g":4.5},{"name":"Farina 00","grams":10,"kcal":36,"protein_g":1,"carbs_g":7.5,"fats_g":0.1},{"name":"Limone","grams":30,"kcal":9,"protein_g":0.2,"carbs_g":2.7,"fats_g":0},{"name":"Burro","grams":10,"kcal":75,"protein_g":0.1,"carbs_g":0,"fats_g":8.3},{"name":"Insalata mista","grams":80,"kcal":14,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Pane","grams":40,"kcal":104,"protein_g":3.6,"carbs_g":20,"fats_g":0.6}]',
 403, 35.9, 32.2, 13.7, 0.8, 'Infarinare le fettine, cuocere nel burro, sfumare con limone. Servire con insalata e pane.', 15),

('Spigola al cartoccio', 'cena', 'mediterranea',
 '[{"name":"Spigola filetti","grams":180,"kcal":176,"protein_g":33,"carbs_g":0,"fats_g":4.5},{"name":"Pomodorini","grams":80,"kcal":16,"protein_g":0.6,"carbs_g":3.2,"fats_g":0.2},{"name":"Olive nere","grams":20,"kcal":30,"protein_g":0.3,"carbs_g":0.4,"fats_g":3},{"name":"Capperi","grams":10,"kcal":2,"protein_g":0.2,"carbs_g":0.4,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Patate","grams":100,"kcal":86,"protein_g":2,"carbs_g":19,"fats_g":0.1}]',
 398, 36.1, 23, 17.8, 0.8, 'Avvolgere la spigola nel cartoccio con pomodorini, olive e capperi. Cuocere in forno a 200° per 20 min. Patate al forno a parte.', 30),

('Hamburger di tacchino', 'cena', 'mediterranea',
 '[{"name":"Macinato di tacchino","grams":150,"kcal":165,"protein_g":28.5,"carbs_g":0,"fats_g":6},{"name":"Pangrattato","grams":15,"kcal":55,"protein_g":1.6,"carbs_g":10.5,"fats_g":0.8},{"name":"Insalata mista","grams":80,"kcal":14,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Pomodoro","grams":50,"kcal":9,"protein_g":0.5,"carbs_g":1.9,"fats_g":0.1},{"name":"Pane integrale","grams":60,"kcal":138,"protein_g":5.4,"carbs_g":24,"fats_g":1.8},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 451, 37, 38.4, 16.9, 0.8, 'Impastare macinato con pangrattato, formare hamburger, cuocere in padella. Servire nel pane con insalata.', 15),

('Caponata con crostini', 'cena', 'mediterranea',
 '[{"name":"Melanzane","grams":150,"kcal":37,"protein_g":1.5,"carbs_g":6.6,"fats_g":0.3},{"name":"Pomodori pelati","grams":100,"kcal":20,"protein_g":1,"carbs_g":4,"fats_g":0.1},{"name":"Sedano","grams":30,"kcal":5,"protein_g":0.2,"carbs_g":1,"fats_g":0},{"name":"Cipolla","grams":40,"kcal":16,"protein_g":0.4,"carbs_g":3.7,"fats_g":0},{"name":"Olive verdi","grams":20,"kcal":24,"protein_g":0.3,"carbs_g":0.6,"fats_g":2.4},{"name":"Capperi","grams":10,"kcal":2,"protein_g":0.2,"carbs_g":0.4,"fats_g":0},{"name":"Olio EVO","grams":15,"kcal":132,"protein_g":0,"carbs_g":0,"fats_g":15},{"name":"Pane casereccio","grams":80,"kcal":208,"protein_g":7.2,"carbs_g":40,"fats_g":1.2}]',
 444, 10.8, 56.3, 19, 0.8, 'Friggere le melanzane a cubetti, aggiungere sedano, cipolla, pomodoro, olive e capperi. Servire con crostini.', 30),

('Crostata salata ricotta e spinaci', 'cena', 'mediterranea',
 '[{"name":"Pasta brisée","grams":80,"kcal":320,"protein_g":4.8,"carbs_g":32,"fats_g":19.2},{"name":"Ricotta","grams":100,"kcal":146,"protein_g":9,"carbs_g":4,"fats_g":10.5},{"name":"Spinaci","grams":100,"kcal":23,"protein_g":2.9,"carbs_g":2.5,"fats_g":0.4},{"name":"Uovo","grams":50,"kcal":72,"protein_g":6.3,"carbs_g":0.4,"fats_g":5},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2}]',
 620, 28.2, 38.9, 39.3, 0.8, 'Stendere la brisée, farcire con ricotta, spinaci saltati, uovo e parmigiano. Cuocere a 180° per 30 min.', 40),

('Parmigiana di melanzane light', 'cena', 'mediterranea',
 '[{"name":"Melanzane","grams":200,"kcal":50,"protein_g":2,"carbs_g":8.8,"fats_g":0.4},{"name":"Passata di pomodoro","grams":120,"kcal":30,"protein_g":1.2,"carbs_g":5.4,"fats_g":0.2},{"name":"Mozzarella","grams":60,"kcal":150,"protein_g":11.1,"carbs_g":0.4,"fats_g":11.4},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2},{"name":"Basilico","grams":3,"kcal":1,"protein_g":0.1,"carbs_g":0.1,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Pane","grams":40,"kcal":104,"protein_g":3.6,"carbs_g":20,"fats_g":0.6}]',
 482, 23.2, 34.7, 26.8, 0.8, 'Grigliare le melanzane (senza friggere), alternare strati con passata, mozzarella e parmigiano. Forno 180° per 25 min.', 35);
