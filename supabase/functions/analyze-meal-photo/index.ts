import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
                  detected_dish_name: {
                    type: "string",
                    description: "Nome del piatto riconosciuto in italiano",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Livello di confidenza nel riconoscimento",
                  },
                  suggested_portion_g: {
                    type: "number",
                    description: "Porzione totale stimata in grammi",
                  },
                  ingredients_suggested: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredient_name: {
                          type: "string",
                          description: "Nome ingrediente base in italiano",
                        },
                        grams: {
                          type: "number",
                          description: "Grammi stimati dell'ingrediente nella porzione",
                        },
                      },
                      required: ["ingredient_name", "grams"],
                      additionalProperties: false,
                    },
                    description: "Lista ingredienti con grammature",
                  },
                },
                required: [
                  "detected_dish_name",
                  "confidence",
                  "suggested_portion_g",
                  "ingredients_suggested",
                ],
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

      return new Response(JSON.stringify({ error: "Errore nell'analisi AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Risposta AI non valida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-meal-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
