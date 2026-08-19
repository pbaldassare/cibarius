import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 4;
const TARGET_FACILE = 2;
const TARGET_GOURMET = 1;
const TARGET_DOLCE = 1;

type IngredientRole = "core" | "minor" | "staple";
type Difficulty = "facile" | "gourmet";
type Course = "salato" | "dolce";

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Condimenti/aromi di supporto: ok se assenti. Non includere ingredienti firma. */
function isOptionalAromatic(name: string): boolean {
  const n = normalizeIngredientName(name);
  if (n === "sale" || /\bsale\b/.test(n)) return true;
  if (/\bpepe\b/.test(n) && !/peperon/.test(n)) return true;
  if (/\bolio\b/.test(n) && !/sott/.test(n)) return true;
  if (n === "acqua" || /\bacqua\b/.test(n)) return true;
  if (/\baceto\b/.test(n)) return true;
  if (/\bcipoll/.test(n)) return true;
  if (/\baglio\b/.test(n)) return true;
  if (/\bprezzemol/.test(n)) return true;
  if (/\brosmarin/.test(n)) return true;
  if (/\borigan/.test(n)) return true;
  if (n === "timo" || /\btimo\b/.test(n)) return true;
  if (/\bsalvia\b/.test(n)) return true;
  if (/\blauro\b/.test(n) || /\balloro\b/.test(n)) return true;
  if (/\bpeperoncin/.test(n)) return true;
  if (/\bspezie\b/.test(n) || /\berbe\b/.test(n)) return true;
  if (/\bbasilico\s+secco\b/.test(n)) return true;
  if (/scorza/.test(n) || /\bzest\b/.test(n)) return true;
  if (/\bburro\b/.test(n) && n.length < 20) return true;
  return false;
}

function resolveIngredientRole(name: string, aiRole?: string): IngredientRole {
  if (isOptionalAromatic(name)) return "staple";
  if (aiRole === "core" || aiRole === "minor" || aiRole === "staple") return aiRole;
  return "core";
}

function normalizeDifficulty(value?: string): Difficulty {
  const v = (value || "").toLowerCase().trim();
  if (v === "gourmet" || v === "elevata" || v === "chef") return "gourmet";
  return "facile";
}

function normalizeCourse(value?: string, title?: string): Course {
  const v = (value || "").toLowerCase().trim();
  if (v === "dolce" || v === "dessert" || v === "sweet") return "dolce";
  if (v === "salato" || v === "savory") return "salato";
  const t = (title || "").toLowerCase();
  if (/dolce|dessert|torta|budino|mousse|tiramis|panna\s*cotta|crema\s+al|biscott|muffin|pancake|waffle|yogurt\s+con|macedonia|gelato|cioccolat/i.test(t)) {
    return "dolce";
  }
  return "salato";
}

/** Yogurt, uova, farina, frutta, latte, cacao, ricotta, biscotti, zucchero/miele, etc. */
function isDessertCapableName(name: string): boolean {
  const n = normalizeIngredientName(name);
  if (!n) return false;
  if (/\byogurt\b/.test(n) || /\byoghurt\b/.test(n)) return true;
  if (/\buova?\b/.test(n) || /\buovo\b/.test(n)) return true;
  if (/\bfarina\b/.test(n)) return true;
  if (/\blatte\b/.test(n) && !/condens/.test(n)) return true;
  if (/\bricotta\b/.test(n) || /\bmascarpone\b/.test(n) || /\bpanna\b/.test(n)) return true;
  if (/\bcacao\b/.test(n) || /\bcioccolat/.test(n) || /\bcocoa\b/.test(n)) return true;
  if (/\bbiscott/.test(n) || /\bcookie/.test(n)) return true;
  if (/\bzucchero\b/.test(n) || /\bmiele\b/.test(n) || /\bconfettur/.test(n) || /\bmarmellat/.test(n)) return true;
  if (/\bbanana\b/.test(n) || /\bmela\b/.test(n) || /\bmele\b/.test(n) || /\bpera\b/.test(n) || /\bpere\b/.test(n)) return true;
  if (/\bfragol/.test(n) || /\bmirtill/.test(n) || /\bfrutta\b/.test(n) || /\barancia\b/.test(n) || /\blimon/.test(n)) return true;
  if (/\bpesca\b/.test(n) || /\bkiwi\b/.test(n) || /\buva\b/.test(n) || /\bananas?\b/.test(n)) return true;
  if (/\bmandorl/.test(n) || /\bnocciol/.test(n) || /\bnoci\b/.test(n)) return true;
  if (/\baven[ae]\b/.test(n) || /\bcornflakes\b/.test(n) || /\bcereali\b/.test(n)) return true;
  if (/\bcrema\s+di\s+nocciol/.test(n) || /\bnutella\b/.test(n)) return true;
  return false;
}

