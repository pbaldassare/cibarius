
-- 1) Create food_templates table
CREATE TABLE IF NOT EXISTS public.food_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  calories_100g numeric NOT NULL,
  protein_100g numeric NOT NULL DEFAULT 0,
  carbs_100g numeric NOT NULL DEFAULT 0,
  fats_100g numeric NOT NULL DEFAULT 0,
  default_unit text DEFAULT 'g',
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS: readable by all authenticated
ALTER TABLE public.food_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_templates_read" ON public.food_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "food_templates_admin_all" ON public.food_templates
  FOR ALL USING (public.current_user_is_admin());

-- 2) Add template_id to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.food_templates(id);

-- 3) Seed 120+ common Italian foods
INSERT INTO public.food_templates (name, category, calories_100g, protein_100g, carbs_100g, fats_100g, keywords) VALUES
-- FRUTTA (15)
('Mela', 'frutta', 52, 0.3, 14, 0.2, ARRAY['mela','mele','apple']),
('Pera', 'frutta', 57, 0.4, 15, 0.1, ARRAY['pera','pere','pear']),
('Banana', 'frutta', 89, 1.1, 23, 0.3, ARRAY['banana','banane']),
('Arancia', 'frutta', 47, 0.9, 12, 0.1, ARRAY['arancia','arance','orange']),
('Fragola', 'frutta', 33, 0.7, 8, 0.3, ARRAY['fragola','fragole','strawberry']),
('Uva', 'frutta', 69, 0.7, 18, 0.2, ARRAY['uva','grapes']),
('Kiwi', 'frutta', 61, 1.1, 15, 0.5, ARRAY['kiwi']),
('Pesca', 'frutta', 39, 0.9, 10, 0.3, ARRAY['pesca','pesche','peach']),
('Albicocca', 'frutta', 48, 1.4, 11, 0.4, ARRAY['albicocca','albicocche','apricot']),
('Anguria', 'frutta', 30, 0.6, 8, 0.2, ARRAY['anguria','cocomero','watermelon']),
('Melone', 'frutta', 34, 0.8, 8, 0.2, ARRAY['melone','melon']),
('Mandarino', 'frutta', 53, 0.8, 13, 0.3, ARRAY['mandarino','mandarini','clementina']),
('Limone', 'frutta', 29, 1.1, 9, 0.3, ARRAY['limone','limoni','lemon']),
('Pompelmo', 'frutta', 42, 0.8, 11, 0.1, ARRAY['pompelmo','grapefruit']),
('Mirtillo', 'frutta', 57, 0.7, 14, 0.3, ARRAY['mirtillo','mirtilli','blueberry']),

-- VERDURA (20)
('Pomodoro', 'verdura', 18, 0.9, 3.9, 0.2, ARRAY['pomodoro','pomodori','tomato']),
('Zucchina', 'verdura', 17, 1.2, 3.1, 0.3, ARRAY['zucchina','zucchine','zucchini']),
('Insalata', 'verdura', 15, 1.4, 2.9, 0.2, ARRAY['insalata','lattuga','lettuce','iceberg']),
('Carota', 'verdura', 41, 0.9, 10, 0.2, ARRAY['carota','carote','carrot']),
('Peperone', 'verdura', 31, 1, 6, 0.3, ARRAY['peperone','peperoni','pepper']),
('Melanzana', 'verdura', 25, 1, 6, 0.2, ARRAY['melanzana','melanzane','eggplant']),
('Spinaci', 'verdura', 23, 2.9, 3.6, 0.4, ARRAY['spinaci','spinach']),
('Broccoli', 'verdura', 34, 2.8, 7, 0.4, ARRAY['broccoli','broccolo']),
('Cavolfiore', 'verdura', 25, 1.9, 5, 0.3, ARRAY['cavolfiore','cauliflower']),
('Cipolla', 'verdura', 40, 1.1, 9, 0.1, ARRAY['cipolla','cipolle','onion']),
('Aglio', 'verdura', 149, 6.4, 33, 0.5, ARRAY['aglio','garlic']),
('Patata', 'verdura', 77, 2, 17, 0.1, ARRAY['patata','patate','potato']),
('Funghi champignon', 'verdura', 22, 3.1, 3.3, 0.3, ARRAY['funghi','champignon','mushroom']),
('Cetriolo', 'verdura', 16, 0.7, 3.6, 0.1, ARRAY['cetriolo','cetrioli','cucumber']),
('Sedano', 'verdura', 16, 0.7, 3, 0.2, ARRAY['sedano','celery']),
('Finocchio', 'verdura', 31, 1.2, 7.3, 0.2, ARRAY['finocchio','fennel']),
('Cavolo', 'verdura', 25, 1.3, 5.8, 0.1, ARRAY['cavolo','cabbage','verza']),
('Rucola', 'verdura', 25, 2.6, 3.7, 0.7, ARRAY['rucola','arugula']),
('Piselli', 'verdura', 81, 5.4, 14, 0.4, ARRAY['piselli','peas']),
('Asparagi', 'verdura', 20, 2.2, 3.9, 0.1, ARRAY['asparagi','asparagus']),

