import type { SupabaseClient } from "@supabase/supabase-js";

export const FRANCESCA_USER_ID = "718a977f-1742-40bc-9960-c61a876e1d93";
const PREFIX = "[FB]";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

type ProductSeed = {
  name: string;
  brand: string | null;
  category: string;
  calories_100g: number;
  macros_100g: { p: number; c: number; f: number };
  barcode: string | null;
  serving_size_g: number;
};

const PRODUCTS: ProductSeed[] = [
  { name: `${PREFIX} Latte fresco`, brand: "Granarolo", category: "latticini", calories_100g: 64, macros_100g: { p: 3.3, c: 4.8, f: 3.6 }, barcode: "8002670001012", serving_size_g: 100 },
  { name: `${PREFIX} Mozzarella`, brand: "Galbani", category: "latticini", calories_100g: 280, macros_100g: { p: 18, c: 1, f: 22 }, barcode: "8000430301007", serving_size_g: 125 },
  { name: `${PREFIX} Yogurt greco 0%`, brand: "Fage", category: "latticini", calories_100g: 57, macros_100g: { p: 10, c: 4, f: 0 }, barcode: "5201360630011", serving_size_g: 150 },
  { name: `${PREFIX} Petto di pollo`, brand: null, category: "carne", calories_100g: 165, macros_100g: { p: 31, c: 0, f: 3.6 }, barcode: null, serving_size_g: 150 },
  { name: `${PREFIX} Uova fresche`, brand: "Ovopel", category: "latticini", calories_100g: 143, macros_100g: { p: 12.6, c: 0.7, f: 9.9 }, barcode: null, serving_size_g: 60 },
  { name: `${PREFIX} Parmigiano Reggiano`, brand: "Grana Padano", category: "latticini", calories_100g: 392, macros_100g: { p: 33, c: 0, f: 28 }, barcode: null, serving_size_g: 30 },
  { name: `${PREFIX} Insalata mista`, brand: null, category: "verdura", calories_100g: 15, macros_100g: { p: 1.3, c: 1.8, f: 0.2 }, barcode: null, serving_size_g: 100 },
  { name: `${PREFIX} Zucchine`, brand: null, category: "verdura", calories_100g: 17, macros_100g: { p: 1.2, c: 2.1, f: 0.3 }, barcode: null, serving_size_g: 200 },
  { name: `${PREFIX} Pomodorini ciliegino`, brand: null, category: "verdura", calories_100g: 18, macros_100g: { p: 1, c: 3.9, f: 0.2 }, barcode: null, serving_size_g: 250 },
  { name: `${PREFIX} Spaghetti`, brand: "Barilla", category: "pasta", calories_100g: 356, macros_100g: { p: 12, c: 72, f: 1.5 }, barcode: "8076809513753", serving_size_g: 80 },
  { name: `${PREFIX} Passata di pomodoro`, brand: "Mutti", category: "verdura", calories_100g: 24, macros_100g: { p: 1, c: 4, f: 0.2 }, barcode: "8005110000102", serving_size_g: 400 },
  { name: `${PREFIX} Riso Arborio`, brand: "Scotti", category: "pasta", calories_100g: 345, macros_100g: { p: 7, c: 78, f: 0.5 }, barcode: "8001250123456", serving_size_g: 80 },
  { name: `${PREFIX} Tonno al naturale`, brand: "Rio Mare", category: "pesce", calories_100g: 116, macros_100g: { p: 26, c: 0, f: 1 }, barcode: "8005240001234", serving_size_g: 80 },
  { name: `${PREFIX} Farina 00`, brand: "Caputo", category: "pasta", calories_100g: 340, macros_100g: { p: 11, c: 73, f: 1 }, barcode: null, serving_size_g: 100 },
  { name: `${PREFIX} Olio extravergine`, brand: "Monini", category: "condimenti", calories_100g: 884, macros_100g: { p: 0, c: 0, f: 100 }, barcode: "8005510001181", serving_size_g: 10 },
  { name: `${PREFIX} Caffè in grani`, brand: "Lavazza", category: "bevande", calories_100g: 2, macros_100g: { p: 0.1, c: 0, f: 0 }, barcode: null, serving_size_g: 7 },
  { name: `${PREFIX} Biscotti integrali`, brand: "Misura", category: "dolci", calories_100g: 420, macros_100g: { p: 8, c: 68, f: 12 }, barcode: null, serving_size_g: 30 },
  { name: `${PREFIX} Spinaci surgelati`, brand: "Findus", category: "verdura", calories_100g: 23, macros_100g: { p: 2.9, c: 2.2, f: 0.4 }, barcode: null, serving_size_g: 450 },
  { name: `${PREFIX} Filetti di merluzzo`, brand: "Findus", category: "pesce", calories_100g: 82, macros_100g: { p: 18, c: 0, f: 0.7 }, barcode: null, serving_size_g: 100 },
  { name: `${PREFIX} Hummus`, brand: "Citterio", category: "condimenti", calories_100g: 166, macros_100g: { p: 8, c: 14, f: 9 }, barcode: null, serving_size_g: 200 },
];

