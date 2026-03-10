/**
 * Category → emoji fallback map + name-keyword matching
 */

const categoryEmoji: Record<string, string> = {
  latticini: "🧀", dairy: "🧀",
  carne: "🥩", meat: "🥩",
  frutta: "🍎", fruit: "🍎",
  verdura: "🥬", vegetables: "🥬", vegetable: "🥬",
  bevande: "🥤", drinks: "🥤", drink: "🥤",
  pane: "🍞", bread: "🍞", bakery: "🍞",
  pesce: "🐟", fish: "🐟", seafood: "🐟",
  surgelati: "🧊", frozen: "🧊",
  condimenti: "🫒", condiments: "🫒",
  dolci: "🍫", sweets: "🍫", dessert: "🍰",
  cereali: "🌾", cereals: "🌾", grains: "🌾",
  uova: "🥚", eggs: "🥚",
  pasta: "🍝",
  legumi: "🫘", legumes: "🫘",
  snack: "🍿",
  olio: "🫒", oil: "🫒",
  riso: "🍚", rice: "🍚",
  formaggio: "🧀", cheese: "🧀",
  salumi: "🥓",
  spezie: "🌿", spices: "🌿",
  acqua: "💧", water: "💧",
  vino: "🍷", wine: "🍷",
  birra: "🍺", beer: "🍺",
  caffè: "☕", coffee: "☕",
  tè: "🍵", tea: "🍵",
  succo: "🧃", juice: "🧃",
  latte: "🥛", milk: "🥛",
  yogurt: "🥛",
  burro: "🧈", butter: "🧈",
  miele: "🍯", honey: "🍯",
  pizza: "🍕",
  insalata: "🥗", salad: "🥗",
  zuppa: "🍲", soup: "🍲",
  gelato: "🍦", icecream: "🍦",
  cioccolato: "🍫", chocolate: "🍫",
  biscotti: "🍪", cookies: "🍪", biscuit: "🍪",
  torta: "🎂", cake: "🎂",
  salsa: "🥫", sauce: "🥫",
  conserve: "🥫", canned: "🥫",
};

