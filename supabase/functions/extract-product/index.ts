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

    const { image_base64, mime_type } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Sei un esperto di prodotti alimentari. Analizza la foto dell'etichetta/confezione di un prodotto alimentare e estrai tutte le informazioni nutrizionali e identificative.

Estrai:
- product_name: nome completo del prodotto
- brand: marca/produttore
- barcode: codice a barre se visibile (stringa numerica)
- calories_100g: calorie per 100g (numero)
- protein_100g: proteine per 100g in grammi (numero)
- carbs_100g: carboidrati per 100g in grammi (numero)
- fat_100g: grassi per 100g in grammi (numero)
- serving_size_g: dimensione porzione in grammi se indicata (numero)
- category: categoria del prodotto (pasta, carne, latticini, verdura, bevande, dolci, condimenti, altro)
- expiry_date: data di scadenza se visibile (YYYY-MM-DD)
- ingredients_text: lista ingredienti se visibile
- allergens: lista di allergeni se indicati

Per i campi che non riesci a leggere, usa null.
Se vedi solo una parte del prodotto, estrai quello che puoi.
Per le calorie, converti da kJ a kcal se necessario (kJ / 4.184).`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime_type || "image/jpeg"};base64,${image_base64}`,
                },
              },
              {
                type: "text",
                text: "Analizza questa etichetta/confezione di prodotto alimentare e estrai tutte le informazioni.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_product_data",
              description: "Report the extracted product data from the food label",
              parameters: {
                type: "object",
                properties: {
                  product_name: { type: ["string", "null"], description: "Nome del prodotto" },
                  brand: { type: ["string", "null"], description: "Marca" },
                  barcode: { type: ["string", "null"], description: "Codice a barre" },
                  calories_100g: { type: ["number", "null"], description: "Calorie per 100g" },
                  protein_100g: { type: ["number", "null"], description: "Proteine per 100g" },
                  carbs_100g: { type: ["number", "null"], description: "Carboidrati per 100g" },
                  fat_100g: { type: ["number", "null"], description: "Grassi per 100g" },
                  serving_size_g: { type: ["number", "null"], description: "Porzione in grammi" },
                  category: { type: ["string", "null"], description: "Categoria prodotto" },
                  expiry_date: { type: ["string", "null"], description: "Data scadenza YYYY-MM-DD" },
                  ingredients_text: { type: ["string", "null"], description: "Lista ingredienti" },
                  allergens: {
                    type: "array",
                    items: { type: "string" },
                    description: "Allergeni presenti",
                  },
                },
                required: ["product_name"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_product_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(
        JSON.stringify({ product: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ product }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-product error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
