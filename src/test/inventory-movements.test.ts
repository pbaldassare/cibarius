import { describe, it, expect } from "vitest";
import { forecastFromMovements, fmtQty, type Movement } from "@/lib/inventory-movements";

type Out = Pick<Movement, "movement_type" | "quantity_delta" | "created_at">;

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const movement = (delta: number, days: number): Out => ({
  movement_type: delta > 0 ? "carico" : "consumo",
  quantity_delta: delta,
  created_at: daysAgo(days),
});

describe("forecastFromMovements", () => {
  it("non stima nulla senza movimenti in uscita", () => {
    const { dailyRate, daysLeft } = forecastFromMovements([movement(50, 3)], 50);
    expect(dailyRate).toBe(0);
    expect(daysLeft).toBeNull();
  });

  it("ignora i carichi nel calcolo del consumo", () => {
    // 100 caricati, 20 consumati in 10 giorni => 2/giorno, non 12
    const movements = [movement(100, 10), movement(-20, 10)];
    const { dailyRate } = forecastFromMovements(movements, 80);
    expect(dailyRate).toBeCloseTo(2, 1);
  });

  it("divide per la finestra osservata, non per windowDays", () => {
    // Il primo movimento e' di 10 giorni fa: dividere per 90 darebbe 0.44/g
    // e una previsione di esaurimento assurdamente lontana.
    const { dailyRate, daysLeft } = forecastFromMovements([movement(-40, 10)], 20, 90);
    expect(dailyRate).toBeCloseTo(4, 1);
    expect(daysLeft).toBe(5);
  });

  it("scarta i movimenti fuori dalla finestra", () => {
    const vecchio = movement(-1000, 200);
    const recente = movement(-10, 5);
    const { dailyRate } = forecastFromMovements([vecchio, recente], 100, 90);
    expect(dailyRate).toBeCloseTo(2, 1);
  });

  it("somma consumo e spreco: entrambi svuotano il magazzino", () => {
    const consumo: Out = { movement_type: "consumo", quantity_delta: -6, created_at: daysAgo(3) };
    const spreco: Out = { movement_type: "spreco", quantity_delta: -3, created_at: daysAgo(3) };
    const { dailyRate } = forecastFromMovements([consumo, spreco], 30);
    expect(dailyRate).toBeCloseTo(3, 1);
  });

  it("arrotonda i giorni per difetto: meglio pessimista", () => {
    // 10 in giacenza, 3/giorno => 3.33 giorni, deve dire 3
    const { daysLeft } = forecastFromMovements([movement(-9, 3)], 10);
    expect(daysLeft).toBe(3);
  });

  it("con giacenza a zero prevede esaurimento immediato", () => {
    const { daysLeft } = forecastFromMovements([movement(-9, 3)], 0);
    expect(daysLeft).toBe(0);
  });
});

describe("fmtQty", () => {
  it("toglie i decimali inutili", () => {
    expect(fmtQty(2, "kg")).toBe("2 kg");
    expect(fmtQty(2.5, "kg")).toBe("2.5 kg");
  });

  it("tronca la coda di virgola mobile", () => {
    expect(fmtQty(0.1 + 0.2)).toBe("0.3");
  });

  it("funziona senza unita'", () => {
    expect(fmtQty(4)).toBe("4");
  });
});
