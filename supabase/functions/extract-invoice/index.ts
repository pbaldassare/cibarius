import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_base64, mime_type, public_url, document_id } = await req.json();

    if (!image_base64 && !public_url) {
      return new Response(JSON.stringify({ error: "image_base64 or public_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build image content for the AI
    let imageContent: any;
    if (image_base64) {
      imageContent = {
        type: "image_url",
        image_url: { url: `data:${mime_type || "image/jpeg"};base64,${image_base64}` },
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: { url: public_url },
      };
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
            content: `Sei un esperto nell'analisi di bolle di consegna, fatture e documenti commerciali italiani.
Analizza l'immagine del documento e estrai TUTTE le informazioni che riesci a trovare.

Estrai:
- supplier_name: nome del fornitore/mittente
- supplier_address: indirizzo del fornitore
- supplier_vat: P.IVA del fornitore
- supplier_phone: telefono del fornitore
- document_number: numero del documento/bolla/fattura
- document_date: data del documento (formato YYYY-MM-DD)
- delivery_date: data di consegna se diversa (formato YYYY-MM-DD)
- recipient_name: nome del destinatario
- items: lista di articoli/prodotti con nome, quantità, unità, prezzo unitario e totale riga
- subtotal: subtotale
- vat_amount: importo IVA
- total: totale documento
- notes: eventuali note, condizioni di pagamento, riferimenti ordine
- raw_text: il testo grezzo che riesci a leggere dal documento

Per i campi che non riesci a leggere, usa null.
Per le date, convertile sempre in formato YYYY-MM-DD.
Per i numeri/prezzi, usa valori numerici senza simboli di valuta.`,
          },
          {
            role: "user",
            content: [
              imageContent,
              {
                type: "text",
                text: "Analizza questo documento commerciale (bolla/fattura) e estrai tutti i dati strutturati.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_invoice_data",
              description: "Report the extracted data from the commercial document",
              parameters: {
                type: "object",
                properties: {
                  supplier_name: { type: ["string", "null"], description: "Nome del fornitore" },
                  supplier_address: { type: ["string", "null"], description: "Indirizzo del fornitore" },
                  supplier_vat: { type: ["string", "null"], description: "P.IVA del fornitore" },
                  supplier_phone: { type: ["string", "null"], description: "Telefono del fornitore" },
                  document_number: { type: ["string", "null"], description: "Numero documento" },
                  document_date: { type: ["string", "null"], description: "Data documento YYYY-MM-DD" },
                  delivery_date: { type: ["string", "null"], description: "Data consegna YYYY-MM-DD" },
                  recipient_name: { type: ["string", "null"], description: "Nome destinatario" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome prodotto/articolo" },
                        quantity: { type: ["number", "null"], description: "Quantità" },
                        unit: { type: ["string", "null"], description: "Unità di misura" },
                        unit_price: { type: ["number", "null"], description: "Prezzo unitario" },
                        total: { type: ["number", "null"], description: "Totale riga" },
                      },
                      required: ["name"],
                    },
                  },
                  subtotal: { type: ["number", "null"], description: "Subtotale" },
                  vat_amount: { type: ["number", "null"], description: "Importo IVA" },
                  total: { type: ["number", "null"], description: "Totale documento" },
                  notes: { type: ["string", "null"], description: "Note, condizioni pagamento, rif. ordine" },
                  raw_text: { type: "string", description: "Testo grezzo estratto dal documento" },
                },
                required: ["items", "raw_text"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_invoice_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, riprova tra poco." }), {
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
        JSON.stringify({ extracted: null, error: "AI non ha restituito dati strutturati" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // If document_id provided, save extracted data to DB
    if (document_id) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await serviceClient.from("restaurant_documents").update({
        extracted_data: extracted,
        supplier_name: extracted.supplier_name || undefined,
        doc_date: extracted.document_date || undefined,
      }).eq("id", document_id);
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-invoice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
