/** Peso di una porzione dal peso netto totale e dal numero di porzioni/pezzi. */
export function portionWeightG(
  totalNetWeightG: number | null | undefined,
  quantity: number | null | undefined,
): number | null {
  if (totalNetWeightG == null || totalNetWeightG <= 0) return null;
  if (quantity == null || quantity <= 0) return null;
  return Math.round((totalNetWeightG / quantity) * 10) / 10;
}

export function formatGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toLocaleString("it-IT", { maximumFractionDigits: 2 })} kg`;
  return `${g.toLocaleString("it-IT", { maximumFractionDigits: 1 })} g`;
}
