
-- =============================================
-- KETO: +5 colazione
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Frittata al forno con formaggio', 'colazione', 'keto',
 '[{"name":"Uova","grams":150,"kcal":216,"protein_g":18.9,"carbs_g":1.2,"fats_g":15},{"name":"Emmental","grams":30,"kcal":114,"protein_g":8.4,"carbs_g":0.3,"fats_g":9},{"name":"Burro","grams":8,"kcal":60,"protein_g":0,"carbs_g":0,"fats_g":6.6}]',
 390, 27.3, 1.5, 30.6, 0.8, 'Sbattere le uova con formaggio grattugiato, cuocere in forno a 180° per 15 min.', 20),

('Yogurt greco intero con noci', 'colazione', 'keto',
 '[{"name":"Yogurt greco intero","grams":170,"kcal":163,"protein_g":10.2,"carbs_g":6.8,"fats_g":10.2},{"name":"Noci","grams":25,"kcal":163,"protein_g":3.8,"carbs_g":1.7,"fats_g":16.3}]',
 326, 14, 8.5, 26.5, 0.8, 'Servire yogurt greco con noci spezzate sopra.', 3),

('Bacon con uova e avocado', 'colazione', 'keto',
 '[{"name":"Bacon","grams":40,"kcal":172,"protein_g":10,"carbs_g":0,"fats_g":14.8},{"name":"Uova","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Avocado","grams":70,"kcal":112,"protein_g":1.4,"carbs_g":1.2,"fats_g":10.5}]',
 428, 24, 2, 35.3, 0.8, 'Cuocere bacon croccante, friggere le uova, servire con avocado a fette.', 10),

('Crêpe di farina di cocco', 'colazione', 'keto',
 '[{"name":"Farina di cocco","grams":20,"kcal":72,"protein_g":2.6,"carbs_g":3.2,"fats_g":5.4},{"name":"Uova","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Latte di cocco","grams":30,"kcal":60,"protein_g":0.6,"carbs_g":0.9,"fats_g":6.3},{"name":"Burro","grams":8,"kcal":60,"protein_g":0,"carbs_g":0,"fats_g":6.6},{"name":"Crema di nocciole senza zucchero","grams":15,"kcal":90,"protein_g":2,"carbs_g":2,"fats_g":8}]',
 426, 17.8, 6.9, 36.3, 0.8, 'Mescolare farina di cocco, uova e latte di cocco. Cuocere come crêpe, farcire con crema.', 15),

('Mousse di ricotta con cacao', 'colazione', 'keto',
 '[{"name":"Ricotta intera","grams":150,"kcal":219,"protein_g":13.5,"carbs_g":6,"fats_g":15.8},{"name":"Cacao amaro","grams":8,"kcal":19,"protein_g":1.6,"carbs_g":1.2,"fats_g":1},{"name":"Eritritolo","grams":10,"kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0},{"name":"Mandorle","grams":15,"kcal":87,"protein_g":3.2,"carbs_g":0.6,"fats_g":7.8}]',
 325, 18.3, 7.8, 24.6, 0.8, 'Frullare ricotta con cacao e eritritolo. Servire con mandorle a lamelle.', 5);

-- =============================================
-- KETO: +10 pranzo
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Carpaccio di manzo con rucola', 'pranzo', 'keto',
 '[{"name":"Manzo carpaccio","grams":120,"kcal":132,"protein_g":24,"carbs_g":0,"fats_g":4.2},{"name":"Rucola","grams":40,"kcal":10,"protein_g":1,"carbs_g":1.5,"fats_g":0.3},{"name":"Parmigiano scaglie","grams":25,"kcal":98,"protein_g":8.7,"carbs_g":0,"fats_g":7},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12},{"name":"Limone","grams":15,"kcal":4,"protein_g":0.1,"carbs_g":1.4,"fats_g":0}]',
 350, 33.8, 2.9, 23.5, 0.8, 'Disporre il carpaccio, coprire con rucola, scaglie di parmigiano, olio e limone.', 5),

