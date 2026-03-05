import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── helpers ── */

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

interface Per100 { carbs: number; protein: number; fat: number; kcal: number }

async function lookupIngredient(
  sb: ReturnType<typeof supabaseAdmin>,
  name: string,
): Promise<{ ingredient_id: string | null; per100: Per100 | null }> {
  // 1. Check local ingredients table (ilike)
  const { data: localRows } = await sb
    .from("ingredients")
    .select("id, carbs_per_100g, protein_per_100g, fat_per_100g, kcal_per_100g")
    .ilike("name", name)
    .limit(1);

  if (localRows && localRows.length > 0) {
    const r = localRows[0];
    return {
      ingredient_id: r.id,
      per100: {
        carbs: Number(r.carbs_per_100g),
        protein: Number(r.protein_per_100g),
        fat: Number(r.fat_per_100g),
        kcal: Number(r.kcal_per_100g),
      },
    };
  }

  // 2. Check food_templates (broader match)
  const { data: tmplRows } = await sb
    .from("food_templates")
    .select("id, name, calories_100g, protein_100g, carbs_100g, fats_100g")
    .ilike("name", `%${name}%`)
    .limit(1);

  if (tmplRows && tmplRows.length > 0) {
    const t = tmplRows[0];
    return {
      ingredient_id: null,
      per100: {
        carbs: Number(t.carbs_100g),
        protein: Number(t.protein_100g),
        fat: Number(t.fats_100g),
        kcal: Number(t.calories_100g),
      },
    };
  }

  // 3. Translate IT→EN
  const lowerName = name.toLowerCase();
  const { data: transRows } = await sb
    .from("ingredient_translation")
    .select("name_en")
    .ilike("name_it", lowerName)
    .limit(1);

  let englishName = transRows?.[0]?.name_en;

  // Fallback: try partial match
  if (!englishName) {
    const { data: partialTrans } = await sb
      .from("ingredient_translation")
      .select("name_en, name_it")
      .limit(300);
    if (partialTrans) {
      const match = partialTrans.find(
        (t) => lowerName.includes(t.name_it.toLowerCase()) || t.name_it.toLowerCase().includes(lowerName),
      );
      if (match) englishName = match.name_en;
    }
  }

  // If no translation, use the original name as query
  const queryName = englishName || name;

  // 4. Call USDA API
  const USDA_API_KEY = Deno.env.get("USDA_API_KEY");
  if (!USDA_API_KEY) {
    console.warn("USDA_API_KEY not configured, skipping USDA lookup for:", name);
    return { ingredient_id: null, per100: null };
  }

  try {
    const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(queryName)}&pageSize=1`;
    const usdaResp = await fetch(usdaUrl);
    if (!usdaResp.ok) {
      console.error("USDA API error:", usdaResp.status);
      return { ingredient_id: null, per100: null };
    }

    const usdaData = await usdaResp.json();
    const food = usdaData.foods?.[0];
    if (!food) return { ingredient_id: null, per100: null };

    // Extract nutrients
    const nutrients = food.foodNutrients || [];
    const getNutrient = (id: number) =>
      nutrients.find((n: any) => n.nutrientId === id)?.value ?? 0;

    const per100: Per100 = {
      protein: getNutrient(1003),
      fat: getNutrient(1004),
      carbs: getNutrient(1005),
      kcal: getNutrient(1008),
    };

    // 5. Save to ingredients table
    const { data: inserted } = await sb
      .from("ingredients")
      .upsert(
        {
          name: name,
          name_en: englishName || food.description || queryName,
          carbs_per_100g: per100.carbs,
          protein_per_100g: per100.protein,
          fat_per_100g: per100.fat,
          kcal_per_100g: per100.kcal,
          usda_fdc_id: String(food.fdcId),
          source: "usda",
          category: food.foodCategory || null,
        },
        { onConflict: "name" },
      )
      .select("id")
      .single();

    return {
      ingredient_id: inserted?.id ?? null,
      per100,
    };
  } catch (err) {
    console.error("USDA lookup failed for:", name, err);
    return { ingredient_id: null, per100: null };
  }
}

/* ── dishes cache helpers ── */

function canonicalize(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, " ")
    .replace(/[''`]/g, "'");
}

