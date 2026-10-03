import { describe, it, expect } from "vitest";
import { matchesSearch, matchesSearchAny, normalizeText } from "@/lib/text-match";

describe("normalizeText", () => {
  it("toglie accenti, maiuscole e spazi di troppo", () => {
    expect(normalizeText("  Purè   di Patate ")).toBe("pure di patate");
    expect(normalizeText("Ragù")).toBe("ragu");
  });
});

describe("matchesSearch", () => {
  it("trova il plurale cercando il singolare", () => {
    // Il caso emerso dal giro di prova: "pomodoro" non trovava i pelati.
    expect(matchesSearch("Pomodori pelati", "pomodoro")).toBe(true);
    expect(matchesSearch("Piselli fini surgelati", "pisello")).toBe(true);
    expect(matchesSearch("Uova fresche", "uovo")).toBe(false); // plurale irregolare
  });

  it("trova il singolare cercando il plurale", () => {
    expect(matchesSearch("Latte intero UHT", "latti")).toBe(true);
    expect(matchesSearch("Filetto di merluzzo", "filetti")).toBe(true);
  });

  it("gestisce i plurali in -chi e -che", () => {
    expect(matchesSearch("Pesche sciroppate", "pesca")).toBe(true);
    expect(matchesSearch("Funghi porcini", "fungo")).toBe(true);
  });

  it("non confonde parole diverse che condividono la radice tronca", () => {
    expect(matchesSearch("Pesce spada", "pesca")).toBe(false);
    expect(matchesSearch("Pesche sciroppate", "pesce")).toBe(false);
  });

  it("ignora gli accenti in entrambe le direzioni", () => {
    expect(matchesSearch("Purè di patate", "pure")).toBe(true);
    expect(matchesSearch("Pure di patate", "purè")).toBe(true);
  });

  it("accetta le parole in ordine diverso", () => {
    expect(matchesSearch("Latte intero UHT", "intero latte")).toBe(true);
  });

  it("richiede che tutte le parole cercate siano presenti", () => {
    expect(matchesSearch("Latte intero UHT", "latte scremato")).toBe(false);
  });

  it("continua a funzionare mentre si digita", () => {
    expect(matchesSearch("Pomodori pelati", "pom")).toBe(true);
    expect(matchesSearch("Pomodori pelati", "pomod")).toBe(true);
  });

  it("con la ricerca vuota accetta tutto", () => {
    expect(matchesSearch("Qualsiasi cosa", "")).toBe(true);
    expect(matchesSearch("Qualsiasi cosa", "   ")).toBe(true);
  });

  it("non esplode su valori mancanti", () => {
    expect(matchesSearch(null, "latte")).toBe(false);
    expect(matchesSearch(undefined, "")).toBe(true);
  });
});

describe("matchesSearchAny", () => {
  it("basta che corrisponda uno dei campi", () => {
    expect(matchesSearchAny(["Yogurt greco", "Fage"], "fage")).toBe(true);
    expect(matchesSearchAny(["Yogurt greco", "Fage"], "greci")).toBe(true);
    expect(matchesSearchAny(["Yogurt greco", "Fage"], "danone")).toBe(false);
  });
});
