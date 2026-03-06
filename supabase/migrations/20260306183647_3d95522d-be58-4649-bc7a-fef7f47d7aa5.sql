
-- =============================================
-- DIMAGRIMENTO: +10 colazione
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Yogurt magro con cereali', 'colazione', 'dimagrimento',
 '[{"name":"Yogurt magro","grams":150,"kcal":60,"protein_g":7.5,"carbs_g":6,"fats_g":0.3},{"name":"Cereali integrali","grams":30,"kcal":114,"protein_g":3,"carbs_g":21,"fats_g":1.8},{"name":"Mirtilli","grams":30,"kcal":17,"protein_g":0.2,"carbs_g":3.6,"fats_g":0.1}]',
 191, 10.7, 30.6, 2.2, 0.9, 'Versare cereali nello yogurt, aggiungere mirtilli.', 3),

('Fette biscottate con ricotta light', 'colazione', 'dimagrimento',
 '[{"name":"Fette biscottate integrali","grams":30,"kcal":114,"protein_g":3.3,"carbs_g":20.4,"fats_g":2.1},{"name":"Ricotta light","grams":60,"kcal":64,"protein_g":6.6,"carbs_g":2.4,"fats_g":3.3},{"name":"Miele","grams":8,"kcal":26,"protein_g":0,"carbs_g":6.6,"fats_g":0}]',
 204, 9.9, 29.4, 5.4, 0.9, 'Spalmare ricotta sulle fette, un filo di miele sopra.', 3),

('Frullato verde', 'colazione', 'dimagrimento',
 '[{"name":"Spinaci","grams":40,"kcal":9,"protein_g":1.2,"carbs_g":1,"fats_g":0.2},{"name":"Banana","grams":80,"kcal":71,"protein_g":0.9,"carbs_g":16.8,"fats_g":0.3},{"name":"Latte scremato","grams":200,"kcal":70,"protein_g":7,"carbs_g":10,"fats_g":0.2},{"name":"Semi di lino","grams":8,"kcal":43,"protein_g":1.5,"carbs_g":0.2,"fats_g":3.4}]',
 193, 10.6, 28, 4.1, 0.9, 'Frullare tutti gli ingredienti fino a ottenere un frullato liscio.', 5),

('Porridge light', 'colazione', 'dimagrimento',
 '[{"name":"Fiocchi d''avena","grams":35,"kcal":132,"protein_g":4.7,"carbs_g":23.1,"fats_g":2.5},{"name":"Latte scremato","grams":150,"kcal":53,"protein_g":5.3,"carbs_g":7.5,"fats_g":0.2},{"name":"Mela","grams":80,"kcal":42,"protein_g":0.2,"carbs_g":9.6,"fats_g":0.1},{"name":"Cannella","grams":2,"kcal":5,"protein_g":0.1,"carbs_g":1.2,"fats_g":0.1}]',
 232, 10.3, 41.4, 2.9, 0.9, 'Cuocere avena nel latte, aggiungere mela a cubetti e cannella.', 8),

('Uovo sodo con pane', 'colazione', 'dimagrimento',
 '[{"name":"Uovo","grams":60,"kcal":86,"protein_g":7.6,"carbs_g":0.5,"fats_g":6},{"name":"Pane integrale","grams":40,"kcal":92,"protein_g":3.6,"carbs_g":16,"fats_g":1.2},{"name":"Pomodoro","grams":50,"kcal":9,"protein_g":0.5,"carbs_g":1.9,"fats_g":0.1}]',
 187, 11.7, 18.4, 7.3, 0.9, 'Lessare uovo 8 min, servire con pane e pomodoro a fette.', 10),

('Toast integrale con pomodoro', 'colazione', 'dimagrimento',
 '[{"name":"Pane integrale","grams":50,"kcal":115,"protein_g":4.5,"carbs_g":20,"fats_g":1.5},{"name":"Pomodoro","grams":80,"kcal":14,"protein_g":0.7,"carbs_g":3,"fats_g":0.2},{"name":"Olio EVO","grams":5,"kcal":44,"protein_g":0,"carbs_g":0,"fats_g":5},{"name":"Origano","grams":1,"kcal":3,"protein_g":0.1,"carbs_g":0.5,"fats_g":0.1}]',
 176, 5.3, 23.5, 6.8, 0.9, 'Tostare pane, condire con pomodoro, olio e origano.', 5),