type InventorySeed = {
  productName: string;
  storage: "frigo" | "freezer" | "ambiente";
  expiry: string | null;
  quantity: number;
  unit: string;
};

const INVENTORY: InventorySeed[] = [
  { productName: `${PREFIX} Insalata mista`, storage: "frigo", expiry: daysFromNow(0), quantity: 1, unit: "pz" },
  { productName: `${PREFIX} Latte fresco`, storage: "frigo", expiry: daysFromNow(1), quantity: 1, unit: "l" },
  { productName: `${PREFIX} Petto di pollo`, storage: "frigo", expiry: daysFromNow(2), quantity: 400, unit: "g" },
  { productName: `${PREFIX} Mozzarella`, storage: "frigo", expiry: daysFromNow(2), quantity: 125, unit: "g" },
  { productName: `${PREFIX} Zucchine`, storage: "frigo", expiry: daysFromNow(3), quantity: 500, unit: "g" },
  { productName: `${PREFIX} Pomodorini ciliegino`, storage: "frigo", expiry: daysFromNow(4), quantity: 250, unit: "g" },
  { productName: `${PREFIX} Yogurt greco 0%`, storage: "frigo", expiry: daysFromNow(6), quantity: 2, unit: "pz" },
  { productName: `${PREFIX} Hummus`, storage: "frigo", expiry: daysFromNow(8), quantity: 1, unit: "pz" },
  { productName: `${PREFIX} Uova fresche`, storage: "frigo", expiry: daysAgo(2), quantity: 6, unit: "pz" },
  { productName: `${PREFIX} Parmigiano Reggiano`, storage: "frigo", expiry: daysFromNow(25), quantity: 200, unit: "g" },
  { productName: `${PREFIX} Spaghetti`, storage: "ambiente", expiry: daysFromNow(180), quantity: 500, unit: "g" },
  { productName: `${PREFIX} Passata di pomodoro`, storage: "ambiente", expiry: daysFromNow(90), quantity: 2, unit: "pz" },
  { productName: `${PREFIX} Riso Arborio`, storage: "ambiente", expiry: daysFromNow(240), quantity: 1, unit: "kg" },
  { productName: `${PREFIX} Tonno al naturale`, storage: "ambiente", expiry: daysFromNow(365), quantity: 3, unit: "pz" },
  { productName: `${PREFIX} Farina 00`, storage: "ambiente", expiry: daysFromNow(120), quantity: 1, unit: "kg" },
  { productName: `${PREFIX} Olio extravergine`, storage: "ambiente", expiry: daysFromNow(300), quantity: 750, unit: "ml" },
  { productName: `${PREFIX} Caffè in grani`, storage: "ambiente", expiry: null, quantity: 250, unit: "g" },
  { productName: `${PREFIX} Biscotti integrali`, storage: "ambiente", expiry: daysFromNow(45), quantity: 1, unit: "pz" },
  { productName: `${PREFIX} Spinaci surgelati`, storage: "freezer", expiry: daysFromNow(120), quantity: 450, unit: "g" },
  { productName: `${PREFIX} Filetti di merluzzo`, storage: "freezer", expiry: daysFromNow(60), quantity: 500, unit: "g" },
];

