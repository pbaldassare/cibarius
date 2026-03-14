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

    // ─── DB enrichment: if AI found a barcode or name, check products table ───
    try {
      const sbUrl = Deno.env.get("SUPABASE_URL")!;
      const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(sbUrl, sbKey);

      let dbProduct: any = null;

      // Try barcode first
      if (result.product?.barcode) {
        const { data } = await sb
          .from("products")
          .select("name, brand, calories_100g, macros_100g, image_url, serving_size_g")
          .eq("barcode", result.product.barcode)
          .not("calories_100g", "is", null)
          .maybeSingle();
        if (data) dbProduct = data;
      }

      // Fallback: exact name match
      if (!dbProduct && result.product?.name) {
        const { data } = await sb
          .from("products")
          .select("name, brand, calories_100g, macros_100g, image_url, serving_size_g")
          .ilike("name", result.product.name)
          .not("calories_100g", "is", null)
          .limit(1)
          .maybeSingle();
        if (data) dbProduct = data;
      }

      // Enrich AI result with DB data if AI didn't find nutrition
      if (dbProduct && (!result.nutrition?.calories_100g || result.nutrition?.confidence < 0.7)) {
        const m = dbProduct.macros_100g as any;
        result.nutrition = {
          calories_100g: dbProduct.calories_100g,
          protein_100g: m?.protein ?? 0,
          carbs_100g: m?.carbs ?? 0,
          fats_100g: m?.fats ?? 0,
          serving_size_g: dbProduct.serving_size_g ?? result.nutrition?.serving_size_g ?? null,
          confidence: 0.95,
        };
        result._source = "db_cache";
      }
    } catch (dbErr) {
      console.warn("DB enrichment failed (non-blocking):", dbErr);
    }

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
