import { describe, it, expect } from "vitest";
import { buildSupplierSpendReport, cartTotal } from "@/lib/supplier-orders";

const order = (over: Record<string, unknown>) => ({
  id: "o1",
  supplier_id: "s1",
  supplier_name: "Ortofrutta",
  status: "consegnato",
  total: 10,
  created_at: "2026-10-02T08:00:00Z",
  delivered_at: "2026-10-03T08:00:00Z",
  ...over,
});

describe("cartTotal", () => {
  it("arrotonda ogni riga come il database e ignora i prezzi mancanti", () => {
    expect(cartTotal([{ price: 2.5, quantity: 3 }, { price: 1.333, quantity: 3 }, { price: null, quantity: 5 }])).toBe(11.5);
  });
});

describe("buildSupplierSpendReport", () => {
  const from = new Date("2026-10-01T00:00:00Z");
  const to = new Date("2026-11-01T00:00:00Z");

  it("conta solo i consegnati nel periodo, per data di consegna", () => {
    const report = buildSupplierSpendReport(
      [
        order({ id: "a", total: 19.5 }),
        order({ id: "b", total: 5, supplier_id: "s2", supplier_name: "Latticini" }),
        order({ id: "c", total: 100, delivered_at: "2026-11-02T08:00:00Z" }),
        order({ id: "d", total: 40, status: "confermato", delivered_at: null }),
        order({ id: "e", total: 7, status: "annullato", delivered_at: null }),
      ],
      {
        a: [{ product_name: "Pomodori", unit: "kg", quantity: 3, line_total: 7.5 }, { product_name: "Basilico", unit: "pz", quantity: 10, line_total: 12 }],
        b: [{ product_name: "Pomodori", unit: "kg", quantity: 2, line_total: 5 }],
      },
      from,
      to,
    );
    expect(report.total).toBe(24.5);
    expect(report.deliveredCount).toBe(2);
    expect(report.bySupplier.map((s) => [s.name, s.total])).toEqual([["Ortofrutta", 19.5], ["Latticini", 5]]);
    expect(report.topProducts[0]).toEqual({ name: "Pomodori", unit: "kg", quantity: 5, total: 12.5 });
    expect(report.open).toEqual({ count: 1, total: 40 });
  });
});
