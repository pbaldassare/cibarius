
-- UPDATE existing ingredients with realistic default portions
-- OLI E GRASSI (1 cucchiaio = ~10g)
UPDATE public.ingredients SET default_portion_g = 10, default_portion_label = '1 cucchiaio' WHERE name IN ('olio di oliva', 'olio extra vergine di oliva', 'olio di semi di girasole', 'olio di semi di lino', 'olio di cocco', 'olio di sesamo');
UPDATE public.ingredients SET default_portion_g = 10, default_portion_label = '1 noce' WHERE name IN ('burro', 'burro chiarificato', 'margarina');
UPDATE public.ingredients SET default_portion_g = 15, default_portion_label = '1 cucchiaio' WHERE name IN ('maionese', 'maionese light', 'ketchup', 'senape', 'senape di Digione', 'salsa barbecue', 'salsa teriyaki', 'salsa worcestershire', 'tabasco', 'sriracha', 'pesto', 'pesto alla genovese', 'pesto rosso', 'salsa di soia', 'tahina', 'aceto', 'aceto balsamico', 'aceto di mele', 'aceto di riso', 'aceto di vino bianco', 'concentrato di pomodoro');

-- LATTICINI porzioni standard
UPDATE public.ingredients SET default_portion_g = 125, default_portion_label = '1 vasetto' WHERE name IN ('yogurt bianco intero', 'yogurt bianco magro', 'yogurt alla frutta', 'yogurt greco', 'skyr');
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 bicchiere' WHERE name IN ('latte intero', 'latte parzialmente scremato', 'latte scremato', 'latte senza lattosio', 'latte di mandorla', 'latte di soia', 'latte di avena', 'latte di cocco', 'latte di riso', 'bevanda di soia');
UPDATE public.ingredients SET default_portion_g = 125, default_portion_label = '1 mozzarella' WHERE name IN ('mozzarella', 'mozzarella di bufala', 'mozzarella light', 'mozzarella per pizza');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '100 g' WHERE name IN ('ricotta vaccina', 'ricotta di bufala', 'ricotta salata');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 fetta' WHERE name IN ('Parmigiano Reggiano', 'pecorino', 'pecorino romano', 'pecorino sardo', 'grana padano', 'emmental', 'asiago', 'fontina', 'provolone dolce', 'provolone piccante', 'cheddar', 'caciocavallo');
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '1 porzione' WHERE name IN ('gorgonzola dolce', 'gorgonzola piccante', 'brie', 'robiola', 'squacquerone', 'stracchino', 'crescenza', 'caprino', 'primo sale', 'feta');
UPDATE public.ingredients SET default_portion_g = 25, default_portion_label = '1 cucchiaio' WHERE name IN ('mascarpone', 'Philadelphia', 'formaggio spalmabile', 'formaggio spalmabile light', 'crema di nocciole', 'nutella', 'burro di arachidi', 'crema di mandorle', 'confettura', 'marmellata', 'marmellata senza zucchero');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 cucchiaio' WHERE name IN ('panna da cucina', 'panna fresca', 'panna montata');
UPDATE public.ingredients SET default_portion_g = 20, default_portion_label = '1 fettina' WHERE name IN ('sottilette');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '100 g' WHERE name IN ('fiocchi di latte', 'burrata');

-- UOVA
UPDATE public.ingredients SET default_portion_g = 60, default_portion_label = '1 uovo' WHERE name IN ('uovo', 'uovo intero', 'uovo sodo', 'uovo in camicia', 'uovo fritto');
UPDATE public.ingredients SET default_portion_g = 33, default_portion_label = '1 albume' WHERE name = 'albume';
UPDATE public.ingredients SET default_portion_g = 120, default_portion_label = '2 uova' WHERE name IN ('uovo strapazzato', 'frittata');

-- PANE porzioni standard (1 fetta o 1 panino)
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '1 fetta' WHERE name LIKE 'pane %';
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 porzione' WHERE name IN ('focaccia', 'focaccia genovese', 'ciabatta', 'base pizza');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 piadina' WHERE name IN ('piadina', 'piadina romagnola', 'tortilla');
UPDATE public.ingredients SET default_portion_g = 25, default_portion_label = '3 fette' WHERE name IN ('pane carasau');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '3 grissini' WHERE name = 'grissini';
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '5 taralli' WHERE name = 'taralli';
UPDATE public.ingredients SET default_portion_g = 25, default_portion_label = '5 cracker' WHERE name IN ('cracker', 'crackers integrali');
UPDATE public.ingredients SET default_portion_g = 25, default_portion_label = '3 fette biscottate' WHERE name = 'fette biscottate';
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 cucchiaio' WHERE name = 'pangrattato';

