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

    const { images } = await req.json();
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

    const systemPrompt = `Sei un assistente specializzato per la gestione operativa di un ristorante professionale. 
Analizza le foto fornite e identifica il TIPO di documento:

1. **single_product** – Foto di un singolo prodotto alimentare (confezione, etichetta, ingrediente sfuso)
2. **ddt** – Documento di Trasporto (DDT/bolla): contiene lista prodotti consegnati da un fornitore
3. **product_list** – Elenco/lista di prodotti (menù interno, inventario cartaceo, lista spesa)

Per ogni prodotto identificato, estrai:
- Nome prodotto (il più preciso possibile)
- Marca/brand (se visibile)
- Quantità e unità di misura (es. 5 kg, 10 pezzi, 2 cartoni)
- Peso in grammi (se indicato sulla confezione)
- Numero di lotto (se visibile)
- Data di scadenza (formato YYYY-MM-DD, se leggibile)
- Data di produzione (formato YYYY-MM-DD, se leggibile)
- Tipo di conservazione suggerita: "frigo", "freezer", o "ambiente"
- Chef life suggerita in ore (es. 24, 48, 72 – basata sul tipo di prodotto)
- Allergeni presenti (dalla lista EU: glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, sesamo, anidride solforosa, lupini, molluschi)
- Categoria prodotto (carne, pesce, latticini, verdura, frutta, secchi, surgelati, bevande, altro)

Per i DDT, estrai anche:
- Nome fornitore
- Data del documento

NON concentrarti su valori nutrizionali o macronutrienti. L'obiettivo è la catalogazione operativa per HACCP e gestione magazzino.`;

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
              { type: "text", text: "Analizza queste foto e estrai tutti i dati operativi per il ristorante." },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_restaurant_analysis",
              description: "Report all extracted operational data from the restaurant photos",
              parameters: {
                type: "object",
                properties: {
                  doc_type: {
                    type: "string",
                    enum: ["single_product", "ddt", "product_list"],
                    description: "Type of document detected",
                  },
                  supplier: {
                    type: "object",
                    properties: {
                      name: { type: ["string", "null"] },
                      date: { type: ["string", "null"], description: "YYYY-MM-DD" },
                    },
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        brand: { type: ["string", "null"] },
                        quantity: { type: ["number", "null"] },
                        unit: { type: ["string", "null"] },
                        weight_g: { type: ["number", "null"] },
                        lot_number: { type: ["string", "null"] },
                        expiry_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
                        production_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
                        storage_hint: { type: "string", enum: ["frigo", "freezer", "ambiente"] },
                        chef_life_hours: { type: ["number", "null"] },
                        allergens: {
                          type: "array",
                          items: { type: "string" },
                        },
                        category: { type: ["string", "null"] },
                      },
                      required: ["name", "storage_hint"],
                    },
                  },
                },
                required: ["doc_type", "items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_restaurant_analysis" } },
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
    console.error("analyze-restaurant-photos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