const PREPARATIONS = [
  { name: `${PREFIX} Sugo al basilico`, storage: "frigo", daysUntil: 2, desc: "Passata, basilico e olio — per pasta veloce" },
  { name: `${PREFIX} Minestra di verdure`, storage: "frigo", daysUntil: 1, desc: "Zucchine, carote e patate" },
];

export type SeedLog = (msg: string) => void;

type ResolvedProduct = {
  id: string;
  name: string;
  calories_100g: number | null;
  macros_100g: { p: number; c: number; f: number } | null;
  source: "catalog" | "created";
};

async function resolveProduct(
  supabase: SupabaseClient,
  seed: ProductSeed,
): Promise<ResolvedProduct | null> {
  const select = "id, name, calories_100g, macros_100g";

  if (seed.barcode) {
    const { data } = await supabase.from("products").select(select).eq("barcode", seed.barcode).maybeSingle();
    if (data) {
      return {
        id: data.id,
        name: seed.name,
        calories_100g: data.calories_100g ?? seed.calories_100g,
        macros_100g: (data.macros_100g as ResolvedProduct["macros_100g"]) ?? seed.macros_100g,
        source: "catalog",
      };
    }
  }

  const { data: byName } = await supabase.from("products").select(select).eq("name", seed.name).maybeSingle();
  if (byName) {
    return {
      id: byName.id,
      name: seed.name,
      calories_100g: byName.calories_100g ?? seed.calories_100g,
      macros_100g: (byName.macros_100g as ResolvedProduct["macros_100g"]) ?? seed.macros_100g,
      source: "catalog",
    };
  }

  const payload = {
    name: seed.name,
    brand: seed.brand,
    category: seed.category,
    calories_100g: seed.calories_100g,
    macros_100g: seed.macros_100g,
    barcode: seed.barcode,
    serving_size_g: seed.serving_size_g,
    unit: "g",
    data_source: "manual",
    nutrition_available: true,
  };

  let { data: inserted, error } = await supabase.from("products").insert(payload).select(select).single();
  if (error?.message.includes("products_barcode_unique") && seed.barcode) {
    ({ data: inserted, error } = await supabase
      .from("products")
      .insert({ ...payload, barcode: null })
      .select(select)
      .single());
  }
  if (error || !inserted) return null;

  return {
    id: inserted.id,
    name: seed.name,
    calories_100g: inserted.calories_100g ?? seed.calories_100g,
    macros_100g: (inserted.macros_100g as ResolvedProduct["macros_100g"]) ?? seed.macros_100g,
    source: "created",
  };
}

