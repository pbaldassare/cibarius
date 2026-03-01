/**
 * Category → emoji fallback map + image resolution helpers
 */

const categoryEmoji: Record<string, string> = {
  latticini: "🧀",
  dairy: "🧀",
  carne: "🥩",
  meat: "🥩",
  frutta: "🍎",
  fruit: "🍎",
  verdura: "🥬",
  vegetables: "🥬",
  bevande: "🥤",
  drinks: "🥤",
  pane: "🍞",
  bread: "🍞",
  bakery: "🍞",
  pesce: "🐟",
  fish: "🐟",
  seafood: "🐟",
  surgelati: "🧊",
  frozen: "🧊",
  condimenti: "🫒",
  condiments: "🫒",
  dolci: "🍫",
  sweets: "🍫",
  cereali: "🌾",
  cereals: "🌾",
  grains: "🌾",
  uova: "🥚",
  eggs: "🥚",
  pasta: "🍝",
  legumi: "🫘",
  legumes: "🫘",
  snack: "🍿",
  olio: "🫒",
  oil: "🫒",
};

export function getFoodEmoji(category: string | null | undefined): string {
  if (!category) return "📦";
  const key = category.toLowerCase().trim();
  return categoryEmoji[key] ?? "📦";
}

export function getFoodImage(
  imageUrl: string | null | undefined,
  category: string | null | undefined
): { type: "image" | "emoji"; value: string } {
  if (imageUrl) return { type: "image", value: imageUrl };
  return { type: "emoji", value: getFoodEmoji(category) };
}
