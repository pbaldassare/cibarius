// Cattura le schermate vere dell'app per la scheda Play, con i dati di prova
// ripuliti, in design/play-store/schermate/. Poi: node scripts/render-play-store.mjs
//
//   npx vite build && npx vite preview --port 5174
//   CIBARIUS_RISTORANTE='email:password' CIBARIUS_UTENTE='email:password' \
//     node scripts/cattura-play-store.mjs
//
// Gli account sono quelli di prova del ristorante e dell'utente di casa: le
// credenziali non stanno nel repository.
//
// L'app gira "come su Android": bridge di Capacitor finto e margini di sistema
// di 32px in alto e 20px in basso, gli stessi che design/play-store.html
// ricopre con barra di stato e barra dei gesti. Le risposte di Supabase
// passano da un filtro che toglie i prefissi [DEMO], rinomina utente e
// ristorante di prova e sposta le scadenze vecchie di mesi su date vicine.
// Il database non viene toccato.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../design/play-store/schermate");
const BASE = process.env.CIBARIUS_URL ?? "http://127.0.0.1:5174";
const credenziali = (nome) => {
  const v = process.env[nome];
  if (!v?.includes(":")) { console.error(`Manca ${nome}='email:password'`); process.exit(1); }
  const i = v.indexOf(":");
  return [v.slice(0, i), v.slice(i + 1)];
};
const OGGI = new Date();
OGGI.setHours(12, 0, 0, 0);
const giorno = (d) => d.toISOString().slice(0, 10);
const NOMI = { "Utente test": "Giulia", "Ristorante prova": "Trattoria Il Glicine", "Ristorante Prova": "Trattoria Il Glicine" };

function pulisci(v) {
  if (typeof v === "string") {
    let s = v.replace(/\[(DEMO|FB)\]\s*/g, "");
    for (const [a, b] of Object.entries(NOMI)) s = s.split(a).join(b);
    return s;
  }
  if (Array.isArray(v)) return v.map(pulisci);
  // Il nome del profilo e' sempre "Giulia": nella scheda pubblica non deve finire
  // il nome vero di chi ha l'account usato per le catture.
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "full_name" && x ? "Giulia" : pulisci(x)]));
  return v;
}
// Le scadenze di prova sono di mesi fa: si spostano tutte insieme, nello
// stesso ordine. In una lista la piu' vicina cade ieri; un elemento da solo
// (pagina di dettaglio) scade fra due giorni. La produzione segue la scadenza.
const SCADENZE = ["expiry_date", "expiration_date", "use_by_date"];
const DATE = [...SCADENZE, "production_date"];
function sposta(json) {
  const date = [];
  const raccogli = (v) => { if (Array.isArray(v)) v.forEach(raccogli); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (SCADENZE.includes(k) && typeof x === "string") date.push(x.slice(0, 10)); else raccogli(x); } };
  raccogli(json);
  if (!date.length) return json;
  const min = date.sort()[0];
  // un elemento da solo: prodotto oggi, se la data c'e'; altrimenti scade fra due giorni
  const prodotto = JSON.stringify(json).match(/"production_date":"([\d-]{10})/)?.[1];
  const ancora = date.length === 1 && prodotto ? prodotto : min;
  const meta = date.length === 1 ? (prodotto ? 0 : 2) : -1;
  const delta = Math.round((OGGI - new Date(ancora + "T12:00:00")) / 864e5) + meta;
  // In una lista i prodotti con la stessa scadenza si distanziano di un giorno:
  // altrimenti finirebbero tutti "scaduti da ieri".
  const visti = new Map();
  const scarto = (k, x) => {
    if (!SCADENZE.includes(k) || date.length < 2) return 0;
    const n = visti.get(x.slice(0, 10)) ?? 0;
    visti.set(x.slice(0, 10), n + 1);
    return n;
  };
  const applica = (v) => Array.isArray(v) ? v.map(applica) : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, DATE.includes(k) && typeof x === "string" ? giorno(new Date(new Date(x.slice(0, 10) + "T12:00:00").getTime() + (delta + scarto(k, x)) * 864e5)) : applica(x)]))
    : v;
  return applica(json);
}

