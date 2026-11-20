import { describe, it, expect } from "vitest";
import { formatExpiryDate } from "@/lib/format-date";
import {
  compareByExpiry,
  daysUntilExpiry,
  getCoarseExpiryStatus,
  getExpiryBadgeLabel,
  getExpiryLabel,
  getExpiryStatus,
  isExpired,
  isExpiringSoon,
  parseExpiryDate,
} from "@/lib/expiry-status";

// Pomeriggio del 3 ottobre, ora italiana: il fuso e' due ore avanti su UTC ed
// e' proprio li' che nasceva lo sfasamento di un giorno.
const now = new Date(2026, 9, 3, 15, 30, 0);

describe("parseExpiryDate", () => {
  it("legge le date di Postgres come mezzanotte locale, non UTC", () => {
    const parsed = parseExpiryDate("2026-10-03")!;
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(3);
    expect(parsed.getHours()).toBe(0);
  });

  it("restituisce null se la data manca o non e' leggibile", () => {
    expect(parseExpiryDate(null)).toBeNull();
    expect(parseExpiryDate("")).toBeNull();
    expect(parseExpiryDate("non una data")).toBeNull();
  });
});

describe("daysUntilExpiry", () => {
  it("conta zero giorni per un prodotto che scade oggi", () => {
    expect(daysUntilExpiry("2026-10-03", now)).toBe(0);
  });

  it("non si lascia influenzare dall'ora del giorno", () => {
    const mattina = new Date(2026, 9, 3, 7, 0, 0);
    const notte = new Date(2026, 9, 3, 23, 59, 0);
    expect(daysUntilExpiry("2026-10-05", mattina)).toBe(2);
    expect(daysUntilExpiry("2026-10-05", notte)).toBe(2);
  });

  it("usa numeri negativi per i prodotti gia' scaduti", () => {
    expect(daysUntilExpiry("2026-10-01", now)).toBe(-2);
  });

  it("attraversa il cambio dell'ora legale senza perdere un giorno", () => {
    // In Italia l'ora legale finisce il 25 ottobre 2026: fra il 24 e il 26
    // ottobre passano 49 ore, non 48.
    const prima = new Date(2026, 9, 24, 12, 0, 0);
    expect(daysUntilExpiry("2026-10-26", prima)).toBe(2);
  });
});

describe("getExpiryStatus", () => {
  it("distingue oggi, domani e i giorni successivi", () => {
    expect(getExpiryStatus("2026-10-02", now)).toBe("expired");
    expect(getExpiryStatus("2026-10-03", now)).toBe("today");
    expect(getExpiryStatus("2026-10-04", now)).toBe("tomorrow");
    expect(getExpiryStatus("2026-10-06", now)).toBe("soon");
    expect(getExpiryStatus("2026-10-07", now)).toBe("ok");
    expect(getExpiryStatus(null, now)).toBe("nodate");
  });

  it("da' la stessa risposta a tutte le viste per un prodotto in scadenza oggi", () => {
    // Il caso che in home diceva "Scade domani", nell'elenco "In scadenza" e
    // nelle ricette "Scaduto".
    const oggi = "2026-10-03";
    expect(getExpiryStatus(oggi, now)).toBe("today");
    expect(getCoarseExpiryStatus(oggi, now)).toBe("expiring");
    expect(getExpiryLabel(oggi, now)).toBe("Scade oggi");
    expect(getExpiryBadgeLabel(oggi, now)).toBe("IN SCADENZA");
    expect(isExpired(oggi, now)).toBe(false);
    expect(isExpiringSoon(oggi, undefined, now)).toBe(true);
  });
});

describe("getCoarseExpiryStatus", () => {
  it("raggruppa oggi, domani e fra poco sotto in scadenza", () => {
    expect(getCoarseExpiryStatus("2026-10-03", now)).toBe("expiring");
    expect(getCoarseExpiryStatus("2026-10-04", now)).toBe("expiring");
    expect(getCoarseExpiryStatus("2026-10-06", now)).toBe("expiring");
    expect(getCoarseExpiryStatus("2026-10-07", now)).toBe("ok");
    expect(getCoarseExpiryStatus("2026-10-02", now)).toBe("expired");
    expect(getCoarseExpiryStatus(null, now)).toBe("nodate");
  });
});

describe("isExpired", () => {
  it("non considera scaduto quello che scade oggi", () => {
    // Confrontare la data con l'ora corrente, come si faceva nella selezione
    // degli ingredienti, escludeva dalle ricette il prodotto da usare per primo.
    expect(isExpired("2026-10-03", now)).toBe(false);
    expect(isExpired("2026-10-02", now)).toBe(true);
    expect(isExpired(null, now)).toBe(false);
  });
});

describe("formatExpiryDate", () => {
  it("stampa il giorno scritto a database", () => {
    expect(formatExpiryDate("2026-10-03")).toBe("03/10/2026");
    expect(formatExpiryDate("2026-10-03", { day: "2-digit", month: "2-digit", year: "2-digit" })).toBe("03/10/26");
    expect(formatExpiryDate(null)).toBe("");
  });
});

describe("isExpiringSoon", () => {
  it("esclude i prodotti gia' scaduti", () => {
    expect(isExpiringSoon("2026-10-02", 3, now)).toBe(false);
  });

  it("rispetta una finestra piu' ampia quando richiesta", () => {
    expect(isExpiringSoon("2026-10-08", 3, now)).toBe(false);
    expect(isExpiringSoon("2026-10-08", 5, now)).toBe(true);
  });
});

describe("getExpiryLabel", () => {
  it("usa il singolare per il giorno appena passato", () => {
    expect(getExpiryLabel("2026-10-02", now)).toBe("Scaduto da ieri");
    expect(getExpiryLabel("2026-09-30", now)).toBe("Scaduto da 3 giorni");
  });
});

describe("compareByExpiry", () => {
  it("mette i piu' urgenti davanti e chi non ha data in fondo", () => {
    const date = ["2026-10-07", null, "2026-10-01", "2026-10-03"];
    expect([...date].sort(compareByExpiry)).toEqual([
      "2026-10-01",
      "2026-10-03",
      "2026-10-07",
      null,
    ]);
  });
});
