import { describe, expect, it } from "vitest";
import { formatGrams, portionWeightG } from "@/lib/portion-weight";

describe("portionWeightG", () => {
  it("divide il peso netto totale per le porzioni", () => {
    expect(portionWeightG(2000, 10)).toBe(200);
    expect(portionWeightG(500, 1)).toBe(500);
    expect(portionWeightG(1000, 3)).toBe(333.3);
  });

  it("non calcola se manca totale o quantita", () => {
    expect(portionWeightG(null, 10)).toBeNull();
    expect(portionWeightG(500, 0)).toBeNull();
    expect(portionWeightG(500, null)).toBeNull();
  });

  it("formatta i grammi", () => {
    expect(formatGrams(200)).toBe("200 g");
    expect(formatGrams(1500)).toBe("1,5 kg");
  });
});