-- PASTA e RISO (porzione standard 80g)
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 porzione' WHERE name IN ('pasta', 'pasta di semola', 'pasta integrale', 'pasta di farro', 'pasta di legumi', 'pasta all uovo', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'farfalle', 'orecchiette');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 porzione' WHERE name IN ('riso', 'riso basmati', 'riso integrale', 'riso venere', 'riso arborio', 'riso carnaroli', 'riso parboiled', 'riso selvaggio');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 porzione' WHERE name IN ('cous cous', 'bulgur', 'quinoa', 'farro perlato', 'farro decorticato', 'orzo perlato', 'amaranto', 'kamut');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name IN ('gnocchi di patate', 'gnocchi alla romana');
UPDATE public.ingredients SET default_portion_g = 180, default_portion_label = '1 porzione' WHERE name IN ('pasta ripiena (tortellini)', 'pasta ripiena (ravioli)', 'tortellini');
UPDATE public.ingredients SET default_portion_g = 250, default_portion_label = '2 sfoglie' WHERE name = 'lasagne fresche sfoglia';
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '1 porzione' WHERE name IN ('polenta', 'polenta taragna', 'semolino');

-- CEREALI COLAZIONE
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 porzione' WHERE name IN ('corn flakes', 'cereali integrali', 'fiocchi di avena', 'avena', 'muesli con frutta', 'granola', 'crusca di frumento');

-- LEGUMI SECCHI (porzione 60-70g secchi)
UPDATE public.ingredients SET default_portion_g = 70, default_portion_label = '1 porzione secchi' WHERE name IN ('fagioli', 'fagioli borlotti', 'fagioli cannellini', 'fagioli bianchi di spagna', 'fagioli neri', 'fagioli rossi', 'fagioli dall''occhio', 'ceci', 'lenticchie', 'lenticchie rosse', 'cicerchie', 'azuki', 'soia', 'fave secche', 'piselli secchi');
-- LEGUMI IN SCATOLA / COTTI (porzione 150g)
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name LIKE '%in scatola' AND category = 'legumi';
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name LIKE '%cotti' AND category = 'legumi';
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 porzione' WHERE name IN ('edamame', 'fave fresche', 'piselli');

-- CARNE porzioni standard
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name IN ('petto di pollo', 'petto di tacchino', 'fesa di tacchino', 'petto di pollo a fette', 'filetto di manzo', 'controfiletto', 'fesa di vitello', 'tagliata di manzo', 'bistecca', 'costata di manzo', 'carpaccio di vitello', 'carpaccio di manzo');
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 porzione' WHERE name IN ('sovracoscia di pollo', 'coscia di pollo', 'cosce di pollo', 'ali di pollo');
UPDATE public.ingredients SET default_portion_g = 125, default_portion_label = '1 hamburger' WHERE name IN ('hamburger di manzo', 'hamburger di pollo', 'hamburger di tacchino', 'burger vegetale');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 porzione' WHERE name IN ('macinato di manzo', 'macinato magro', 'macinato di vitello', 'macinato di maiale', 'macinato misto');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 salsiccia' WHERE name IN ('salsiccia', 'salsiccia fresca', 'salsiccia di pollo', 'salsiccia di tacchino', 'luganega');
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '1 wurstel' WHERE name IN ('wurstel', 'wurstel di pollo');
UPDATE public.ingredients SET default_portion_g = 120, default_portion_label = '1 fetta' WHERE name IN ('fegato di vitello', 'fegato di pollo');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name IN ('coniglio', 'agnello', 'anatra', 'cavallo', 'arista di maiale', 'stinco di maiale', 'ossobuco', 'spezzatino di manzo', 'spezzatino di vitello', 'straccetti di manzo', 'trippa', 'cotechino', 'cotechino cotto');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '2 polpette' WHERE name IN ('polpette di carne');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 fetta' WHERE name = 'polpettone';
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 cotoletta' WHERE name = 'cotoletta';

-- SALUMI (porzione 30-50g)
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '2 fette' WHERE name IN ('prosciutto crudo', 'prosciutto cotto', 'bresaola', 'speck', 'coppa', 'capocollo', 'culatello', 'roast beef', 'fesa di tacchino affettata', 'petto di pollo affettato', 'arrosto di tacchino');
UPDATE public.ingredients SET default_portion_g = 25, default_portion_label = '3 fette' WHERE name IN ('salame', 'salame milano', 'salame napoli', 'salame ungherese', 'salame piccante', 'soppressa veneta', 'mortadella');
UPDATE public.ingredients SET default_portion_g = 10, default_portion_label = '1 cucchiaino' WHERE name IN ('nduja');
UPDATE public.ingredients SET default_portion_g = 20, default_portion_label = '1 fettina' WHERE name IN ('guanciale', 'lardo', 'pancetta');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 porzione' WHERE name = 'porchetta';