function pantrySupportsDessert(
  pantryList: { name?: string; category?: string }[],
): { supported: boolean; sweetNames: string[] } {
  const sweetNames: string[] = [];
  let hasDairy = false;
  let hasEgg = false;
  let hasFruit = false;
  let hasSweetener = false;
  let hasBase = false;

  for (const p of pantryList) {
    const name = String(p.name || "");
    if (!name) continue;
    const n = normalizeIngredientName(name);
    const cat = String(p.category || "").toLowerCase();
    if (isDessertCapableName(name) || /dolc|dessert|frutta|yogurt|latticin|uova|pane|biscott/.test(cat)) {
      sweetNames.push(name);
    }
    if (/\byogurt\b|\blatte\b|\bricotta\b|\bmascarpone\b|\bpanna\b/.test(n)) hasDairy = true;
    if (/\buova?\b|\buovo\b/.test(n)) hasEgg = true;
    if (/\bbanana\b|\bmela\b|\bmele\b|\bpera\b|\bfragol|\bmirtill|\bfrutta\b|\barancia|\blimon|\bpesca|\bkiwi|\buva\b/.test(n) || /frutta/.test(cat)) {
      hasFruit = true;
    }
    if (/\bzucchero\b|\bmiele\b|\bconfettur|\bmarmellat/.test(n)) hasSweetener = true;
    if (/\bfarina\b|\bbiscott|\bcacao\b|\bcioccolat|\baven[ae]\b/.test(n)) hasBase = true;
  }

  const unique = [...new Set(sweetNames.map((s) => s.toLowerCase()))];
  const combo = (hasDairy && (hasEgg || hasFruit || hasSweetener || hasBase)) ||
    (hasFruit && (hasDairy || hasSweetener || hasBase)) ||
    (hasBase && (hasDairy || hasEgg || hasFruit || hasSweetener));
  const supported = unique.length >= 2 || combo;
  return { supported, sweetNames: sweetNames.slice(0, 8) };
}

type AiIngredient = {
  name: string;
  available?: boolean;
  expiring?: boolean;
  quantity?: string;
  role?: IngredientRole;
};

type AiSuggestion = {
  title: string;
  reason?: string;
  difficulty?: Difficulty;
  course?: Course;
  estimated_kcal?: number;
  estimated_macros?: { protein: number; carbs: number; fats: number };
  ingredients: AiIngredient[];
};

type ScoredSuggestion = AiSuggestion & {
  _missingCore: number;
  _missingMinor: number;
  _expiringUsed: number;
};

function reconcileSuggestion(
  s: AiSuggestion,
  pantryNames: string[],
  expiringNames: string[],
): ScoredSuggestion {
  const ingredients = (s.ingredients || []).map((ing) => {
    const name = ing.name || "";
    const role = resolveIngredientRole(name, ing.role);
    const inPantry = pantryNames.some((p) => {
      const ingLower = name.toLowerCase();
      return p.includes(ingLower) || ingLower.includes(p);
    });
    const available = role === "staple" ? true : inPantry;
    const expiring =
      available &&
      role !== "staple" &&
      expiringNames.some((e) => {
        const ingLower = name.toLowerCase();
        return e.includes(ingLower) || ingLower.includes(e);
      });
    return { ...ing, name, role, available, expiring };
  });

  let missingCore = 0;
  let missingMinor = 0;
  for (const i of ingredients) {
    if (i.available) continue;
    const role = resolveIngredientRole(i.name, i.role);
    if (role === "staple") continue;
    if (role === "core") missingCore++;
    else missingMinor++;
  }

  return {
    ...s,
    difficulty: normalizeDifficulty(s.difficulty),
    course: normalizeCourse(s.course, s.title),
    ingredients,
    _missingCore: missingCore,
    _missingMinor: missingMinor,
    _expiringUsed: ingredients.filter((i) => i.expiring).length,
  };
}

