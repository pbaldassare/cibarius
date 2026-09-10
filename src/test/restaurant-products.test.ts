import { describe, it, expect } from "vitest";
import { productKey } from "@/lib/restaurant-products";

describe("productKey", () => {
  it("ignora maiuscole e spazi di troppo", () => {
    expect(productKey("  Pomodori   Pelati ")).toBe(productKey("pomodori pelati"));
  });

  it("ignora accenti e punteggiatura", () => {
    expect(productKey("Purè di patate")).toBe(productKey("Pure' di patate"));
    expect(productKey("Mozzarella (bufala)")).toBe(productKey("Mozzarella bufala"));
  });

  it("tiene distinti prodotti diversi", () => {
    // Meglio un prodotto nuovo che un accorpamento sbagliato: la pezzatura
    // fa parte del nome e i due articoli restano separati.
    expect(productKey("Farina 00")).not.toBe(productKey("Farina 0"));
    expect(productKey("Olio di oliva")).not.toBe(productKey("Olio di semi"));
  });

  it("restituisce vuoto per un nome senza caratteri utili", () => {
    expect(productKey("   ")).toBe("");
    expect(productKey("---")).toBe("");
  });
});