-- PESCE porzioni standard
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 filetto' WHERE name IN ('salmone', 'salmone fresco', 'salmone affumicato', 'tonno fresco', 'merluzzo', 'merluzzo surgelato', 'filetto di merluzzo', 'nasello', 'orata', 'branzino', 'spigola', 'pesce spada', 'trota', 'trota salmonata', 'sogliola', 'rombo', 'platessa', 'halibut', 'rana pescatrice', 'coda di rospo', 'dentice', 'cernia');
UPDATE public.ingredients SET default_portion_g = 52, default_portion_label = '1 scatoletta sgocciolata' WHERE name IN ('tonno', 'tonno in scatola', 'tonno sott olio sgocciolato', 'tonno al naturale');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 scatoletta' WHERE name IN ('sardine in scatola', 'sgombro in scatola');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name IN ('sardine', 'sgombro', 'calamari', 'calamari fritti', 'polpo', 'seppia', 'vongole', 'cozze', 'gamberi', 'gamberi sgusciati', 'gamberi surgelati', 'mazzancolle', 'scampi', 'capesante', 'aragosta', 'insalata di mare', 'baccalà', 'baccalà dissalato', 'baccalà mantecato', 'bastoncini di pesce');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '2 fette' WHERE name IN ('salmone affumicato');
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '1 stick' WHERE name = 'surimi';
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '8 pezzi' WHERE name = 'sushi misto';
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '5 fette' WHERE name = 'sashimi salmone';

-- FRUTTA (1 frutto medio)
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 frutto' WHERE name IN ('mela', 'mela golden', 'mela fuji', 'mela granny smith', 'mela annurca', 'pera', 'pera williams', 'pera abate', 'arancia', 'arancia rossa', 'pesca', 'pesca noce', 'pompelmo', 'pompelmo rosa');
UPDATE public.ingredients SET default_portion_g = 120, default_portion_label = '1 banana' WHERE name IN ('banana', 'banana matura');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 kiwi' WHERE name = 'kiwi';
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 fetta' WHERE name IN ('anguria', 'melone cantalupo', 'melone invernale');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 coppetta' WHERE name IN ('fragole', 'lamponi', 'more', 'mirtilli', 'ribes rosso', 'ribes nero', 'uva spina', 'ciliegie', 'uva bianca', 'uva nera');
UPDATE public.ingredients SET default_portion_g = 60, default_portion_label = '2 frutti' WHERE name IN ('albicocca', 'prugne', 'nespole', 'clementine', 'mandarino', 'cachi', 'fichi');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 fetta' WHERE name IN ('ananas', 'papaya', 'mango');
UPDATE public.ingredients SET default_portion_g = 70, default_portion_label = '½ frutto' WHERE name = 'avocado';
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 manciata' WHERE name IN ('uva passa', 'uva sultanina', 'datteri', 'albicocche secche', 'prugne secche', 'fichi secchi', 'bacche di goji', 'cranberry essiccate');
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '½ frutto' WHERE name IN ('cocco fresco');

-- FRUTTA SECCA (porzione 20-30g)
UPDATE public.ingredients SET default_portion_g = 20, default_portion_label = '1 manciata' WHERE name IN ('mandorle', 'noci', 'nocciole', 'anacardi', 'pistacchi', 'arachidi', 'noci pecan', 'noci macadamia', 'noci brasiliane', 'pinoli', 'castagne');

-- SEMI (1 cucchiaio ~10g)
UPDATE public.ingredients SET default_portion_g = 10, default_portion_label = '1 cucchiaio' WHERE name IN ('semi di chia', 'semi di lino', 'semi di canapa', 'semi di girasole', 'semi di zucca', 'semi di sesamo', 'semi di papavero');

