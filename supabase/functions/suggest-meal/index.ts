import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // 1. Fetch pantry
    const { data: pantry } = await supabase
      .from("inventory_items")
      .select("id, quantity, unit, expiry_date, storage_type, product:products(id, name, category, calories_100g, macros_100g)")
      .eq("owner_user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    // 2. Fetch today's meals
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayMeals } = await supabase
      .from("meal_logs")
      .select("dish_name, meal_type, kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .gte("created_at", today + "T00:00:00")
      .lte("created_at", today + "T23:59:59");

    // Also check meal_items via meal_days
    const { data: mealDay } = await supabase
      .from("meal_days")
      .select("id")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();

    let mealItems: any[] = [];
    if (mealDay) {
      const { data: meals } = await supabase
        .from("meals")
        .select("meal_type, meal_items(custom_name, dish_name, calories, macros)")
        .eq("meal_day_id", mealDay.id);
      if (meals) {
        for (const m of meals) {
          for (const item of (m as any).meal_items || []) {
            mealItems.push({
              meal_type: (m as any).meal_type,
              name: item.dish_name || item.custom_name,
              kcal: item.calories || 0,
              macros: item.macros,
            });
          }
        }
      }
    }

    // 3. Fetch nutrition targets
    const { data: targets } = await supabase
      .from("nutrition_targets")
      .select("kcal_day, protein_g, carbs_g, fats_g")
      .eq("user_id", user.id)
      .maybeSingle();

    // 4. Fetch active diet plan
    const { data: activePlan } = await supabase
      .from("diet_plans")
      .select("kcal_day, protein_g_day, carbs_g_day, fats_g_day, title")
      .eq("client_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    // Build context for AI
    const pantryList = (pantry || []).map((p: any) => {
      const daysToExpiry = p.expiry_date
        ? Math.ceil((new Date(p.expiry_date).getTime() - new Date().setHours(0,0,0,0)) / 864e5)
        : null;
      return {
        name: p.product?.name,
        quantity: p.quantity,
        unit: p.unit,
        daysToExpiry,
        expiring: daysToExpiry !== null && daysToExpiry <= 3,
        category: p.product?.category,
      };
    });

    const consumedToday = {
      meals: [
        ...(todayMeals || []).map((m: any) => ({
          type: m.meal_type,
          name: m.dish_name,
          kcal: m.kcal,
          protein: m.protein_g,
          carbs: m.carbs_g,
          fats: m.fat_g,
        })),
        ...mealItems.map((m: any) => ({
          type: m.meal_type,
          name: m.name,
          kcal: m.kcal,
          protein: m.macros?.protein || 0,
          carbs: m.macros?.carbs || 0,
          fats: m.macros?.fats || 0,
        })),
      ],
      totalKcal: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
    };
    for (const m of consumedToday.meals) {
      consumedToday.totalKcal += m.kcal || 0;
      consumedToday.totalProtein += m.protein || 0;
      consumedToday.totalCarbs += m.carbs || 0;
      consumedToday.totalFats += m.fats || 0;
    }

    const dailyTarget = activePlan || targets || { kcal_day: 2000, protein_g: 120, carbs_g: 220, fats_g: 70 };

    const systemPrompt = `Sei l'assistente alimentare di Cibarius, app italiana per la gestione del cibo domestico e riduzione dello spreco.

Il tuo compito è suggerire 3 ricette basate sulla dispensa reale dell'utente.

REGOLE:
- Priorità 1: usa ingredienti con scadenza imminente (<=3 giorni)
- Priorità 2: usa ingredienti già disponibili nella dispensa
- Priorità 3: mantieni equilibrio nutrizionale considerando i pasti già consumati oggi
- Le ricette devono essere italiane, casalinghe, realistiche
- Per ogni ricetta indica: titolo, lista ingredienti (con flag disponibile/mancante), motivo del suggerimento, stima kcal e macro (proteine, carboidrati, grassi)
- Se l'utente ha già mangiato molto oggi, suggerisci pasti leggeri
- Rispondi SOLO con il JSON richiesto, nessun altro testo`;

    const userPrompt = `DISPENSA UTENTE:
${JSON.stringify(pantryList, null, 2)}

PASTI GIÀ CONSUMATI OGGI:
${consumedToday.meals.length > 0 ? JSON.stringify(consumedToday, null, 2) : "Nessun pasto registrato oggi."}

TARGET GIORNALIERO:
Kcal: ${(dailyTarget as any).kcal_day}, Proteine: ${(dailyTarget as any).protein_g || (dailyTarget as any).protein_g_day}g, Carboidrati: ${(dailyTarget as any).carbs_g || (dailyTarget as any).carbs_g_day}g, Grassi: ${(dailyTarget as any).fats_g || (dailyTarget as any).fats_g_day}g

Kcal rimanenti: ${Math.max(0, ((dailyTarget as any).kcal_day || 2000) - consumedToday.totalKcal)}

Suggerisci 3 ricette.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_meals",
              description: "Restituisce 3 suggerimenti di pasto basati sulla dispensa dell'utente",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Nome del piatto" },
                        reason: { type: "string", description: "Motivo del suggerimento (es. usa ingredienti in scadenza)" },
                        estimated_kcal: { type: "number" },
                        estimated_macros: {
                          type: "object",
                          properties: {
                            protein: { type: "number" },
                            carbs: { type: "number" },
                            fats: { type: "number" },
                          },
                          required: ["protein", "carbs", "fats"],
                        },
                        ingredients: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              available: { type: "boolean", description: "true se presente nella dispensa" },
                              expiring: { type: "boolean", description: "true se in scadenza imminente" },
                              quantity: { type: "string", description: "Quantità suggerita es. '2 uova' o '150g'" },
                            },
                            required: ["name", "available", "quantity"],
                          },
                        },
                      },
                      required: ["title", "reason", "estimated_kcal", "estimated_macros", "ingredients"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_meals" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Troppo richieste, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      suggestions = parsed.suggestions || [];
    }

    return new Response(JSON.stringify({
      suggestions,
      pantry_count: pantryList.length,
      expiring_count: pantryList.filter((p: any) => p.expiring).length,
      consumed_today: consumedToday,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-meal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