async function lookupDishCache(
  sb: ReturnType<typeof supabaseAdmin>,
  dishName: string,
): Promise<{
  dish_id: string;
  ingredients: Array<{ ingredient_id: string; name: string; grams: number; per100: Per100 }>;
} | null> {
  const canonical = canonicalize(dishName);

  // Try exact match on canonical_name or name
  const { data: dishes } = await sb
    .from("dishes")
    .select("id, name, canonical_name")
    .or(`canonical_name.ilike.${canonical},name.ilike.${canonical}`)
    .limit(1);

  if (!dishes || dishes.length === 0) return null;

  const dish = dishes[0];

  // Load dish_ingredients + join ingredients for macro data
  const { data: dishIngs } = await sb
    .from("dish_ingredients")
    .select("ingredient_id, grams_in_standard_portion")
    .eq("dish_id", dish.id);

  if (!dishIngs || dishIngs.length === 0) return null;

  // Load all ingredient macros
  const ingredientIds = dishIngs.map((di) => di.ingredient_id);
  const { data: ingredientRows } = await sb
    .from("food_templates")
    .select("id, name, calories_100g, protein_100g, carbs_100g, fats_100g")
    .in("id", ingredientIds);

  const ingredientMap = new Map(
    (ingredientRows || []).map((r) => [r.id, r]),
  );

  const ingredients = dishIngs.map((di) => {
    const tmpl = ingredientMap.get(di.ingredient_id);
    return {
      ingredient_id: di.ingredient_id,
      name: tmpl?.name || "Sconosciuto",
      grams: Number(di.grams_in_standard_portion),
      per100: tmpl
        ? {
            carbs: Number(tmpl.carbs_100g),
            protein: Number(tmpl.protein_100g),
            fat: Number(tmpl.fats_100g),
            kcal: Number(tmpl.calories_100g),
          }
        : { carbs: 0, protein: 0, fat: 0, kcal: 0 },
    };
  });

  return { dish_id: dish.id, ingredients };
}

async function saveDishCache(
  sb: ReturnType<typeof supabaseAdmin>,
  dishName: string,
  ingredients: Array<{ ingredient_id: string | null; name: string; grams: number }>,
) {
  try {
    const canonical = canonicalize(dishName);
    const { data: dish } = await sb
      .from("dishes")
      .insert({ name: dishName, canonical_name: canonical })
      .select("id")
      .single();

    if (!dish) return;

    // Only save ingredients that have an ingredient_id (resolved from food_templates)
    const rows = ingredients
      .filter((i) => i.ingredient_id)
      .map((i) => ({
        dish_id: dish.id,
        ingredient_id: i.ingredient_id!,
        grams_in_standard_portion: i.grams,
      }));

    if (rows.length > 0) {
      await sb.from("dish_ingredients").insert(rows);
    }
    console.log(`Cached dish "${dishName}" with ${rows.length} ingredients`);
  } catch (err) {
    console.warn("Failed to cache dish:", err);
  }
}

