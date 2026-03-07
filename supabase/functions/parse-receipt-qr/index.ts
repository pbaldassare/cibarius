import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { qr_content } = await req.json();
    if (!qr_content) {
      return new Response(JSON.stringify({ error: "qr_content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // If it's a URL, try to fetch its content
    let textContent = qr_content;
    if (qr_content.startsWith("http://") || qr_content.startsWith("https://")) {
      try {
        const pageResp = await fetch(qr_content, {
          headers: { "User-Agent": "Cibarius/1.0" },
          redirect: "follow",
        });
        if (pageResp.ok) {
          const html = await pageResp.text();
          // Strip HTML tags to get raw text
          textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 8000); // limit to avoid token overflow
        }
      } catch (fetchErr) {
        console.warn("Failed to fetch QR URL, using raw content:", fetchErr);
        textContent = qr_content;
      }
    }

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
          {
            role: "system",
            content: `Sei un assistente che analizza scontrini e liste della spesa da supermercato.
Dall'input ricevuto (testo di uno scontrino, pagina web di spesa digitale, o lista prodotti), estrai tutti i prodotti alimentari acquistati.

Per ogni prodotto restituisci:
- name: nome del prodotto in italiano, pulito e leggibile (es. "Latte Intero", "Petto di Pollo")
- quantity: numero di pezzi acquistati (default 1)
- unit: unità (es. "pz", "kg", "g", "l")
- price: prezzo unitario se disponibile, altrimenti null
- category: categoria merceologica (es. "latticini", "carne", "frutta", "verdura", "bevande", "cereali", "surgelati", "altro")

Ignora voci non alimentari (sacchetti, sconti, totali, IVA, etc.).
Usa la tool "extract_products" per restituire il risultato.`,
          },
          {
            role: "user",
            content: `Ecco il contenuto dello scontrino/lista:\n\n${textContent}`,
          },
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