-- CARNE (15)
('Petto di pollo', 'carne', 165, 31, 0, 3.6, ARRAY['pollo','petto di pollo','chicken breast','chicken']),
('Coscia di pollo', 'carne', 209, 26, 0, 11, ARRAY['coscia di pollo','chicken thigh']),
('Tacchino petto', 'carne', 135, 30, 0, 1, ARRAY['tacchino','turkey','petto di tacchino']),
('Manzo magro', 'carne', 250, 26, 0, 15, ARRAY['manzo','beef','bovino','vitello']),
('Maiale lonza', 'carne', 143, 27, 0, 3.5, ARRAY['maiale','lonza','pork loin']),
('Vitello fettina', 'carne', 172, 30, 0, 5, ARRAY['vitello','veal','fettina']),
('Salsiccia', 'carne', 300, 18, 1, 25, ARRAY['salsiccia','sausage']),
('Prosciutto cotto', 'carne', 145, 21, 1, 6, ARRAY['prosciutto cotto','cooked ham']),
('Prosciutto crudo', 'carne', 230, 26, 0, 14, ARRAY['prosciutto crudo','parma ham']),
('Bresaola', 'carne', 151, 32, 0, 2, ARRAY['bresaola']),
('Hamburger bovino', 'carne', 254, 17, 0, 20, ARRAY['hamburger','burger']),
('Coniglio', 'carne', 136, 20, 0, 6, ARRAY['coniglio','rabbit']),
('Agnello', 'carne', 258, 25, 0, 17, ARRAY['agnello','lamb']),
('Fegato bovino', 'carne', 135, 20, 4, 4, ARRAY['fegato','liver']),
('Wurstel', 'carne', 275, 12, 2, 24, ARRAY['wurstel','frankfurter','hot dog']),

-- PESCE (12)
('Tonno fresco', 'pesce', 144, 23, 0, 5, ARRAY['tonno','tuna']),
('Tonno in scatola', 'pesce', 130, 29, 0, 1, ARRAY['tonno scatola','canned tuna','tonno sott''olio']),
('Salmone', 'pesce', 208, 20, 0, 13, ARRAY['salmone','salmon']),
('Merluzzo', 'pesce', 82, 18, 0, 0.7, ARRAY['merluzzo','cod','nasello']),
('Orata', 'pesce', 100, 20, 0, 2, ARRAY['orata','sea bream']),
('Branzino', 'pesce', 97, 19, 0, 2, ARRAY['branzino','spigola','sea bass']),
('Gamberi', 'pesce', 99, 24, 0, 0.3, ARRAY['gamberi','gamberetti','shrimp','prawns']),
('Calamaro', 'pesce', 92, 15, 3, 1.4, ARRAY['calamaro','calamari','squid']),
('Sgombro', 'pesce', 205, 19, 0, 14, ARRAY['sgombro','mackerel']),
('Sardina', 'pesce', 208, 25, 0, 11, ARRAY['sardina','sardine']),
('Acciuga', 'pesce', 131, 20, 0, 5, ARRAY['acciuga','acciughe','anchovy']),
('Polpo', 'pesce', 82, 15, 2.2, 1, ARRAY['polpo','octopus']),

