import { supabase } from "@/integrations/supabase/client";

/**
 * Riuso del prodotto a catalogo per i carichi di magazzino.
 *
 * `inventory_items.product_id` e' obbligatorio, quindi ogni carico deve
 * puntare a una riga di `products`. Finora sia il carico rapido sia l'import
 * da bolla facevano una INSERT secca: caricare due volte lo stesso articolo
 * creava due prodotti distinti, quindi due righe separate in Giacenze e una
 * stima di consumo spezzata a meta' (i movimenti si dividono fra i due id).
 *
 * Qui si costruisce un indice dei prodotti che il ristorante ha gia' usato e
 * lo si consulta prima di creare. L'indice si popola da due fonti perche'
 * nessuna delle due basta da sola:
 *   - `inventory_items`     -> lotti attualmente a magazzino
 *   - `inventory_movements` -> storico, che sopravvive ai lotti esauriti
 */

/** Chiave di confronto: minuscole, senza accenti, senza punteggiatura. */
export const productKey = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Prodotti gia' noti al ristorante, indicizzati per nome normalizzato. */
export type ProductIndex = Map<string, string>;

/**
 * Carica l'indice una volta sola, prima di un ciclo di carichi.
 *
 * Le righe con lo stesso nome normalizzato ma id diversi sono duplicati gia'
 * presenti a database: vince il primo incontrato fra i lotti attivi, cosi' i
 * carichi successivi convergono su un prodotto ancora in uso.
 */
export const loadProductIndex = async (restaurantId: string): Promise<ProductIndex> => {
  const index: ProductIndex = new Map();

  const [lotsRes, movRes] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("product_id, product:products(name)")
      .eq("restaurant_id", restaurantId)
      .not("product_id", "is", null)
      .limit(2000),
    supabase
      .from("inventory_movements")
      .select("product_id, product_name")
      .eq("restaurant_id", restaurantId)
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  // Prima i lotti attivi: hanno la precedenza sullo storico.
  for (const row of (lotsRes.data ?? []) as { product_id: string | null; product: { name: string } | null }[]) {
    const name = row.product?.name;
    if (!row.product_id || !name) continue;
    const key = productKey(name);
    if (key && !index.has(key)) index.set(key, row.product_id);
  }

  for (const row of (movRes.data ?? []) as { product_id: string | null; product_name: string }[]) {
    if (!row.product_id || !row.product_name) continue;
    const key = productKey(row.product_name);
    if (key && !index.has(key)) index.set(key, row.product_id);
  }

  return index;
};

/**
 * Restituisce l'id del prodotto da usare per un carico, creandolo se serve.
 *
 * L'indice viene aggiornato in memoria: due righe della stessa bolla con lo
 * stesso articolo finiscono sullo stesso prodotto senza una seconda query.
 */
export const resolveProduct = async (
  index: ProductIndex,
  name: string,
  unit?: string | null,
): Promise<{ productId: string | null; created: boolean; error: string | null }> => {
  const trimmed = name.trim();
  if (!trimmed) return { productId: null, created: false, error: "Nome prodotto mancante" };

  const key = productKey(trimmed);
  const existing = index.get(key);
  if (existing) return { productId: existing, created: false, error: null };

  const { data, error } = await supabase
    .from("products")
    .insert({ name: trimmed, unit: unit ?? null })
    .select("id")
    .single();

  if (error || !data) {
    return { productId: null, created: false, error: error?.message ?? "Prodotto non creato" };
  }

  index.set(key, data.id);
  return { productId: data.id, created: true, error: null };
};

/**
 * Dice se una bolla e' gia' stata portata in magazzino.
 *
 * L'unica prova affidabile e' il registro movimenti: i carichi generati da un
 * documento portano `source_document_id`. Senza questo controllo un secondo
 * clic sul pulsante duplicava tutti gli articoli della bolla.
 */
export const documentAlreadyImported = async (documentId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("inventory_movements")
    .select("id")
    .eq("source_document_id", documentId)
    .eq("movement_type", "carico")
    .limit(1);

  return (data?.length ?? 0) > 0;
};

/** Documenti gia' importati, in un colpo solo per l'intera lista. */
export const loadImportedDocumentIds = async (restaurantId: string): Promise<Set<string>> => {
  const { data } = await supabase
    .from("inventory_movements")
    .select("source_document_id")
    .eq("restaurant_id", restaurantId)
    .eq("movement_type", "carico")
    .not("source_document_id", "is", null)
    .limit(2000);

  return new Set(
    ((data ?? []) as { source_document_id: string | null }[])
      .map((r) => r.source_document_id)
      .filter((id): id is string => !!id),
  );
};