-- SPEZIE E ERBE (1 cucchiaino ~3g)
UPDATE public.ingredients SET default_portion_g = 3, default_portion_label = '1 cucchiaino' WHERE name IN ('cannella', 'curcuma', 'curcuma in polvere', 'curry in polvere', 'zenzero', 'zenzero in polvere', 'paprika', 'pepe nero', 'pepe', 'peperoncino in polvere', 'origano', 'timo', 'rosmarino', 'salvia', 'basilico', 'prezzemolo', 'menta', 'coriandolo', 'cumino', 'cardamomo', 'chiodi di garofano', 'noce moscata', 'anice stellato', 'zafferano', 'alloro', 'erba cipollina', 'dragoncello', 'cacao amaro', 'cacao in polvere');
UPDATE public.ingredients SET default_portion_g = 5, default_portion_label = '1 cucchiaino' WHERE name IN ('sale', 'zucchero', 'zucchero di canna', 'miele', 'sciroppo d''acero', 'stevia', 'eritritolo');
UPDATE public.ingredients SET default_portion_g = 2, default_portion_label = '1 spicchio' WHERE name IN ('aglio', 'aglio fresco', 'aglio nero');
UPDATE public.ingredients SET default_portion_g = 5, default_portion_label = '1 cucchiaino' WHERE name = 'capperi';

-- VERDURE porzioni standard
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 porzione' WHERE name IN ('spinaci', 'bietola', 'broccoli', 'broccolini', 'cavolfiore', 'cavolo nero', 'cavolo cappuccio', 'cavolo verza', 'cavolo rosso', 'cavolo cinese', 'cavoletti di Bruxelles', 'cime di rapa', 'asparagi', 'carciofi', 'carciofi romani', 'fagiolini', 'taccole', 'zucchine', 'melanzane');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 porzione' WHERE name IN ('pomodori', 'pomodoro', 'pomodorini ciliegino', 'pomodoro san marzano', 'peperoni', 'peperoni rossi', 'peperoni gialli', 'peperoni verdi', 'friggitelli', 'cetrioli', 'carote', 'finocchio', 'sedano');
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '1 porzione' WHERE name IN ('rucola', 'songino', 'valeriana', 'lattuga iceberg', 'lattuga romana', 'misticanza', 'radicchio rosso', 'radicchio variegato', 'scarola', 'indivia belga', 'cicoria', 'catalogna', 'crescione');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 cucchiaio' WHERE name IN ('cipolla', 'cipolla rossa', 'cipolla bianca', 'cipolla dorata', 'cipollotto', 'scalogno');
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 patata' WHERE name IN ('patata', 'patate', 'patata dolce');
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 porzione' WHERE name IN ('zucca', 'barbabietola', 'topinambur');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name IN ('funghi', 'funghi champignon', 'funghi porcini');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 pannocchia' WHERE name IN ('mais dolce');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '½ scatola' WHERE name IN ('mais in scatola');

-- CONDIMENTI PORZIONE
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 cucchiaio' WHERE name IN ('hummus', 'guacamole');
UPDATE public.ingredients SET default_portion_g = 50, default_portion_label = '2 cucchiai' WHERE name IN ('ragù alla bolognese', 'sugo al pomodoro', 'sugo all arrabbiata', 'passata di pomodoro', 'polpa di pomodoro', 'pomodori pelati', 'besciamella', 'bechamel', 'besciamella pronta');

-- DOLCI porzioni standard
UPDATE public.ingredients SET default_portion_g = 40, default_portion_label = '1 brioche' WHERE name IN ('brioche', 'cornetto');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 fetta' WHERE name IN ('tiramisù', 'panna cotta', 'torta di mele', 'torta margherita', 'torta della nonna', 'pastiera napoletana', 'cassata siciliana', 'crostata', 'colomba pasquale');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 fetta' WHERE name IN ('pandoro', 'panettone');
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 pallina' WHERE name IN ('gelato alla vaniglia', 'gelato al cioccolato', 'gelato alla frutta');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '3 biscotti' WHERE name IN ('biscotti', 'biscotti integrali', 'frollini', 'amaretti');
UPDATE public.ingredients SET default_portion_g = 80, default_portion_label = '1 porzione' WHERE name IN ('cannoli siciliani', 'cannolo siciliano', 'profiteroles', 'babà', 'sfogliatella', 'zeppole');
UPDATE public.ingredients SET default_portion_g = 35, default_portion_label = '1 porzione' WHERE name IN ('cioccolato', 'cioccolato fondente', 'cioccolato fondente 70%', 'cioccolato al latte', 'cioccolato bianco');

