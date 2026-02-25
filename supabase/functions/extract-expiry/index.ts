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
    // Auth check
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

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body - expect base64 image
    const { image_base64, mime_type } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
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

    // Call Gemini via Lovable AI Gateway with tool calling for structured output
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
            content: `You are an expert at reading expiry dates from food product labels/photos.
Analyze the image and extract ALL dates you can find. For each date, classify it:
- "Scadenza" for expiry/use-by/best-before dates (keywords: "scad.", "da consumarsi entro", "da consumare preferibilmente entro", "best before", "use by", "exp")
- "Produzione" for production/packaging dates (keywords: "prod.", "confezionato il", "lotto", "L")
- "Sconosciuto" if you cannot determine the type

Handle Italian date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, month names in Italian.
If a date only has month+year (e.g. "03/2026"), use the last day of that month.
Provide a confidence score from 0 to 1.
Return the raw text you extracted from the image too.`,
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
                text: "Extract all dates from this food product label photo. Focus on expiry dates.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_dates",
              description: "Report the dates found in the food label image",
              parameters: {
                type: "object",
                properties: {
                  candidates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        label: {
                          type: "string",
                          enum: ["Scadenza", "Produzione", "Sconosciuto"],
                        },
                        confidence: {
                          type: "number",
                          description: "Confidence score 0-1",
                        },
                      },
                      required: ["date", "label", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  raw_text: {
                    type: "string",
                    description: "The raw text extracted from the image",
                  },
                },
                required: ["candidates", "raw_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_dates" } },
      }),
    });

    if (!response.ok) {
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
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();

    // Extract tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ candidates: [], raw_text: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-expiry error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
