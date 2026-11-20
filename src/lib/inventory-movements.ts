import { supabase } from "@/integrations/supabase/client";

/**
 * Movimenti di magazzino.
 *
 * `inventory_items` tiene la giacenza corrente (una riga per lotto),
 * `inventory_movements` e' il libro mastro append-only che la spiega.
 * Ogni variazione di quantita' deve passare da qui: e' l'unico modo per
 * sapere quanto si consuma davvero e stimare quando finisce la merce.
 */

export type MovementType = "carico" | "consumo" | "spreco" | "rettifica";

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  carico: "Carico",
  consumo: "Consumo",
  spreco: "Spreco",
  rettifica: "Rettifica",
};

export interface MovementInput {
  restaurantId: string;
  inventoryItemId?: string | null;
  productId?: string | null;
  productName: string;
  movementType: MovementType;
  /** Sempre positiva: il segno lo decide il tipo di movimento. */
  quantity: number;
  unit?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  sourceDocumentId?: string | null;
  notes?: string | null;
}

export interface Movement {
  id: string;
  inventory_item_id: string | null;
  product_id: string | null;
  product_name: string;
  movement_type: MovementType;
  quantity_delta: number;
  unit: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  user_name: string | null;
  created_at: string;
}

/** I movimenti in uscita sono registrati con delta negativo. */
const isOutbound = (t: MovementType) => t === "consumo" || t === "spreco";

const currentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null as string | null, name: null as string | null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  return { id: user.id, name: profile?.full_name || profile?.email || null };
};

/**
 * Scrive una riga nel libro mastro. Non tocca la giacenza:
 * usare `applyMovement` per fare entrambe le cose.
 */
export const recordMovement = async (input: MovementInput) => {
  const { id: userId, name: userName } = await currentUser();
  const magnitude = Math.abs(input.quantity);

  return supabase.from("inventory_movements").insert({
    restaurant_id: input.restaurantId,
    inventory_item_id: input.inventoryItemId ?? null,
    product_id: input.productId ?? null,
    product_name: input.productName,
    movement_type: input.movementType,
    quantity_delta: isOutbound(input.movementType) ? -magnitude : magnitude,
    unit: input.unit ?? null,
    lot_number: input.lotNumber ?? null,
    expiry_date: input.expiryDate ?? null,
    source_document_id: input.sourceDocumentId ?? null,
    notes: input.notes ?? null,
    user_id: userId,
    user_name: userName,
  });
};

/**
 * Scarica un lotto: scala la quantita' e registra il movimento.
 *
 * Se `quantity` non e' indicata scarica tutto il residuo. La riga di
 * `inventory_items` viene eliminata solo quando arriva a zero — prima
 * "utilizzato" e "buttato" la cancellavano comunque, perdendo il resto.
 */
export const consumeFromItem = async (
  item: {
    id: string;
    restaurant_id: string;
    product_id?: string | null;
    quantity?: number | null;
    unit?: string | null;
    lot_number?: string | null;
    expiry_date?: string | null;
  },
  _productName: string,
  movementType: Extract<MovementType, "consumo" | "spreco">,
  quantity?: number,
): Promise<{ error: string | null; remaining: number }> => {
  const { data, error } = await supabase.rpc("consume_restaurant_stock", {
    p_restaurant_id: item.restaurant_id,
    p_item_id: item.id,
    p_is_preparation: false,
    p_movement_type: movementType,
    p_quantity: quantity ?? null,
  });
  return { error: error?.message ?? null, remaining: data ?? Number(item.quantity ?? 0) };
};

/**
 * Scarica una preparazione interna: scala le porzioni e registra il movimento.
 *
 * Stessa semantica dei lotti — la preparazione si elimina solo quando arriva a
 * zero. Senza questo, uno scarico parziale cancellerebbe l'intera teglia.
 */
export const consumeFromPreparation = async (
  prep: {
    id: string;
    restaurant_id: string;
    quantity?: number | null;
    unit?: string | null;
    lot_number?: string | null;
    expiry_date?: string | null;
  },
  _name: string,
  movementType: Extract<MovementType, "consumo" | "spreco">,
  quantity?: number,
): Promise<{ error: string | null; remaining: number }> => {
  const { data, error } = await supabase.rpc("consume_restaurant_stock", {
    p_restaurant_id: prep.restaurant_id,
    p_item_id: prep.id,
    p_is_preparation: true,
    p_movement_type: movementType,
    p_quantity: quantity ?? null,
  });
  return { error: error?.message ?? null, remaining: data ?? Number(prep.quantity ?? 0) };
};

/** Consumo medio giornaliero e giorni residui stimati, per prodotto. */
export interface StockForecast {
  /** Quantita' media consumata al giorno nella finestra osservata. */
  dailyRate: number;
  /** Giorni prima dell'esaurimento, null se non c'e' consumo misurabile. */
  daysLeft: number | null;
}

/**
 * Stima quando finisce la merce a partire dai soli movimenti in uscita.
 *
 * La finestra parte dal primo movimento osservato, non da `windowDays`:
 * con due settimane di storico non ha senso dividere per novanta giorni,
 * si otterrebbe un consumo medio artificialmente basso.
 */
export const forecastFromMovements = (
  movements: Pick<Movement, "movement_type" | "quantity_delta" | "created_at">[],
  currentStock: number,
  windowDays = 90,
): StockForecast => {
  const since = Date.now() - windowDays * 86400000;
  const outbound = movements.filter(
    (m) => m.quantity_delta < 0 && new Date(m.created_at).getTime() >= since,
  );
  if (outbound.length === 0) return { dailyRate: 0, daysLeft: null };

  const consumed = outbound.reduce((sum, m) => sum + Math.abs(Number(m.quantity_delta)), 0);
  const oldest = Math.min(...outbound.map((m) => new Date(m.created_at).getTime()));
  const spanDays = (Date.now() - oldest) / 86400000;

  /*
   * Serve almeno un giorno di osservazione.
   *
   * Prima la finestra veniva portata a un minimo di un giorno, quindi il
   * primo scarico appena registrato diventava il consumo di un'intera
   * giornata: scaricare 4 kg su 10 faceva scrivere "consumo medio 4 kg al
   * giorno" e "finisce in ~1 g". Meglio dire che non e' ancora misurabile.
   */
  if (spanDays < 1) return { dailyRate: 0, daysLeft: null };

  const dailyRate = consumed / spanDays;

  if (dailyRate <= 0) return { dailyRate: 0, daysLeft: null };
  return { dailyRate, daysLeft: Math.floor(currentStock / dailyRate) };
};

/** Formatta una quantita' senza decimali inutili ("2" invece di "2.000"). */
export const fmtQty = (n: number, unit?: string | null) => {
  const rounded = Math.round(n * 1000) / 1000;
  return `${rounded}${unit ? ` ${unit}` : ""}`;
};