('Pancake proteici light', 'colazione', 'dimagrimento',
 '[{"name":"Albumi","grams":100,"kcal":52,"protein_g":11,"carbs_g":0.7,"fats_g":0.2},{"name":"Farina d''avena","grams":30,"kcal":113,"protein_g":4,"carbs_g":19.8,"fats_g":2.1},{"name":"Banana","grams":60,"kcal":53,"protein_g":0.7,"carbs_g":12.6,"fats_g":0.2},{"name":"Frutti di bosco","grams":40,"kcal":18,"protein_g":0.4,"carbs_g":3.8,"fats_g":0.2}]',
 236, 16.1, 36.9, 2.7, 0.9, 'Frullare albumi, farina e banana. Cuocere come pancake. Guarnire con frutti di bosco.', 10),

('Latte con avena', 'colazione', 'dimagrimento',
 '[{"name":"Latte parzialmente scremato","grams":200,"kcal":92,"protein_g":6.4,"carbs_g":9.6,"fats_g":3.2},{"name":"Fiocchi d''avena","grams":30,"kcal":113,"protein_g":4,"carbs_g":19.8,"fats_g":2.1}]',
 205, 10.4, 29.4, 5.3, 0.9, 'Scaldare il latte, aggiungere i fiocchi d''avena e lasciare riposare 5 min.', 5),

('Frutta con yogurt', 'colazione', 'dimagrimento',
 '[{"name":"Yogurt greco 0%","grams":150,"kcal":86,"protein_g":15,"carbs_g":6,"fats_g":0},{"name":"Mela","grams":100,"kcal":52,"protein_g":0.3,"carbs_g":12,"fats_g":0.2},{"name":"Kiwi","grams":60,"kcal":37,"protein_g":0.7,"carbs_g":8.7,"fats_g":0.3}]',
 175, 16, 26.7, 0.5, 0.9, 'Tagliare frutta a pezzi, mescolare con yogurt.', 5),

('Spremuta con fette biscottate', 'colazione', 'dimagrimento',
 '[{"name":"Arance per spremuta","grams":200,"kcal":86,"protein_g":1.4,"carbs_g":19.4,"fats_g":0.2},{"name":"Fette biscottate","grams":30,"kcal":120,"protein_g":3.3,"carbs_g":22,"fats_g":2.1},{"name":"Marmellata senza zucchero","grams":15,"kcal":23,"protein_g":0.1,"carbs_g":5.5,"fats_g":0}]',
 229, 4.8, 46.9, 2.3, 0.9, 'Spremere le arance, spalmare marmellata sulle fette.', 5);

-- =============================================
-- DIMAGRIMENTO: +10 pranzo
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Insalata di ceci', 'pranzo', 'dimagrimento',
 '[{"name":"Ceci cotti","grams":120,"kcal":158,"protein_g":8.4,"carbs_g":21.6,"fats_g":3.6},{"name":"Pomodorini","grams":80,"kcal":16,"protein_g":0.6,"carbs_g":3.2,"fats_g":0.2},{"name":"Cetrioli","grams":60,"kcal":9,"protein_g":0.4,"carbs_g":1.8,"fats_g":0.1},{"name":"Cipolla rossa","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 261, 9.6, 28.4, 11.9, 0.9, 'Mescolare ceci con verdure tagliate, condire con olio e limone.', 5),

('Wrap di lattuga con tonno', 'pranzo', 'dimagrimento',
 '[{"name":"Lattuga iceberg","grams":60,"kcal":8,"protein_g":0.5,"carbs_g":1.5,"fats_g":0.1},{"name":"Tonno al naturale","grams":100,"kcal":110,"protein_g":25,"carbs_g":0,"fats_g":1},{"name":"Pomodoro","grams":50,"kcal":9,"protein_g":0.5,"carbs_g":1.9,"fats_g":0.1},{"name":"Yogurt greco 0%","grams":30,"kcal":17,"protein_g":3,"carbs_g":1.2,"fats_g":0}]',
 144, 29, 4.6, 1.2, 0.9, 'Usare foglie di lattuga come involucro, farcire con tonno, pomodoro e yogurt.', 5),