function stripScore(s: ScoredSuggestion): AiSuggestion {
  const { _missingCore, _missingMinor, _expiringUsed, ...rest } = s;
  return rest;
}

function sortCookable(a: ScoredSuggestion, b: ScoredSuggestion): number {
  if (a._missingCore !== b._missingCore) return a._missingCore - b._missingCore;
  if (a._missingMinor !== b._missingMinor) return a._missingMinor - b._missingMinor;
  if (b._expiringUsed !== a._expiringUsed) return b._expiringUsed - a._expiringUsed;
  return (b.ingredients?.length || 0) - (a.ingredients?.length || 0);
}

/** Soft filter: drop absurd missing-core dishes; keep cookable (+ ≤1 minor missing). */
function filterCookable(scored: ScoredSuggestion[]): AiSuggestion[] {
  return scored
    .filter((s) => s._missingCore === 0 && s._missingMinor <= 1)
    .sort(sortCookable)
    .map(stripScore);
}

function elevateToGourmet(s: AiSuggestion): AiSuggestion {
  const baseTitle = (s.title || "Piatto dalla dispensa").replace(/\s+/g, " ").trim();
  const alreadyElevated = /gourmet|glassa|emulsione|riduzione|mantecat|scottat|confit|croccant/i.test(baseTitle);
  return {
    ...s,
    difficulty: "gourmet",
    course: s.course === "dolce" ? "dolce" : "salato",
    title: alreadyElevated ? baseTitle : `${baseTitle} in versione gourmet`,
    reason: s.reason
      ? `${s.reason} — variante elevata: cottura più precisa, plating curato e contrasto di sapori.`
      : "Variante gourmet: tecnica e plating più curati, ancora cucinabile con la dispensa.",
  };
}

/** Heuristic gourmet from pantry when AI returns only easy recipes. */
function buildGourmetFromPantry(
  pantryList: { name?: string; quantity?: number; unit?: string; expiring?: boolean }[],
): AiSuggestion | null {
  const items = pantryList.filter((p) => p.name).slice(0, 12);
  if (items.length === 0) return null;

  const names = items.map((p) => String(p.name));
  const expiring = items.filter((p) => p.expiring).map((p) => String(p.name));
  const a = names[0];
  const b = names[1] || names[0];
  const c = names[2];

  const ingredients: AiIngredient[] = [
    { name: a, role: "core", available: true, expiring: !!items.find((p) => p.name === a)?.expiring, quantity: "a piacere" },
    ...(b !== a
      ? [{ name: b, role: "core" as const, available: true, expiring: !!items.find((p) => p.name === b)?.expiring, quantity: "a piacere" }]
      : []),
    ...(c
      ? [{ name: c, role: "minor" as const, available: true, expiring: !!items.find((p) => p.name === c)?.expiring, quantity: "q.b." }]
      : []),
    { name: "olio", role: "staple", available: true, quantity: "1 cucchiaio" },
    { name: "sale", role: "staple", available: true, quantity: "q.b." },
    { name: "pepe", role: "staple", available: true, quantity: "q.b." },
  ];

  return {
    title: c
      ? `${a} scottato con ${b} e riduzione di ${c}`
      : `${a} scottato con emulsione all'olio e ${b}`,
    reason: expiring.length
      ? `Gourmet anti-spreco: valorizza ${expiring[0]} con cottura precisa e plating curato`
      : "Ricetta gourmet cucinabile ora: contrasto di texture e sapori con la tua dispensa",
    difficulty: "gourmet",
    course: "salato",
    estimated_kcal: 420 + names.length * 25,
    estimated_macros: { protein: 18, carbs: 28, fats: 18 },
    ingredients,
  };
}