-- LATTICINI (15)
('Latte intero', 'latticini', 64, 3.3, 4.7, 3.6, ARRAY['latte','latte intero','whole milk']),
('Latte scremato', 'latticini', 34, 3.4, 5, 0.1, ARRAY['latte scremato','skim milk']),
('Yogurt greco', 'latticini', 97, 9, 3.6, 5, ARRAY['yogurt greco','greek yogurt']),
('Yogurt bianco', 'latticini', 61, 3.5, 4.7, 3.3, ARRAY['yogurt','yogurt bianco','plain yogurt']),
('Mozzarella', 'latticini', 280, 22, 2, 20, ARRAY['mozzarella']),
('Mozzarella bufala', 'latticini', 288, 16, 0.7, 24, ARRAY['mozzarella bufala','buffalo mozzarella']),
('Parmigiano Reggiano', 'latticini', 392, 33, 3.2, 28, ARRAY['parmigiano','parmesan','grana']),
('Ricotta vaccina', 'latticini', 146, 11, 3, 10, ARRAY['ricotta','ricotta vaccina']),
('Gorgonzola', 'latticini', 353, 19, 1, 31, ARRAY['gorgonzola']),
('Stracchino', 'latticini', 300, 18, 0, 25, ARRAY['stracchino','crescenza']),
('Burro', 'latticini', 717, 0.9, 0.1, 81, ARRAY['burro','butter']),
('Panna', 'latticini', 337, 2, 3, 35, ARRAY['panna','cream','panna da cucina']),
('Formaggio spalmabile', 'latticini', 342, 6, 4, 34, ARRAY['formaggio spalmabile','philadelphia','cream cheese']),
('Pecorino', 'latticini', 387, 26, 0.5, 32, ARRAY['pecorino']),
('Fontina', 'latticini', 343, 25, 0.8, 27, ARRAY['fontina']),

-- CEREALI E PASTA (15)
('Pasta di semola', 'cereali', 353, 13, 71, 1.5, ARRAY['pasta','spaghetti','penne','fusilli','rigatoni','maccheroni']),
('Pasta integrale', 'cereali', 348, 14, 66, 2.5, ARRAY['pasta integrale','whole wheat pasta']),
('Riso bianco', 'cereali', 365, 7, 80, 0.6, ARRAY['riso','riso bianco','white rice','rice']),
('Riso integrale', 'cereali', 370, 7.5, 77, 2.7, ARRAY['riso integrale','brown rice']),
('Pane bianco', 'cereali', 265, 9, 49, 3.2, ARRAY['pane','pane bianco','bread']),
('Pane integrale', 'cereali', 247, 13, 41, 3.4, ARRAY['pane integrale','whole wheat bread']),
('Avena', 'cereali', 389, 17, 66, 7, ARRAY['avena','oats','fiocchi avena','oatmeal']),
('Farro', 'cereali', 335, 15, 67, 2.5, ARRAY['farro','spelt']),
('Orzo', 'cereali', 354, 12, 73, 2.3, ARRAY['orzo','barley']),
('Couscous', 'cereali', 376, 13, 77, 0.6, ARRAY['couscous','cous cous']),
('Quinoa', 'cereali', 368, 14, 64, 6, ARRAY['quinoa']),
('Crackers', 'cereali', 440, 10, 68, 14, ARRAY['crackers','cracker']),
('Fette biscottate', 'cereali', 408, 11, 75, 6, ARRAY['fette biscottate','rusks']),
('Cornflakes', 'cereali', 378, 7, 84, 1, ARRAY['cornflakes','cereali colazione']),
('Gallette riso', 'cereali', 387, 8, 81, 3, ARRAY['gallette','gallette di riso','rice cakes']),

