import { supabase } from "@/integrations/supabase/client";
import { recordMovement } from "@/lib/inventory-movements";
import {
  loadProductIndex,
  resolveProduct,
  documentAlreadyImported,
  type ProductIndex,
} from "@/lib/restaurant-products";

export type IngestLine = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  storage_type?: "frigo" | "congelatore" | "dispensa" | string | null;
};

export type IngestReceiptHeader = {
  supplier_name?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  notes?: string | null;
};

export type IngestReceiptInput = {
  lines: IngestLine[];
  header?: IngestReceiptHeader;
  /** Se presente, riusa il controllo idempotenza delle bolle HACCP. */
  source_document_id?: string | null;
};

export type IngestReceiptResult = {
  created: number;
  total: number;
  skipped: boolean;
  skipReason?: "already_imported" | "empty";
  errors: string[];
};

const defaultNotes = (header?: IngestReceiptHeader): string | null => {
  if (!header) return null;
  if (header.notes) return header.notes;
  if (header.supplier_name && header.document_type) {
    return `Da ${header.document_type} ${header.supplier_name}`;
  }
  if (header.document_type) return `Da ${header.document_type}`;
  return null;
};

/**
 * Carica righe in magazzino con la stessa semantica di Bolle → "Carica articoli".
 */
export const ingestReceiptLines = async (
  restaurantId: string,
  input: IngestReceiptInput,
): Promise<IngestReceiptResult> => {
  const lines = input.lines ?? [];
  const errors: string[] = [];

  if (lines.length === 0) {
    return { created: 0, total: 0, skipped: true, skipReason: "empty", errors };
  }

  if (input.source_document_id) {
    if (await documentAlreadyImported(input.source_document_id)) {
      return {
        created: 0,
        total: lines.length,
        skipped: true,
        skipReason: "already_imported",
        errors,
      };
    }
  }

  const lotDefault =
    input.header?.document_number?.trim() || null;
  const notes = defaultNotes(input.header);
  const index: ProductIndex = await loadProductIndex(restaurantId);
  let created = 0;

  for (const line of lines) {
    const trimmed = line.name?.trim();
    if (!trimmed) {
      errors.push("Riga senza nome prodotto");
      continue;
    }

    const unit = line.unit?.trim() || "pz";
    const { productId, productName, error: pErr } = await resolveProduct(index, trimmed, unit);
    if (!productId) {
      errors.push(pErr ?? `Prodotto non creato: ${trimmed}`);
      continue;
    }

    const quantity = line.quantity != null && line.quantity > 0 ? line.quantity : 1;
    const storage = line.storage_type || "frigo";
    const lotNumber = line.lot_number?.trim() || lotDefault;

    const { data: inv, error: iErr } = await supabase
      .from("inventory_items")
      .insert({
        product_id: productId,
        restaurant_id: restaurantId,
        storage_type: storage,
        quantity,
        unit,
        lot_number: lotNumber,
        expiry_date: line.expiry_date ?? null,
        source_document_id: input.source_document_id ?? null,
      })
      .select("id")
      .single();

    if (iErr || !inv) {
      errors.push(iErr?.message ?? `Inventario non creato: ${trimmed}`);
      continue;
    }

    const { error: movErr } = await recordMovement({
      restaurantId,
      inventoryItemId: inv.id,
      productId,
      productName,
      movementType: "carico",
      quantity,
      unit,
      lotNumber,
      expiryDate: line.expiry_date ?? null,
      sourceDocumentId: input.source_document_id ?? null,
      notes,
    });

    if (movErr) {
      errors.push(movErr.message);
      continue;
    }

    created++;
  }

  return {
    created,
    total: lines.length,
    skipped: false,
    errors,
  };
};