/** Simple dessert from dessert-capable pantry items. */
function buildDolceFromPantry(
  pantryList: { name?: string; quantity?: number; unit?: string; expiring?: boolean; category?: string }[],
  sweetNames: string[],
): AiSuggestion | null {
  const preferred = sweetNames.length
    ? sweetNames
    : pantryList.filter((p) => p.name && isDessertCapableName(String(p.name))).map((p) => String(p.name));
  const names = [...new Set(preferred)].slice(0, 4);
  if (names.length === 0) return null;

  const a = names[0];
  const b = names[1] || names[0];
  const c = names[2];
  const expiring = pantryList.filter((p) => p.expiring && p.name).map((p) => String(p.name));

  const ingredients: AiIngredient[] = [
    { name: a, role: "core", available: true, expiring: !!pantryList.find((p) => p.name === a)?.expiring, quantity: "a piacere" },
    ...(b !== a
      ? [{ name: b, role: "core" as const, available: true, expiring: !!pantryList.find((p) => p.name === b)?.expiring, quantity: "a piacere" }]
      : []),
    ...(c
      ? [{ name: c, role: "minor" as const, available: true, expiring: !!pantryList.find((p) => p.name === c)?.expiring, quantity: "q.b." }]
      : []),
  ];

  return {
    title: c
      ? `Dolce rapido di ${a} con ${b} e ${c}`
      : b !== a
        ? `Coppetta di ${a} e ${b}`
        : `Dolce semplice alla ${a}`,
    reason: expiring.length
      ? `Dolce anti-spreco con ${expiring[0]} e altri ingredienti dolci della dispensa`
      : "Dolce facile cucinabile ora con ciò che hai in casa",
    difficulty: "facile",
    course: "dolce",
    estimated_kcal: 280 + names.length * 30,
    estimated_macros: { protein: 8, carbs: 36, fats: 10 },
    ingredients,
  };
}

/**
 * Guarantee mix: 2–3 facile + exactly 1 gourmet; +1 dolce when pantry supports dessert.
 * Target when dessert OK: 2 facili salate + 1 gourmet + 1 dolce (up to 4).
 */
function ensureDifficultyMix(
  suggestions: AiSuggestion[],
  pantryList: { name?: string; quantity?: number; unit?: string; expiring?: boolean; category?: string }[],
  wantDolce: boolean,
  sweetNames: string[],
): AiSuggestion[] {
  if (suggestions.length === 0 && !wantDolce) return suggestions;

  const normalized = suggestions.map((s) => ({
    ...s,
    difficulty: normalizeDifficulty(s.difficulty),
    course: normalizeCourse(s.course, s.title),
  }));

  // Ensure dolce when pantry supports it
  if (wantDolce && !normalized.some((s) => s.course === "dolce")) {
    const invented = buildDolceFromPantry(pantryList, sweetNames);
    if (invented) {
      // Prefer promoting an existing sweet-titled dish if any, else append/replace
      const promoteIdx = normalized.findIndex((s) =>
        /dolce|dessert|yogurt|torta|crema|biscott|cioccolat|frutta/i.test(s.title),
      );
      if (promoteIdx >= 0) {
        normalized[promoteIdx] = {
          ...normalized[promoteIdx],
          course: "dolce",
          difficulty: normalizeDifficulty(normalized[promoteIdx].difficulty),
        };
      } else if (normalized.length >= MAX_SUGGESTIONS) {
        // Keep gourmet + facili; replace a non-gourmet salato slot
        const replaceIdx = normalized.findIndex((s) => s.difficulty !== "gourmet" && s.course !== "dolce");
        if (replaceIdx >= 0) normalized[replaceIdx] = invented;
        else normalized[normalized.length - 1] = invented;
      } else {
        normalized.push(invented);
      }
    }
  }

  let gourmetIdx = normalized.findIndex((s) => s.difficulty === "gourmet" && s.course !== "dolce");
  if (gourmetIdx < 0) {
    gourmetIdx = normalized.findIndex((s) => s.difficulty === "gourmet");
  }

  if (gourmetIdx < 0) {
    let best = -1;
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i].course === "dolce") continue;
      if (best < 0 || (normalized[i].ingredients?.length || 0) > (normalized[best].ingredients?.length || 0)) {
        best = i;
      }
    }
    const invented = buildGourmetFromPantry(pantryList);
    if (invented && !normalized.some((s) => s.title.toLowerCase() === invented.title.toLowerCase())) {
      if (best >= 0 && normalized.length >= MIN_SUGGESTIONS) {
        // Prefer inventing rather than converting a dolce
        const insertAt = normalized.findIndex((s) => s.course !== "dolce" && s.difficulty !== "gourmet");
        if (normalized.length >= MAX_SUGGESTIONS && insertAt >= 0) {
          normalized[insertAt] = invented;
          gourmetIdx = insertAt;
        } else {
          normalized.push(invented);
          gourmetIdx = normalized.length - 1;
        }
      } else {
        normalized.push(invented);
        gourmetIdx = normalized.length - 1;
      }
    } else if (best >= 0) {
      normalized[best] = elevateToGourmet({ ...normalized[best], course: "salato" });
      gourmetIdx = best;
    }
  }

  // Exactly one gourmet among non-dolce (dolce may stay facile or gourmet dessert)
  let gourmetAssigned = false;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i].course === "dolce") {
      // Keep dolce difficulty as-is (usually facile); never demote course
      normalized[i] = {
        ...normalized[i],
        course: "dolce",
        difficulty: normalizeDifficulty(normalized[i].difficulty),
      };
      continue;
    }
    if (!gourmetAssigned && (i === gourmetIdx || normalized[i].difficulty === "gourmet")) {
      normalized[i] = { ...normalized[i], difficulty: "gourmet", course: "salato" };
      gourmetAssigned = true;
      gourmetIdx = i;
    } else {
      normalized[i] = { ...normalized[i], difficulty: "facile", course: "salato" };
    }
  }

  const faciliSalate = normalized.filter((s) => s.course !== "dolce" && s.difficulty === "facile");
  const gourmet = normalized.filter((s) => s.course !== "dolce" && s.difficulty === "gourmet");
  const dolci = normalized.filter((s) => s.course === "dolce");

  const mixed: AiSuggestion[] = [
    ...faciliSalate.slice(0, TARGET_FACILE),
    ...gourmet.slice(0, TARGET_GOURMET),
    ...(wantDolce ? dolci.slice(0, TARGET_DOLCE) : []),
  ];

  // Pad to at least MIN with leftover facili (still salate)
  if (mixed.length < MIN_SUGGESTIONS) {
    for (const s of faciliSalate) {
      if (mixed.length >= MIN_SUGGESTIONS) break;
      if (!mixed.some((m) => m.title.toLowerCase() === s.title.toLowerCase())) mixed.push(s);
    }
  }

  // Cap at MAX
  return mixed.slice(0, wantDolce ? MAX_SUGGESTIONS : MIN_SUGGESTIONS);
}