-- LEGUMI (8)
('Ceci', 'legumi', 364, 19, 61, 6, ARRAY['ceci','chickpeas']),
('Lenticchie', 'legumi', 352, 25, 60, 1, ARRAY['lenticchie','lentils']),
('Fagioli borlotti', 'legumi', 335, 23, 60, 1.5, ARRAY['fagioli','fagioli borlotti','beans']),
('Fagioli cannellini', 'legumi', 333, 23, 60, 1, ARRAY['fagioli cannellini','white beans']),
('Piselli secchi', 'legumi', 340, 22, 60, 1.2, ARRAY['piselli secchi']),
('Fave', 'legumi', 341, 26, 58, 1.5, ARRAY['fave','fava beans']),
('Soia', 'legumi', 446, 36, 30, 20, ARRAY['soia','edamame','soy']),
('Tofu', 'legumi', 76, 8, 1.9, 4.8, ARRAY['tofu']),

-- UOVA (3)
('Uovo intero', 'uova', 155, 13, 1.1, 11, ARRAY['uovo','uova','egg','eggs']),
('Albume', 'uova', 52, 11, 0.7, 0.2, ARRAY['albume','albumi','egg white']),
('Tuorlo', 'uova', 322, 16, 3.6, 27, ARRAY['tuorlo','tuorli','egg yolk']),

-- CONDIMENTI E OLI (10)
('Olio extravergine', 'condimenti', 884, 0, 0, 100, ARRAY['olio','olio extravergine','olive oil','evo']),
('Olio di semi', 'condimenti', 884, 0, 0, 100, ARRAY['olio di semi','seed oil']),
('Aceto balsamico', 'condimenti', 88, 0.5, 17, 0, ARRAY['aceto balsamico','balsamic vinegar']),
('Salsa di soia', 'condimenti', 53, 8, 5, 0, ARRAY['salsa di soia','soy sauce']),
('Maionese', 'condimenti', 680, 1, 1, 75, ARRAY['maionese','mayo','mayonnaise']),
('Ketchup', 'condimenti', 112, 1.7, 26, 0.1, ARRAY['ketchup']),
('Miele', 'condimenti', 304, 0.3, 82, 0, ARRAY['miele','honey']),
('Zucchero', 'condimenti', 400, 0, 100, 0, ARRAY['zucchero','sugar']),
('Sale', 'condimenti', 0, 0, 0, 0, ARRAY['sale','salt']),
('Pesto alla genovese', 'condimenti', 383, 4, 4, 39, ARRAY['pesto','pesto genovese']),

-- FRUTTA SECCA E SNACK (8)
('Mandorle', 'frutta_secca', 579, 21, 22, 50, ARRAY['mandorle','almonds']),
('Noci', 'frutta_secca', 654, 15, 14, 65, ARRAY['noci','walnuts']),
('Nocciole', 'frutta_secca', 628, 15, 17, 61, ARRAY['nocciole','hazelnuts']),
('Arachidi', 'frutta_secca', 567, 26, 16, 49, ARRAY['arachidi','peanuts']),
('Pistacchi', 'frutta_secca', 562, 20, 28, 45, ARRAY['pistacchi','pistachios']),
('Cioccolato fondente', 'frutta_secca', 546, 5, 60, 31, ARRAY['cioccolato','cioccolato fondente','dark chocolate']),
('Cocco', 'frutta_secca', 354, 3, 15, 33, ARRAY['cocco','coconut']),
('Semi di chia', 'frutta_secca', 486, 17, 42, 31, ARRAY['chia','semi di chia','chia seeds']),

-- BEVANDE (5)
('Succo arancia', 'bevande', 45, 0.7, 10, 0.2, ARRAY['succo','succo arancia','orange juice']),
('Birra', 'bevande', 43, 0.5, 3.6, 0, ARRAY['birra','beer']),
('Vino rosso', 'bevande', 85, 0.1, 2.6, 0, ARRAY['vino','vino rosso','red wine']),
('Coca Cola', 'bevande', 42, 0, 11, 0, ARRAY['coca cola','cola','soft drink']),
('Caffè', 'bevande', 2, 0.1, 0, 0, ARRAY['caffè','caffe','coffee','espresso'])
ON CONFLICT DO NOTHING;
