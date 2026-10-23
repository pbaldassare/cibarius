import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Registro delle scritture su Supabase fatte dal flusso di carico.
const inserts: { table: string; row: Record<string, unknown> }[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    const result = { data: [], error: null };
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    chain.insert = (row: Record<string, unknown>) => {
      inserts.push({ table, row });
      return {
        select: () => ({ single: () => Promise.resolve({ data: { id: `${table}-${inserts.length}` }, error: null }) }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
    };
    return chain;
  };
  return { supabase: { from: builder } };
});

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));
const recordMovement = vi.fn(async () => {});
vi.mock("@/lib/inventory-movements", () => ({ recordMovement: (...args: unknown[]) => recordMovement(...args) }));

import RestaurantAddFlow from "@/components/RestaurantAddFlow";

describe("RestaurantAddFlow precompilato da un ordine", () => {
  beforeEach(() => {
    inserts.length = 0;
    recordMovement.mockClear();
  });

  it("parte dai dettagli e carica i prodotti dell'ordine senza duplicarli", async () => {
    const onComplete = vi.fn();
    render(
      <RestaurantAddFlow
        open
        onOpenChange={() => {}}
        restaurantId="r1"
        onComplete={onComplete}
        movementNotes="Da ordine a Ortofrutta"
        initialItems={[
          { name: "Pomodori", quantity: 3, unit: "kg", productId: "p-pomodori" },
          { name: "Basilico", quantity: 10, unit: "pezzi", productId: "p-basilico" },
        ]}
      />,
    );

    expect(await screen.findByText("1/2 — Dettagli")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pomodori")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Prossimo/ }));
    expect(await screen.findByText("2/2 — Dettagli")).toBeInTheDocument();
    // "pezzi" del catalogo diventa "pz" del magazzino
    expect(screen.getByDisplayValue("pz")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Salva e genera etichette/ }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    expect(inserts.filter((i) => i.table === "products")).toHaveLength(0);
    const stock = inserts.filter((i) => i.table === "inventory_items").map((i) => i.row);
    expect(stock.map((r) => [r.product_id, r.quantity, r.unit])).toEqual([
      ["p-pomodori", 3, "kg"],
      ["p-basilico", 10, "pz"],
    ]);
    expect(recordMovement).toHaveBeenCalledWith(expect.objectContaining({ notes: "Da ordine a Ortofrutta", movementType: "carico" }));
  });
});