export async function seedFrancescaBiazzi(supabase: SupabaseClient, log: SeedLog = console.log) {
  const userId = FRANCESCA_USER_ID;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    log("❌ Utente Francesca Biazzi non trovato (id: " + userId + ")");
    return { ok: false };
  }

  log(`👤 Utente: ${profile.full_name || profile.email || userId}`);

  // Clean previous FB seed data
  const { data: oldProducts } = await supabase.from("products").select("id").like("name", `${PREFIX}%`);
  const oldProductIds = oldProducts?.map((p) => p.id) ?? [];

  if (oldProductIds.length > 0) {
    const { data: oldPreps } = await supabase.from("preparations").select("id").eq("owner_user_id", userId);
    if (oldPreps?.length) {
      await supabase.from("preparation_ingredients").delete().in("preparation_id", oldPreps.map((p) => p.id));
    }
    await supabase.from("preparations").delete().eq("owner_user_id", userId);
    await supabase.from("inventory_items").delete().eq("owner_user_id", userId);
    await supabase.from("products").delete().in("id", oldProductIds);
    log("🧹 Dati precedenti [FB] rimossi");
  } else {
    await supabase.from("inventory_items").delete().eq("owner_user_id", userId);
    await supabase.from("preparations").delete().eq("owner_user_id", userId);
  }

  await supabase.from("waste_savings").delete().eq("user_id", userId);

  const productMap: Record<string, ResolvedProduct> = {};
  let created = 0;
  let reused = 0;

  for (const p of PRODUCTS) {
    const row = await resolveProduct(supabase, p);
    if (!row) {
      log(`❌ Prodotto non risolto: ${p.name}`);
      return { ok: false };
    }
    productMap[p.name] = row;
    if (row.source === "created") created += 1;
    else reused += 1;
  }

  log(`📦 Prodotti: ${PRODUCTS.length} pronti (${reused} dal catalogo, ${created} nuovi)`);

  // Inventory
  const invRows = INVENTORY.map((item) => {
    const p = productMap[item.productName];
    if (!p) return null;
    const macro = p.macros_100g as { p: number; c: number; f: number };
    const qty = item.quantity;
    const factor = item.unit === "g" || item.unit === "ml" ? qty / 100 : 1;
    return {
      product_id: p.id,
      owner_user_id: userId,
      storage_type: item.storage,
      expiry_date: item.expiry,
      quantity: qty,
      unit: item.unit,
      calories_total: p.calories_100g ? Math.round(p.calories_100g * factor) : null,
      macros_total: macro ? { p: Math.round(macro.p * factor), c: Math.round(macro.c * factor), f: Math.round(macro.f * factor) } : null,
      data_completeness: "full",
    };
  }).filter(Boolean);

  const { data: invIns, error: invErr } = await supabase.from("inventory_items").insert(invRows).select("id");
  if (invErr) {
    log(`❌ Inventario: ${invErr.message}`);
    return { ok: false };
  }
  log(`🧊 Inventario: ${invIns?.length ?? 0} prodotti in dispensa`);

  // Preparations
  for (const prep of PREPARATIONS) {
    const { data: prepRow } = await supabase
      .from("preparations")
      .insert({
        owner_user_id: userId,
        name: prep.name.replace(PREFIX, "").trim(),
        description: prep.desc,
        storage_type: prep.storage,
        use_by_date: daysFromNow(prep.daysUntil),
        prepared_at: new Date().toISOString(),
        portions: 2,
      })
      .select("id")
      .single();

    if (prepRow) {
      const ingNames = prep.name.includes("Sugo")
        ? [`${PREFIX} Passata di pomodoro`, `${PREFIX} Olio extravergine`]
        : [`${PREFIX} Zucchine`, `${PREFIX} Riso Arborio`];
      const ings = ingNames
        .map((n) => productMap[n])
        .filter(Boolean)
        .map((p) => ({ preparation_id: prepRow.id, product_id: p!.id, quantity: 100, unit: "g" }));
      if (ings.length) await supabase.from("preparation_ingredients").insert(ings);
    }
  }
  log(`🍲 Preparazioni: ${PREPARATIONS.length} create`);

  // Waste savings (realistic month stats)
  const wasteRows = [
    { item_name: "Insalata mista", weight_g: 120, estimated_price: 1.2, source: "consumed" },
    { item_name: "Yogurt greco", weight_g: 150, estimated_price: 0.9, source: "consumed" },
    { item_name: "Zucchine", weight_g: 300, estimated_price: 1.5, source: "ai_suggestion" },
    { item_name: "Pomodorini", weight_g: 200, estimated_price: 1.8, source: "cooked" },
  ].map((w) => ({ ...w, user_id: userId }));

  await supabase.from("waste_savings").insert(wasteRows);
  log(`♻️ Anti-spreco: ${wasteRows.length} voci salvate questo mese`);

  await supabase.from("profiles").update({ full_name: "Francesca Biazzi" }).eq("id", userId);

  log("✅ Francesca Biazzi popolata con successo!");
  return { ok: true };
}