/** keyword → emoji for matching product names */
const nameKeywords: [string, string][] = [
  // Dolci / snack
  ["caramell", "🍬"],  // caramella, caramelle
  ["candy", "🍬"],
  ["candies", "🍬"],
  ["lollipop", "🍭"],
  ["barrett", "🍫"],  // barretta, barrette
  ["protein bar", "🍫"],
  ["energy bar", "🍫"],
  ["cioccolat", "🍫"],  // cioccolato, cioccolatini
  ["chocolat", "🍫"],
  ["biscott", "🍪"],  // biscotto, biscotti
  ["cookie", "🍪"],
  ["wafer", "🍪"],
  ["croissant", "🥐"],
  ["brioche", "🥐"],
  ["cornett", "🥐"],  // cornetto, cornetti
  ["muffin", "🧁"],
  ["cupcake", "🧁"],
  ["tort", "🎂"],  // torta, torte, tortina
  ["cake", "🎂"],
  ["gelat", "🍦"],  // gelato, gelati
  ["ice cream", "🍦"],
  ["patatine", "🍟"],
  ["chips", "🍟"],
  ["popcorn", "🍿"],
  ["cracker", "🍘"],
  ["grissin", "🥖"],  // grissini, grissino
  ["merendin", "🧁"],  // merendina, merendine
  ["snack", "🍿"],
  ["chewing", "🍬"],
  ["gomm", "🍬"],  // gomma, gomme
  ["marmellat", "🍯"],  // marmellata, marmellate
  ["confettur", "🍯"],
  ["nutella", "🍫"],
  ["crema nocc", "🍫"],
  ["crema cioc", "🍫"],
  ["crema spalm", "🍫"],

  // Bevande
  ["acqua", "💧"],
  ["water", "💧"],
  ["coca cola", "🥤"],
  ["cola", "🥤"],
  ["fanta", "🥤"],
  ["sprite", "🥤"],
  ["aranciat", "🥤"],  // aranciata, aranciate
  ["gassos", "🥤"],
  ["succ", "🧃"],  // succo, succhi
  ["juice", "🧃"],
  ["latte", "🥛"],
  ["milk", "🥛"],
  ["yogurt", "🥛"],
  ["caffè", "☕"],
  ["caffe", "☕"],
  ["coffee", "☕"],
  ["espresso", "☕"],
  ["cappuccin", "☕"],
  ["tè ", "🍵"],
  ["tea", "🍵"],
  ["tisan", "🍵"],  // tisana, tisane
  ["vin", "🍷"],  // vino, vini
  ["wine", "🍷"],
  ["birr", "🍺"],  // birra, birre
  ["beer", "🍺"],
  ["prosecc", "🥂"],
  ["spumant", "🥂"],
  ["champagne", "🥂"],
  ["smoothie", "🥤"],
  ["frullat", "🥤"],  // frullato, frullati
  ["energy drink", "🥤"],

  // Pane / cereali
  ["pane ", "🍞"],
  ["panin", "🥪"],  // panino, panini
  ["bread", "🍞"],
  ["sandwich", "🥪"],
  ["toast", "🍞"],
  ["fette biscottat", "🍞"],
  ["cereal", "🥣"],  // cereali, cereale
  ["muesli", "🥣"],
  ["granola", "🥣"],
  ["cornflakes", "🥣"],
  ["aven", "🌾"],  // avena
  ["oat", "🌾"],
  ["riso", "🍚"],  // riso (exact enough)
  ["rice", "🍚"],
  ["pasta", "🍝"],  // pasta, paste
  ["spaghett", "🍝"],
  ["penne", "🍝"],
  ["fusill", "🍝"],
  ["tagliatell", "🍝"],
  ["lasagn", "🍝"],
  ["gnocch", "🍝"],
  ["farin", "🌾"],  // farina, farine
  ["flour", "🌾"],
  ["pizz", "🍕"],  // pizza, pizze
  ["focacc", "🍕"],
  ["baguette", "🥖"],
  ["piadin", "🥙"],
  ["wrap", "🥙"],
  ["tortill", "🌮"],

  // Frutta
  ["mela", "🍎"],  // mela
  ["mele ", "🍎"],  // mele (with space to avoid "melone")
  ["apple", "🍎"],
  ["banan", "🍌"],  // banana, banane
  ["aranc", "🍊"],  // arancia, arance, arancio
  ["orange", "🍊"],
  ["mandarin", "🍊"],
  ["limon", "🍋"],  // limone, limoni
  ["lemon", "🍋"],
  ["fragol", "🍓"],  // fragola, fragole
  ["strawberr", "🍓"],
  ["pesch", "🍑"],  // pesca, pesche
  ["peach", "🍑"],
  ["uva", "🍇"],
  ["grape", "🍇"],
  ["cilieg", "🍒"],  // ciliegia, ciliegie
  ["cherry", "🍒"],
  ["anguri", "🍉"],  // anguria, angurie
  ["watermelon", "🍉"],
  ["melon", "🍈"],  // melone, meloni
  ["pere ", "🍐"],  // pere (with space)
  ["pera", "🍐"],  // pera
  ["ananas", "🍍"],
  ["pineapple", "🍍"],
  ["cocco", "🥥"],  // cocco
  ["coconut", "🥥"],
  ["kiwi", "🥝"],
  ["avocado", "🥑"],
  ["mango", "🥭"],
  ["mirtill", "🫐"],  // mirtillo, mirtilli
  ["blueberr", "🫐"],
  ["frutta secc", "🥜"],
  ["noc", "🥜"],  // noce, noci, nocciola, nocciole
  ["walnut", "🥜"],
  ["mandorl", "🥜"],  // mandorla, mandorle
  ["almond", "🥜"],
  ["hazelnut", "🥜"],
  ["arachid", "🥜"],  // arachide, arachidi
  ["peanut", "🥜"],
  ["pistacch", "🥜"],  // pistacchio, pistacchi

  // Verdura
  ["pomodor", "🍅"],  // pomodoro, pomodori
  ["tomato", "🍅"],
  ["carot", "🥕"],  // carota, carote
  ["carrot", "🥕"],
  ["patat", "🥔"],  // patata, patate, patatine already above
  ["potato", "🥔"],
  ["insalat", "🥗"],  // insalata, insalate
  ["lattug", "🥬"],
  ["spinac", "🥬"],  // spinaci, spinacio
  ["spinach", "🥬"],
  ["broccol", "🥦"],
  ["zucchin", "🥒"],  // zucchina, zucchine
  ["cetriol", "🥒"],  // cetriolo, cetrioli
  ["cucumber", "🥒"],
  ["peperon", "🫑"],  // peperone, peperoni
  ["pepper", "🫑"],
  ["cipoll", "🧅"],  // cipolla, cipolle
  ["onion", "🧅"],
  ["aglio", "🧄"],
  ["garlic", "🧄"],
  ["mais", "🌽"],
  ["corn", "🌽"],
  ["fungh", "🍄"],  // fungo, funghi
  ["mushroom", "🍄"],
  ["melanzan", "🍆"],  // melanzana, melanzane
  ["eggplant", "🍆"],
  ["peperoncin", "🌶️"],
  ["chili", "🌶️"],
  ["zucc", "🎃"],  // zucca, zucche

  // Proteine
  ["pollo", "🍗"],
  ["chicken", "🍗"],
  ["tacchino", "🍗"],
  ["turkey", "🍗"],
  ["manzo", "🥩"],
  ["beef", "🥩"],
  ["maiale", "🥩"],
  ["pork", "🥩"],
  ["salsiccia", "🌭"],
  ["würstel", "🌭"],
  ["hot dog", "🌭"],
  ["hamburger", "🍔"],
  ["burger", "🍔"],
  ["prosciutto", "🥓"],
  ["bacon", "🥓"],
  ["salame", "🥓"],
  ["mortadella", "🥓"],
  ["bresaola", "🥓"],
  ["tonno", "🐟"],
  ["tuna", "🐟"],
  ["salmone", "🐟"],
  ["salmon", "🐟"],
  ["pesce", "🐟"],
  ["fish", "🐟"],
  ["gamber", "🦐"],
  ["shrimp", "🦐"],
  ["uova", "🥚"],
  ["uovo", "🥚"],
  ["egg", "🥚"],
  ["tofu", "🧈"],

  // Latticini
  ["formaggio", "🧀"],
  ["cheese", "🧀"],
  ["mozzarella", "🧀"],
  ["parmigiano", "🧀"],
  ["ricotta", "🧀"],
  ["gorgonzola", "🧀"],
  ["burro", "🧈"],
  ["butter", "🧈"],
  ["panna", "🥛"],
  ["cream", "🥛"],

  // Condimenti / altro
  ["olio", "🫒"],
  ["oil", "🫒"],
  ["aceto", "🫒"],
  ["vinegar", "🫒"],
  ["sale", "🧂"],
  ["salt", "🧂"],
  ["zucchero", "🍬"],
  ["sugar", "🍬"],
  ["ketchup", "🥫"],
  ["maionese", "🥫"],
  ["mayo", "🥫"],
  ["senape", "🥫"],
  ["mustard", "🥫"],
  ["miele", "🍯"],
  ["honey", "🍯"],
  ["salsa", "🥫"],

  // Legumi
  ["fagioli", "🫘"],
  ["beans", "🫘"],
  ["lenticchie", "🫘"],
  ["lentil", "🫘"],
  ["ceci", "🫘"],
  ["chickpea", "🫘"],
  ["piselli", "🫛"],
  ["peas", "🫛"],

  // Piatti pronti
  ["sushi", "🍣"],
  ["taco", "🌮"],
  ["burrito", "🌯"],
  ["curry", "🍛"],
  ["ramen", "🍜"],
  ["zuppa", "🍲"],
  ["soup", "🍲"],
  ["stew", "🍲"],
  ["risotto", "🍚"],
];

export function getFoodEmoji(category: string | null | undefined, name?: string | null): string {
  // 1. Try matching product name keywords first (more specific)
  if (name) {
    const lower = name.toLowerCase().trim();
    for (const [kw, emoji] of nameKeywords) {
      if (lower.includes(kw)) return emoji;
    }
  }

  // 2. Try category
  if (category) {
    const key = category.toLowerCase().trim();
    if (categoryEmoji[key]) return categoryEmoji[key];
  }

  // 3. Generic food fallback
  return "🛒";
}

export function getFoodImage(
  imageUrl: string | null | undefined,
  category: string | null | undefined,
  name?: string | null
): { type: "image" | "emoji"; value: string } {
  if (imageUrl) return { type: "image", value: imageUrl };
  return { type: "emoji", value: getFoodEmoji(category, name) };
}
