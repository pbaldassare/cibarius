import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sprout, Trash2, Download } from "lucide-react";

const DEMO = "[DEMO]";

/* ── Allergens standard ── */
const ALLERGENS = [
  { code: "GL", name: "Glutine" }, { code: "LA", name: "Latte" },
  { code: "UO", name: "Uova" }, { code: "AR", name: "Arachidi" },
  { code: "FG", name: "Frutta a guscio" }, { code: "SO", name: "Soia" },
  { code: "PE", name: "Pesce" }, { code: "CR", name: "Crostacei" },
  { code: "MO", name: "Molluschi" }, { code: "SE", name: "Sedano" },
  { code: "SN", name: "Senape" }, { code: "SS", name: "Sesamo" },
  { code: "SF", name: "Solfiti" }, { code: "LU", name: "Lupini" },
];

/* ── Products ── */
const PRODUCTS = [
  { name: `${DEMO} Spaghetti Barilla`, brand: "Barilla", category: "pasta", calories_100g: 356, macros_100g: { p: 12, c: 72, f: 1.5 }, barcode: "8076809513753", serving_size_g: 80 },
  { name: `${DEMO} Penne rigate`, brand: "De Cecco", category: "pasta", calories_100g: 351, macros_100g: { p: 11, c: 73, f: 1.4 }, barcode: "8001250100245", serving_size_g: 80 },
  { name: `${DEMO} Fusilli`, brand: "Rummo", category: "pasta", calories_100g: 350, macros_100g: { p: 12, c: 71, f: 1.5 }, barcode: "8008343210017", serving_size_g: 80 },
  { name: `${DEMO} Petto di pollo`, brand: null, category: "carne", calories_100g: 165, macros_100g: { p: 31, c: 0, f: 3.6 }, barcode: "2000000000001", serving_size_g: 150 },
  { name: `${DEMO} Macinato manzo`, brand: null, category: "carne", calories_100g: 250, macros_100g: { p: 26, c: 0, f: 15 }, barcode: "2000000000002", serving_size_g: 200 },
  { name: `${DEMO} Salsiccia`, brand: "Aia", category: "carne", calories_100g: 300, macros_100g: { p: 18, c: 1, f: 25 }, barcode: "2000000000003", serving_size_g: 100 },
  { name: `${DEMO} Mozzarella fresca`, brand: "Galbani", category: "latticini", calories_100g: 280, macros_100g: { p: 18, c: 1, f: 22 }, barcode: "8000430301007", serving_size_g: 125 },
  { name: `${DEMO} Parmigiano Reggiano`, brand: null, category: "latticini", calories_100g: 392, macros_100g: { p: 33, c: 0, f: 28 }, barcode: "2000000000004", serving_size_g: 30 },
  { name: `${DEMO} Latte intero`, brand: "Granarolo", category: "latticini", calories_100g: 64, macros_100g: { p: 3.3, c: 4.8, f: 3.6 }, barcode: "8002670001012", serving_size_g: 250 },
  { name: `${DEMO} Yogurt bianco`, brand: "Müller", category: "latticini", calories_100g: 61, macros_100g: { p: 3.5, c: 4.7, f: 3.3 }, barcode: "2000000000005", serving_size_g: 125 },
  { name: `${DEMO} Pomodori pelati`, brand: "Mutti", category: "verdura", calories_100g: 24, macros_100g: { p: 1, c: 4, f: 0.2 }, barcode: "8005110000102", serving_size_g: 400 },
  { name: `${DEMO} Zucchine`, brand: null, category: "verdura", calories_100g: 17, macros_100g: { p: 1.2, c: 2.1, f: 0.3 }, barcode: null, serving_size_g: 200 },
  { name: `${DEMO} Insalata mista`, brand: null, category: "verdura", calories_100g: 15, macros_100g: { p: 1.3, c: 1.8, f: 0.2 }, barcode: null, serving_size_g: 100 },
  { name: `${DEMO} Carote`, brand: null, category: "verdura", calories_100g: 41, macros_100g: { p: 0.9, c: 9.6, f: 0.2 }, barcode: null, serving_size_g: 150 },
  { name: `${DEMO} Patate`, brand: null, category: "verdura", calories_100g: 77, macros_100g: { p: 2, c: 17, f: 0.1 }, barcode: null, serving_size_g: 200 },
  { name: `${DEMO} Acqua naturale 1.5L`, brand: "Sant'Anna", category: "bevande", calories_100g: 0, macros_100g: { p: 0, c: 0, f: 0 }, barcode: "8001040060216", serving_size_g: 1500 },
  { name: `${DEMO} Succo d'arancia`, brand: "Santal", category: "bevande", calories_100g: 42, macros_100g: { p: 0.5, c: 10, f: 0.1 }, barcode: "2000000000006", serving_size_g: 200 },
  { name: `${DEMO} Coca-Cola 330ml`, brand: "Coca-Cola", category: "bevande", calories_100g: 42, macros_100g: { p: 0, c: 10.6, f: 0 }, barcode: "5449000000996", serving_size_g: 330 },
  { name: `${DEMO} Tiramisù`, brand: null, category: "dolci", calories_100g: 280, macros_100g: { p: 6, c: 30, f: 15 }, barcode: null, serving_size_g: 120 },
  { name: `${DEMO} Nutella`, brand: "Ferrero", category: "dolci", calories_100g: 539, macros_100g: { p: 6.3, c: 57, f: 31 }, barcode: "3017620422003", serving_size_g: 30 },
  { name: `${DEMO} Uova fresche x6`, brand: null, category: "latticini", calories_100g: 143, macros_100g: { p: 12.6, c: 0.7, f: 9.9 }, barcode: "2000000000007", serving_size_g: 60 },
  { name: `${DEMO} Olio EVO`, brand: "Monini", category: "condimenti", calories_100g: 884, macros_100g: { p: 0, c: 0, f: 100 }, barcode: "8005510001181", serving_size_g: 10 },
  { name: `${DEMO} Burro`, brand: "Lurpak", category: "latticini", calories_100g: 717, macros_100g: { p: 0.9, c: 0.1, f: 81 }, barcode: "2000000000008", serving_size_g: 10 },
  { name: `${DEMO} Farina 00`, brand: null, category: "pasta", calories_100g: 340, macros_100g: { p: 11, c: 73, f: 1 }, barcode: null, serving_size_g: 100 },
  { name: `${DEMO} Riso Arborio`, brand: "Scotti", category: "pasta", calories_100g: 345, macros_100g: { p: 7, c: 78, f: 0.5 }, barcode: "2000000000009", serving_size_g: 80 },
];

