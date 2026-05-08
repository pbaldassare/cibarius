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

    const { qr_content, receipt_image } = await req.json();
    if (!qr_content && !receipt_image) {
      return new Response(JSON.stringify({ error: "qr_content or receipt_image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build user content based on input type
    let userContent: any;

    if (receipt_image && receipt_image.base64 && receipt_image.mime_type) {
      // Multimodal: image input
      userContent = [
        { type: "text", text: "Analizza questa foto di uno scontrino/lista della spesa ed estrai tutti i prodotti alimentari:" },
        { type: "image_url", image_url: { url: `data:${receipt_image.mime_type};base64,${receipt_image.base64}` } },
      ];
    } else if (qr_content) {
      // SECURITY: never fetch arbitrary URLs from user input (SSRF). Pass raw text to AI.
      const textContent = String(qr_content).slice(0, 8000);
      userContent = `Ecco il contenuto dello scontrino/lista (QR/testo grezzo):\n\n${textContent}`;
    }

    const systemPrompt = `Sei un assistente che analizza scontrini e liste della spesa da supermercato.
Dall'input ricevuto (testo di uno scontrino, pagina web di spesa digitale, foto di scontrino, o lista prodotti), estrai tutti i prodotti alimentari acquistati.

Per ogni prodotto restituisci:
- name: nome del prodotto in italiano, pulito e leggibile (es. "Latte Intero", "Petto di Pollo")
- quantity: numero di pezzi acquistati (default 1)
- unit: unità (es. "pz", "kg", "g", "l")
- price: prezzo unitario se disponibile, altrimenti null
- category: categoria merceologica (es. "latticini", "carne", "frutta", "verdura", "bevande", "cereali", "surgelati", "altro")

Ignora voci non alimentari (sacchetti, sconti, totali, IVA, etc.).
Usa la tool "extract_products" per restituire il risultato.`;

    // Call AI to extract product list
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
              name: "extract_products",
              description: "Restituisce la lista di prodotti alimentari estratti dallo scontrino",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                        price: { type: "number", nullable: true },
                        category: { type: "string" },
                      },
                      required: ["name", "quantity", "unit", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_products" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, riprova tra poco." }), {
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

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ products: parsed.products || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-receipt-qr error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
