import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to build ingredient
const ing = (name: string, grams: number, kcal: number, protein_g: number, carbs_g: number, fats_g: number) =>
  ({ name, grams, kcal, protein_g, carbs_g, fats_g });

// Helper to build recipe
const r = (
  title: string, meal_type: string, diet_category: string,
  ingredients: any[], prep_time_min = 15
) => {
  const kcal_total = ingredients.reduce((s, i) => s + i.kcal, 0);
  const protein_total = ingredients.reduce((s, i) => s + i.protein_g, 0);
  const carbs_total = ingredients.reduce((s, i) => s + i.carbs_g, 0);
  const fats_total = ingredients.reduce((s, i) => s + i.fats_g, 0);
  return { title, meal_type, diet_category, ingredients, kcal_total, protein_total, carbs_total, fats_total, prep_time_min };
};

const recipes = [
  // ════════════════════════════════════════════
  // MEDITERRANEA - COLAZIONE (+14)
  // ════════════════════════════════════════════
  r("Fette biscottate con marmellata e latte","colazione","mediterranea",[ing("Fette biscottate",40,156,4,28,3),ing("Marmellata di albicocche",20,50,0,13,0),ing("Latte parzialmente scremato",200,92,6,10,3)],5),
  r("Cornetto integrale con cappuccino","colazione","mediterranea",[ing("Cornetto integrale",60,210,5,30,8),ing("Latte parzialmente scremato",150,69,5,7,2),ing("Caffè espresso",30,2,0,0,0)],5),
  r("Pancake proteici con mirtilli","colazione","mediterranea",[ing("Farina d'avena",50,185,7,30,4),ing("Albume d'uovo",100,52,11,1,0),ing("Mirtilli",80,46,1,11,0),ing("Miele",10,30,0,8,0)],15),
  r("Toast con avocado e pomodorini","colazione","mediterranea",[ing("Pane integrale",60,140,5,26,2),ing("Avocado",50,80,1,4,7),ing("Pomodorini",60,12,1,2,0)],5),
  r("Yogurt con granola e fragole","colazione","mediterranea",[ing("Yogurt bianco",150,92,6,7,4),ing("Granola",30,132,3,20,5),ing("Fragole",100,33,1,7,0)],5),
  r("Crêpes con ricotta e miele","colazione","mediterranea",[ing("Farina 00",40,140,4,28,1),ing("Uovo",30,43,4,0,3),ing("Ricotta vaccina",60,86,5,2,6),ing("Miele",15,45,0,12,0)],15),
  r("Pane e burro con spremuta d'arancia","colazione","mediterranea",[ing("Pane casereccio",60,160,5,32,1),ing("Burro",10,74,0,0,8),ing("Spremuta d'arancia",200,72,1,16,0)],5),
  r("Müsli con latte di mandorla e banana","colazione","mediterranea",[ing("Müsli",50,185,5,30,5),ing("Latte di mandorla",200,30,1,1,2),ing("Banana",80,72,1,16,0)],5),
  r("Frullato di pesca e yogurt","colazione","mediterranea",[ing("Pesca",150,59,1,14,0),ing("Yogurt greco",100,59,10,4,0),ing("Miele",10,30,0,8,0)],5),
  r("Brioche vuota con latte macchiato","colazione","mediterranea",[ing("Brioche",50,175,4,25,7),ing("Latte parzialmente scremato",150,69,5,7,2),ing("Caffè",30,2,0,0,0)],5),
  r("Gallette di riso con marmellata e tè","colazione","mediterranea",[ing("Gallette di riso",30,116,2,25,1),ing("Marmellata",25,63,0,16,0),ing("Tè verde",250,2,0,0,0)],5),
  r("Torta allo yogurt fatta in casa","colazione","mediterranea",[ing("Torta allo yogurt (fetta)",80,210,4,28,9),ing("Latte parzialmente scremato",150,69,5,7,2)],5),
  r("Biscotti secchi con latte caldo","colazione","mediterranea",[ing("Biscotti secchi",30,126,2,21,4),ing("Latte intero",200,128,6,10,7)],5),
  r("Ciambellone con succo di mela","colazione","mediterranea",[ing("Ciambellone (fetta)",70,215,3,30,9),ing("Succo di mela",200,92,0,23,0)],5),

  // MEDITERRANEA - PRANZO (+22)
  r("Pasta al pesto genovese","pranzo","mediterranea",[ing("Pasta di semola",80,284,10,56,2),ing("Pesto genovese",25,128,2,1,13),ing("Parmigiano",10,39,4,0,3)],20),
  r("Risotto ai funghi porcini","pranzo","mediterranea",[ing("Riso arborio",80,264,5,58,1),ing("Funghi porcini",100,26,3,1,0),ing("Parmigiano",15,59,5,0,4),ing("Olio EVO",5,45,0,0,5)],30),
  r("Pasta e fagioli","pranzo","mediterranea",[ing("Pasta mista",60,213,7,42,1),ing("Fagioli borlotti",80,104,7,15,1),ing("Pomodoro",50,9,0,2,0),ing("Olio EVO",8,72,0,0,8)],30),
  r("Insalata di farro con verdure grigliate","pranzo","mediterranea",[ing("Farro",80,272,10,54,2),ing("Zucchine grigliate",100,17,1,2,0),ing("Peperoni",80,17,1,3,0),ing("Feta",30,79,4,1,6)],25),
  r("Orecchiette con cime di rapa","pranzo","mediterranea",[ing("Orecchiette",80,284,10,56,2),ing("Cime di rapa",150,33,5,3,0),ing("Aglio",5,7,0,2,0),ing("Olio EVO",10,90,0,0,10)],25),
  r("Gnocchi al pomodoro e basilico","pranzo","mediterranea",[ing("Gnocchi di patate",180,281,6,58,2),ing("Salsa di pomodoro",80,26,1,5,0),ing("Parmigiano",10,39,4,0,3),ing("Basilico",3,1,0,0,0)],20),
  r("Insalata caprese con pane","pranzo","mediterranea",[ing("Mozzarella di bufala",125,303,22,1,23),ing("Pomodori",200,36,2,6,0),ing("Basilico",5,1,0,0,0),ing("Olio EVO",10,90,0,0,10),ing("Pane",40,107,3,21,1)],10),
  r("Spaghetti alle vongole","pranzo","mediterranea",[ing("Spaghetti",80,284,10,56,2),ing("Vongole",150,72,12,2,1),ing("Olio EVO",10,90,0,0,10),ing("Prezzemolo",5,2,0,0,0)],25),
  r("Minestrone con crostini","pranzo","mediterranea",[ing("Verdure miste",200,50,3,8,1),ing("Patate",50,39,1,8,0),ing("Fagioli",40,52,4,7,0),ing("Crostini",30,120,3,22,2),ing("Olio EVO",5,45,0,0,5)],35),
  r("Pasta alla norma","pranzo","mediterranea",[ing("Pasta",80,284,10,56,2),ing("Melanzane",120,29,1,5,0),ing("Pomodoro",100,18,1,3,0),ing("Ricotta salata",20,56,4,0,4),ing("Olio EVO",8,72,0,0,8)],25),
  r("Couscous con verdure e ceci","pranzo","mediterranea",[ing("Couscous",70,252,9,52,1),ing("Ceci",80,129,7,20,2),ing("Zucchine",80,13,1,2,0),ing("Carote",50,21,0,5,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Riso venere con gamberi e zucchine","pranzo","mediterranea",[ing("Riso venere",80,272,7,57,2),ing("Gamberi",120,106,24,0,1),ing("Zucchine",100,17,1,2,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Panzanella toscana","pranzo","mediterranea",[ing("Pane toscano raffermo",80,213,6,42,2),ing("Pomodori",150,27,1,5,0),ing("Cipolla rossa",30,12,0,3,0),ing("Cetriolo",80,13,1,2,0),ing("Olio EVO",12,108,0,0,12),ing("Basilico",5,1,0,0,0)],15),
  r("Pennette all'arrabbiata","pranzo","mediterranea",[ing("Penne rigate",80,284,10,56,2),ing("Pomodori pelati",100,18,1,3,0),ing("Peperoncino",2,5,0,1,0),ing("Olio EVO",10,90,0,0,10)],20),
  r("Frittata di zucchine con insalata","pranzo","mediterranea",[ing("Uova",120,172,15,1,12),ing("Zucchine",150,26,2,3,0),ing("Parmigiano",15,59,5,0,4),ing("Insalata mista",80,13,1,2,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Bruschetta con pomodori e tonno","pranzo","mediterranea",[ing("Pane casereccio",80,213,6,42,2),ing("Tonno al naturale",80,89,20,0,1),ing("Pomodorini",100,18,1,3,0),ing("Olio EVO",8,72,0,0,8)],10),
  r("Pasta con le sarde","pranzo","mediterranea",[ing("Bucatini",80,284,10,56,2),ing("Sarde fresche",100,135,20,0,6),ing("Finocchietto",20,6,0,1,0),ing("Pinoli",10,67,1,1,7),ing("Olio EVO",8,72,0,0,8)],30),
  r("Zuppa di lenticchie","pranzo","mediterranea",[ing("Lenticchie",80,228,18,33,1),ing("Carote",50,21,0,5,0),ing("Sedano",30,5,0,1,0),ing("Pomodoro",50,9,0,2,0),ing("Olio EVO",10,90,0,0,10),ing("Pane",40,107,3,21,1)],35),
  r("Tortellini in brodo","pranzo","mediterranea",[ing("Tortellini",120,312,14,38,12),ing("Brodo di carne",300,30,3,1,1),ing("Parmigiano",10,39,4,0,3)],25),
  r("Lasagne al ragù (porzione)","pranzo","mediterranea",[ing("Lasagna al ragù",200,380,18,32,20)],60),
  r("Trofie al pesto con fagiolini","pranzo","mediterranea",[ing("Trofie",80,284,10,56,2),ing("Pesto",20,102,2,1,10),ing("Fagiolini",80,25,2,4,0),ing("Patate",50,39,1,8,0)],25),
  r("Polpo con patate","pranzo","mediterranea",[ing("Polpo",150,124,24,0,2),ing("Patate",150,117,3,24,0),ing("Olio EVO",10,90,0,0,10),ing("Prezzemolo",5,2,0,0,0)],40),

  // MEDITERRANEA - CENA (+22)
  r("Petto di pollo alla griglia con verdure","cena","mediterranea",[ing("Petto di pollo",150,165,31,0,4),ing("Zucchine grigliate",100,17,1,2,0),ing("Pomodorini",80,14,1,2,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Branzino al forno con patate","cena","mediterranea",[ing("Branzino",180,175,32,0,5),ing("Patate",150,117,3,24,0),ing("Olio EVO",8,72,0,0,8),ing("Rosmarino",2,1,0,0,0)],35),
  r("Scaloppine al limone","cena","mediterranea",[ing("Vitello",150,165,30,0,5),ing("Limone",30,9,0,3,0),ing("Farina",10,34,1,7,0),ing("Olio EVO",10,90,0,0,10),ing("Insalata",80,13,1,2,0)],20),
  r("Pesce spada alla griglia","cena","mediterranea",[ing("Pesce spada",180,234,34,0,10),ing("Rucola",60,15,2,2,0),ing("Pomodorini",80,14,1,2,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Polpette al sugo con purè","cena","mediterranea",[ing("Polpette di manzo",120,228,20,6,14),ing("Salsa di pomodoro",80,26,1,5,0),ing("Purè di patate",120,106,2,16,4)],30),
  r("Frittata di cipolle con pane","cena","mediterranea",[ing("Uova",120,172,15,1,12),ing("Cipolle",100,40,1,9,0),ing("Pane integrale",40,93,3,18,1),ing("Olio EVO",5,45,0,0,5)],20),
  r("Merluzzo con olive e capperi","cena","mediterranea",[ing("Merluzzo",180,145,31,0,1),ing("Olive taggiasche",20,29,0,0,3),ing("Capperi",10,2,0,0,0),ing("Pomodorini",100,18,1,3,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Tagliata di manzo con rucola","cena","mediterranea",[ing("Controfiletto di manzo",150,225,30,0,11),ing("Rucola",60,15,2,2,0),ing("Parmigiano a scaglie",20,78,7,0,6),ing("Olio EVO",5,45,0,0,5)],15),
  r("Sogliola al burro con spinaci","cena","mediterranea",[ing("Sogliola",180,149,30,0,2),ing("Burro",10,74,0,0,8),ing("Spinaci",150,35,4,4,1)],20),
  r("Pollo al curry leggero","cena","mediterranea",[ing("Petto di pollo",150,165,31,0,4),ing("Yogurt greco",50,30,5,2,0),ing("Curry",5,16,1,3,0),ing("Riso basmati",60,198,4,44,0)],25),
  r("Involtini di melanzane con ricotta","cena","mediterranea",[ing("Melanzane",200,48,2,8,0),ing("Ricotta",100,144,8,3,10),ing("Pomodoro",80,14,1,3,0),ing("Parmigiano",15,59,5,0,4)],30),
  r("Orata al cartoccio","cena","mediterranea",[ing("Orata",200,194,36,0,5),ing("Pomodorini",80,14,1,2,0),ing("Olive",15,22,0,0,2),ing("Olio EVO",8,72,0,0,8)],30),
  r("Vellutata di zucca con crostini","cena","mediterranea",[ing("Zucca",250,58,3,11,0),ing("Patate",50,39,1,8,0),ing("Crostini",30,120,3,22,2),ing("Olio EVO",8,72,0,0,8),ing("Parmigiano",10,39,4,0,3)],30),
  r("Calamari ripieni al forno","cena","mediterranea",[ing("Calamari",180,147,29,2,2),ing("Pangrattato",20,72,3,14,1),ing("Prezzemolo",5,2,0,0,0),ing("Olio EVO",8,72,0,0,8)],35),
  r("Fesa di tacchino con funghi","cena","mediterranea",[ing("Fesa di tacchino",150,157,33,0,2),ing("Funghi champignon",120,26,4,1,0),ing("Olio EVO",8,72,0,0,8),ing("Insalata mista",80,13,1,2,0)],20),
  r("Cozze alla marinara con pane","cena","mediterranea",[ing("Cozze",300,198,27,6,5),ing("Pomodoro",100,18,1,3,0),ing("Pane",50,133,4,26,1),ing("Olio EVO",5,45,0,0,5)],25),
  r("Coniglio al forno con patate","cena","mediterranea",[ing("Coniglio",150,206,30,0,9),ing("Patate",120,94,2,19,0),ing("Rosmarino",3,1,0,0,0),ing("Olio EVO",8,72,0,0,8)],45),
  r("Salmone al forno con asparagi","cena","mediterranea",[ing("Salmone",150,280,30,0,17),ing("Asparagi",150,30,3,4,0),ing("Limone",20,6,0,2,0),ing("Olio EVO",5,45,0,0,5)],25),
  r("Spiedini di pollo e verdure","cena","mediterranea",[ing("Petto di pollo",140,154,29,0,4),ing("Peperoni",80,17,1,3,0),ing("Zucchine",80,13,1,2,0),ing("Cipolla",40,16,0,4,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Baccalà alla vicentina","cena","mediterranea",[ing("Baccalà",180,153,35,0,1),ing("Latte",100,46,3,5,2),ing("Cipolla",50,20,1,5,0),ing("Olio EVO",10,90,0,0,10)],40),
  r("Parmigiana di melanzane (porzione)","cena","mediterranea",[ing("Parmigiana",180,320,15,18,22)],60),
  r("Zuppa di pesce alla livornese","cena","mediterranea",[ing("Pesce misto",200,180,34,0,4),ing("Pomodoro",100,18,1,3,0),ing("Pane tostato",40,152,4,28,2),ing("Olio EVO",8,72,0,0,8)],35),

  // MEDITERRANEA - SPUNTINO (+14)
  r("Macedonia di frutta fresca","spuntino","mediterranea",[ing("Frutta mista",200,90,1,21,0),ing("Limone",10,3,0,1,0)],10),
  r("Bruschetta pomodoro e basilico","spuntino","mediterranea",[ing("Pane",40,107,3,21,1),ing("Pomodoro",80,14,1,3,0),ing("Olio EVO",5,45,0,0,5),ing("Basilico",3,1,0,0,0)],5),
  r("Yogurt con noci e miele","spuntino","mediterranea",[ing("Yogurt bianco",125,77,5,6,3),ing("Noci",15,98,2,1,10),ing("Miele",10,30,0,8,0)],5),
  r("Frutta secca mista","spuntino","mediterranea",[ing("Mandorle",15,86,3,1,8),ing("Noci",10,65,2,1,6),ing("Nocciole",10,63,1,1,6)],0),
  r("Crackers integrali con hummus","spuntino","mediterranea",[ing("Crackers integrali",30,120,3,20,3),ing("Hummus",40,66,3,6,4)],5),
  r("Banana con burro d'arachidi","spuntino","mediterranea",[ing("Banana",100,89,1,20,0),ing("Burro d'arachidi",15,88,4,2,8)],5),
  r("Pane e cioccolato fondente","spuntino","mediterranea",[ing("Pane",30,80,2,16,1),ing("Cioccolato fondente",15,79,1,5,6)],5),
  r("Centrifuga di carote e mela","spuntino","mediterranea",[ing("Carote",150,62,1,14,0),ing("Mela",100,52,0,12,0)],10),
  r("Fichi secchi e mandorle","spuntino","mediterranea",[ing("Fichi secchi",30,75,1,17,1),ing("Mandorle",15,86,3,1,8)],0),
  r("Grissini con prosciutto crudo","spuntino","mediterranea",[ing("Grissini",25,100,3,18,2),ing("Prosciutto crudo",20,47,5,0,3)],5),
  r("Mela cotta con cannella","spuntino","mediterranea",[ing("Mela",150,78,0,18,0),ing("Cannella",2,5,0,1,0),ing("Miele",10,30,0,8,0)],15),
  r("Toast con marmellata","spuntino","mediterranea",[ing("Pane in cassetta",25,65,2,12,1),ing("Marmellata",20,50,0,13,0)],5),
  r("Spremuta d'arancia con biscotto","spuntino","mediterranea",[ing("Spremuta",200,72,1,16,0),ing("Biscotto secco",15,63,1,10,2)],5),
  r("Gelato alla frutta (coppetta)","spuntino","mediterranea",[ing("Gelato alla frutta",80,128,1,20,5)],0),

  // ════════════════════════════════════════════
  // KETO - COLAZIONE (+6)
  // ════════════════════════════════════════════
  r("Uova al bacon con avocado","colazione","keto",[ing("Uova",120,172,15,1,12),ing("Bacon",30,140,4,0,14),ing("Avocado",60,96,1,5,8)],10),
  r("Frittata al formaggio e spinaci","colazione","keto",[ing("Uova",120,172,15,1,12),ing("Spinaci",60,14,2,2,0),ing("Formaggio cheddar",30,121,7,0,10),ing("Burro",8,59,0,0,7)],10),
  r("Pancake di cocco keto","colazione","keto",[ing("Farina di cocco",20,72,2,3,5),ing("Uova",60,86,8,0,6),ing("Burro",10,74,0,0,8),ing("Eritritolo",10,0,0,0,0)],15),
  r("Yogurt greco intero con semi di chia","colazione","keto",[ing("Yogurt greco intero",150,148,8,5,10),ing("Semi di chia",15,73,2,1,5),ing("Noci",10,65,2,1,6)],5),
  r("Omelette con salmone affumicato","colazione","keto",[ing("Uova",120,172,15,1,12),ing("Salmone affumicato",40,58,9,0,2),ing("Crema di formaggio",20,49,1,1,5),ing("Erba cipollina",5,2,0,0,0)],10),
  r("Budino di chia al cacao","colazione","keto",[ing("Semi di chia",25,122,4,2,8),ing("Latte di cocco",150,135,1,3,14),ing("Cacao amaro",10,23,2,2,1),ing("Eritritolo",10,0,0,0,0)],5),

  // KETO - PRANZO (+12)
  r("Insalata Caesar senza crostini","pranzo","keto",[ing("Pollo grigliato",150,165,31,0,4),ing("Lattuga romana",100,17,1,3,0),ing("Parmigiano",20,78,7,0,6),ing("Salsa Caesar",20,70,0,1,7)],15),
  r("Salmone con crema di avocado","pranzo","keto",[ing("Salmone",150,280,30,0,17),ing("Avocado",80,128,2,6,11),ing("Limone",15,5,0,1,0)],20),
  r("Hamburger senza pane con insalata","pranzo","keto",[ing("Hamburger di manzo",150,309,26,0,22),ing("Lattuga",80,12,1,2,0),ing("Formaggio",20,80,5,0,7),ing("Pomodoro",50,9,0,2,0)],15),
  r("Zucchine ripiene con carne e formaggio","pranzo","keto",[ing("Zucchine",200,34,2,4,0),ing("Carne macinata",100,206,17,0,15),ing("Mozzarella",40,100,7,0,8),ing("Parmigiano",10,39,4,0,3)],30),
  r("Tonno con insalata di avocado","pranzo","keto",[ing("Tonno al naturale",120,134,30,0,1),ing("Avocado",80,128,2,6,11),ing("Pomodorini",80,14,1,2,0),ing("Olio EVO",8,72,0,0,8)],10),
  r("Pollo al pesto con verdure","pranzo","keto",[ing("Petto di pollo",150,165,31,0,4),ing("Pesto",30,153,3,1,15),ing("Zucchine grigliate",100,17,1,2,0)],20),
  r("Uova alla fiorentina","pranzo","keto",[ing("Uova",120,172,15,1,12),ing("Spinaci",150,35,4,4,1),ing("Parmigiano",15,59,5,0,4),ing("Burro",10,74,0,0,8)],15),
  r("Carpaccio di manzo con rucola","pranzo","keto",[ing("Carpaccio di manzo",120,144,24,0,5),ing("Rucola",60,15,2,2,0),ing("Parmigiano",20,78,7,0,6),ing("Olio EVO",10,90,0,0,10)],5),
  r("Involtini di prosciutto e formaggio","pranzo","keto",[ing("Prosciutto crudo",80,188,20,0,12),ing("Formaggio spalmabile",40,99,2,2,10),ing("Rucola",40,10,1,1,0)],5),
  r("Cavolfiore gratinato","pranzo","keto",[ing("Cavolfiore",250,63,5,10,1),ing("Panna",30,97,1,1,10),ing("Parmigiano",20,78,7,0,6),ing("Burro",8,59,0,0,7)],25),
  r("Sgombro con insalata greca","pranzo","keto",[ing("Sgombro",150,305,27,0,21),ing("Cetriolo",80,13,1,2,0),ing("Pomodoro",80,14,1,3,0),ing("Feta",40,105,6,1,9),ing("Olive",15,22,0,0,2)],10),
  r("Tacchino con crema di funghi","pranzo","keto",[ing("Tacchino",150,157,33,0,2),ing("Funghi",120,26,4,1,0),ing("Panna",40,129,1,1,14),ing("Burro",5,37,0,0,4)],20),

  // KETO - CENA (+12)
  r("Filetto di salmone con burro alle erbe","cena","keto",[ing("Salmone",180,336,36,0,20),ing("Burro",15,111,0,0,12),ing("Erbe aromatiche",5,2,0,0,0)],20),
  r("Bistecca con burro e asparagi","cena","keto",[ing("Bistecca di manzo",180,342,36,0,21),ing("Burro",10,74,0,0,8),ing("Asparagi",150,30,3,4,0)],20),
  r("Pollo arrosto con broccoli","cena","keto",[ing("Coscia di pollo",180,290,25,0,20),ing("Broccoli",150,51,4,7,1),ing("Olio EVO",8,72,0,0,8)],35),
  r("Gamberoni all'aglio con spinaci","cena","keto",[ing("Gamberoni",200,177,40,0,2),ing("Spinaci",150,35,4,4,1),ing("Burro all'aglio",15,111,0,0,12)],15),
  r("Maiale con cavolo saltato","cena","keto",[ing("Braciola di maiale",150,264,27,0,17),ing("Cavolo",150,38,2,6,1),ing("Olio EVO",8,72,0,0,8)],25),
  r("Seppie con piselli (pochi)","cena","keto",[ing("Seppie",180,130,29,2,1),ing("Piselli",40,32,2,5,0),ing("Olio EVO",10,90,0,0,10),ing("Pomodoro",50,9,0,2,0)],30),
  r("Fettine di vitello con funghi","cena","keto",[ing("Vitello",150,165,30,0,5),ing("Funghi porcini",120,31,4,1,0),ing("Burro",10,74,0,0,8),ing("Prezzemolo",5,2,0,0,0)],20),
  r("Trota al forno con verdure","cena","keto",[ing("Trota",180,234,36,0,9),ing("Zucchine",100,17,1,2,0),ing("Pomodorini",80,14,1,2,0),ing("Olio EVO",8,72,0,0,8)],30),
  r("Petto d'anatra con insalata","cena","keto",[ing("Petto d'anatra",150,285,25,0,20),ing("Insalata mista",100,17,1,3,0),ing("Noci",10,65,2,1,6),ing("Olio EVO",5,45,0,0,5)],20),
  r("Cotoletta di pollo impanata keto","cena","keto",[ing("Petto di pollo",150,165,31,0,4),ing("Farina di mandorle",20,114,4,1,10),ing("Parmigiano",15,59,5,0,4),ing("Olio per frittura",15,135,0,0,15)],20),
  r("Tofu saltato con verdure","cena","keto",[ing("Tofu",150,108,12,2,6),ing("Peperoni",80,17,1,3,0),ing("Broccoli",100,34,3,5,0),ing("Olio di sesamo",10,90,0,0,10)],15),
  r("Stracotto con cavolfiore","cena","keto",[ing("Manzo per stracotto",150,255,30,0,14),ing("Cavolfiore",150,38,3,6,1),ing("Olio EVO",8,72,0,0,8)],60),

  // KETO - SPUNTINO (+6)
  r("Cubetti di formaggio e olive","spuntino","keto",[ing("Formaggio stagionato",30,118,8,0,9),ing("Olive",20,29,0,0,3)],0),
  r("Uovo sodo con maionese","spuntino","keto",[ing("Uova",60,86,8,0,6),ing("Maionese",10,68,0,0,7)],10),
  r("Sedano con crema di formaggio","spuntino","keto",[ing("Sedano",80,13,1,2,0),ing("Crema di formaggio",30,74,2,1,7)],5),
  r("Noci di macadamia","spuntino","keto",[ing("Noci di macadamia",25,180,2,1,19)],0),
  r("Involtini di salame e formaggio","spuntino","keto",[ing("Salame",20,80,3,0,7),ing("Formaggio spalmabile",20,49,1,1,5)],0),
  r("Cioccolato fondente 90%","spuntino","keto",[ing("Cioccolato fondente 90%",20,109,2,3,10)],0),

  // ════════════════════════════════════════════
  // DIMAGRIMENTO - COLAZIONE (+8)
  // ════════════════════════════════════════════
  r("Yogurt magro con frutti di bosco","colazione","dimagrimento",[ing("Yogurt magro",150,57,8,6,0),ing("Frutti di bosco",100,40,1,8,0)],5),
  r("Fette biscottate integrali con miele","colazione","dimagrimento",[ing("Fette biscottate integrali",30,105,3,20,2),ing("Miele",10,30,0,8,0),ing("Tè verde",250,2,0,0,0)],5),
  r("Porridge leggero con mela","colazione","dimagrimento",[ing("Fiocchi d'avena",30,111,4,18,2),ing("Acqua",200,0,0,0,0),ing("Mela grattugiata",100,52,0,12,0),ing("Cannella",2,5,0,1,0)],10),
  r("Smoothie verde detox","colazione","dimagrimento",[ing("Spinaci",50,12,2,2,0),ing("Banana",60,54,1,12,0),ing("Mela verde",80,42,0,10,0),ing("Acqua",150,0,0,0,0)],5),
  r("Albumi strapazzati con pomodoro","colazione","dimagrimento",[ing("Albumi",150,78,16,1,0),ing("Pomodoro",80,14,1,3,0),ing("Pane integrale",30,70,2,13,1)],10),
  r("Ricotta light con cetriolo","colazione","dimagrimento",[ing("Ricotta light",100,105,10,4,5),ing("Cetriolo",80,13,1,2,0),ing("Pane di segale",30,75,2,15,1)],5),
  r("Latte scremato con cereali integrali","colazione","dimagrimento",[ing("Latte scremato",200,66,7,10,0),ing("Cereali integrali",30,105,3,22,1)],5),
  r("Gallette con avocado light","colazione","dimagrimento",[ing("Gallette di riso",20,77,2,17,0),ing("Avocado",30,48,1,2,4),ing("Limone",10,3,0,1,0)],5),

  // DIMAGRIMENTO - PRANZO (+14)
  r("Insalata di pollo e verdure","pranzo","dimagrimento",[ing("Petto di pollo grigliato",120,132,25,0,3),ing("Insalata mista",120,19,2,3,0),ing("Pomodorini",80,14,1,2,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Zuppa di verdure con crostini light","pranzo","dimagrimento",[ing("Verdure miste",250,63,3,10,1),ing("Crostini integrali",20,72,2,14,1),ing("Olio EVO",5,45,0,0,5)],30),
  r("Pasta integrale al pomodoro fresco","pranzo","dimagrimento",[ing("Pasta integrale",60,198,8,38,2),ing("Pomodori freschi",100,18,1,3,0),ing("Basilico",5,1,0,0,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Poke bowl con riso e tonno","pranzo","dimagrimento",[ing("Riso integrale",50,175,4,36,1),ing("Tonno fresco",80,104,23,0,1),ing("Edamame",30,38,3,3,2),ing("Cetriolo",50,8,0,1,0),ing("Avocado",30,48,1,2,4)],20),
  r("Filetto di merluzzo con verdure al vapore","pranzo","dimagrimento",[ing("Merluzzo",150,121,26,0,1),ing("Broccoli",100,34,3,5,0),ing("Carote",80,33,1,7,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Insalata di quinoa con verdure","pranzo","dimagrimento",[ing("Quinoa",60,216,8,34,3),ing("Peperoni",80,17,1,3,0),ing("Cetriolo",60,10,1,2,0),ing("Pomodorini",60,11,0,2,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Vellutata di carote e zenzero","pranzo","dimagrimento",[ing("Carote",200,82,2,16,0),ing("Zenzero fresco",5,4,0,1,0),ing("Patata",40,31,1,6,0),ing("Olio EVO",5,45,0,0,5),ing("Pane integrale",30,70,2,13,1)],25),
  r("Wrap di pollo e verdure","pranzo","dimagrimento",[ing("Tortilla integrale",40,105,3,18,2),ing("Pollo grigliato",80,88,17,0,2),ing("Lattuga",30,5,0,1,0),ing("Pomodoro",40,7,0,1,0),ing("Yogurt greco",20,12,2,1,0)],10),
  r("Riso integrale con lenticchie","pranzo","dimagrimento",[ing("Riso integrale",50,175,4,36,1),ing("Lenticchie",60,171,13,25,1),ing("Carote",40,16,0,4,0),ing("Olio EVO",5,45,0,0,5)],30),
  r("Tartare di tonno con avocado","pranzo","dimagrimento",[ing("Tonno fresco",120,156,35,0,1),ing("Avocado",50,80,1,4,7),ing("Salsa di soia",10,5,1,1,0),ing("Sesamo",5,29,1,1,2)],15),
  r("Pomodori ripieni di tonno","pranzo","dimagrimento",[ing("Pomodori grandi",200,36,2,6,0),ing("Tonno al naturale",80,89,20,0,1),ing("Capperi",5,1,0,0,0),ing("Olio EVO",5,45,0,0,5)],10),
  r("Minestra di orzo e verdure","pranzo","dimagrimento",[ing("Orzo perlato",50,160,4,34,1),ing("Verdure miste",150,38,2,6,0),ing("Olio EVO",5,45,0,0,5)],30),
  r("Carpaccio di zucchine con gamberetti","pranzo","dimagrimento",[ing("Zucchine",200,34,2,4,0),ing("Gamberetti",100,88,20,0,1),ing("Limone",15,5,0,1,0),ing("Olio EVO",8,72,0,0,8)],15),
  r("Gazpacho con crostini","pranzo","dimagrimento",[ing("Pomodori",200,36,2,6,0),ing("Cetriolo",80,13,1,2,0),ing("Peperone",50,11,0,2,0),ing("Olio EVO",5,45,0,0,5),ing("Crostini",20,80,2,15,1)],15),

  // DIMAGRIMENTO - CENA (+14)
  r("Petto di tacchino con insalata","cena","dimagrimento",[ing("Fesa di tacchino",130,136,28,0,2),ing("Insalata mista",120,19,2,3,0),ing("Pomodorini",60,11,0,2,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Pesce al vapore con limone","cena","dimagrimento",[ing("Filetto di platessa",180,162,33,0,2),ing("Limone",20,6,0,2,0),ing("Verdure al vapore",150,38,2,6,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Zucchine ripiene light","cena","dimagrimento",[ing("Zucchine",200,34,2,4,0),ing("Ricotta light",80,84,8,3,4),ing("Parmigiano",10,39,4,0,3),ing("Pomodoro",50,9,0,2,0)],25),
  r("Vellutata di piselli","cena","dimagrimento",[ing("Piselli",150,121,8,19,1),ing("Patata",40,31,1,6,0),ing("Olio EVO",5,45,0,0,5),ing("Menta",3,1,0,0,0)],20),
  r("Pollo al limone con rucola","cena","dimagrimento",[ing("Petto di pollo",130,143,27,0,3),ing("Limone",20,6,0,2,0),ing("Rucola",80,20,2,3,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Merluzzo con pomodorini al forno","cena","dimagrimento",[ing("Merluzzo",160,129,28,0,1),ing("Pomodorini",120,22,1,4,0),ing("Olio EVO",5,45,0,0,5),ing("Origano",2,3,0,1,0)],25),
  r("Minestrone leggero","cena","dimagrimento",[ing("Verdure miste",250,63,3,10,1),ing("Fagioli",30,39,3,6,0),ing("Olio EVO",5,45,0,0,5)],30),
  r("Bresaola con rucola e grana","cena","dimagrimento",[ing("Bresaola",80,120,26,0,2),ing("Rucola",60,15,2,2,0),ing("Grana padano",20,78,7,0,6),ing("Olio EVO",5,45,0,0,5)],5),
  r("Caponata con crostini","cena","dimagrimento",[ing("Melanzane",120,29,1,5,0),ing("Pomodoro",80,14,1,3,0),ing("Sedano",30,5,0,1,0),ing("Olive",10,15,0,0,2),ing("Crostini",30,120,3,22,2),ing("Olio EVO",5,45,0,0,5)],25),
  r("Insalata di mare","cena","dimagrimento",[ing("Gamberi",80,71,16,0,1),ing("Calamari",80,65,14,1,1),ing("Cozze",60,40,5,1,1),ing("Sedano",30,5,0,1,0),ing("Limone",15,5,0,1,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Finocchi gratinati","cena","dimagrimento",[ing("Finocchi",250,78,3,14,0),ing("Parmigiano",15,59,5,0,4),ing("Olio EVO",5,45,0,0,5)],25),
  r("Frittata di albumi e verdure","cena","dimagrimento",[ing("Albumi",150,78,16,1,0),ing("Zucchine",80,13,1,2,0),ing("Peperoni",60,13,0,2,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Sgombro con insalata di finocchi","cena","dimagrimento",[ing("Sgombro",120,244,22,0,17),ing("Finocchi",150,47,2,8,0),ing("Arancia",50,24,0,6,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Tacchino con peperoni","cena","dimagrimento",[ing("Fesa di tacchino",130,136,28,0,2),ing("Peperoni",150,32,1,6,0),ing("Olio EVO",8,72,0,0,8)],20),

  // DIMAGRIMENTO - SPUNTINO (+8)
  r("Mela verde con cannella","spuntino","dimagrimento",[ing("Mela verde",150,72,0,17,0),ing("Cannella",2,5,0,1,0)],0),
  r("Finocchio crudo","spuntino","dimagrimento",[ing("Finocchio",150,47,2,8,0)],0),
  r("Yogurt magro con kiwi","spuntino","dimagrimento",[ing("Yogurt magro",125,48,7,5,0),ing("Kiwi",80,49,1,10,0)],5),
  r("Carote crude con hummus","spuntino","dimagrimento",[ing("Carote",100,41,1,9,0),ing("Hummus",30,50,2,4,3)],5),
  r("Gelatina di frutta","spuntino","dimagrimento",[ing("Gelatina di frutta",120,72,2,16,0)],0),
  r("Pomodorini con mozzarelline","spuntino","dimagrimento",[ing("Pomodorini",80,14,1,2,0),ing("Mozzarelline light",30,52,5,0,3)],5),
  r("Tisana e gallette","spuntino","dimagrimento",[ing("Tisana",250,2,0,0,0),ing("Gallette di riso",15,58,1,13,0)],5),
  r("Anguria fresca","spuntino","dimagrimento",[ing("Anguria",200,60,1,14,0)],0),

  // ════════════════════════════════════════════
  // MASSA - COLAZIONE (+8)
  // ════════════════════════════════════════════
  r("Porridge proteico con banana e noci","colazione","massa",[ing("Fiocchi d'avena",70,259,10,42,5),ing("Latte intero",200,128,6,10,7),ing("Banana",100,89,1,20,0),ing("Noci",20,131,3,1,13),ing("Miele",15,45,0,12,0)],10),
  r("Pane con uova e prosciutto","colazione","massa",[ing("Pane integrale",80,186,6,35,2),ing("Uova",120,172,15,1,12),ing("Prosciutto cotto",40,46,7,1,2)],10),
  r("Smoothie massa con avena","colazione","massa",[ing("Latte intero",250,160,8,12,9),ing("Banana",120,107,1,24,0),ing("Fiocchi d'avena",40,148,5,24,3),ing("Burro d'arachidi",20,117,5,3,10)],5),
  r("French toast proteico","colazione","massa",[ing("Pane in cassetta",80,208,6,38,4),ing("Uova",60,86,8,0,6),ing("Latte",50,32,2,2,2),ing("Miele",15,45,0,12,0),ing("Cannella",2,5,0,1,0)],15),
  r("Muesli con yogurt greco e semi","colazione","massa",[ing("Müsli",60,222,6,36,6),ing("Yogurt greco",150,89,15,5,0),ing("Semi misti",10,55,2,1,5),ing("Miele",10,30,0,8,0)],5),
  r("Ricotta con miele e noci","colazione","massa",[ing("Ricotta",150,216,12,5,15),ing("Miele",20,60,0,16,0),ing("Noci",20,131,3,1,13),ing("Pane integrale",40,93,3,18,1)],5),
  r("Omelette con pane e marmellata","colazione","massa",[ing("Uova",120,172,15,1,12),ing("Pane integrale",60,140,5,26,2),ing("Marmellata",25,63,0,16,0)],10),
  r("Açaí bowl con granola","colazione","massa",[ing("Polpa di açaí",100,70,1,4,5),ing("Banana",80,72,1,16,0),ing("Granola",40,176,4,26,7),ing("Miele",10,30,0,8,0)],10),

  // MASSA - PRANZO (+14)
  r("Pasta con ragù di carne","pranzo","massa",[ing("Pasta di semola",100,355,12,70,2),ing("Ragù di carne",100,130,12,3,8),ing("Parmigiano",15,59,5,0,4)],30),
  r("Riso con pollo e verdure","pranzo","massa",[ing("Riso",90,297,6,66,1),ing("Petto di pollo",150,165,31,0,4),ing("Verdure miste",100,25,2,4,0),ing("Olio EVO",10,90,0,0,10)],25),
  r("Pasta al tonno con olive","pranzo","massa",[ing("Pasta",100,355,12,70,2),ing("Tonno al naturale",100,112,25,0,1),ing("Olive",15,22,0,0,2),ing("Olio EVO",10,90,0,0,10)],15),
  r("Panino con bresaola e mozzarella","pranzo","massa",[ing("Panino integrale",100,247,8,45,3),ing("Bresaola",60,90,20,0,2),ing("Mozzarella",50,125,9,0,10),ing("Rucola",20,5,0,1,0)],5),
  r("Pasta alla carbonara","pranzo","massa",[ing("Spaghetti",100,355,12,70,2),ing("Guanciale",30,219,4,0,23),ing("Uova",60,86,8,0,6),ing("Pecorino",20,78,5,0,6)],20),
  r("Farro con salmone e avocado","pranzo","massa",[ing("Farro",80,272,10,54,2),ing("Salmone",120,224,24,0,14),ing("Avocado",50,80,1,4,7),ing("Olio EVO",5,45,0,0,5)],20),
  r("Cous cous con pollo e ceci","pranzo","massa",[ing("Couscous",80,288,10,60,1),ing("Pollo",120,132,25,0,3),ing("Ceci",60,97,5,15,2),ing("Olio EVO",8,72,0,0,8)],25),
  r("Pasta con salsiccia e broccoli","pranzo","massa",[ing("Pasta",100,355,12,70,2),ing("Salsiccia",60,190,9,0,17),ing("Broccoli",100,34,3,5,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Riso con gamberoni e zucchine","pranzo","massa",[ing("Riso",90,297,6,66,1),ing("Gamberoni",150,133,30,0,2),ing("Zucchine",100,17,1,2,0),ing("Olio EVO",10,90,0,0,10)],25),
  r("Polenta con ragù","pranzo","massa",[ing("Polenta",200,140,3,30,1),ing("Ragù di carne",120,156,14,4,10),ing("Parmigiano",15,59,5,0,4)],30),
  r("Tagliatelle ai funghi","pranzo","massa",[ing("Tagliatelle all'uovo",100,365,13,68,4),ing("Funghi misti",120,26,4,1,0),ing("Panna",20,65,0,1,7),ing("Parmigiano",15,59,5,0,4)],20),
  r("Piadina con prosciutto e squacquerone","pranzo","massa",[ing("Piadina",100,310,7,45,12),ing("Prosciutto crudo",50,118,13,0,7),ing("Squacquerone",40,73,4,1,6),ing("Rucola",20,5,0,1,0)],5),
  r("Pasta e ceci","pranzo","massa",[ing("Pasta mista",60,213,7,42,1),ing("Ceci",100,161,9,25,3),ing("Rosmarino",2,1,0,0,0),ing("Olio EVO",10,90,0,0,10)],30),
  r("Focaccia farcita con mortadella","pranzo","massa",[ing("Focaccia",100,270,6,35,12),ing("Mortadella",50,157,7,1,14),ing("Mozzarella",30,75,5,0,6)],5),

  // MASSA - CENA (+14)
  r("Bistecca con patate al forno","cena","massa",[ing("Bistecca di manzo",200,380,40,0,24),ing("Patate",200,156,4,32,0),ing("Olio EVO",10,90,0,0,10)],30),
  r("Pollo intero al forno con contorno","cena","massa",[ing("Coscia di pollo",200,322,28,0,22),ing("Patate",150,117,3,24,0),ing("Carote",80,33,1,7,0),ing("Olio EVO",10,90,0,0,10)],45),
  r("Salmone con riso e broccoli","cena","massa",[ing("Salmone",150,280,30,0,17),ing("Riso",70,231,5,51,0),ing("Broccoli",120,41,3,6,1),ing("Olio EVO",8,72,0,0,8)],25),
  r("Burger di manzo con pane e patatine","cena","massa",[ing("Hamburger di manzo",150,309,26,0,22),ing("Pane per burger",70,184,5,34,3),ing("Lattuga",20,3,0,1,0),ing("Pomodoro",30,5,0,1,0),ing("Patate fritte",80,210,2,28,10)],20),
  r("Pollo al curry con riso basmati","cena","massa",[ing("Petto di pollo",180,198,37,0,5),ing("Riso basmati",80,264,5,58,0),ing("Latte di cocco",50,45,0,1,5),ing("Curry",5,16,1,3,0)],25),
  r("Spezzatino con polenta","cena","massa",[ing("Manzo per stufato",180,306,36,0,17),ing("Polenta",150,105,2,23,1),ing("Carote",50,21,0,5,0),ing("Olio EVO",5,45,0,0,5)],60),
  r("Cotoletta alla milanese con insalata","cena","massa",[ing("Cotoletta di vitello",150,345,25,12,22),ing("Insalata mista",100,17,1,3,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Petto di pollo farcito","cena","massa",[ing("Petto di pollo",180,198,37,0,5),ing("Prosciutto cotto",30,35,5,0,1),ing("Formaggio filante",30,93,6,0,7),ing("Spinaci",50,12,2,2,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Salsicce con peperoni","cena","massa",[ing("Salsiccia",120,380,18,0,34),ing("Peperoni",150,32,1,6,0),ing("Pane",50,133,4,26,1),ing("Olio EVO",5,45,0,0,5)],25),
  r("Arista di maiale con purè","cena","massa",[ing("Arista di maiale",180,324,36,0,19),ing("Purè di patate",150,133,3,20,5),ing("Olio EVO",5,45,0,0,5)],35),
  r("Pasta al forno gratinata","cena","massa",[ing("Pasta al forno",250,475,20,52,22)],60),
  r("Straccetti di manzo con rucola","cena","massa",[ing("Manzo a straccetti",160,272,32,0,15),ing("Rucola",60,15,2,2,0),ing("Pomodorini",80,14,1,2,0),ing("Parmigiano",15,59,5,0,4),ing("Olio EVO",8,72,0,0,8)],15),
  r("Polpettone con contorno","cena","massa",[ing("Polpettone di carne",180,342,25,10,23),ing("Patate lesse",150,117,3,24,0),ing("Olio EVO",5,45,0,0,5)],45),
  r("Pesce fritto con verdure","cena","massa",[ing("Calamari fritti",100,175,10,10,11),ing("Gamberi fritti",80,172,10,10,10),ing("Verdure",80,13,1,2,0),ing("Limone",15,5,0,1,0)],20),

  // MASSA - SPUNTINO (+8)
  r("Pane con prosciutto e formaggio","spuntino","massa",[ing("Pane",50,133,4,26,1),ing("Prosciutto cotto",30,35,5,0,1),ing("Formaggio",20,80,5,0,7)],5),
  r("Frullato di banana e latte","spuntino","massa",[ing("Banana",120,107,1,24,0),ing("Latte intero",200,128,6,10,7)],5),
  r("Barretta ai cereali e cioccolato","spuntino","massa",[ing("Barretta ai cereali",35,150,3,22,6)],0),
  r("Toast con burro d'arachidi","spuntino","massa",[ing("Pane in cassetta",40,104,3,19,2),ing("Burro d'arachidi",20,117,5,3,10)],5),
  r("Yogurt greco con miele e banana","spuntino","massa",[ing("Yogurt greco",150,89,15,5,0),ing("Miele",15,45,0,12,0),ing("Banana",80,72,1,16,0)],5),
  r("Mix di frutta secca energetico","spuntino","massa",[ing("Mandorle",15,86,3,1,8),ing("Anacardi",15,87,3,5,7),ing("Uvetta",15,45,0,12,0)],0),
  r("Pane con Nutella","spuntino","massa",[ing("Pane",40,107,3,21,1),ing("Crema di nocciole",20,108,1,11,7)],5),
  r("Muffin proteico","spuntino","massa",[ing("Muffin proteico",60,180,12,18,7)],0),

  // ════════════════════════════════════════════
  // DIGIUNO - COLAZIONE (+4)
  // ════════════════════════════════════════════
  r("Caffè bulletproof","colazione","digiuno",[ing("Caffè",200,4,0,0,0),ing("Olio di cocco",10,90,0,0,10),ing("Burro",5,37,0,0,4)],5),
  r("Tè verde con limone","colazione","digiuno",[ing("Tè verde",300,3,0,0,0),ing("Limone",10,3,0,1,0)],5),
  r("Acqua e limone con zenzero","colazione","digiuno",[ing("Acqua",300,0,0,0,0),ing("Limone",20,6,0,2,0),ing("Zenzero",5,4,0,1,0)],5),
  r("Brodo vegetale leggero","colazione","digiuno",[ing("Brodo vegetale",250,13,0,3,0)],10),

  // DIGIUNO - PRANZO (+14)
  r("Bowl di riso integrale con salmone e verdure","pranzo","digiuno",[ing("Riso integrale",80,280,6,56,2),ing("Salmone",120,224,24,0,14),ing("Edamame",50,63,5,4,3),ing("Avocado",40,64,1,3,6),ing("Olio EVO",5,45,0,0,5)],25),
  r("Pasta integrale con verdure e legumi","pranzo","digiuno",[ing("Pasta integrale",80,264,11,50,2),ing("Ceci",60,97,5,15,2),ing("Zucchine",80,13,1,2,0),ing("Pomodoro",80,14,1,3,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Insalatona proteica completa","pranzo","digiuno",[ing("Pollo grigliato",120,132,25,0,3),ing("Uovo sodo",60,86,8,0,6),ing("Insalata mista",100,17,1,3,0),ing("Mais",30,29,1,6,0),ing("Olio EVO",10,90,0,0,10)],15),
  r("Zuppa di miso con tofu","pranzo","digiuno",[ing("Tofu",100,72,8,1,4),ing("Miso",15,30,2,4,1),ing("Alga wakame",5,2,0,0,0),ing("Riso integrale",60,210,4,42,2)],20),
  r("Quinoa con pollo e avocado","pranzo","digiuno",[ing("Quinoa",70,252,9,40,4),ing("Pollo",120,132,25,0,3),ing("Avocado",40,64,1,3,6),ing("Limone",10,3,0,1,0)],20),
  r("Farro con tonno e verdure","pranzo","digiuno",[ing("Farro",80,272,10,54,2),ing("Tonno al naturale",80,89,20,0,1),ing("Pomodorini",80,14,1,2,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Poke bowl vegetariano","pranzo","digiuno",[ing("Riso integrale",60,210,4,42,2),ing("Edamame",60,76,7,5,3),ing("Avocado",50,80,1,4,7),ing("Carote",40,16,0,4,0),ing("Cetriolo",40,6,0,1,0),ing("Salsa di soia",10,5,1,1,0)],15),
  r("Wrap integrale con hummus e verdure","pranzo","digiuno",[ing("Tortilla integrale",50,131,4,23,3),ing("Hummus",50,83,4,7,5),ing("Carote",40,16,0,4,0),ing("Lattuga",30,5,0,1,0),ing("Pomodoro",40,7,0,1,0)],10),
  r("Pesce alla griglia con insalata mista","pranzo","digiuno",[ing("Orata",180,194,36,0,5),ing("Insalata mista",120,19,2,3,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Buddha bowl con tahini","pranzo","digiuno",[ing("Quinoa",50,180,7,28,3),ing("Ceci",50,81,4,12,1),ing("Barbabietola",50,22,1,5,0),ing("Cavolo riccio",50,25,2,3,0),ing("Tahini",15,89,3,1,8)],20),
  r("Crema di lenticchie rosse","pranzo","digiuno",[ing("Lenticchie rosse",80,240,18,36,1),ing("Carote",40,16,0,4,0),ing("Curcuma",3,9,0,2,0),ing("Olio EVO",8,72,0,0,8),ing("Pane integrale",30,70,2,13,1)],25),
  r("Soba noodles con verdure","pranzo","digiuno",[ing("Soba (grano saraceno)",80,275,11,56,1),ing("Verdure miste",100,25,2,4,0),ing("Salsa di soia",10,5,1,1,0),ing("Olio di sesamo",5,45,0,0,5)],15),
  r("Orzo con verdure e feta","pranzo","digiuno",[ing("Orzo",70,224,6,47,1),ing("Pomodorini",80,14,1,2,0),ing("Cetriolo",60,10,1,2,0),ing("Feta",30,79,4,1,6),ing("Olio EVO",5,45,0,0,5)],20),
  r("Vellutata di broccoli con crostini","pranzo","digiuno",[ing("Broccoli",250,85,7,12,1),ing("Patata",50,39,1,8,0),ing("Crostini integrali",25,90,3,17,1),ing("Olio EVO",8,72,0,0,8)],25),

  // DIGIUNO - CENA (+14)
  r("Salmone con spinaci e limone","cena","digiuno",[ing("Salmone",150,280,30,0,17),ing("Spinaci",150,35,4,4,1),ing("Limone",20,6,0,2,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Petto di pollo con verdure al forno","cena","digiuno",[ing("Petto di pollo",150,165,31,0,4),ing("Zucchine",100,17,1,2,0),ing("Peperoni",80,17,1,3,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Tofu alla piastra con verdure","cena","digiuno",[ing("Tofu",150,108,12,2,6),ing("Broccoli",100,34,3,5,0),ing("Carote",60,25,0,5,0),ing("Salsa di soia",10,5,1,1,0),ing("Olio di sesamo",5,45,0,0,5)],15),
  r("Zuppa di verdure con legumi","cena","digiuno",[ing("Verdure miste",200,50,3,8,1),ing("Lenticchie",50,143,9,21,0),ing("Olio EVO",5,45,0,0,5)],30),
  r("Merluzzo al vapore con verdure","cena","digiuno",[ing("Merluzzo",180,145,31,0,1),ing("Broccoli",100,34,3,5,0),ing("Carote",80,33,1,7,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Gamberi con zucchine e menta","cena","digiuno",[ing("Gamberi",150,133,30,0,2),ing("Zucchine",120,20,2,3,0),ing("Menta",5,1,0,0,0),ing("Olio EVO",8,72,0,0,8)],15),
  r("Vellutata di finocchi","cena","digiuno",[ing("Finocchi",250,78,3,14,0),ing("Patata",50,39,1,8,0),ing("Olio EVO",8,72,0,0,8)],25),
  r("Tacchino con cavolfiore al vapore","cena","digiuno",[ing("Fesa di tacchino",140,147,30,0,2),ing("Cavolfiore",150,38,3,6,1),ing("Olio EVO",8,72,0,0,8)],20),
  r("Omelette di albumi con funghi","cena","digiuno",[ing("Albumi",150,78,16,1,0),ing("Funghi",120,26,4,1,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Insalata tiepida di lenticchie","cena","digiuno",[ing("Lenticchie",80,228,18,33,1),ing("Carote",40,16,0,4,0),ing("Sedano",30,5,0,1,0),ing("Olio EVO",8,72,0,0,8)],20),
  r("Branzino con carciofi","cena","digiuno",[ing("Branzino",180,175,32,0,5),ing("Carciofi",120,57,4,10,0),ing("Olio EVO",8,72,0,0,8),ing("Limone",15,5,0,1,0)],30),
  r("Spiedini di pesce con verdure","cena","digiuno",[ing("Pesce spada",100,130,19,0,6),ing("Gamberi",80,71,16,0,1),ing("Peperoni",60,13,0,2,0),ing("Zucchine",60,10,1,1,0),ing("Olio EVO",5,45,0,0,5)],20),
  r("Crema di ceci con rosmarino","cena","digiuno",[ing("Ceci",100,161,9,25,3),ing("Olio EVO",8,72,0,0,8),ing("Rosmarino",2,1,0,0,0),ing("Pane integrale",30,70,2,13,1)],20),
  r("Sogliola con spinaci al limone","cena","digiuno",[ing("Sogliola",180,149,30,0,2),ing("Spinaci",120,28,3,3,1),ing("Limone",15,5,0,1,0),ing("Olio EVO",5,45,0,0,5)],20),

  // DIGIUNO - SPUNTINO (+12)
  r("Centrifuga verde","spuntino","digiuno",[ing("Sedano",80,11,1,2,0),ing("Cetriolo",80,13,1,2,0),ing("Mela verde",80,42,0,10,0),ing("Zenzero",5,4,0,1,0)],10),
  r("Mandorle tostate","spuntino","digiuno",[ing("Mandorle",20,115,4,2,10)],0),
  r("Mela con cannella","spuntino","digiuno",[ing("Mela",150,78,0,18,0),ing("Cannella",3,7,0,2,0)],0),
  r("Bastoncini di sedano e carote","spuntino","digiuno",[ing("Sedano",80,11,1,2,0),ing("Carote",80,33,1,7,0)],0),
  r("Tè matcha","spuntino","digiuno",[ing("Tè matcha",2,6,0,1,0),ing("Acqua calda",200,0,0,0,0)],5),
  r("Semi di zucca tostati","spuntino","digiuno",[ing("Semi di zucca",20,111,6,3,9)],0),
  r("Kefir naturale","spuntino","digiuno",[ing("Kefir",200,72,6,8,2)],0),
  r("Pompelmo fresco","spuntino","digiuno",[ing("Pompelmo",200,68,1,17,0)],0),
  r("Olive verdi","spuntino","digiuno",[ing("Olive verdi",30,39,0,1,4)],0),
  r("Cetriolo con sale e limone","spuntino","digiuno",[ing("Cetriolo",150,24,1,4,0),ing("Limone",10,3,0,1,0)],0),
  r("Chips di cavolo riccio","spuntino","digiuno",[ing("Cavolo riccio",50,25,2,3,0),ing("Olio EVO",5,45,0,0,5)],15),
  r("Brodo di ossa","spuntino","digiuno",[ing("Brodo di ossa",250,50,10,0,1)],0),
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") throw new Error("Admin only");

    // Check for duplicates by title
    const titles = recipes.map(r => r.title);
    const { data: existing } = await adminClient
      .from("template_recipes")
      .select("title")
      .in("title", titles);
    const existingTitles = new Set((existing || []).map(e => e.title));
    const newRecipes = recipes.filter(r => !existingTitles.has(r.title));

    if (newRecipes.length === 0) {
      return new Response(JSON.stringify({ message: "Tutte le ricette esistono già", added: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < newRecipes.length; i += 50) {
      const batch = newRecipes.slice(i, i + 50);
      const { error } = await adminClient.from("template_recipes").insert(batch);
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(JSON.stringify({
      message: `Inserite ${inserted} nuove ricette template`,
      added: inserted,
      skipped: recipes.length - newRecipes.length,
      total_in_function: recipes.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
