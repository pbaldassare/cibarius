import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file uploaded");

    // Read file content as text
    let textContent: string;
    if (file.name.endsWith(".csv")) {
      textContent = await file.text();
    } else {
      // For PDF: read as base64 and send to LLM for extraction
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
      textContent = `[PDF file base64, filename: ${file.name}]\n${base64.slice(0, 50000)}`;
    }

    const systemPrompt = `Sei un assistente specializzato nell'estrazione di piani alimentari da documenti.
Analizza il testo fornito ed estrai un piano alimentare strutturato.
Rispondi SOLO con un JSON valido nel seguente formato:
{
  "title": "Nome del piano",
  "kcal_day": 2000,
  "protein_g_day": 100,
  "carbs_g_day": 250,
  "fats_g_day": 70,
  "notes": "eventuali note",
  "meals": [
    { "meal_type": "colazione", "kcal_target": 400, "protein_g": 20, "carbs_g": 50, "fats_g": 15 },
    { "meal_type": "pranzo", "kcal_target": 600, "protein_g": 35, "carbs_g": 80, "fats_g": 20 },
    { "meal_type": "spuntino", "kcal_target": 200, "protein_g": 10, "carbs_g": 25, "fats_g": 8 },
    { "meal_type": "cena", "kcal_target": 600, "protein_g": 35, "carbs_g": 70, "fats_g": 22 }
  ]
}
I meal_type validi sono: colazione, pranzo, cena, spuntino.
Se non riesci a calcolare i macro esatti, fai stime ragionevoli basate sugli alimenti descritti.
NON aggiungere testo prima o dopo il JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Estrai il piano alimentare dal seguente documento:\n\n${textContent}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppi tentativi, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown code fences if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-diet-template error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