/* ── main handler ── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, mime_type, meal_type, notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!image_base64) throw new Error("image_base64 is required");

    const sb = supabaseAdmin();

    // ── NEW: Precise prompt for pizza / pasta / risotto ──
    const systemPrompt = `Sei un assistente nutrizionale. Devi analizzare una foto di un piatto e restituire SOLO la chiamata allo strumento analyze_meal.

Regole IMPORTANTI:
- Restituisci ingredienti "base" (es: pasta secca, passata di pomodoro, olio evo, mozzarella, parmigiano, riso arborio, brodo vegetale, burro, cipolla).
- Non usare marche.
- Stima una porzione totale (portion_g) e grammi per ingrediente che sommano circa alla porzione totale.
- Se non sei sicuro al 100% dell'ingrediente, proponi l'opzione più comune in Italia per quel piatto.

Precisione per categorie:
A) Pizza:
- Base impasto (pizza base)
- Passata di pomodoro
- Mozzarella
- Olio extravergine di oliva
- Ingredienti extra (prosciutto, funghi, olive, ecc.) SOLO se chiaramente visibili.

B) Pasta:
- Tipo pasta (pasta secca / pasta fresca / spaghetti / penne...) se riconoscibile, altrimenti "Pasta secca"
- Condimento: passata di pomodoro / pelati / pesto / ragù / olio extravergine di oliva
- Formaggio grattugiato (Parmigiano reggiano) se visibile o implicito

C) Risotto:
- Riso arborio o Riso carnaroli se riconoscibile, altrimenti "Riso"
- Soffritto (Cipolla) in quantità piccola
- Brodo vegetale in quantità implicita (es 100-150g)
- Burro e Parmigiano reggiano se risotto mantecato
- Ingrediente principale (funghi, zucca, gamberi, ecc.) solo se visibile

Usa nomi ingredienti italiani semplici e generici.`;

    const userContent: any[] = [
      {
        type: "image_url",
        image_url: { url: `data:${mime_type || "image/jpeg"};base64,${image_base64}` },
      },
      {
        type: "text",
        text: `Analizza questo piatto${meal_type ? ` (${meal_type})` : ""}.${notes ? ` Note: ${notes}` : ""} Usa lo strumento analyze_meal per restituire i risultati.`,
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_meal",
              description: "Restituisci l'analisi del piatto dalla foto",
              parameters: {
                type: "object",
                properties: {
                  detected_dish_name: { type: "string", description: "Nome del piatto riconosciuto in italiano" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  suggested_portion_g: { type: "number", description: "Porzione totale stimata in grammi" },
                  ingredients_suggested: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredient_name: { type: "string", description: "Nome ingrediente base in italiano" },
                        grams: { type: "number", description: "Grammi stimati" },
                      },
                      required: ["ingredient_name", "grams"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["detected_dish_name", "confidence", "suggested_portion_g", "ingredients_suggested"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_meal" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppi tentativi, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Errore nell'analisi AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Risposta AI non valida" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    const detectedDishName = analysis.detected_dish_name;

    // ── DB-FIRST: Check dishes cache before USDA lookups ──
    const cached = await lookupDishCache(sb, detectedDishName);
    if (cached) {
      console.log(`Cache HIT for dish: "${detectedDishName}"`);
      let totalCarbs = 0, totalProtein = 0, totalFat = 0, totalKcal = 0;
      const enrichedIngredients = cached.ingredients.map((ing) => {
        const factor = ing.grams / 100;
        const c = Math.round(ing.per100.carbs * factor * 10) / 10;
        const p = Math.round(ing.per100.protein * factor * 10) / 10;
        const f = Math.round(ing.per100.fat * factor * 10) / 10;
        const k = Math.round(ing.per100.kcal * factor);
        totalCarbs += c; totalProtein += p; totalFat += f; totalKcal += k;
        return {
          ingredient_id: ing.ingredient_id,
          name: ing.name,
          grams: ing.grams,
          per100: ing.per100,
          carbs: c, protein: p, fat: f, kcal: k,
        };
      });

      return new Response(JSON.stringify({
        dish_name: detectedDishName,
        confidence: analysis.confidence,
        portion_g: analysis.suggested_portion_g,
        cached: true,
        ingredients: enrichedIngredients,
        totals: {
          carbs: Math.round(totalCarbs * 10) / 10,
          protein: Math.round(totalProtein * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          kcal: Math.round(totalKcal),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Cache MISS for dish: "${detectedDishName}", enriching via USDA...`);

    // ── STEP 2: Enrich each ingredient with macro data from DB/USDA ──
    const enrichedIngredients = [];
    let totalCarbs = 0, totalProtein = 0, totalFat = 0, totalKcal = 0;

    for (const ing of (analysis.ingredients_suggested || [])) {
      const { ingredient_id, per100 } = await lookupIngredient(sb, ing.ingredient_name);
      const grams = ing.grams || 0;

      let ingCarbs = 0, ingProtein = 0, ingFat = 0, ingKcal = 0;
      if (per100) {
        const factor = grams / 100;
        ingCarbs = Math.round(per100.carbs * factor * 10) / 10;
        ingProtein = Math.round(per100.protein * factor * 10) / 10;
        ingFat = Math.round(per100.fat * factor * 10) / 10;
        ingKcal = Math.round(per100.kcal * factor);
      }

      totalCarbs += ingCarbs;
      totalProtein += ingProtein;
      totalFat += ingFat;
      totalKcal += ingKcal;

      enrichedIngredients.push({
        ingredient_id,
        name: ing.ingredient_name,
        grams,
        per100: per100 || null,
        carbs: ingCarbs,
        protein: ingProtein,
        fat: ingFat,
        kcal: ingKcal,
      });
    }

    // ── Save to dishes cache for next time ──
    await saveDishCache(sb, detectedDishName, enrichedIngredients);

    const enrichedResult = {
      dish_name: detectedDishName,
      confidence: analysis.confidence,
      portion_g: analysis.suggested_portion_g,
      cached: false,
      ingredients: enrichedIngredients,
      totals: {
        carbs: Math.round(totalCarbs * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        kcal: Math.round(totalKcal),
      },
    };

    return new Response(JSON.stringify(enrichedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-meal-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