-- BEVANDE
UPDATE public.ingredients SET default_portion_g = 250, default_portion_label = '1 bicchiere' WHERE name IN ('succo di arancia', 'succo di mela', 'succo di pompelmo', 'succo ACE', 'limonata', 'the freddo', 'aranciata', 'gassosa', 'chinotto', 'cedrata', 'coca cola', 'coca cola zero', 'energy drink', 'acqua tonica');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 calice' WHERE name IN ('vino rosso', 'vino bianco', 'vino rosato', 'prosecco', 'spumante', 'spritz');
UPDATE public.ingredients SET default_portion_g = 330, default_portion_label = '1 lattina' WHERE name IN ('birra', 'birra chiara', 'birra artigianale');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 tazzina' WHERE name IN ('caffè', 'caffè macchiato');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 tazza' WHERE name IN ('cappuccino', 'cioccolata calda', 'the verde', 'tisana');
UPDATE public.ingredients SET default_portion_g = 40, default_portion_label = '1 shot' WHERE name IN ('grappa', 'limoncello', 'amaro');

-- PIATTI PRONTI (porzione piatto)
UPDATE public.ingredients SET default_portion_g = 300, default_portion_label = '1 piatto' WHERE name IN ('carbonara', 'amatriciana', 'cacio e pepe', 'pasta al pesto', 'pasta al pomodoro', 'pasta alla norma', 'pasta e fagioli', 'pasta e ceci', 'risotto ai funghi', 'risotto alla milanese', 'lasagna', 'lasagna bolognese');
UPDATE public.ingredients SET default_portion_g = 250, default_portion_label = '1 porzione' WHERE name IN ('minestrone', 'minestrone surgelato', 'zuppa di legumi', 'zuppa di lenticchie', 'vellutata di zucca', 'vellutata di funghi', 'crema di piselli');
UPDATE public.ingredients SET default_portion_g = 200, default_portion_label = '1 pizza (⅓)' WHERE name IN ('pizza margherita', 'pizza rossa', 'pizza bianca');
UPDATE public.ingredients SET default_portion_g = 150, default_portion_label = '1 porzione' WHERE name IN ('insalata caprese', 'insalata di riso', 'insalata di farro', 'insalata di pollo', 'insalata di tonno', 'poke bowl', 'bowl di quinoa', 'caponata', 'peperonata', 'verdure grigliate', 'parmigiana di melanzane', 'vitello tonnato');
UPDATE public.ingredients SET default_portion_g = 120, default_portion_label = '1 panino' WHERE name IN ('tramezzino', 'panino imbottito', 'toast', 'wrap', 'kebab');
UPDATE public.ingredients SET default_portion_g = 60, default_portion_label = '1 pezzo' WHERE name IN ('arancini', 'supplì', 'crocchette di patate', 'mozzarella in carrozza', 'calzone', 'bruschetta', 'crostini');

-- PROTEINE VEGETALI
UPDATE public.ingredients SET default_portion_g = 100, default_portion_label = '1 porzione' WHERE name IN ('tofu', 'tempeh', 'seitan');
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 misurino' WHERE name IN ('proteine whey', 'proteine in polvere', 'collagene in polvere');
UPDATE public.ingredients SET default_portion_g = 5, default_portion_label = '1 cucchiaino' WHERE name IN ('spirulina', 'chlorella', 'matcha', 'agar agar', 'psyllium');

-- FARINE (1 cucchiaio ~15g per ricette)
UPDATE public.ingredients SET default_portion_g = 15, default_portion_label = '1 cucchiaio' WHERE name IN ('farina 00', 'farina 0', 'farina integrale', 'farina di mandorle', 'farina di cocco', 'farina di ceci', 'farina di riso', 'farina di avena', 'amido di mais', 'amido di riso');

-- SNACK porzione tipica
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 manciata' WHERE name IN ('popcorn', 'nachos', 'patatine', 'barretta frutta secca');
UPDATE public.ingredients SET default_portion_g = 40, default_portion_label = '1 barretta' WHERE name = 'barretta proteica';
UPDATE public.ingredients SET default_portion_g = 30, default_portion_label = '1 merendina' WHERE name = 'merendine';
UPDATE public.ingredients SET default_portion_g = 25, default_portion_label = '2 wafer' WHERE name = 'wafer';