/** Heuristic recipes from pantry items — always usable when AI fails. */
function buildPantryFallback(
  pantryList: { name?: string; quantity?: number; unit?: string; expiring?: boolean }[],
  count: number,
): AiSuggestion[] {
  const items = pantryList.filter((p) => p.name).slice(0, 12);
  if (items.length === 0) return [];

  const names = items.map((p) => String(p.name));
  const expiring = items.filter((p) => p.expiring).map((p) => String(p.name));
  const pick = (...idxs: number[]) =>
    idxs.map((i) => names[i % names.length]).filter(Boolean);

  const templates: { title: (n: string[]) => string; reason: string; use: number[]; difficulty: Difficulty; course: Course }[] = [
    {
      title: (n) => `Padellata di ${n[0]}${n[1] ? ` e ${n[1]}` : ""}`,
      reason: expiring.length
        ? `Usa subito ${expiring[0]} e altri ingredienti in dispensa`
        : "Ricetta semplice con ciò che hai in casa",
      use: [0, 1],
      difficulty: "facile",
      course: "salato",
    },
    {
      title: (n) => n[0] ? `${n[0]} in padella` : "Piatto veloce dalla dispensa",
      reason: "Preparazione rapida solo con ingredienti disponibili",
      use: [0],
      difficulty: "facile",
      course: "salato",
    },
    {
      title: (n) => n.length >= 2
        ? `${n[0]} glassato con riduzione di ${n[1]}${n[2] ? ` e ${n[2]}` : ""}`
        : `${n[0]} in emulsione all'olio`,
      reason: "Variante gourmet: cottura precisa e contrasto di sapori dalla dispensa",
      use: [0, 1, 2],
      difficulty: "gourmet",
      course: "salato",
    },
  ];

  const out: AiSuggestion[] = [];
  for (let t = 0; t < templates.length && out.length < count; t++) {
    const tpl = templates[t];
    const usedNames = [...new Set(pick(...tpl.use))];
    if (usedNames.length === 0) continue;
    const ingredients: AiIngredient[] = [
      ...usedNames.map((name) => ({
        name,
        role: "core" as const,
        available: true,
        expiring: !!items.find((p) => p.name === name)?.expiring,
        quantity: "a piacere",
      })),
      { name: "olio", role: "staple", available: true, quantity: "1 cucchiaio" },
      { name: "sale", role: "staple", available: true, quantity: "q.b." },
    ];
    out.push({
      title: tpl.title(usedNames),
      reason: tpl.reason,
      difficulty: tpl.difficulty,
      course: tpl.course,
      estimated_kcal: 350 + usedNames.length * 40,
      estimated_macros: { protein: 12, carbs: 30, fats: 14 },
      ingredients,
    });
  }
  return out;
}