('Riso integrale con verdure', 'pranzo', 'dimagrimento',
 '[{"name":"Riso integrale","grams":60,"kcal":216,"protein_g":4.2,"carbs_g":44.4,"fats_g":1.8},{"name":"Zucchine","grams":80,"kcal":13,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Peperoni","grams":60,"kcal":19,"protein_g":0.6,"carbs_g":3.8,"fats_g":0.2},{"name":"Carota","grams":40,"kcal":16,"protein_g":0.4,"carbs_g":3.6,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 334, 6.2, 53.8, 10.2, 0.9, 'Cuocere riso, saltare verdure in padella, unire tutto.', 20),

('Pasta fredda con verdure', 'pranzo', 'dimagrimento',
 '[{"name":"Fusilli integrali","grams":60,"kcal":198,"protein_g":7.8,"carbs_g":37.2,"fats_g":1.8},{"name":"Pomodorini","grams":80,"kcal":16,"protein_g":0.6,"carbs_g":3.2,"fats_g":0.2},{"name":"Zucchine","grams":60,"kcal":10,"protein_g":0.7,"carbs_g":1.5,"fats_g":0.2},{"name":"Basilico","grams":3,"kcal":1,"protein_g":0.1,"carbs_g":0.1,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 295, 9.2, 42, 10.2, 0.9, 'Cuocere pasta, raffreddare, condire con verdure crude o grigliate e olio.', 15),

('Zuppa di verdure', 'pranzo', 'dimagrimento',
 '[{"name":"Patate","grams":80,"kcal":69,"protein_g":1.6,"carbs_g":15.2,"fats_g":0.1},{"name":"Carota","grams":60,"kcal":24,"protein_g":0.6,"carbs_g":5.4,"fats_g":0},{"name":"Zucchine","grams":80,"kcal":13,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Sedano","grams":30,"kcal":5,"protein_g":0.2,"carbs_g":1,"fats_g":0},{"name":"Cipolla","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Pane integrale","grams":30,"kcal":69,"protein_g":2.7,"carbs_g":12,"fats_g":0.9}]',
 262, 6.4, 38.4, 9.2, 0.9, 'Cuocere tutte le verdure in acqua con sale, frullare se desiderato. Servire con pane.', 25),

('Pollo al limone con insalata', 'pranzo', 'dimagrimento',
 '[{"name":"Petto di pollo","grams":140,"kcal":145,"protein_g":32.2,"carbs_g":0,"fats_g":1.4},{"name":"Insalata mista","grams":100,"kcal":18,"protein_g":1.3,"carbs_g":2.5,"fats_g":0.3},{"name":"Limone","grams":20,"kcal":6,"protein_g":0.1,"carbs_g":1.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Pane integrale","grams":30,"kcal":69,"protein_g":2.7,"carbs_g":12,"fats_g":0.9}]',
 308, 36.3, 16.3, 10.6, 0.9, 'Grigliare pollo con limone, servire con insalata condita e pane.', 15),

('Bowl di bulgur e verdure', 'pranzo', 'dimagrimento',
 '[{"name":"Bulgur","grams":60,"kcal":204,"protein_g":7.2,"carbs_g":40.8,"fats_g":0.9},{"name":"Cetrioli","grams":60,"kcal":9,"protein_g":0.4,"carbs_g":1.8,"fats_g":0.1},{"name":"Pomodorini","grams":60,"kcal":12,"protein_g":0.5,"carbs_g":2.4,"fats_g":0.1},{"name":"Cipolla rossa","grams":15,"kcal":6,"protein_g":0.2,"carbs_g":1.4,"fats_g":0},{"name":"Menta","grams":3,"kcal":1,"protein_g":0,"carbs_g":0.2,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 302, 8.3, 46.6, 9.1, 0.9, 'Cuocere bulgur, raffreddare, condire con verdure tritate e olio (stile tabulè).', 15),

('Tortilla con tacchino', 'pranzo', 'dimagrimento',
 '[{"name":"Tortilla integrale","grams":50,"kcal":140,"protein_g":4,"carbs_g":22,"fats_g":4},{"name":"Fesa di tacchino","grams":60,"kcal":60,"protein_g":12,"carbs_g":0.6,"fats_g":1.2},{"name":"Lattuga","grams":20,"kcal":3,"protein_g":0.2,"carbs_g":0.5,"fats_g":0},{"name":"Pomodoro","grams":40,"kcal":7,"protein_g":0.4,"carbs_g":1.5,"fats_g":0.1},{"name":"Yogurt greco 0%","grams":20,"kcal":11,"protein_g":2,"carbs_g":0.8,"fats_g":0}]',
 221, 18.6, 25.4, 5.3, 0.9, 'Farcire tortilla con tacchino, verdure e yogurt, arrotolare.', 5),

('Cous cous con pesce', 'pranzo', 'dimagrimento',
 '[{"name":"Cous cous","grams":60,"kcal":216,"protein_g":6.6,"carbs_g":43.2,"fats_g":0.6},{"name":"Merluzzo","grams":120,"kcal":97,"protein_g":21.6,"carbs_g":0,"fats_g":0.9},{"name":"Zucchine","grams":60,"kcal":10,"protein_g":0.7,"carbs_g":1.5,"fats_g":0.2},{"name":"Pomodorini","grams":50,"kcal":10,"protein_g":0.4,"carbs_g":2,"fats_g":0.1},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 403, 29.3, 46.7, 9.8, 0.9, 'Cuocere cous cous, saltare pesce con verdure, combinare.', 15),

('Minestrone leggero', 'pranzo', 'dimagrimento',
 '[{"name":"Fagioli borlotti","grams":50,"kcal":68,"protein_g":4.5,"carbs_g":9.5,"fats_g":0.5},{"name":"Patate","grams":60,"kcal":52,"protein_g":1.2,"carbs_g":11.4,"fats_g":0.1},{"name":"Carota","grams":40,"kcal":16,"protein_g":0.4,"carbs_g":3.6,"fats_g":0},{"name":"Zucchine","grams":60,"kcal":10,"protein_g":0.7,"carbs_g":1.5,"fats_g":0.2},{"name":"Sedano","grams":20,"kcal":3,"protein_g":0.1,"carbs_g":0.7,"fats_g":0},{"name":"Passata","grams":40,"kcal":10,"protein_g":0.4,"carbs_g":1.8,"fats_g":0.1},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Pane integrale","grams":30,"kcal":69,"protein_g":2.7,"carbs_g":12,"fats_g":0.9}]',
 298, 10, 40.5, 9.8, 0.9, 'Cuocere le verdure in acqua, aggiungere fagioli e passata. Servire con pane.', 30);

-- =============================================
-- DIMAGRIMENTO: +10 cena
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Sogliola con spinaci', 'cena', 'dimagrimento',
 '[{"name":"Sogliola","grams":160,"kcal":131,"protein_g":26.7,"carbs_g":0,"fats_g":2.2},{"name":"Spinaci","grams":120,"kcal":28,"protein_g":3.5,"carbs_g":3,"fats_g":0.5},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 229, 30.2, 3, 10.7, 0.9, 'Cuocere la sogliola in padella con limone, servire con spinaci saltati.', 12),

('Tacchino con verdure al vapore', 'cena', 'dimagrimento',
 '[{"name":"Fesa di tacchino","grams":150,"kcal":150,"protein_g":30,"carbs_g":1.5,"fats_g":3},{"name":"Broccoli","grams":100,"kcal":34,"protein_g":2.8,"carbs_g":5.5,"fats_g":0.4},{"name":"Carota","grams":60,"kcal":24,"protein_g":0.6,"carbs_g":5.4,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 278, 33.4, 12.4, 11.4, 0.9, 'Cuocere tacchino alla griglia, verdure al vapore, condire con olio a crudo.', 15),

('Uova e asparagi', 'cena', 'dimagrimento',
 '[{"name":"Uova","grams":100,"kcal":144,"protein_g":12.6,"carbs_g":0.8,"fats_g":10},{"name":"Asparagi","grams":150,"kcal":30,"protein_g":3.3,"carbs_g":4.5,"fats_g":0.2},{"name":"Parmigiano","grams":10,"kcal":39,"protein_g":3.5,"carbs_g":0,"fats_g":2.8},{"name":"Olio EVO","grams":5,"kcal":44,"protein_g":0,"carbs_g":0,"fats_g":5}]',
 257, 19.4, 5.3, 18, 0.9, 'Grigliare asparagi, servire con uova all''occhio di bue e parmigiano.', 10),

('Zuppa di pesce', 'cena', 'dimagrimento',
 '[{"name":"Mix pesce","grams":180,"kcal":162,"protein_g":32.4,"carbs_g":0,"fats_g":3.6},{"name":"Pomodorini","grams":80,"kcal":16,"protein_g":0.6,"carbs_g":3.2,"fats_g":0.2},{"name":"Aglio","grams":3,"kcal":4,"protein_g":0.2,"carbs_g":0.9,"fats_g":0},{"name":"Prezzemolo","grams":5,"kcal":2,"protein_g":0.1,"carbs_g":0.3,"fats_g":0},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10},{"name":"Pane tostato","grams":30,"kcal":78,"protein_g":2.7,"carbs_g":15,"fats_g":0.5}]',
 350, 36, 19.4, 14.3, 0.9, 'Soffriggere aglio, aggiungere pomodorini e pesce, cuocere 15 min. Servire con crostini.', 20),

('Carpaccio di manzo light', 'cena', 'dimagrimento',
 '[{"name":"Manzo carpaccio","grams":100,"kcal":110,"protein_g":20,"carbs_g":0,"fats_g":3.5},{"name":"Rucola","grams":40,"kcal":10,"protein_g":1,"carbs_g":1.5,"fats_g":0.3},{"name":"Parmigiano scaglie","grams":15,"kcal":59,"protein_g":5.2,"carbs_g":0,"fats_g":4.2},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Limone","grams":10,"kcal":3,"protein_g":0.1,"carbs_g":0.9,"fats_g":0}]',
 252, 26.3, 2.4, 16, 0.9, 'Disporre carpaccio su piatto, aggiungere rucola, parmigiano, olio e limone.', 5),

('Pollo alla griglia con finocchi', 'cena', 'dimagrimento',
 '[{"name":"Petto di pollo","grams":140,"kcal":145,"protein_g":32.2,"carbs_g":0,"fats_g":1.4},{"name":"Finocchi","grams":150,"kcal":47,"protein_g":1.9,"carbs_g":9,"fats_g":0.3},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 262, 34.1, 9, 9.7, 0.9, 'Grigliare il pollo, servire con finocchi crudi o grigliati.', 12),

('Calamari grigliati con insalata', 'cena', 'dimagrimento',
 '[{"name":"Calamari","grams":150,"kcal":117,"protein_g":22.5,"carbs_g":2.3,"fats_g":1.7},{"name":"Insalata mista","grams":80,"kcal":14,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Pomodorini","grams":50,"kcal":10,"protein_g":0.4,"carbs_g":2,"fats_g":0.1},{"name":"Olio EVO","grams":10,"kcal":88,"protein_g":0,"carbs_g":0,"fats_g":10}]',
 229, 23.9, 6.3, 12, 0.9, 'Grigliare i calamari, servire con insalata e pomodorini.', 10),

('Tofu saltato con verdure', 'cena', 'dimagrimento',
 '[{"name":"Tofu","grams":150,"kcal":120,"protein_g":15,"carbs_g":1.5,"fats_g":6},{"name":"Peperoni","grams":80,"kcal":25,"protein_g":0.8,"carbs_g":5,"fats_g":0.2},{"name":"Zucchine","grams":80,"kcal":13,"protein_g":1,"carbs_g":2,"fats_g":0.2},{"name":"Salsa di soia","grams":10,"kcal":5,"protein_g":0.8,"carbs_g":0.4,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 233, 17.6, 8.9, 14.4, 0.9, 'Tagliare tofu a cubetti, saltare con verdure e soia in padella.', 12),

('Spiedini di pollo e peperoni', 'cena', 'dimagrimento',
 '[{"name":"Petto di pollo","grams":140,"kcal":145,"protein_g":32.2,"carbs_g":0,"fats_g":1.4},{"name":"Peperoni","grams":100,"kcal":31,"protein_g":1,"carbs_g":6.3,"fats_g":0.3},{"name":"Cipolla","grams":30,"kcal":12,"protein_g":0.3,"carbs_g":2.8,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8}]',
 258, 33.5, 9.1, 9.7, 0.9, 'Alternare pollo e verdure sugli spiedini, grigliare.', 15),

('Crema di piselli con crostini', 'cena', 'dimagrimento',
 '[{"name":"Piselli","grams":150,"kcal":122,"protein_g":8.4,"carbs_g":19.5,"fats_g":0.6},{"name":"Cipolla","grams":20,"kcal":8,"protein_g":0.2,"carbs_g":1.9,"fats_g":0},{"name":"Olio EVO","grams":8,"kcal":70,"protein_g":0,"carbs_g":0,"fats_g":8},{"name":"Pane tostato","grams":30,"kcal":78,"protein_g":2.7,"carbs_g":15,"fats_g":0.5}]',
 278, 11.3, 36.4, 9.1, 0.9, 'Cuocere piselli con cipolla, frullare, servire con crostini e un filo di olio.', 15);

-- =============================================
-- DIMAGRIMENTO: +7 spuntino
-- =============================================
INSERT INTO public.template_recipes (title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, portion_scale_female, instructions, prep_time_min)
VALUES
('Finocchio crudo', 'spuntino', 'dimagrimento',
 '[{"name":"Finocchio","grams":150,"kcal":47,"protein_g":1.9,"carbs_g":9,"fats_g":0.3}]',
 47, 1.9, 9, 0.3, 0.9, 'Tagliare il finocchio a spicchi e gustare crudo.', 3),

('Yogurt greco 0% con frutti di bosco', 'spuntino', 'dimagrimento',
 '[{"name":"Yogurt greco 0%","grams":120,"kcal":69,"protein_g":12,"carbs_g":4.8,"fats_g":0},{"name":"Frutti di bosco","grams":50,"kcal":22,"protein_g":0.5,"carbs_g":4.8,"fats_g":0.2}]',
 91, 12.5, 9.6, 0.2, 0.9, 'Versare frutti di bosco sullo yogurt.', 2),

('Gallette con ricotta light', 'spuntino', 'dimagrimento',
 '[{"name":"Gallette di riso","grams":20,"kcal":77,"protein_g":1.4,"carbs_g":16.4,"fats_g":0.6},{"name":"Ricotta light","grams":40,"kcal":43,"protein_g":4.4,"carbs_g":1.6,"fats_g":2.2}]',
 120, 5.8, 18, 2.8, 0.9, 'Spalmare ricotta sulle gallette.', 2),

('Centrifuga di verdure', 'spuntino', 'dimagrimento',
 '[{"name":"Carota","grams":100,"kcal":41,"protein_g":0.9,"carbs_g":9,"fats_g":0.2},{"name":"Sedano","grams":80,"kcal":13,"protein_g":0.6,"carbs_g":2.4,"fats_g":0.1},{"name":"Mela verde","grams":80,"kcal":42,"protein_g":0.2,"carbs_g":9.6,"fats_g":0.1}]',
 96, 1.7, 21, 0.4, 0.9, 'Centrifugare carota, sedano e mela.', 5),

('Edamame', 'spuntino', 'dimagrimento',
 '[{"name":"Edamame sgusciati","grams":80,"kcal":98,"protein_g":8.8,"carbs_g":6.4,"fats_g":4.4}]',
 98, 8.8, 6.4, 4.4, 0.9, 'Scaldare edamame con un pizzico di sale.', 3),

('Gelatina proteica', 'spuntino', 'dimagrimento',
 '[{"name":"Gelatina proteica","grams":120,"kcal":50,"protein_g":10,"carbs_g":2,"fats_g":0.3}]',
 50, 10, 2, 0.3, 0.9, 'Servire dalla confezione o preparare con proteine e gelatina alimentare.', 2),

('Kefir con semi di lino', 'spuntino', 'dimagrimento',
 '[{"name":"Kefir","grams":150,"kcal":98,"protein_g":5.3,"carbs_g":6,"fats_g":5.3},{"name":"Semi di lino","grams":8,"kcal":43,"protein_g":1.5,"carbs_g":0.2,"fats_g":3.4}]',
 141, 6.8, 6.2, 8.7, 0.9, 'Versare kefir in un bicchiere, aggiungere semi di lino.', 2);
