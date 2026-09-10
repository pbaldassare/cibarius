import { describe, it, expect } from "vitest";
import { productKey, nameSimilarity, findDuplicatePairs } from "@/lib/restaurant-products";

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

describe("nameSimilarity e findDuplicatePairs", () => {
  it("riconosce lo stesso prodotto con un prefisso in piu'", () => {
    expect(nameSimilarity("[DEMO] Pomodori pelati", "Pomodori pelati")).toBe(1);
    expect(nameSimilarity("Mozzarella", "Mozzarella fiordilatte")).toBe(1);
  });

  it("riconosce lo stesso articolo sotto un prefisso di catalogo", () => {
    // Contando le parole questi restavano sotto soglia: "[DEMO]" diluiva.
    expect(nameSimilarity("[DEMO] Mozzarella", "Mozzarella fiordilatte")).toBeGreaterThan(0.6);
    expect(nameSimilarity("[DEMO] Parmigiano 24m", "Parmigiano 24 mesi")).toBeGreaterThan(0.6);
  });

  it("non propone accostamenti retti da una parola generica", () => {
    // "olio" e' condiviso ma corto: non basta a dire che sia lo stesso olio.
    expect(nameSimilarity("Olio EVO", "Olio di semi")).toBeLessThan(0.6);
  });

  it("non accosta prodotti senza parole in comune", () => {
    expect(nameSimilarity("Branzino", "Petto di pollo")).toBe(0);
  });

  it("ignora le parole troppo corte", () => {
    // "kg" e "1l" non dicono nulla sull'identita' del prodotto
    expect(nameSimilarity("Olio 1l", "Farina kg")).toBe(0);
  });

  it("propone le coppie sopra soglia, dalla piu' simile", () => {
    const rows = [
      { productId: "1", name: "[DEMO] Pomodori pelati" },
      { productId: "2", name: "Pomodori pelati" },
      { productId: "3", name: "Branzino" },
    ];
    const pairs = findDuplicatePairs(rows);
    expect(pairs).toHaveLength(1);
    expect([pairs[0].a.productId, pairs[0].b.productId]).toEqual(["1", "2"]);
  });

  it("non propone nulla quando i nomi sono distinti", () => {
    const rows = [
      { productId: "1", name: "Branzino" },
      { productId: "2", name: "Petto di pollo" },
      { productId: "3", name: "Zafferano" },
    ];
    expect(findDuplicatePairs(rows)).toHaveLength(0);
  });
});
