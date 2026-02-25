import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { images, context } = await req.json();
    // images: Array<{ base64: string; mime_type: string }>
    // context: "inventory" | "meal" | "recipe" | "preparation"
    if (!images?.length) {
      return new Response(JSON.stringify({ error: "Almeno un'immagine richiesta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageContent = images.slice(0, 5).map((img: { base64: string; mime_type: string }) => ({
      type: "image_url",
      image_url: { url: `data:${img.mime_type || "image/jpeg"};base64,${img.base64}` },
    }));

    const contextHint = context === "recipe"
      ? "Se vedi una lista di ingredienti nella foto, elencali tutti separatamente nel campo ingredients_list."
      : context === "preparation"
      ? "Cerca allergeni nel testo ingredienti e riportali. Cerca anche la data di scadenza/consumo entro."
      : "Cerca la data di scadenza e suggerisci il tipo di conservazione.";

    const systemPrompt = `Sei un esperto di prodotti alimentari. Analizza le foto di un prodotto alimentare (possono essere fronte, retro, tabella nutrizionale, data scadenza) e estrai TUTTI i dati possibili.

Per ogni campo, fornisci anche un livello di confidenza (0.0 = non trovato/indovinato, 1.0 = chiaramente leggibile).

${contextHint}

Per storage_hint: deduci se il prodotto va in "frigo", "freezer" o "ambiente" (dispensa) in base al tipo di prodotto. Se non sei sicuro, metti confidence bassa.

Per le date: distingui tra "Scadenza" (da consumarsi entro), "TMC" (da consumarsi preferibilmente entro), e "Produzione". Riporta tutte le date trovate con il tipo.

Per quantity: se vedi un peso netto o volume sulla confezione, riportalo.`;

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
          {
            role: "user",
            content: [
              ...imageContent,
              { type: "text", text: "Analizza queste foto di prodotto alimentare e estrai tutti i dati." },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_food_analysis",
              description: "Report all extracted food data from the photos",
              parameters: {
                type: "object",
                properties: {
                  product: {
                    type: "object",
                    properties: {
                      name: { type: ["string", "null"] },
                      name_confidence: { type: "number" },
                      brand: { type: ["string", "null"] },
                      barcode: { type: ["string", "null"] },
                      barcode_confidence: { type: "number" },
                      category: { type: ["string", "null"] },
                    },
                    required: ["name"],
                  },
                  nutrition: {
                    type: "object",
                    properties: {
                      calories_100g: { type: ["number", "null"] },
                      protein_100g: { type: ["number", "null"] },
                      carbs_100g: { type: ["number", "null"] },
                      fats_100g: { type: ["number", "null"] },
                      serving_size_g: { type: ["number", "null"] },
                      confidence: { type: "number" },
                    },
                  },
                  expiry: {
                    type: "object",
                    properties: {
                      candidates: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", description: "YYYY-MM-DD" },
                            confidence: { type: "number" },
                            label: { type: "string", description: "Scadenza | TMC | Produzione" },
                          },
                          required: ["date", "confidence", "label"],
                        },
                      },
                    },
                  },
                  quantity: {
                    type: "object",
                    properties: {
                      value: { type: ["number", "null"] },
                      unit: { type: ["string", "null"] },
                      confidence: { type: "number" },
                    },
                  },
                  storage_hint: {
                    type: "object",
                    properties: {
                      value: { type: ["string", "null"], description: "ambiente | frigo | freezer" },
                      confidence: { type: "number" },
                    },
                  },
                  ingredients_text: { type: ["string", "null"] },
                  ingredients_list: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: ["number", "null"] },
                        unit: { type: ["string", "null"] },
                      },
                      required: ["name"],
                    },
                  },
                  allergens: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["product"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_food_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ result: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-food-photos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