-- Now add NEW ingredients with portions
INSERT INTO public.ingredients (name, name_en, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, source, default_portion_g, default_portion_label)
VALUES
-- Verdure e ortaggi mancanti
('zucchine grigliate', 'grilled zucchini', 30, 1.5, 3, 1.5, 'verdure', 'crea', 150, '1 porzione'),
('melanzane grigliate', 'grilled eggplant', 35, 1, 3.5, 2, 'verdure', 'crea', 150, '1 porzione'),
('peperoni arrostiti', 'roasted peppers', 35, 1, 6, 1, 'verdure', 'crea', 100, '1 peperone'),
('carciofi sott''olio', 'artichokes in oil', 230, 2, 6, 22, 'verdure', 'crea', 30, '3 pezzi'),
('olive verdi', 'green olives', 145, 1, 1, 15, 'verdure', 'crea', 20, '5 olive'),
('olive nere', 'black olives', 115, 0.8, 6, 11, 'verdure', 'crea', 20, '5 olive'),
('olive taggiasche', 'taggiasca olives', 200, 1.5, 2, 21, 'verdure', 'crea', 15, '8 olive'),
('funghi champignon crudi', 'raw button mushrooms', 22, 3, 3.3, 0.3, 'verdure', 'crea', 100, '5 funghi'),
('funghi trifolati', 'sauteed mushrooms', 60, 2, 3, 4, 'verdure', 'crea', 100, '1 porzione'),
('funghi secchi porcini', 'dried porcini', 296, 30, 27, 5, 'verdure', 'crea', 10, '1 manciata'),
('pomodoro cuore di bue', 'beefsteak tomato', 18, 0.9, 3.5, 0.2, 'verdure', 'crea', 200, '1 pomodoro'),
('insalata mista', 'mixed salad', 15, 1.2, 2, 0.3, 'verdure', 'crea', 80, '1 ciotola'),
('purè di patate', 'mashed potatoes', 83, 2, 13, 2.5, 'verdure', 'crea', 200, '1 porzione'),
('patate al forno', 'roasted potatoes', 93, 2, 17, 2.5, 'verdure', 'crea', 200, '1 porzione'),
('patate fritte', 'french fries', 312, 3.4, 41, 15, 'verdure', 'crea', 150, '1 porzione'),
('patate lesse', 'boiled potatoes', 86, 1.7, 20, 0.1, 'verdure', 'crea', 200, '2 patate'),
('spinaci surgelati', 'frozen spinach', 23, 2.5, 2, 0.5, 'verdure', 'crea', 200, '1 porzione'),
('piselli surgelati', 'frozen peas', 81, 5, 14, 0.4, 'verdure', 'crea', 100, '1 porzione'),
('minestrone pronto', 'ready minestrone', 30, 1.5, 5, 0.5, 'verdure', 'crea', 300, '1 piatto'),
-- Frutta mancante
('cocco rapè', 'shredded coconut', 604, 6, 24, 55, 'frutta', 'crea', 10, '1 cucchiaio'),
('scorza di limone', 'lemon zest', 47, 1.5, 16, 0.3, 'frutta', 'crea', 3, '1 cucchiaino'),
('succo di limone', 'lemon juice', 22, 0.4, 6.9, 0.2, 'frutta', 'crea', 15, '1 cucchiaio'),
('macedonia', 'fruit salad', 40, 0.5, 10, 0.2, 'frutta', 'crea', 200, '1 coppetta'),
-- Pesce mancante
('acciughe sott''olio', 'anchovies in oil', 210, 25, 0, 12, 'pesce', 'crea', 15, '3 filetti'),
('bottarga', 'bottarga', 373, 36, 1, 25, 'pesce', 'crea', 10, '1 grattugiata'),
('stoccafisso', 'stockfish', 130, 29, 0, 0.9, 'pesce', 'crea', 150, '1 porzione'),
('pesce persico', 'perch', 91, 19, 0, 1.2, 'pesce', 'crea', 150, '1 filetto'),
('luccio', 'pike', 88, 19, 0, 0.7, 'pesce', 'crea', 150, '1 filetto'),
('salmone in crosta', 'salmon en croute', 230, 16, 12, 14, 'pesce', 'crea', 200, '1 porzione'),
('gambero rosso', 'red shrimp', 90, 18, 0, 1.5, 'pesce', 'crea', 100, '6 gamberi'),
-- Carne mancante
('scaloppine di vitello', 'veal scaloppine', 120, 21, 2, 3, 'carne', 'crea', 150, '2 fettine'),
('involtini di carne', 'meat rolls', 200, 18, 4, 12, 'carne', 'crea', 150, '2 involtini'),
('arrosto di vitello', 'veal roast', 150, 22, 0, 7, 'carne', 'crea', 150, '2 fette'),
('arrosto di maiale', 'pork roast', 200, 22, 0, 12, 'carne', 'crea', 150, '2 fette'),
('bollito misto', 'mixed boiled meats', 220, 22, 0, 14, 'carne', 'crea', 200, '1 porzione'),
('pollo arrosto', 'roast chicken', 190, 25, 0, 10, 'carne', 'crea', 200, '1 coscia'),
('pollo alla griglia', 'grilled chicken', 150, 27, 0, 4, 'carne', 'crea', 150, '1 petto'),
('tacchino arrosto', 'roast turkey', 135, 28, 0, 2.5, 'carne', 'crea', 150, '3 fette'),
('spiedini di carne', 'meat skewers', 180, 20, 2, 10, 'carne', 'crea', 150, '2 spiedini'),
('ragù di cinghiale', 'wild boar ragu', 110, 9, 3, 7, 'carne', 'crea', 80, '2 cucchiai'),
-- Piatti pronti e street food
('arancino al ragù', 'ragu arancino', 210, 6, 28, 8, 'altro', 'crea', 150, '1 arancino'),
('panzerotto', 'panzerotto', 280, 8, 30, 14, 'altro', 'crea', 120, '1 panzerotto'),
('focaccia ripiena', 'stuffed focaccia', 310, 10, 35, 15, 'altro', 'crea', 150, '1 porzione'),
('panzanella', 'panzanella', 120, 3, 15, 5, 'altro', 'crea', 200, '1 porzione'),
('ribollita', 'ribollita', 65, 3, 10, 1.5, 'altro', 'crea', 300, '1 piatto'),
('acquacotta', 'acquacotta', 55, 3, 8, 1, 'altro', 'crea', 300, '1 piatto'),
('fregola sarda', 'fregola sarda', 350, 12, 72, 1.5, 'pasta_riso_pane', 'crea', 80, '1 porzione'),
('passatelli', 'passatelli', 285, 14, 30, 13, 'pasta_riso_pane', 'crea', 200, '1 porzione'),
('canederli', 'canederli', 180, 8, 22, 7, 'altro', 'crea', 200, '3 canederli'),
('pizzoccheri', 'pizzoccheri', 160, 6, 18, 7, 'altro', 'crea', 300, '1 piatto'),
('orecchiette alle cime di rapa', 'orecchiette with turnip tops', 150, 5, 22, 5, 'altro', 'crea', 300, '1 piatto'),
('trofie al pesto', 'trofie with pesto', 190, 6, 26, 7, 'altro', 'crea', 300, '1 piatto'),
('spaghetti alle vongole', 'spaghetti with clams', 140, 7, 20, 4, 'altro', 'crea', 300, '1 piatto'),
('penne all''arrabbiata', 'penne arrabbiata', 145, 5, 24, 3, 'altro', 'crea', 300, '1 piatto'),
('rigatoni alla gricia', 'rigatoni alla gricia', 200, 8, 22, 9, 'altro', 'crea', 300, '1 piatto'),
('tortellini in brodo', 'tortellini in broth', 100, 5, 12, 3.5, 'altro', 'crea', 350, '1 piatto'),
('cappelletti in brodo', 'cappelletti in broth', 95, 5, 11, 3, 'altro', 'crea', 350, '1 piatto'),
('gnocchi al pomodoro', 'gnocchi with tomato', 100, 3, 18, 2, 'altro', 'crea', 300, '1 piatto'),
('gnocchi al pesto', 'gnocchi with pesto', 140, 4, 18, 6, 'altro', 'crea', 300, '1 piatto'),
('polenta e salsiccia', 'polenta with sausage', 170, 8, 16, 8, 'altro', 'crea', 300, '1 piatto'),
('polenta e funghi', 'polenta with mushrooms', 90, 3, 15, 2, 'altro', 'crea', 300, '1 piatto'),
-- Dolci mancanti
('crostata alla marmellata', 'jam tart', 350, 5, 55, 13, 'dolci_snack', 'crea', 80, '1 fetta'),
('torta al cioccolato', 'chocolate cake', 380, 5, 50, 18, 'dolci_snack', 'crea', 80, '1 fetta'),
('cheesecake', 'cheesecake', 321, 6, 26, 22, 'dolci_snack', 'crea', 100, '1 fetta'),
('torta caprese', 'caprese cake', 350, 7, 35, 20, 'dolci_snack', 'crea', 80, '1 fetta'),
('sbrisolona', 'sbrisolona', 430, 7, 55, 20, 'dolci_snack', 'crea', 60, '1 fetta'),
('torta paradiso', 'paradise cake', 380, 6, 50, 17, 'dolci_snack', 'crea', 80, '1 fetta'),
('semifreddo', 'semifreddo', 280, 4, 30, 16, 'dolci_snack', 'crea', 100, '1 fetta'),
('sorbetto al limone', 'lemon sorbet', 120, 0.3, 30, 0, 'dolci_snack', 'crea', 100, '2 palline'),
('zabaione', 'zabaglione', 190, 5, 18, 11, 'dolci_snack', 'crea', 80, '1 coppetta'),
('bignè', 'cream puff', 260, 5, 25, 16, 'dolci_snack', 'crea', 60, '1 bignè'),
('maritozzo con panna', 'maritozzo with cream', 300, 6, 35, 15, 'dolci_snack', 'crea', 100, '1 maritozzo'),
('pasticciotto leccese', 'pasticciotto', 320, 6, 38, 16, 'dolci_snack', 'crea', 100, '1 pasticciotto'),
('ciambellone', 'ring cake', 350, 6, 50, 14, 'dolci_snack', 'crea', 80, '1 fetta'),
('plumcake', 'plum cake', 370, 5, 48, 18, 'dolci_snack', 'crea', 50, '1 fetta'),
('pancake', 'pancake', 227, 7, 28, 10, 'dolci_snack', 'crea', 60, '1 pancake'),
('waffle', 'waffle', 291, 8, 33, 14, 'dolci_snack', 'crea', 75, '1 waffle'),
('crepe', 'crepe', 112, 4, 16, 3.5, 'dolci_snack', 'crea', 50, '1 crepe'),
('crepe alla nutella', 'nutella crepe', 220, 4, 30, 10, 'dolci_snack', 'crea', 80, '1 crepe'),
('french toast', 'french toast', 230, 8, 28, 10, 'dolci_snack', 'crea', 70, '1 fetta'),
('porridge', 'porridge', 68, 2.4, 12, 1.5, 'cereali', 'crea', 250, '1 ciotola'),
('overnight oats', 'overnight oats', 150, 6, 22, 4, 'cereali', 'crea', 200, '1 vasetto'),
-- Condimenti e altro mancanti
('dado vegetale', 'vegetable bouillon cube', 220, 5, 20, 13, 'condimenti', 'crea', 4, '½ dado'),
('lievito di birra', 'brewer yeast', 105, 16, 10, 2, 'condimenti', 'crea', 7, '1 panetto (¼)'),
('lievito per dolci', 'baking powder', 53, 0, 28, 0, 'condimenti', 'crea', 8, '1 bustina (½)'),
('estratto di vaniglia', 'vanilla extract', 288, 0, 13, 0, 'condimenti', 'crea', 5, '1 cucchiaino'),
('gelatina in fogli', 'gelatin sheets', 335, 86, 0, 0, 'condimenti', 'crea', 5, '2 fogli'),
('salsa tonnata', 'tuna sauce', 250, 10, 2, 23, 'condimenti', 'crea', 30, '2 cucchiai'),
('crema al pistacchio', 'pistachio cream', 560, 14, 28, 45, 'condimenti', 'crea', 20, '1 cucchiaio'),
('miele di acacia', 'acacia honey', 304, 0.3, 76, 0, 'condimenti', 'crea', 10, '1 cucchiaino'),
('miele millefiori', 'wildflower honey', 304, 0.3, 76, 0, 'condimenti', 'crea', 10, '1 cucchiaino'),
('sciroppo d''agave', 'agave syrup', 310, 0, 76, 0, 'condimenti', 'crea', 10, '1 cucchiaino'),
('salsa verde', 'green sauce', 200, 2, 3, 20, 'condimenti', 'crea', 15, '1 cucchiaio'),
('bagna cauda', 'bagna cauda', 260, 5, 2, 26, 'condimenti', 'crea', 30, '1 porzione'),
-- Bevande mancanti
('latte di nocciola', 'hazelnut milk', 29, 0.4, 3.5, 1.6, 'bevande', 'crea', 200, '1 bicchiere'),
('kombucha', 'kombucha', 17, 0, 4, 0, 'bevande', 'crea', 250, '1 bicchiere'),
('smoothie frutta', 'fruit smoothie', 60, 1, 14, 0.3, 'bevande', 'crea', 250, '1 bicchiere'),
('centrifuga di verdure', 'vegetable juice', 25, 1, 5, 0.2, 'bevande', 'crea', 250, '1 bicchiere'),
('spremuta di arancia', 'fresh orange juice', 45, 0.7, 10, 0.2, 'bevande', 'crea', 200, '1 bicchiere'),
('caffè lungo', 'americano coffee', 2, 0.1, 0, 0, 'bevande', 'crea', 120, '1 tazza'),
('caffè d''orzo', 'barley coffee', 10, 0.3, 2, 0, 'bevande', 'crea', 150, '1 tazza'),
('latte macchiato', 'latte macchiato', 50, 3, 5, 2, 'bevande', 'crea', 200, '1 bicchiere'),
('frappuccino', 'frappuccino', 120, 2, 22, 3, 'bevande', 'crea', 300, '1 bicchiere')
ON CONFLICT (name) DO NOTHING;