/* ── Helpers ── */
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
};
const daysFromNow = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};
const pick = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

const AdminSeedPage = () => {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const log = useCallback((msg: string) => {
    setLogs(prev => [...prev, msg]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  /* ═════════════════════════════════════════════════════
     SEED
     ═════════════════════════════════════════════════════ */
  const handleSeed = async () => {
    if (!user) return;
    setRunning(true);
    setLogs([]);
    try {
      // ── Check if already seeded ──
      const { data: existingProducts } = await supabase.from("products").select("id").like("name", `${DEMO}%`).limit(1);
      if (existingProducts && existingProducts.length > 0) {
        log("⚠️  Dati demo già presenti. Pulisci prima di rigenerare.");
        setRunning(false);
        return;
      }

      // ── Get all profiles to find users by role ──
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (!profiles) { log("❌ Impossibile leggere profili"); setRunning(false); return; }

      const userProfile = profiles.find(p => p.role === "user") ?? null;
      const restoProfile = profiles.find(p => p.role === "restaurant_owner") ?? null;
      const adminProfile = profiles.find(p => p.role === "admin") ?? null;
      log(`👤 Profili trovati: ${profiles.length} (user: ${userProfile ? "✓" : "✗"}, risto: ${restoProfile ? "✓" : "✗"}, admin: ${adminProfile ? "✓" : "✗"})`);

      // ── A) Allergens ──
      const { data: existingAllergens } = await supabase.from("allergens").select("id, code");
      let allergenMap: Record<string, string> = {};
      if (!existingAllergens || existingAllergens.length === 0) {
        const { data: inserted } = await supabase.from("allergens").insert(ALLERGENS).select("id, code");
        if (inserted) {
          inserted.forEach(a => allergenMap[a.code] = a.id);
          log(`🥜 Allergeni: ${inserted.length} creati`);
        }
      } else {
        existingAllergens.forEach(a => allergenMap[a.code] = a.id);
        log(`🥜 Allergeni: ${existingAllergens.length} già presenti`);
      }

      // ── B) Products ──
      const { data: products, error: prodErr } = await supabase.from("products").insert(
        PRODUCTS.map(p => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          calories_100g: p.calories_100g,
          macros_100g: p.macros_100g,
          barcode: p.barcode,
          serving_size_g: p.serving_size_g,
          image_url: null,
          unit: "g",
        }))
      ).select("id, name, calories_100g, macros_100g");
      if (prodErr) { log(`❌ Prodotti: ${prodErr.message}`); setRunning(false); return; }
      log(`📦 Prodotti: ${products!.length} creati`);

      // ── C) Restaurant ──
      let restaurantId: string | null = null;
      if (restoProfile) {
        const { data: existingR } = await supabase.from("restaurants").select("id").eq("owner_id", restoProfile.id).maybeSingle();
        if (existingR) {
          restaurantId = existingR.id;
          log(`🏪 Ristorante: già esistente (${restaurantId})`);
        } else {
          const { data: newR } = await supabase.from("restaurants").insert({
            owner_id: restoProfile.id,
            name: `${DEMO} Trattoria Demo Cibarius`,
            address: "Via Roma 10, Roma",
            phone: "3470000000",
          }).select("id").single();
          if (newR) {
            restaurantId = newR.id;
            log(`🏪 Ristorante: creato (${restaurantId})`);
          }
        }
      }

      // ── D) Inventory items for USER ──
      if (userProfile && products) {
        const userInv = buildInventoryItems(products, userProfile.id, null, 18);
        const { data: ins } = await supabase.from("inventory_items").insert(userInv).select("id");
        log(`🧊 Inventario user: ${ins?.length ?? 0} items`);
      }

      // ── D) Inventory items for RESTAURANT ──
      if (restaurantId && products) {
        const restoInv = buildInventoryItems(products, null, restaurantId, 30);
        const { data: ins } = await supabase.from("inventory_items").insert(restoInv).select("id");
        log(`🧊 Inventario ristorante: ${ins?.length ?? 0} items`);
      }

      // ── E) Preparations for USER ──
      if (userProfile && products) {
        await seedPreparations(
          [
            { name: `${DEMO} Pasta al forno`, storage: "frigo", daysUntil: 2, desc: "Pasta al forno della nonna" },
            { name: `${DEMO} Insalata di pollo`, storage: "frigo", daysUntil: 1, desc: "Con pomodorini e mais" },
            { name: `${DEMO} Tiramisù fatto in casa`, storage: "frigo", daysUntil: 3, desc: "Con mascarpone e caffè" },
          ],
          products, allergenMap, userProfile.id, null, log
        );
      }

      // ── E) Preparations for RESTAURANT ──
      if (restaurantId && products) {
        await seedPreparations(
          [
            { name: `${DEMO} Lasagne`, storage: "frigo", daysUntil: 2, desc: "Lasagne alla bolognese" },
            { name: `${DEMO} Ragù`, storage: "frigo", daysUntil: 3, desc: "Ragù di carne slow cook" },
            { name: `${DEMO} Parmigiana`, storage: "frigo", daysUntil: 2, desc: "Melanzane alla parmigiana" },
            { name: `${DEMO} Zuppa del giorno`, storage: "frigo", daysUntil: 1, desc: "Zuppa di verdure" },
            { name: `${DEMO} Cheesecake`, storage: "frigo", daysUntil: 4, desc: "New York cheesecake" },
            { name: `${DEMO} Polpette al sugo`, storage: "freezer", daysUntil: 30, desc: "Polpette di manzo" },
          ],
          products, allergenMap, null, restaurantId, log
        );
      }

      // ── G) Recipes for RESTAURANT ──
      if (restaurantId && products) {
        const recipeTitles = [
          { title: `${DEMO} Spaghetti alla carbonara`, pub: true, cat: "primi", diff: "media" },
          { title: `${DEMO} Risotto ai funghi`, pub: true, cat: "primi", diff: "media" },
          { title: `${DEMO} Pollo alla griglia`, pub: true, cat: "secondi", diff: "facile" },
          { title: `${DEMO} Tiramisù classico`, pub: true, cat: "dolci", diff: "media" },
          { title: `${DEMO} Penne all'arrabbiata`, pub: false, cat: "primi", diff: "facile" },
          { title: `${DEMO} Insalata Caesar`, pub: false, cat: "contorni", diff: "facile" },
          { title: `${DEMO} Cotoletta alla milanese`, pub: false, cat: "secondi", diff: "media" },
          { title: `${DEMO} Panna cotta`, pub: false, cat: "dolci", diff: "facile" },
        ];

        let recipeCount = 0;
        for (const r of recipeTitles) {
          const { data: recipe } = await supabase.from("recipes").insert({
            restaurant_id: restaurantId,
            title: r.title,
            category: r.cat,
            difficulty: r.diff,
            is_public: r.pub,
            servings: Math.floor(Math.random() * 4) + 2,
            prep_time_minutes: Math.floor(Math.random() * 20) + 10,
            cook_time_minutes: Math.floor(Math.random() * 40) + 15,
            instructions: `Preparazione ${r.title.replace(DEMO, "").trim()}:\n1. Preparare gli ingredienti\n2. Cuocere secondo la ricetta tradizionale\n3. Impiattare e servire caldo`,
            image_url: null,
          }).select("id").single();

          if (recipe) {
            recipeCount++;
            const ingProducts = pick(products, Math.floor(Math.random() * 4) + 5);
            await supabase.from("recipe_ingredients").insert(
              ingProducts.map(p => ({
                recipe_id: recipe.id,
                product_id: p.id,
                quantity: Math.floor(Math.random() * 300) + 50,
                unit: "g",
              }))
            );
            const allergenCodes = pick(Object.keys(allergenMap), Math.floor(Math.random() * 3) + 2);
            await supabase.from("recipe_allergens").insert(
              allergenCodes.map(code => ({
                recipe_id: recipe.id,
                allergen_id: allergenMap[code],
              }))
            );
          }
        }
        log(`📖 Ricette: ${recipeCount} create con ingredienti e allergeni`);
      }

      // ── H) Meals for USER ──
      if (userProfile && products) {
        // Nutrition targets
        await supabase.from("nutrition_targets").upsert({
          user_id: userProfile.id,
          kcal_day: 2000,
          protein_g: 120,
          carbs_g: 220,
          fats_g: 65,
        });
        log(`🎯 Target nutrizionali impostati`);

        const mealTypes = ["colazione", "pranzo", "cena", "spuntino"];
        let mealDaysCreated = 0;
        let mealsCreated = 0;
        let mealItemsCreated = 0;

        for (let d = 0; d < 7; d++) {
          const dayDate = daysAgo(d);
          const { data: mealDay } = await supabase.from("meal_days").insert({
            user_id: userProfile.id,
            day_date: dayDate,
          }).select("id").single();
          if (!mealDay) continue;
          mealDaysCreated++;

          for (const mt of mealTypes) {
            const { data: meal } = await supabase.from("meals").insert({
              meal_day_id: mealDay.id,
              meal_type: mt,
            }).select("id").single();
            if (!meal) continue;
            mealsCreated++;

            const itemCount = mt === "spuntino" ? 1 : Math.floor(Math.random() * 2) + 1;
            const mealProducts = pick(products, itemCount);
            const mealItemsToInsert = mealProducts.map(p => {
              const macro = p.macros_100g as any;
              const qty = Math.floor(Math.random() * 150) + 50;
              return {
                meal_id: meal.id,
                product_id: p.id,
                source_type: "product",
                quantity: qty,
                unit: "g",
                calories: p.calories_100g ? Math.round(p.calories_100g * qty / 100) : null,
                macros: macro ? { p: Math.round(macro.p * qty / 100), c: Math.round(macro.c * qty / 100), f: Math.round(macro.f * qty / 100) } : null,
              };
            });
            const { data: insertedItems } = await supabase.from("meal_items").insert(mealItemsToInsert).select("id");
            mealItemsCreated += insertedItems?.length ?? 0;
          }
        }
        log(`🍽️ Pasti: ${mealDaysCreated} giorni, ${mealsCreated} meals, ${mealItemsCreated} items`);
      }

      // ── I) Restaurant documents ──
      if (restaurantId) {
        const docs = [
          { supplier: "Fornitore Rossi S.r.l.", daysAgo: 2, type: "bolla" },
          { supplier: "Carni Bianchi", daysAgo: 5, type: "bolla" },
          { supplier: "Ortofrutticola Verde", daysAgo: 8, type: "bolla" },
          { supplier: "Latteria del Sud", daysAgo: 12, type: "fattura" },
          { supplier: "Bevande Italia", daysAgo: 18, type: "bolla" },
          { supplier: "Panificio Centrale", daysAgo: 25, type: "bolla" },
        ];
        const { data: docsIns } = await supabase.from("restaurant_documents").insert(
          docs.map(d => ({
            restaurant_id: restaurantId!,
            doc_type: d.type,
            supplier_name: `${DEMO} ${d.supplier}`,
            doc_date: daysAgo(d.daysAgo),
            file_path: `restaurants/${restaurantId}/bolle/demo-${d.daysAgo}.pdf`,
            public_url: null,
          }))
        ).select("id");
        log(`📄 Documenti ristorante: ${docsIns?.length ?? 0} creati`);
      }

      log("✅ Seed completato con successo!");
    } catch (err: any) {
      log(`❌ Errore: ${err.message}`);
    }
    setRunning(false);
  };

  /* ═════════════════════════════════════════════════════
     CLEAN
     ═════════════════════════════════════════════════════ */
  const handleClean = async () => {
    setCleaning(true);
    setLogs([]);
    try {
      // Get demo product IDs
      const { data: demoProducts } = await supabase.from("products").select("id").like("name", `${DEMO}%`);
      const demoProductIds = demoProducts?.map(p => p.id) ?? [];

      // 1) meal_items linked to demo products
      if (demoProductIds.length > 0) {
        const { data: mealItems } = await supabase.from("meal_items").select("id, meal_id").in("product_id", demoProductIds);
        if (mealItems && mealItems.length > 0) {
          await supabase.from("meal_items").delete().in("id", mealItems.map(m => m.id));
          log(`🗑️ Meal items: ${mealItems.length} eliminati`);

          // Clean empty meals
          const mealIds = [...new Set(mealItems.map(m => m.meal_id))];
          for (const mId of mealIds) {
            const { data: remaining } = await supabase.from("meal_items").select("id").eq("meal_id", mId).limit(1);
            if (!remaining || remaining.length === 0) {
              await supabase.from("meals").delete().eq("id", mId);
            }
          }
        }
      }

      // 2) Clean empty meal_days (no meals left)
      const { data: allMealDays } = await supabase.from("meal_days").select("id");
      if (allMealDays) {
        for (const md of allMealDays) {
          const { data: meals } = await supabase.from("meals").select("id").eq("meal_day_id", md.id).limit(1);
          if (!meals || meals.length === 0) {
            await supabase.from("meal_days").delete().eq("id", md.id);
          }
        }
        log(`🗑️ Meal days orfani puliti`);
      }

      // 3) Demo preparations (cascade deletes ingredients/allergens)
      const { data: delPreps } = await supabase.from("preparations").delete().like("name", `${DEMO}%`).select("id");
      log(`🗑️ Preparazioni: ${delPreps?.length ?? 0} eliminate`);

      // 4) Demo recipes (cascade deletes ingredients/allergens)
      const { data: delRecipes } = await supabase.from("recipes").delete().like("title", `${DEMO}%`).select("id");
      log(`🗑️ Ricette: ${delRecipes?.length ?? 0} eliminate`);

      // 5) Demo restaurant_documents
      const { data: delDocs } = await supabase.from("restaurant_documents").delete().like("supplier_name", `${DEMO}%`).select("id");
      log(`🗑️ Documenti: ${delDocs?.length ?? 0} eliminati`);

      // 6) Demo inventory_items
      if (demoProductIds.length > 0) {
        const { data: delInv } = await supabase.from("inventory_items").delete().in("product_id", demoProductIds).select("id");
        log(`🗑️ Inventario: ${delInv?.length ?? 0} eliminati`);
      }

      // 7) Demo products
      if (demoProductIds.length > 0) {
        await supabase.from("products").delete().in("id", demoProductIds);
        log(`🗑️ Prodotti: ${demoProductIds.length} eliminati`);
      }

      // 8) Demo restaurant
      const { data: delResto } = await supabase.from("restaurants").delete().like("name", `${DEMO}%`).select("id");
      log(`🗑️ Ristoranti demo: ${delResto?.length ?? 0} eliminati`);

      log("✅ Pulizia completata!");
    } catch (err: any) {
      log(`❌ Errore: ${err.message}`);
    }
    setCleaning(false);
  };

  const handleImportOFF = async () => {
    setImporting(true);
    setLogs([]);
    log("🌍 Avvio importazione prodotti italiani da OpenFoodFacts...");
    try {
      const { data, error } = await supabase.functions.invoke("seed-off-products", {
        body: { max_pages: 50 },
      });
      if (error) {
        log(`❌ Errore: ${error.message}`);
      } else {
        log(`✅ Importazione completata: ${data.total_saved} prodotti salvati, ${data.total_skipped} saltati`);
      }
    } catch (err: any) {
      log(`❌ Errore: ${err.message}`);
    }
    setImporting(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dati Demo & Import</h1>
          <p className="text-sm text-muted-foreground">Popola dati demo o importa prodotti reali da OpenFoodFacts</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dati Demo</CardTitle>
              <CardDescription>Genera o pulisci dati fittizi per testare la piattaforma</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleSeed} disabled={running || cleaning || importing} className="gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
                Genera
              </Button>
              <Button variant="destructive" onClick={handleClean} disabled={running || cleaning || importing} className="gap-2">
                {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Pulisci
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importa da OpenFoodFacts</CardTitle>
              <CardDescription>Importa i top ~5000 prodotti italiani più scansionati. Operazione una tantum (~2 min).</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleImportOFF} disabled={running || cleaning || importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {importing ? "Importazione in corso..." : "Importa prodotti IT"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Log</CardTitle></CardHeader>
          <CardContent>
            <div
              ref={logRef}
              className="h-96 overflow-y-auto rounded-lg bg-muted p-4 font-mono text-xs space-y-1"
            >
              {logs.length === 0 && <p className="text-muted-foreground">Premi un bottone per iniziare...</p>}
              {logs.map((l, i) => <p key={i}>{l}</p>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

/* ── Build inventory items helper ── */
function buildInventoryItems(
  products: { id: string; name: string; calories_100g: number | null; macros_100g: any }[],
  ownerId: string | null,
  restaurantId: string | null,
  count: number,
) {
  const storages = ["ambiente", "frigo", "freezer"];
  const items: any[] = [];

  // expired (20%), expiring (35%), ok (35%), no-date (10%)
  const expired = Math.round(count * 0.2);
  const expiring = Math.round(count * 0.35);
  const ok = Math.round(count * 0.35);
  const noDate = count - expired - expiring - ok;

  const buildItem = (pIdx: number, expiryDate: string | null, storage: string) => {
    const p = products[pIdx % products.length];
    const qty = [1, 2, 0.5, 1.5, 3][Math.floor(Math.random() * 5)];
    const unit = ["pz", "kg", "l", "g"][Math.floor(Math.random() * 4)];
    return {
      product_id: p.id,
      owner_user_id: ownerId,
      restaurant_id: restaurantId,
      storage_type: storage,
      expiry_date: expiryDate,
      quantity: qty,
      unit,
      calories_total: p.calories_100g ? Math.round(p.calories_100g * qty) : null,
      macros_total: p.macros_100g,
      notes: null,
    };
  };

  let idx = 0;
  for (let i = 0; i < expired; i++) items.push(buildItem(idx++, daysAgo(Math.floor(Math.random() * 5) + 1), storages[idx % 3]));
  for (let i = 0; i < expiring; i++) items.push(buildItem(idx++, daysFromNow(Math.floor(Math.random() * 3) + 1), storages[idx % 3]));
  for (let i = 0; i < ok; i++) items.push(buildItem(idx++, daysFromNow(Math.floor(Math.random() * 20) + 10), storages[idx % 3]));
  for (let i = 0; i < noDate; i++) items.push(buildItem(idx++, null, storages[idx % 3]));

  return items;
}

/* ── Seed preparations helper ── */
async function seedPreparations(
  defs: { name: string; storage: string; daysUntil: number; desc: string }[],
  products: { id: string; name: string }[],
  allergenMap: Record<string, string>,
  ownerId: string | null,
  restaurantId: string | null,
  log: (msg: string) => void,
) {
  let count = 0;
  for (const def of defs) {
    const { data: prep } = await supabase.from("preparations").insert({
      owner_user_id: ownerId,
      restaurant_id: restaurantId,
      name: def.name,
      description: def.desc,
      storage_type: def.storage,
      use_by_date: daysFromNow(def.daysUntil),
      portions: Math.floor(Math.random() * 4) + 2,
      prepared_at: daysAgo(Math.floor(Math.random() * 2)),
      notes: null,
      image_url: null,
    }).select("id").single();

    if (prep) {
      count++;
      const ingProducts = pick(products, Math.floor(Math.random() * 3) + 4);
      await supabase.from("preparation_ingredients").insert(
        ingProducts.map(p => ({
          preparation_id: prep.id,
          product_id: p.id,
          quantity: Math.floor(Math.random() * 200) + 50,
          unit: "g",
        }))
      );
      const codes = pick(Object.keys(allergenMap), Math.floor(Math.random() * 2) + 2);
      await supabase.from("preparation_allergens").insert(
        codes.map(c => ({
          preparation_id: prep.id,
          allergen_id: allergenMap[c],
        }))
      );
    }
  }
  log(`🍳 Preparazioni ${ownerId ? "user" : "ristorante"}: ${count} create`);
}

export default AdminSeedPage;
