/**
 * Confronto testuale per le ricerche a schermo.
 *
 * Il confronto diretto con `includes` non bastava: in un'app italiana si cerca
 * "pomodoro" e in dispensa c'è scritto "Pomodori pelati", si scrive "puré"
 * senza accento, si digitano le parole in ordine diverso da quello
 * dell'etichetta. Qui le parole della ricerca vengono normalizzate e
 * confrontate anche nelle loro forme singolare e plurale.
 */

/** Minuscolo, senza accenti e senza punteggiatura. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Forme alternative singolare/plurale di una parola italiana.
 *
 * Si generano solo le varianti regolari, una desinenza alla volta: trasformare
 * la parola in una radice tronca farebbe incontrare parole diverse fra loro
 * (con "pesc" una pesca troverebbe il pesce).
 */
function inflections(word: string): string[] {
  if (word.length < 4) return [word];
  const forms = new Set<string>([word]);
  const stem = word.slice(0, -1);
  const last = word.slice(-1);
  const lastTwo = word.slice(-2);

  // Le parole in -ca/-ga/-co/-go prendono l'acca al plurale: pesca/pesche,
  // fungo/funghi. Hanno la precedenza sulla regola generale, che altrimenti
  // da "pesca" tirerebbe fuori "pesce".
  const velar: Record<string, string> = {
    ca: `${stem}he`,
    ga: `${stem}he`,
    co: `${stem}hi`,
    go: `${stem}hi`,
    he: `${word.slice(0, -2)}a`,
    hi: `${word.slice(0, -2)}o`,
  };
  if (velar[lastTwo]) {
    forms.add(velar[lastTwo]);
    return [...forms];
  }

  if (last === "o") forms.add(`${stem}i`);
  else if (last === "a") forms.add(`${stem}e`);
  else if (last === "e") forms.add(`${stem}i`);
  else if (last === "i") {
    forms.add(`${stem}o`);
    forms.add(`${stem}e`);
  }

  return [...forms];
}

/**
 * Vero se il testo contiene tutte le parole cercate, ciascuna in una qualunque
 * delle sue forme. Una ricerca vuota accetta tutto.
 */
export function matchesSearch(haystack: string | null | undefined, query: string): boolean {
  const needle = normalizeText(query ?? "");
  if (!needle) return true;
  const text = normalizeText(haystack ?? "");
  if (!text) return false;

  return needle
    .split(" ")
    .filter(Boolean)
    .every((word) => inflections(word).some((form) => text.includes(form)));
}

/** Come `matchesSearch`, ma cerca in più campi (nome, marca, categoria…). */
export function matchesSearchAny(fields: Array<string | null | undefined>, query: string): boolean {
  if (!normalizeText(query ?? "")) return true;
  return fields.some((field) => field && matchesSearch(field, query));
}