const toolSchema = {
  type: "function",
  function: {
    name: "suggest_meals",
    description: "Restituisce 3–4 ricette inventate dalla dispensa: 2 facili salate + 1 gourmet + 1 dolce se la dispensa lo consente",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              reason: { type: "string" },
              difficulty: {
                type: "string",
                enum: ["facile", "gourmet"],
                description: "facile = quotidiana/veloce; gourmet = plating/tecnica/combo sapori più elevata",
              },
              course: {
                type: "string",
                enum: ["salato", "dolce"],
                description: "salato = piatto principale; dolce = dessert",
              },
              estimated_kcal: { type: "number" },
              estimated_macros: {
                type: "object",
                properties: {
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                },
                required: ["protein", "carbs", "fats"],
              },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    role: {
                      type: "string",
                      enum: ["core", "minor", "staple"],
                    },
                    available: { type: "boolean" },
                    expiring: { type: "boolean" },
                    quantity: { type: "string" },
                  },
                  required: ["name", "role", "available", "quantity"],
                },
              },
            },
            required: ["title", "reason", "difficulty", "course", "estimated_kcal", "estimated_macros", "ingredients"],
          },
        },
      },
      required: ["suggestions"],
    },
  },
};

async function callSuggestMeals(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiSuggestion[]> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [toolSchema],
      tool_choice: { type: "function", function: { name: "suggest_meals" } },
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    const err = new Error(`AI gateway error: ${aiResponse.status}`) as Error & {
      status: number;
      body: string;
    };
    err.status = aiResponse.status;
    err.body = errText;
    throw err;
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    return (parsed.suggestions || []).map((s: AiSuggestion) => ({
      ...s,
      difficulty: normalizeDifficulty(s.difficulty),
      course: normalizeCourse(s.course, s.title),
    }));
  }
  return [];
}

