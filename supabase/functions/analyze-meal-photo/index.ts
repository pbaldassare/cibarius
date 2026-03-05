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
      .limit(100);
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

/* ── main handler ── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, mime_type, meal_type, notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!image_base64) throw new Error("image_base64 is required");

    const systemPrompt = `Sei un nutrizionista esperto italiano. L'utente ti invierà la foto di un piatto.
Devi:
1. Riconoscere il piatto dalla foto
2. Scomporre il piatto nei suoi ingredienti base (es: pasta secca, sugo pomodoro, olio evo, parmigiano)
3. Stimare la porzione totale in grammi
4. Stimare i grammi di ogni ingrediente

Usa nomi di ingredienti semplici e generici in italiano (es: "Pasta secca", "Riso bianco", "Pomodoro", "Olio extravergine di oliva").
Sii preciso e realistico nelle stime delle grammature.`;

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

    // ── STEP 2: Enrich each ingredient with macro data from DB/USDA ──
    const sb = supabaseAdmin();
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

    const enrichedResult = {
      dish_name: analysis.detected_dish_name,
      confidence: analysis.confidence,
      portion_g: analysis.suggested_portion_g,
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
