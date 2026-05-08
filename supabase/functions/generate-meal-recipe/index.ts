import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sbAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { meal_type, kcal_target, protein_g, carbs_g, fats_g, diet_category, is_female } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const mealLabels: Record<string, string> = {
      colazione: "colazione",
      pranzo: "pranzo",
      cena: "cena",
      spuntino: "spuntino",
    };

    const categoryDescriptions: Record<string, string> = {
      mediterranea: "Dieta Mediterranea: cereali integrali, legumi, pesce, olio EVO, verdure di stagione",
      keto: "Dieta Chetogenica: altissimi grassi buoni, proteine moderate, carboidrati minimi (<20g netti). Usa avocado, olio di cocco, burro, formaggi, uova, pesce grasso, noci.",
      digiuno: "Digiuno Intermittente 16:8: pasti nutrienti e sazianti, ricchi di proteine e fibre per sostenere il digiuno",
      massa: "Dieta per Massa Muscolare: alto apporto proteico, carboidrati complessi per energia, grassi moderati",
      dimagrimento: "Dieta Dimagrimento: deficit calorico moderato, alto apporto proteico per preservare massa magra, cibi sazianti a bassa densità calorica",
    };

    const catDesc = categoryDescriptions[diet_category] || categoryDescriptions.mediterranea;
    const mealLabel = mealLabels[meal_type] || meal_type;

    const systemPrompt = `Sei un nutrizionista italiano esperto. Genera UNA ricetta per ${mealLabel} che rispetti ESATTAMENTE questi target nutrizionali.

Categoria dietetica: ${catDesc}
${is_female ? "La ricetta è per una donna, usa porzioni femminili." : ""}

VINCOLI CALORICI STRETTI:
- Calorie target: ${kcal_target} kcal (tolleranza ±10%)
- Proteine target: ${protein_g}g (tolleranza ±15%)
- Carboidrati target: ${carbs_g}g (tolleranza ±15%)
- Grassi target: ${fats_g}g (tolleranza ±15%)

REGOLE:
1. Usa ingredienti comuni italiani, facili da reperire
2. Ricetta realistica e appetitosa
3. Indica tempi di preparazione realistici
4. Ogni ingrediente deve avere grammi e macro precisi
5. La somma dei macro degli ingredienti DEVE corrispondere ai target

Rispondi SOLO con il tool call richiesto, nessun testo aggiuntivo.`;

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
          { role: "user", content: `Genera una ricetta per ${mealLabel} da circa ${kcal_target} kcal.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_recipe",
              description: "Crea una ricetta con ingredienti e macro dettagliati",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Nome della ricetta in italiano" },
                  instructions: { type: "string", description: "Istruzioni brevi di preparazione (2-3 frasi)" },
                  prep_time_min: { type: "number", description: "Tempo di preparazione in minuti" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        grams: { type: "number" },
                        kcal: { type: "number" },
                        protein_g: { type: "number" },
                        carbs_g: { type: "number" },
                        fats_g: { type: "number" },
                      },
                      required: ["name", "grams", "kcal", "protein_g", "carbs_g", "fats_g"],
                      additionalProperties: false,
                    },
                  },
                  kcal_total: { type: "number" },
                  protein_total: { type: "number" },
                  carbs_total: { type: "number" },
                  fats_total: { type: "number" },
                },
                required: ["title", "instructions", "prep_time_min", "ingredients", "kcal_total", "protein_total", "carbs_total", "fats_total"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_recipe" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "Risposta AI non valida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipe = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meal-recipe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
