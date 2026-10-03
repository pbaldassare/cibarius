/**
 * Controllo di installabilita' della PWA.
 *
 *   node scripts/check_pwa.mjs https://indirizzo-https/
 *
 * Verifica le condizioni che Chrome richiede per offrire l'installazione:
 * origine sicura, manifesto valido con nome, icone, start_url e display, e un
 * service worker che arrivi allo stato "activated". Controlla anche che la
 * pagina di cortesia offline risponda quando la rete manca.
 *
 * Serve un indirizzo HTTPS (oppure http://localhost): su HTTP semplice il
 * browser non registra il service worker e l'invito a installare non compare
 * mai, quindi il controllo fallisce per quello e non per colpa dell'app.
 */
import { chromium } from "@playwright/test";

const BASE = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const SHOT = process.argv[3] || null;

const esiti = [];
const ok = (voce, nota = "") => esiti.push({ stato: true, voce, nota });
const ko = (voce, nota = "") => esiti.push({ stato: false, voce, nota });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 420, height: 880 }, deviceScaleFactor: 2 });
const page = await context.newPage();

const erroriConsole = [];
page.on("console", (m) => m.type() === "error" && erroriConsole.push(m.text()));
page.on("pageerror", (e) => erroriConsole.push(String(e)));

await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });

// ─── Contesto sicuro ────────────────────────────────────────────────────
const sicuro = await page.evaluate(() => window.isSecureContext);
sicuro
  ? ok("Contesto sicuro", "il browser consente service worker e installazione")
  : ko("Contesto sicuro", "serve HTTPS oppure localhost");

// ─── Manifesto, letto come lo legge il browser ──────────────────────────
const cdp = await context.newCDPSession(page);
const { url: manifestUrl, errors = [], data } = await cdp.send("Page.getAppManifest");
manifestUrl ? ok("Manifesto collegato", manifestUrl) : ko("Manifesto collegato");

const gravi = errors.filter((e) => e.critical);
gravi.length === 0
  ? ok("Manifesto senza errori critici", errors.length ? `${errors.length} avvisi minori` : "nessun avviso")
  : ko("Manifesto senza errori critici", gravi.map((e) => e.message).join("; "));

const manifest = data ? JSON.parse(data) : {};
const campi = ["name", "short_name", "start_url", "scope", "display", "theme_color", "background_color"];
for (const c of campi) {
  manifest[c] ? ok(`Campo ${c}`, String(manifest[c])) : ko(`Campo ${c}`, "assente");
}

// Chrome pretende almeno un'icona quadrata da 144px o piu'.
const icone = manifest.icons || [];
const grandi = icone.filter((i) => (i.sizes || "").split(" ").some((s) => Number(s.split("x")[0]) >= 144));
grandi.length
  ? ok("Icona da almeno 144px", grandi.map((i) => i.sizes).join(", "))
  : ko("Icona da almeno 144px", "nessuna icona abbastanza grande");

const maskable = icone.some((i) => (i.purpose || "").includes("maskable"));
maskable ? ok("Icona maskable", "l'icona si adatta alla forma del sistema") : ko("Icona maskable");

// Le icone dichiarate devono esistere e avere davvero la misura dichiarata.
for (const icona of icone) {
  const src = new URL(icona.src, `${BASE}/`).href;
  const esito = await page.evaluate(
    (u) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => res(null);
        img.src = u;
      }),
    src,
  );
  const attesa = (icona.sizes || "").split(" ")[0];
  if (!esito) ko(`Icona ${icona.sizes}`, `non si carica: ${src}`);
  else if (`${esito.w}x${esito.h}` !== attesa) ko(`Icona ${icona.sizes}`, `in realta' e' ${esito.w}x${esito.h}`);
  else ok(`Icona ${icona.sizes}`, `${esito.w}x${esito.h} reali`);
}

// ─── start_url raggiungibile ────────────────────────────────────────────
if (manifest.start_url) {
  const target = new URL(manifest.start_url, `${BASE}/`).href;
  const risposta = await page.request.get(target);
  risposta.ok() ? ok("start_url raggiungibile", `${target} -> ${risposta.status()}`) : ko("start_url raggiungibile", `${target} -> ${risposta.status()}`);
}

// ─── Service worker ─────────────────────────────────────────────────────
const stato = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return "non supportato";
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "non registrato";
  const atteso = reg.active || reg.waiting || reg.installing;
  if (reg.active) return "activated";
  await new Promise((res) => {
    atteso.addEventListener("statechange", function h() {
      if (atteso.state === "activated") {
        atteso.removeEventListener("statechange", h);
        res();
      }
    });
    setTimeout(res, 10000);
  });
  return (await navigator.serviceWorker.getRegistration())?.active ? "activated" : atteso.state;
});
stato === "activated" ? ok("Service worker attivo", stato) : ko("Service worker attivo", stato);

const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope ?? null);
scope ? ok("Ambito del service worker", scope) : ko("Ambito del service worker");

// ─── Comportamento offline ──────────────────────────────────────────────
await page.evaluate(() => navigator.serviceWorker.ready);
await context.setOffline(true);
let testoOffline = "";
try {
  await page.goto(`${BASE}/una-pagina-qualsiasi`, { waitUntil: "domcontentloaded", timeout: 20000 });
  testoOffline = (await page.textContent("body").catch(() => "")) || "";
} catch (e) {
  testoOffline = `errore: ${e.message}`;
}
/offline|connessione|rete/i.test(testoOffline)
  ? ok("Pagina offline", "il service worker risponde senza rete")
  : ko("Pagina offline", testoOffline.slice(0, 120).replace(/\s+/g, " "));
await context.setOffline(false);

// ─── Schermata finale ───────────────────────────────────────────────────
if (SHOT) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT, fullPage: false });
}

erroriConsole.length === 0
  ? ok("Nessun errore in console")
  : ko("Nessun errore in console", `${erroriConsole.length}: ${erroriConsole[0]}`);

await browser.close();

console.log(`\nControllo PWA su ${BASE}\n`);
for (const e of esiti) console.log(`${e.stato ? "OK  " : "KO  "} ${e.voce}${e.nota ? ` — ${e.nota}` : ""}`);
const falliti = esiti.filter((e) => !e.stato);
console.log(`\n${esiti.length - falliti.length}/${esiti.length} controlli superati`);
process.exit(falliti.length ? 1 : 0);
