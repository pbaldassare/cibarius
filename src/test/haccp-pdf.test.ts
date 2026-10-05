import { describe, expect, it } from "vitest";
import { CONSERVATION_LABELS, formatHaccpDate } from "@/components/HaccpPublicPdfDocument";

describe("HACCP PDF helpers", () => {
  it("formatta le date in gg/mm/aaaa", () => {
    expect(formatHaccpDate("2026-10-05")).toBe("05/10/2026");
    expect(formatHaccpDate(null)).toBe("—");
  });

  it("traduce il tipo di conservazione", () => {
    expect(CONSERVATION_LABELS.frigo).toContain("Frigo");
    expect(CONSERVATION_LABELS.freezer).toContain("Congelatore");
  });
});
