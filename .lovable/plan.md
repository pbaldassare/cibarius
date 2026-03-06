

# Piano: Espansione ricette template_recipes

## Stato attuale
| Categoria | Colazione | Pranzo | Cena | Spuntino | Totale |
|---|---|---|---|---|---|
| mediterranea | 10 | 10 | 10 | 10 | 40 |
| keto | 5 | 5 | 5 | 5 | 20 |
| digiuno | 0 | 2 | 2 | 1 | 5 |
| massa | 3 | 5 | 5 | 5 | 18 |
| dimagrimento | 0 | 5 | 5 | 3 | 13 |
| **Totale** | | | | | **96** |

## Obiettivo
Portare ogni categoria a ~10 colazione, ~20 pranzo, ~20 cena, ~10 spuntino (dove applicabile). Totale ~250 ricette. Per il digiuno niente colazione (corretto). Le ricette saranno semplici, italiane, con ingredienti da supermercato e macro calcolati realisticamente.

## Ricette da aggiungere (migrazione SQL)

### Mediterranea (+30)
- **+10 pranzo**: Risotto alla milanese, Pasta cacio e pepe, Farro con verdure grigliate, Insalata di riso con tonno, Penne all'arrabbiata, Pasta con lenticchie, Bruschetta con pomodori e mozzarella, Polpo con patate, Orzo con gamberi e zucchine, Pasta e ceci
- **+10 cena**: Sogliola al limone con riso, Straccetti di manzo con rucola, Caprese con pane, Zuppa di legumi, Scaloppine al limone, Spigola al cartoccio, Hamburger di tacchino, Caponata con crostini, Crostata salata ricotta e spinaci, Parmigiana di melanzane light

### Keto (+30)
- **+5 colazione**: Frittata al forno con formaggio, Yogurt greco intero con noci, Bacon con uova e avocado, Crêpe di farina di cocco, Mousse di ricotta con cacao
- **+10 pranzo**: Carpaccio di manzo con rucola, Pollo ripieno di spinaci, Tartare di salmone, Insalata greca senza pane, Stracchino con noci e sedano, Tonno in crosta di sesamo, Parmigiana di zucchine, Fettine di vitello con funghi, Polpette al forno senza pane, Cavolfiore al gratin
- **+10 cena**: Tagliata con verdure, Branzino al sale, Petto d'anatra con spinaci, Frittata con salsiccia, Gamberoni alla griglia, Maiale con cavoletti, Pesce spada grigliato, Pollo al limone con asparagi, Vitello tonnato, Salmone in crosta
- **+5 spuntino**: Prosciutto crudo con mozzarelline, Cetrioli con tzatziki, Uova di quaglia con mayo, Bresaola e grana, Burro di mandorle con sedano

### Massa (+32)
- **+7 colazione**: Frullato avena banana e proteine, Toast con uova e avocado, Bowl di ricotta con granola, Pancake proteici, Latte con cereali e frutta secca, Pane con prosciutto e formaggio, French toast proteico
- **+10 pranzo**: Pasta carbonara, Riso con manzo e verdure, Bowl di quinoa e pollo, Pasta al salmone, Hamburger con patate, Wrap gigante con pollo, Pasta con salsiccia e broccoli, Gnocchi con ragu, Risotto con gamberetti, Insalata proteica con uova
- **+10 cena**: Pollo arrosto con patate, Pasta con tonno e pomodorini, Stufato di manzo con verdure, Filetto di maiale con riso, Lasagna di carne, Polpettone con purè, Pizza proteica, Merluzzo impanato con riso, Petto di pollo alla parmigiana, Bowl di riso e salmone teriyaki
- **+5 spuntino**: Budino proteico, Ricotta con miele e noci, Panino con tonno, Banana con burro d'arachidi, Trail mix energetico

### Dimagrimento (+37)
- **+10 colazione** (condivise/simili a mediterranea ma porzioni ridotte): Yogurt magro con cereali, Fette biscottate con ricotta light, Frullato verde, Porridge light, Uovo sodo con pane, Toast integrale con pomodoro, Pancake proteici light, Latte con avena, Frutta con yogurt, Spremuta con fette biscottate
- **+10 pranzo**: Insalata di ceci, Wrap di lattuga con tonno, Riso integrale con verdure, Pasta fredda con verdure, Zuppa di verdure, Pollo al limone con insalata, Bowl di bulgur e verdure, Tortilla con tacchino, Cous cous con pesce, Minestrone leggero
- **+10 cena**: Sogliola con spinaci, Tacchino con verdure al vapore, Uova e asparagi, Zuppa di pesce, Carpaccio di manzo light, Pollo alla griglia con finocchi, Calamari grigliati con insalata, Tofu saltato con verdure, Spiedini di pollo e peperoni, Crema di piselli con crostini
- **+7 spuntino**: Finocchio crudo, Yogurt greco 0% con frutti di bosco, Gallette con ricotta light, Centrifuga di verdure, Edamame, Gelatina proteica, Kefir con semi di lino

### Digiuno (+26)
- **+8 pranzo**: Pasta con ragù ricco, Bowl di pollo teriyaki, Risotto ai frutti di mare, Piadina farcita, Pasta alla norma, Riso con curry di pollo, Insalatona proteica, Gnocchi al pesto con pollo
- **+8 cena**: Bistecca con contorno misto, Pasta al forno, Pesce con patate al forno, Tagliata con rucola, Risotto con salsiccia, Frittata sostanziosa, Polpette con verdure, Salmone con quinoa
- **+9 spuntino**: Yogurt con granola, Pane con burro d'arachidi, Barretta energetica, Frutta e cioccolato fondente, Shake proteico, Pane con nutella proteica, Mix di frutta secca e cocco, Gallette con avocado, Banana con mandorle

## File coinvolti

| File | Azione |
|---|---|
| Nuova migrazione SQL | ~155 INSERT con ingredienti JSON e macro calcolati |

Nessuna modifica al frontend -- la pagina `/plan` già carica le ricette da `template_recipes` filtrando per `diet_category` e `meal_type`.

## Note tecniche
- Ogni ricetta avrà ingredienti con macro pre-calcolati realisticamente (valori USDA/CREA)
- `portion_scale_female` differenziato: 0.7 per massa, 0.8 per standard, 0.85-0.9 per dimagrimento
- Nomi ingredienti standard per futuro matching con `products`/`food_templates`
- `ON CONFLICT` non serve: titoli unici ma non c'è constraint UNIQUE sul titolo