function mergeUnique(primary: AiSuggestion[], extra: AiSuggestion[], limit: number): AiSuggestion[] {
  const seen = new Set(primary.map((s) => s.title.toLowerCase()));
  const out = [...primary];
  for (const s of extra) {
    if (out.length >= limit) break;
    const key = (s.title || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: pantry } = await supabase
      .from("inventory_items")
      .select("id, quantity, unit, expiry_date, storage_type, product:products(id, name, category, calories_100g, macros_100g)")
      .eq("owner_user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    const today = new Date().toISOString().slice(0, 10);
    const { data: todayMeals } = await supabase
      .from("meal_logs")
      .select("dish_name, meal_type, kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .gte("created_at", today + "T00:00:00")
      .lte("created_at", today + "T23:59:59");

    const { data: mealDay } = await supabase
      .from("meal_days")
      .select("id")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();

    const mealItems: any[] = [];
    if (mealDay) {
      const { data: meals } = await supabase
        .from("meals")
        .select("meal_type, meal_items(custom_name, dish_name, calories, macros)")
        .eq("meal_day_id", mealDay.id);
      if (meals) {
        for (const m of meals) {
          for (const item of (m as any).meal_items || []) {
            mealItems.push({
              meal_type: (m as any).meal_type,
              name: item.dish_name || item.custom_name,
              kcal: item.calories || 0,
              macros: item.macros,
            });
          }
        }
      }
    }

    const { data: targets } = await supabase
      .from("nutrition_targets")
      .select("kcal_day, protein_g, carbs_g, fats_g")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: activePlan } = await supabase
      .from("diet_plans")
      .select("kcal_day, protein_g_day, carbs_g_day, fats_g_day, title")
      .eq("client_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const pantryList = (pantry || []).map((p: any) => {
      const daysToExpiry = p.expiry_date
        ? Math.ceil((new Date(p.expiry_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 864e5)
        : null;
      return {
        name: p.product?.name,
        quantity: p.quantity,
        unit: p.unit,
        daysToExpiry,
        expiring: daysToExpiry !== null && daysToExpiry <= 3,
        category: p.product?.category,
      };
    });

    const pantryNames = pantryList
      .map((p: any) => (p.name || "").toLowerCase())
      .filter(Boolean);
    const expiringNames = pantryList
      .filter((p: any) => p.expiring && p.name)
      .map((p: any) => String(p.name).toLowerCase());

    const consumedToday = {
      meals: [
        ...(todayMeals || []).map((m: any) => ({
          type: m.meal_type,
          name: m.dish_name,
          kcal: m.kcal,
          protein: m.protein_g,
          carbs: m.carbs_g,
          fats: m.fat_g,
        })),
        ...mealItems.map((m: any) => ({
          type: m.meal_type,
          name: m.name,
          kcal: m.kcal,
          protein: m.macros?.protein || 0,
          carbs: m.macros?.carbs || 0,
          fats: m.macros?.fats || 0,
        })),
      ],
      totalKcal: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
    };
    for (const m of consumedToday.meals) {
      consumedToday.totalKcal += m.kcal || 0;
      consumedToday.totalProtein += m.protein || 0;
      consumedToday.totalCarbs += m.carbs || 0;
      consumedToday.totalFats += m.fats || 0;
    }

    const dailyTarget = activePlan || targets || { kcal_day: 2000, protein_g: 120, carbs_g: 220, fats_g: 70 };

    if (pantryNames.length === 0) {
      return new Response(JSON.stringify({
        suggestions: [],
        pantry_count: 0,
        expiring_count: 0,
        consumed_today: consumedToday,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dessertInfo = pantrySupportsDessert(pantryList);
    const wantDolce = dessertInfo.supported;
    const targetCount = wantDolce ? MAX_SUGGESTIONS : MIN_SUGGESTIONS;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Sei l'assistente alimentare di Cibarius (app italiana anti-spreco).

OBIETTIVO: restituisci SEMPRE ${targetCount} ricette utili, inventate/adattate PARTENDO dagli ingredienti in dispensa.

MIX OBBLIGATORIO:
- Esattamente 2 ricette salate con difficulty="facile" e course="salato" (quotidiane, veloci).
- Esattamente 1 ricetta con difficulty="gourmet" e course="salato" (plating/tecnica/combo più elevata — ancora cucinabile ORA; niente ingredienti esotici fuori dispensa).
${wantDolce
  ? `- Esattamente 1 ricetta con course="dolce" (dessert semplice: yogurt, frutta, uova, farina, cacao, ricotta, biscotti, latte, miele…). Può essere difficulty="facile" (preferito) o "gourmet".`
  : `- NON includere dolci: la dispensa non ha ingredienti da dessert sufficienti. Tutte course="salato".`}
- Ordine preferito: facili salate, poi gourmet, poi eventuale dolce.

COME LAVORARE (ordine):
1. Guarda cosa c'è in dispensa (soprattutto in scadenza).
2. Inventa piatti casalinghi italiani che usino QUEGLI ingredienti.
3. NON partire da un piatto classico famoso e poi segnare ingredienti mancanti.

VIETATO:
- Proporre piatti firma senza i componenti che li definiscono (es. "pasta al pesto" senza basilico fresco E pinoli; carbonara senza uova/guanciale o pecorino; pizza senza mozzarella se è pizza-style).
- Restituire meno di ${targetCount} ricette se la dispensa ha almeno 1 prodotto.
- Chiedere di fare la spesa.
- Gourmet/dolce che richiedano ingredienti core assenti dalla dispensa.

CONSENTITO:
- Staple/aromatici anche assenti: sale, pepe, olio, acqua, aceto, cipolla, aglio, prezzemolo, spezie comuni, burro, scorza di limone.
- Al più 1 "minor" mancante; TUTTI i "core" devono essere in dispensa.
- Titoli descrittivi del tipo "Padellata di zucchine e uova", non nomi di piatti impossibili.
- Gourmet = stessa dispensa, ma tecnica/plating/contrasto (es. emulsione, riduzione, scottatura, croccante).
- Dolce = dessert con base presente (es. yogurt+frutta, uova+zucchero/farina, ricotta+miele).

Per ogni ricetta: difficulty, course, ingredienti con role = core | minor | staple; available fedele alla dispensa (staple sempre available=true).
Rispondi SOLO con il tool suggest_meals.`;

    const userPrompt = `DISPENSA (usa questi prodotti come base delle ricette):
${JSON.stringify(pantryList, null, 2)}

${wantDolce
  ? `INGREDIENTI ADATTI A DOLCI (obbligatorio includere 1 course="dolce"): ${dessertInfo.sweetNames.join(", ") || pantryNames.join(", ")}`
  : "Nessun dolce richiesto in questo round."}

PASTI GIÀ CONSUMATI OGGI:
${consumedToday.meals.length > 0 ? JSON.stringify(consumedToday, null, 2) : "Nessun pasto registrato oggi."}

TARGET: Kcal ${(dailyTarget as any).kcal_day}, P ${(dailyTarget as any).protein_g || (dailyTarget as any).protein_g_day}g, C ${(dailyTarget as any).carbs_g || (dailyTarget as any).carbs_g_day}g, G ${(dailyTarget as any).fats_g || (dailyTarget as any).fats_g_day}g
Kcal rimanenti: ${Math.max(0, ((dailyTarget as any).kcal_day || 2000) - consumedToday.totalKcal)}

Inventa ${targetCount} ricette diverse cucinabili ORA (difficulty + course obbligatori su ciascuna).`;

    let raw: AiSuggestion[] = [];
    try {
      raw = await callSuggestMeals(LOVABLE_API_KEY, systemPrompt, userPrompt);
    } catch (e: any) {
      if (e?.status === 429) {
        return new Response(JSON.stringify({ error: "Troppo richieste, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (e?.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", e?.status, e?.body || e);
      // Continua con fallback euristico
      raw = [];
    }

    const scored = raw.map((s) => reconcileSuggestion(s, pantryNames, expiringNames));
    let suggestions = filterCookable(scored);

    // Second pass: force pantry-only adaptation if filter emptied / too few
    if (suggestions.length < targetCount) {
      const fallbackSystem = `Sei Cibarius. Le proposte precedenti erano invalide (ingredienti core assenti).
DEVI inventare ${targetCount} ricette NUOVE usando SOLO i prodotti elencati + staple (olio, sale, pepe, cipolla, aglio, spezie).
Mix: 2 difficulty="facile" course="salato" + 1 difficulty="gourmet" course="salato"${wantDolce ? ' + 1 course="dolce"' : ""}.
Ogni ingrediente non-staple DEVE comparire nella lista dispensa.
Niente pesto/carbonara/piatti firma se mancano i componenti. Titoli descrittivi. Tool suggest_meals, esattamente ${targetCount} ricette.`;

      const fallbackUser = `PRODOTTI DISPONIBILI (obbligatori come base):
${pantryNames.join(", ")}

Dettaglio:
${JSON.stringify(pantryList, null, 2)}

${wantDolce ? `Include 1 dolce usando: ${dessertInfo.sweetNames.join(", ")}` : ""}

Inventa ${targetCount} piatti diversi, tutti cucinabili ora.`;

      try {
        const retryRaw = await callSuggestMeals(LOVABLE_API_KEY, fallbackSystem, fallbackUser);
        const retryScored = retryRaw.map((s) => reconcileSuggestion(s, pantryNames, expiringNames));
        const retryCookable = filterCookable(retryScored);
        suggestions = mergeUnique(suggestions, retryCookable, targetCount);

        // Se ancora pochi, accetta anche ricette con 0 core mancanti e ≤2 minor dal retry
        if (suggestions.length < targetCount) {
          const soft = retryScored
            .filter((s) => s._missingCore === 0 && s._missingMinor <= 2)
            .sort(sortCookable)
            .map(stripScore);
          suggestions = mergeUnique(suggestions, soft, targetCount);
        }
      } catch (e) {
        console.error("AI fallback pass failed:", e);
      }
    }

    // Safety net: heuristic recipes from pantry — never return empty when pantry has food
    if (suggestions.length < MIN_SUGGESTIONS) {
      const heuristic = buildPantryFallback(pantryList, MIN_SUGGESTIONS - suggestions.length);
      const heuristicCookable = filterCookable(
        heuristic.map((s) => reconcileSuggestion(s, pantryNames, expiringNames)),
      );
      suggestions = mergeUnique(suggestions, heuristicCookable.length ? heuristicCookable : heuristic, targetCount);
    }

    suggestions = ensureDifficultyMix(suggestions, pantryList, wantDolce, dessertInfo.sweetNames)
      .slice(0, targetCount);

    return new Response(JSON.stringify({
      suggestions,
      pantry_count: pantryList.length,
      expiring_count: pantryList.filter((p: any) => p.expiring).length,
      consumed_today: consumedToday,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-meal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
