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

/**
 * Prodotti gia' noti al ristorante, indicizzati per nome normalizzato.
 *
 * Si tiene anche il nome per esteso: quando un carico riusa un prodotto
 * esistente, il registro movimenti deve riportare il nome a catalogo e non
 * quello digitato al momento, altrimenti lo stesso articolo compare nella
 * lista con grafie diverse ("qa pomodori pelati" accanto a "QA Pomodori
 * Pelati").
 */
export type ProductIndex = Map<string, { id: string; name: string }>;

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
    if (key && !index.has(key)) index.set(key, { id: row.product_id, name });
  }

  for (const row of (movRes.data ?? []) as { product_id: string | null; product_name: string }[]) {
    if (!row.product_id || !row.product_name) continue;
    const key = productKey(row.product_name);
    if (key && !index.has(key)) index.set(key, { id: row.product_id, name: row.product_name });
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
): Promise<{ productId: string | null; productName: string; created: boolean; error: string | null }> => {
  const trimmed = name.trim();
  if (!trimmed) return { productId: null, productName: trimmed, created: false, error: "Nome prodotto mancante" };

  const key = productKey(trimmed);
  const existing = index.get(key);
  // Vince il nome a catalogo: il registro resta leggibile.
  if (existing) return { productId: existing.id, productName: existing.name, created: false, error: null };

  const { data, error } = await supabase
    .from("products")
    .insert({ name: trimmed, unit: unit ?? null })
    .select("id")
    .single();

  if (error || !data) {
    return { productId: null, productName: trimmed, created: false, error: error?.message ?? "Prodotto non creato" };
  }

  index.set(key, { id: data.id, name: trimmed });
  return { productId: data.id, productName: trimmed, created: true, error: null };
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

/* ─────────── duplicati gia' a magazzino ─────────── */

/**
 * Quanto due nomi sembrano lo stesso articolo, fra 0 e 1.
 *
 * Si misura il contenimento e non la sovrapposizione simmetrica: "Pomodori
 * pelati" e "[DEMO] Pomodori pelati" sono lo stesso prodotto anche se uno ha
 * una parola in piu'. Le parole corte si scartano perche' unita' di misura e
 * pezzature ("kg", "1l") non dicono nulla sull'identita' del prodotto.
 *
 * Il peso e' la lunghezza della parola, non il semplice conteggio: condividere
 * "mozzarella" dice molto piu' che condividere "olio". Contando le parole,
 * "[DEMO] Mozzarella" e "Mozzarella fiordilatte" restavano sotto soglia
 * perche' il prefisso diluiva il punteggio, mentre "Olio EVO" e "Olio di
 * semi" ci finivano sopra.
 */
export const nameSimilarity = (a: string, b: string): number => {
  const words = (s: string) => productKey(s).split(" ").filter((w) => w.length >= 3);
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) return 0;

  const peso = (list: string[]) => list.reduce((sum, w) => sum + w.length, 0);
  const setB = new Set(wb);
  const condivise = wa.filter((w) => setB.has(w));

  return peso(condivise) / Math.min(peso(wa), peso(wb));
};

/** Soglia oltre la quale due nomi vengono proposti come duplicati. */
export const DUPLICATE_THRESHOLD = 0.6;

export interface DuplicatePair<T> {
  a: T;
  b: T;
  score: number;
}

/**
 * Coppie di righe di magazzino che sembrano lo stesso prodotto.
 *
 * E' un suggerimento, non una fusione automatica: "Farina 00" e "Farina 0"
 * si somigliano moltissimo e sono due articoli diversi. Decide chi guarda.
 */
export const findDuplicatePairs = <T extends { productId: string; name: string }>(
  rows: T[],
): DuplicatePair<T>[] => {
  const pairs: DuplicatePair<T>[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const score = nameSimilarity(rows[i].name, rows[j].name);
      if (score >= DUPLICATE_THRESHOLD) pairs.push({ a: rows[i], b: rows[j], score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
};

export interface MergeOutcome {
  lots_moved: number;
  movements_moved: number;
  source_deleted: boolean;
  target_name: string;
}

/**
 * Unisce due prodotti nel magazzino del ristorante.
 *
 * Il lavoro lo fa la funzione SQL `merge_restaurant_products`: sposta lotti e
 * movimenti e cancella il prodotto di origine solo se non lo usa piu' nessuno.
 * Non si puo' fare dal client perche' `products` non ha policy di DELETE e
 * `inventory_items` cancella a cascata: una DELETE diretta farebbe sparire le
 * giacenze di chiunque condivida quel prodotto a catalogo.
 *
 * Il cast serve perche' `types.ts` e' rigenerato dall'API e non conosce
 * ancora questa funzione.
 */
export const mergeProducts = async (
  restaurantId: string,
  targetProductId: string,
  sourceProductId: string,
): Promise<{ data: MergeOutcome | null; error: string | null }> => {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, string>,
  ) => Promise<{ data: MergeOutcome | null; error: { message: string } | null }>)(
    "merge_restaurant_products",
    {
      p_restaurant_id: restaurantId,
      p_target_product: targetProductId,
      p_source_product: sourceProductId,
    },
  );

  return { data, error: error?.message ?? null };
};