// Registro HACCP della settimana scorsa: nel database di prova i controlli
// sono di mesi fa. Ogni attivita' risulta fatta ogni giorno, tranne due buchi.
let attivita = null;
async function registro(url) {
  const da = /log_date=gte\.([\d-]+)/.exec(url)?.[1], a = /log_date=lte\.([\d-]+)/.exec(url)?.[1];
  for (let i = 0; i < 50 && !attivita; i++) await new Promise((r) => setTimeout(r, 100));
  const righe = [];
  for (let d = new Date(da + "T12:00:00"); giorno(d) <= a && d < OGGI; d.setDate(d.getDate() + 1))
    (attivita || []).forEach((t, i) => {
      if ((i === 2 && d.getDay() === 3) || (i === 5 && d.getDay() === 6)) return;
      righe.push({ id: `${t.id}-${giorno(d)}`, task_id: t.id, restaurant_id: t.restaurant_id, log_date: giorno(d), status: "completata", completed_at: giorno(d) + "T09:30:00+00:00", completed_by: null, notes: null, temperature: null, created_at: giorno(d) + "T09:30:00+00:00" });
    });
  return righe;
}

async function sessione(browser, [email, password]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "it-IT", timezoneId: "Europe/Rome" });
  await ctx.addInitScript(() => {
    window.androidBridge = { postMessage() {} };
    localStorage.setItem("cibarius_onboarding_done", "1");
    localStorage.setItem("cibarius_tour_done", "1");
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.setProperty("--safe-area-inset-top", "32px");
      document.documentElement.style.setProperty("--safe-area-inset-bottom", "20px");
      // niente barre di scorrimento nelle catture
      const st = document.createElement("style"); st.textContent = "::-webkit-scrollbar{display:none}"; document.head.appendChild(st);
    });
  });
  await ctx.route(/supabase\.co\/rest\/v1\//, async (route) => {
    const r = await route.fetch();
    const tipo = r.headers()["content-type"] || "";
    if (!tipo.includes("json")) return route.fulfill({ response: r });
    let j; try { j = await r.json(); } catch { return route.fulfill({ response: r }); }
    const url = route.request().url();
    if (url.includes("/haccp_tasks") && Array.isArray(j) && j.length) attivita = j;
    if (url.includes("/haccp_logs?") && route.request().method() === "GET" && url.includes("log_date=gte")) j = await registro(url);
    route.fulfill({ response: r, json: sposta(pulisci(j)) });
  });
  const p = await ctx.newPage();
  await p.goto(BASE + "/auth/login");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', password);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20000 });
  return p;
}
const scatta = async (p, nome) => { await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/${nome}.png` }); console.log(nome); };

{
  const browser = await chromium.launch();
  const r = await sessione(browser, credenziali("CIBARIUS_RISTORANTE"));
  await scatta(r, "r1-home");
  await r.goto(BASE + "/restaurant/haccp"); await r.waitForTimeout(2500);
  await r.getByLabel("Settimana precedente").click();
  await r.evaluate(() => document.activeElement?.blur());
  await r.mouse.move(200, 450);
  await scatta(r, "r2-haccp");
  await r.goto(BASE + "/restaurant/haccp-labels"); await r.waitForTimeout(2500);
  await r.getByText(/Zuppa del giorno/).first().click(); await r.waitForURL(/haccp-labels\/.+/); await scatta(r, "r3-etichetta");
  await r.goto(BASE + "/restaurant/stock"); await scatta(r, "r4-magazzino");
  const u = await sessione(browser, credenziali("CIBARIUS_UTENTE"));
  await scatta(u, "u1-home");
  await u.goto(BASE + "/anti-waste"); await scatta(u, "u2-antispreco");
  await browser.close();
}
