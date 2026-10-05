export interface RecipeIngredient {
  key: string;
  product_id: string | null;
  pantry_item_id: string | null;
  name: string;
  quantity: string;
  unit: string;
  lot_number?: string | null;
  expiry_date?: string | null;
}

export const QUICK_INGREDIENTS = [
  "Farina",
  "Uova",
  "Sale",
  "Olio EVO",
  "Latte",
  "Burro",
  "Zucchero",
  "Pomodoro",
  "Cipolla",
  "Aglio",
  "Acqua",
  "Parmigiano",
];

/** Testo ingredienti per etichetta: "Farina (500 g), Uova (2 pz)". */
export function recipeIngredientsLabel(items: RecipeIngredient[]): string {
  return items
    .map((i) => {
      const qty = i.quantity ? `${i.quantity} ${i.unit}`.trim() : "";
      return qty ? `${i.name} (${qty})` : i.name;
    })
    .join(", ");
}
