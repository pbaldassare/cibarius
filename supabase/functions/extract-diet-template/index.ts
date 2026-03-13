import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Sei un assistente specializzato nell'estrazione di piani alimentari da documenti (PDF, CSV, testo).
Analizza TUTTO il contenuto fornito ed estrai un piano alimentare il più completo possibile.

Rispondi SOLO con un JSON valido nel seguente formato:
{
  "title": "Nome del piano (es. Piano ipocalorico 1500 kcal)",
  "kcal_day": 2000,
  "protein_g_day": 100,
  "carbs_g_day": 250,
  "fats_g_day": 70,
  "sugars_g_day": null,
  "fiber_g_day": null,
  "saturated_fats_g_day": null,
  "unsaturated_fats_g_day": null,
  "notes": "eventuali note, intolleranze, obiettivi, consigli trovati nel documento",
  "meals": [
    {
      "meal_type": "colazione",
      "kcal_target": 400,
      "protein_g": 20,
      "carbs_g": 50,
      "fats_g": 15
    }
  ],
  "weekly_data": {
    "weeks": [
      {
        "week_number": 1,
        "week_title": "Settimana 1",
        "days": [
          {
            "day_of_week": 0,
            "meals": [
              { "meal_type": "colazione", "text": "Latte scremato 200ml + fette biscottate integrali 3 + marmellata 20g" },
              { "meal_type": "pranzo", "text": "Pasta integrale 80g + petto di pollo 150g + insalata mista" },
              { "meal_type": "cena", "text": "Pesce al vapore 200g + verdure grigliate + pane integrale 40g" },
              { "meal_type": "spuntino", "text": "Yogurt greco 150g + frutta secca 15g" }
            ]
          }
        ]
      }
    ]
  }
}

REGOLE IMPORTANTI:
- I meal_type validi sono: colazione, pranzo, cena, spuntino (spuntino include merenda, spuntino mattina, spuntino pomeriggio)
- Se il documento contiene un piano settimanale giorno per giorno, DEVI compilare weekly_data con i testi dei pasti per ogni giorno
- day_of_week: 0=Lunedì, 1=Martedì, 2=Mercoledì, 3=Giovedì, 4=Venerdì, 5=Sabato, 6=Domenica
- Se non riesci a calcolare i macro esatti, fai stime ragionevoli basate sugli alimenti descritti
- Estrai TUTTO: note del nutrizionista, consigli, alternative, sostituzioni
- Se ci sono più settimane diverse, inseriscile tutte in weeks[]
- Se il piano è uguale per tutti i giorni, metti un solo giorno
- weekly_data può essere null se non ci sono dettagli giornalieri nel documento
- NON aggiungere testo prima o dopo il JSON`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file uploaded");

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    let messages: any[];

    if (file.name.endsWith(".csv")) {
      const textContent = await file.text();
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Estrai il piano alimentare dal seguente file CSV:\n\n${textContent}` },
      ];
    } else {
      // PDF: convert to proper base64 using standard encoding
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      
      // Proper base64 encoding for Deno
      const { encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
      const base64 = encode(bytes);

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`,
              },
            },
            {
              type: "text",
              text: "Estrai il piano alimentare completo da questo documento PDF. Analizza ogni pagina attentamente.",
            },
          ],
        },
      ];
    }

    console.log("Calling AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 8000,
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    console.log("AI response length:", content.length);

    // Parse JSON from response (strip markdown code fences if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    console.log("Parsed successfully:", parsed.title, "meals:", parsed.meals?.length);

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
