import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type IngestLine = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  storage_type?: string | null;
};

export type IngestPayload = {
  idempotency_key: string;
  lines: IngestLine[];
  header?: {
    supplier_name?: string | null;
    document_number?: string | null;
    document_type?: string | null;
    notes?: string | null;
  };
  source_document_id?: string | null;
};

export type IngestOutcome = {
  created: number;
  total: number;
  skipped: boolean;
  skipReason?: string;
  errors: string[];
};

const productKey = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type ProductIndex = Map<string, { id: string; name: string }>;

const loadProductIndex = async (sb: SupabaseClient, restaurantId: string): Promise<ProductIndex> => {
  const index: ProductIndex = new Map();
  const [lotsRes, movRes] = await Promise.all([
    sb.from("inventory_items")
      .select("product_id, product:products(name)")
      .eq("restaurant_id", restaurantId)
      .not("product_id", "is", null)
      .limit(2000),
    sb.from("inventory_movements")
      .select("product_id, product_name")
      .eq("restaurant_id", restaurantId)
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

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

const resolveProduct = async (
  sb: SupabaseClient,
  index: ProductIndex,
  name: string,
  unit?: string | null,
): Promise<{ productId: string | null; productName: string; error: string | null }> => {
  const trimmed = name.trim();
  if (!trimmed) return { productId: null, productName: trimmed, error: "Nome prodotto mancante" };

  const key = productKey(trimmed);
  const existing = index.get(key);
  if (existing) return { productId: existing.id, productName: existing.name, error: null };

  const { data, error } = await sb
    .from("products")
    .insert({ name: trimmed, unit: unit ?? null })
    .select("id")
    .single();

  if (error || !data) {
    return { productId: null, productName: trimmed, error: error?.message ?? "Prodotto non creato" };
  }

  index.set(key, { id: data.id, name: trimmed });
  return { productId: data.id, productName: trimmed, error: null };
};

const documentAlreadyImported = async (sb: SupabaseClient, documentId: string): Promise<boolean> => {
  const { data } = await sb
    .from("inventory_movements")
    .select("id")
    .eq("source_document_id", documentId)
    .eq("movement_type", "carico")
    .limit(1);
  return (data?.length ?? 0) > 0;
};

const hashKey = async (raw: string): Promise<string> => {
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const verifyRestaurantApiKey = async (
  sb: SupabaseClient,
  rawKey: string,
): Promise<{ restaurantId: string; keyId: string } | null> => {
  if (!rawKey.startsWith("cibr_") || rawKey.length < 20) return null;
  const keyHash = await hashKey(rawKey);
  const { data } = await sb
    .from("restaurant_api_keys")
    .select("id, restaurant_id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return { restaurantId: data.restaurant_id, keyId: data.id };
};

export const ingestStockForRestaurant = async (
  sb: SupabaseClient,
  restaurantId: string,
  payload: IngestPayload,
): Promise<IngestOutcome> => {
  const lines = payload.lines ?? [];
  const errors: string[] = [];

  if (!payload.idempotency_key?.trim()) {
    return { created: 0, total: lines.length, skipped: true, skipReason: "missing_idempotency_key", errors: ["idempotency_key obbligatoria"] };
  }

  if (lines.length === 0) {
    return { created: 0, total: 0, skipped: true, skipReason: "empty", errors };
  }

  const { data: existingIdem } = await sb
    .from("integration_idempotency")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("idempotency_key", payload.idempotency_key.trim())
    .maybeSingle();

  if (existingIdem) {
    return { created: 0, total: lines.length, skipped: true, skipReason: "already_imported", errors };
  }

  if (payload.source_document_id && (await documentAlreadyImported(sb, payload.source_document_id))) {
    return { created: 0, total: lines.length, skipped: true, skipReason: "document_already_imported", errors };
  }

  const lotDefault = payload.header?.document_number?.trim() || null;
  let notes: string | null = payload.header?.notes ?? null;
  if (!notes && payload.header?.supplier_name && payload.header?.document_type) {
    notes = `Da ${payload.header.document_type} ${payload.header.supplier_name}`;
  } else if (!notes && payload.header?.document_type) {
    notes = `Da ${payload.header.document_type}`;
  }

  const index = await loadProductIndex(sb, restaurantId);
  let created = 0;

  for (const line of lines) {
    const trimmed = line.name?.trim();
    if (!trimmed) {
      errors.push("Riga senza nome prodotto");
      continue;
    }

    const unit = line.unit?.trim() || "pz";
    const { productId, productName, error: pErr } = await resolveProduct(sb, index, trimmed, unit);
    if (!productId) {
      errors.push(pErr ?? `Prodotto non creato: ${trimmed}`);
      continue;
    }

    const quantity = line.quantity != null && line.quantity > 0 ? line.quantity : 1;
    const storage = line.storage_type?.trim() || "frigo";
    const lotNumber = line.lot_number?.trim() || lotDefault;

    const { data: inv, error: iErr } = await sb
      .from("inventory_items")
      .insert({
        product_id: productId,
        restaurant_id: restaurantId,
        storage_type: storage,
        quantity,
        unit,
        lot_number: lotNumber,
        expiry_date: line.expiry_date ?? null,
        source_document_id: payload.source_document_id ?? null,
      })
      .select("id")
      .single();

    if (iErr || !inv) {
      errors.push(iErr?.message ?? `Inventario non creato: ${trimmed}`);
      continue;
    }

    const { error: movErr } = await sb.from("inventory_movements").insert({
      restaurant_id: restaurantId,
      inventory_item_id: inv.id,
      product_id: productId,
      product_name: productName,
      movement_type: "carico",
      quantity_delta: quantity,
      unit,
      lot_number: lotNumber,
      expiry_date: line.expiry_date ?? null,
      source_document_id: payload.source_document_id ?? null,
      notes,
      user_id: null,
      user_name: "API integrazione",
    });

    if (movErr) {
      errors.push(movErr.message);
      continue;
    }

    created++;
  }

  return { created, total: lines.length, skipped: false, errors };
};