('Pollo ripieno di spinaci', 'pranzo', 'keto',
 '[{"name":"Petto di pollo","grams":180,"kcal":187,"protein_g":41.4,"carbs_g":0,"fats_g":1.8},{"name":"Spinaci","grams":80,"kcal":18,"protein_g":2.3,"carbs_g":2,"fats_g":0.3},{"name":"Philadelphia","grams":30,"kcal":87,"protein_g":1.8,"carbs_g":1.2,"fats_g":8.4},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 362, 45.5, 3.2, 18.5, 0.8, 'Aprire il petto a libro, farcire con spinaci saltati e Philadelphia, arrotolare e cuocere in forno a 200° per 25 min.', 30),

('Tartare di salmone', 'pranzo', 'keto',
 '[{"name":"Salmone fresco","grams":150,"kcal":276,"protein_g":30,"carbs_g":0,"fats_g":16.5},{"name":"Avocado","grams":60,"kcal":96,"protein_g":1.2,"carbs_g":1,"fats_g":9},{"name":"Cipollotto","grams":10,"kcal":3,"protein_g":0.2,"carbs_g":0.7,"fats_g":0},{"name":"Salsa di soia","grams":10,"kcal":5,"protein_g":0.8,"carbs_g":0.4,"fats_g":0},{"name":"Olio di sesamo","grams":5,"kcal":44,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 424, 32.2, 2.1, 30.5, 0.8, 'Tagliare salmone a cubetti, condire con soia e sesamo, servire con avocado.', 10),

('Insalata greca senza pane', 'pranzo', 'keto',
 '[{"name":"Cetrioli","grams":100,"kcal":15,"protein_g":0.7,"carbs_g":3,"fats_g":0.1},{"name":"Pomodori","grams":100,"kcal":18,"protein_g":0.9,"carbs_g":3.8,"fats_g":0.2},{"name":"Feta","grams":80,"kcal":210,"protein_g":11.2,"carbs_g":3.2,"fats_g":17.6},{"name":"Olive nere","grams":30,"kcal":45,"protein_g":0.4,"carbs_g":0.6,"fats_g":4.5},{"name":"Cipolla rossa","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.8,"fats_g":0},{"name":"Olio EVO","grams":15,"kcal":132,"protein_g":0,"carbs_g":0,"fats_g":15},{"name":"Origano","grams":1,"kcal":3,"protein_g":0.1,"carbs_g":0.5,"fats_g":0.1}]',
 431, 13.5, 12.9, 37.5, 0.8, 'Tagliare verdure a pezzi, aggiungere feta a cubetti, olive, condire con olio e origano.', 10),

('Stracchino con noci e sedano', 'pranzo', 'keto',
 '[{"name":"Stracchino","grams":100,"kcal":300,"protein_g":18,"carbs_g":0,"fats_g":25},{"name":"Noci","grams":30,"kcal":196,"protein_g":4.5,"carbs_g":2,"fats_g":19.5},{"name":"Sedano","grams":80,"kcal":13,"protein_g":0.6,"carbs_g":2.4,"fats_g":0.1}]',
 509, 23.1, 4.4, 44.6, 0.8, 'Servire stracchino con sedano a bastoncino e noci.', 5),

('Tonno in crosta di sesamo', 'pranzo', 'keto',
 '[{"name":"Trancio di tonno","grams":160,"kcal":208,"protein_g":36.8,"carbs_g":0,"fats_g":6.4},{"name":"Semi di sesamo","grams":15,"kcal":87,"protein_g":2.7,"carbs_g":1.7,"fats_g":7.5},{"name":"Zucchine","grams":100,"kcal":16,"protein_g":1.2,"carbs_g":2.5,"fats_g":0.3},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 399, 40.7, 4.2, 24.2, 0.8, 'Panare il tonno nel sesamo, scottare in padella. Servire con zucchine grigliate.', 10),

('Parmigiana di zucchine', 'pranzo', 'keto',
 '[{"name":"Zucchine","grams":250,"kcal":40,"protein_g":3,"carbs_g":6.3,"fats_g":0.8},{"name":"Mozzarella","grams":60,"kcal":150,"protein_g":11.1,"carbs_g":0.4,"fats_g":11.4},{"name":"Parmigiano","grams":20,"kcal":78,"protein_g":6.9,"carbs_g":0,"fats_g":5.6},{"name":"Passata","grams":80,"kcal":20,"protein_g":0.8,"carbs_g":3.6,"fats_g":0.1},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 376, 21.8, 10.3, 27.9, 0.8, 'Grigliare le zucchine, alternare strati con passata, mozzarella e parmigiano. Forno 180° per 20 min.', 25),

('Fettine di vitello con funghi', 'pranzo', 'keto',
 '[{"name":"Vitello fettine","grams":150,"kcal":165,"protein_g":30,"carbs_g":0,"fats_g":4.5},{"name":"Funghi champignon","grams":120,"kcal":26,"protein_g":3.7,"carbs_g":0.5,"fats_g":0.4},{"name":"Burro","grams":10,"kcal":75,"protein_g":0.1,"carbs_g":0,"fats_g":8.3},{"name":"Prezzemolo","grams":3,"kcal":1,"protein_g":0.1,"carbs_g":0.2,"fats_g":0},{"name":"Aglio","grams":3,"kcal":4,"protein_g":0.2,"carbs_g":0.9,"fats_g":0}]',
 271, 34.1, 1.6, 13.2, 0.8, 'Saltare le fettine nel burro, aggiungere funghi trifolati con aglio e prezzemolo.', 15),

('Polpette al forno senza pane', 'pranzo', 'keto',
 '[{"name":"Macinato di manzo","grams":150,"kcal":225,"protein_g":30,"carbs_g":0,"fats_g":12},{"name":"Uovo","grams":50,"kcal":72,"protein_g":6.3,"carbs_g":0.4,"fats_g":5},{"name":"Parmigiano","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2},{"name":"Insalata verde","grams":80,"kcal":14,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 440, 42.5, 2.4, 29.4, 0.8, 'Impastare macinato con uovo e parmigiano, formare polpette, cuocere in forno a 200° per 20 min. Servire con insalata.', 25),

('Cavolfiore al gratin', 'pranzo', 'keto',
 '[{"name":"Cavolfiore","grams":250,"kcal":63,"protein_g":4.8,"carbs_g":10,"fats_g":0.8},{"name":"Panna","grams":40,"kcal":132,"protein_g":0.8,"carbs_g":1.2,"fats_g":13.6},{"name":"Emmental","grams":30,"kcal":114,"protein_g":8.4,"carbs_g":0.3,"fats_g":9},{"name":"Burro","grams":8,"kcal":60,"protein_g":0,"carbs_g":0,"fats_g":6.6}]',
 369, 14, 11.5, 30, 0.8, 'Lessare il cavolfiore, condire con panna, coprire con emmental e gratinare in forno.', 20);

-- =============================================
-- KETO: +10 cena
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Tagliata con verdure', 'cena', 'keto',
 '[{"name":"Controfiletto di manzo","grams":180,"kcal":234,"protein_g":36,"carbs_g":0,"fats_g":9},{"name":"Rucola","grams":40,"kcal":10,"protein_g":1,"carbs_g":1.5,"fats_g":0.3},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 344, 37.5, 3.9, 19.4, 0.8, 'Grigliare la carne al sangue, tagliare a fette, servire con rucola e pomodorini.', 10),

('Branzino al sale', 'cena', 'keto',
 '[{"name":"Branzino intero","grams":250,"kcal":230,"protein_g":43,"carbs_g":0,"fats_g":5.5},{"name":"Sale grosso","grams":500,"kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0},{"name":"Insalata mista","grams":80,"kcal":14,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 350, 44, 2, 17.7, 0.8, 'Coprire il branzino di sale grosso, cuocere in forno a 220° per 30 min. Rompere la crosta di sale, servire con insalata.', 35),

('Petto d''anatra con spinaci', 'cena', 'keto',
 '[{"name":"Petto d''anatra","grams":150,"kcal":201,"protein_g":29,"carbs_g":0,"fats_g":9},{"name":"Spinaci","grams":120,"kcal":28,"protein_g":3.5,"carbs_g":3,"fats_g":0.5},{"name":"Burro","grams":8,"kcal":60,"protein_g":0,"carbs_g":0,"fats_g":6.6},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 359, 32.5, 3, 24.1, 0.8, 'Cuocere petto d''anatra pelle in giù, girare e completare. Saltare spinaci nel burro.', 15),

('Frittata con salsiccia', 'cena', 'keto',
 '[{"name":"Uova","grams":150,"kcal":216,"protein_g":18.9,"carbs_g":1.2,"fats_g":15},{"name":"Salsiccia","grams":80,"kcal":256,"protein_g":12.8,"carbs_g":0.8,"fats_g":22.4},{"name":"Peperoni","grams":60,"kcal":19,"protein_g":0.6,"carbs_g":3.8,"fats_g":0.2}]',
 491, 32.3, 5.8, 37.6, 0.8, 'Sbricciolare la salsiccia, rosolare con peperoni, versare le uova e cuocere la frittata.', 15),

('Gamberoni alla griglia', 'cena', 'keto',
 '[{"name":"Gamberoni","grams":200,"kcal":170,"protein_g":36,"carbs_g":1.8,"fats_g":1.2},{"name":"Zucchine grigliate","grams":120,"kcal":19,"protein_g":1.4,"carbs_g":3,"fats_g":0.4},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12},{"name":"Limone","grams":15,"kcal":4,"protein_g":0.1,"carbs_g":1.4,"fats_g":0}]',
 299, 37.5, 6.2, 13.6, 0.8, 'Grigliare i gamberoni con olio e limone. Servire con zucchine grigliate.', 12),

('Maiale con cavoletti', 'cena', 'keto',
 '[{"name":"Lonza di maiale","grams":160,"kcal":192,"protein_g":33.6,"carbs_g":0,"fats_g":6.4},{"name":"Cavoletti di Bruxelles","grams":150,"kcal":57,"protein_g":5.1,"carbs_g":7.5,"fats_g":0.5},{"name":"Pancetta","grams":20,"kcal":82,"protein_g":2.8,"carbs_g":0,"fats_g":8},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 401, 41.5, 7.5, 22.9, 0.8, 'Cuocere la lonza in padella, saltare cavoletti con pancetta e olio.', 20),

('Pesce spada grigliato', 'cena', 'keto',
 '[{"name":"Pesce spada","grams":180,"kcal":234,"protein_g":34.2,"carbs_g":0,"fats_g":10.8},{"name":"Insalata mista","grams":80,"kcal":14,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 348, 35.7, 4.4, 21.1, 0.8, 'Grigliare il pesce spada, servire con insalata e pomodorini.', 10),

('Pollo al limone con asparagi', 'cena', 'keto',
 '[{"name":"Petto di pollo","grams":180,"kcal":187,"protein_g":41.4,"carbs_g":0,"fats_g":1.8},{"name":"Asparagi","grams":120,"kcal":24,"protein_g":2.6,"carbs_g":3.6,"fats_g":0.1},{"name":"Limone","grams":20,"kcal":6,"protein_g":0.1,"carbs_g":1.8,"fats_g":0},{"name":"Olio EVO","grams":12,"kcal":106,"protein_g":0,"carbs_g":0,"fats_g":12}]',
 323, 44.1, 5.4, 13.9, 0.8, 'Cuocere il pollo con limone e olio, servire con asparagi grigliati.', 15),

('Vitello tonnato', 'cena', 'keto',
 '[{"name":"Girello di vitello","grams":150,"kcal":165,"protein_g":30,"carbs_g":0,"fats_g":4.5},{"name":"Tonno sott''olio","grams":40,"kcal":80,"protein_g":9.2,"carbs_g":0,"fats_g":4.8},{"name":"Capperi","grams":10,"kcal":2,"protein_g":0.2,"carbs_g":0.4,"fats_g":0},{"name":"Maionese","grams":20,"kcal":140,"protein_g":0.2,"carbs_g":0.6,"fats_g":15.4}]',
 387, 39.6, 1, 24.7, 0.8, 'Lessare il vitello, affettare. Frullare tonno con maionese e capperi per la salsa.', 50),

('Salmone in crosta di erbe', 'cena', 'keto',
 '[{"name":"Salmone filetto","grams":170,"kcal":313,"protein_g":34,"carbs_g":0,"fats_g":18.7},{"name":"Mandorle tritate","grams":15,"kcal":87,"protein_g":3.2,"carbs_g":0.6,"fats_g":7.8},{"name":"Erbe aromatiche","grams":5,"kcal":2,"protein_g":0.1,"carbs_g":0.3,"fats_g":0},{"name":"Fagiolini","grams":100,"kcal":31,"protein_g":1.8,"carbs_g":5.7,"fats_g":0.2},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 503, 39.1, 6.6, 34.7, 0.8, 'Panare salmone con mandorle e erbe, cuocere in forno 200° per 15 min. Fagiolini al vapore.', 20);

-- =============================================
-- KETO: +5 spuntino
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Prosciutto crudo con mozzarelline', 'spuntino', 'keto',
 '[{"name":"Prosciutto crudo","grams":30,"kcal":69,"protein_g":7.8,"carbs_g":0,"fats_g":4.2},{"name":"Mozzarelline","grams":50,"kcal":125,"protein_g":9.3,"carbs_g":0.3,"fats_g":9.5}]',
 194, 17.1, 0.3, 13.7, 0.8, 'Avvolgere mozzarelline con fette di prosciutto crudo.', 3),

('Cetrioli con tzatziki', 'spuntino', 'keto',
 '[{"name":"Cetrioli","grams":120,"kcal":18,"protein_g":0.8,"carbs_g":3.6,"fats_g":0.1},{"name":"Yogurt greco","grams":80,"kcal":77,"protein_g":4.8,"carbs_g":3.2,"fats_g":4.8},{"name":"Aglio","grams":2,"kcal":3,"protein_g":0.1,"carbs_g":0.6,"fats_g":0},{"name":"Olio EVO","grams":5,"kcal":44,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 142, 5.7, 7.4, 9.9, 0.8, 'Grattugiare cetriolo nello yogurt, aggiungere aglio e olio. Intingere bastoncini di cetriolo.', 5),

('Uova di quaglia con mayo', 'spuntino', 'keto',
 '[{"name":"Uova di quaglia","grams":60,"kcal":94,"protein_g":8,"carbs_g":0.5,"fats_g":6.6},{"name":"Maionese","grams":10,"kcal":70,"protein_g":0.1,"carbs_g":0.3,"fats_g":7.7}]',
 164, 8.1, 0.8, 14.3, 0.8, 'Lessare le uova 3 min, sbucciare, servire con maionese.', 5),

('Bresaola e grana', 'spuntino', 'keto',
 '[{"name":"Bresaola","grams":40,"kcal":60,"protein_g":12.8,"carbs_g":0,"fats_g":0.8},{"name":"Grana Padano","grams":20,"kcal":78,"protein_g":6.9,"carbs_g":0,"fats_g":5.6},{"name":"Rucola","grams":15,"kcal":4,"protein_g":0.4,"carbs_g":0.6,"fats_g":0.1},{"name":"Olio EVO","grams":5,"kcal":44,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 186, 20.1, 0.6, 11.5, 0.8, 'Arrotolare bresaola con scaglie di grana e rucola.', 3),

('Burro di mandorle con sedano', 'spuntino', 'keto',
 '[{"name":"Burro di mandorle","grams":20,"kcal":122,"protein_g":4.2,"carbs_g":1.4,"fats_g":11},{"name":"Sedano","grams":100,"kcal":16,"protein_g":0.7,"carbs_g":3,"fats_g":0.2}]',
 138, 4.9, 4.4, 11.2, 0.8, 'Spalmare burro di mandorle nei bastoncini di sedano.', 3);
