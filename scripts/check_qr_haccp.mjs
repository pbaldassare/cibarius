/**
 * Verifica che il QR delle etichette HACCP porti davvero alla scheda pubblica.
 *
 * Non basta guardare la pagina: il QR e' un'immagine, quindi viene decodificato
 * come farebbe un telefono e poi seguito. Servono delle etichette di prova e le
 * credenziali di un ristoratore.
 *
 *   node scripts/check_qr_haccp.mjs <baseUrl> <email> <password> <idEtichetta>...
 */
import { chromium } from "@playwright/test";

const [BASE_RAW, EMAIL, PASSWORD, ...ETICHETTE] = process.argv.slice(2);
const BASE = (BASE_RAW ?? "http://127.0.0.1:4173").replace(/\/$/, "");

if (!EMAIL || !PASSWORD || ETICHETTE.length === 0) {
  console.error("Uso: node scripts/check_qr_haccp.mjs <baseUrl> <email> <password> <idEtichetta>...");
  process.exit(2);
}

const esiti = [];
const verifica = (descrizione, superato, dettaglio = "") => {
  esiti.push(superato);
  console.log(`${superato ? "  ok  " : " FAIL "} ${descrizione}${dettaglio ? ` — ${dettaglio}` : ""}`);
};

/** Legge il QR disegnato sul canvas, come farebbe la fotocamera di un telefono. */
const decodificaQr = async (page) => {
  await page.addScriptTag({ url: "https://unpkg.com/jsqr@1.4.0/dist/jsQR.js" });
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return null;
    const dati = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    const letto = window.jsQR(dati.data, dati.width, dati.height);
    return letto ? letto.data : null;
  });
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 950 } });
const page = await context.newPage();

await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder("Email").fill(EMAIL);
await page.getByPlaceholder("Password").fill(PASSWORD);
await page.getByRole("button", { name: "Accedi", exact: true }).click();
await page.waitForURL("**/restaurant**", { timeout: 20000 });
await page.waitForTimeout(2000);
const salta = page.getByRole("button", { name: /Salta/i });
if (await salta.count()) {
  await salta.first().click();
  await page.waitForTimeout(1200);
}

for (const id of ETICHETTE) {
  await page.goto(`${BASE}/restaurant/haccp-labels/${id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const indirizzo = await decodificaQr(page);
  const nome = await page.locator("text=Lotto").first().innerText().catch(() => id);
  console.log(`\n--- ${nome} ---`);
  verifica("il QR e' leggibile e contiene un indirizzo", !!indirizzo?.startsWith("http"), indirizzo ?? "illeggibile");
  if (!indirizzo?.startsWith("http")) continue;

  const errori = [];
  const pubblica = await context.newPage();
  pubblica.on("console", (m) => m.type() === "error" && errori.push(m.text().slice(0, 120)));
  await pubblica.goto(indirizzo, { waitUntil: "networkidle" }).catch(() => {});
  await pubblica.waitForTimeout(2500);
  const testo = (await pubblica.innerText("body")).replace(/\s+/g, " ");

  verifica("la rotta viene riconosciuta", !testo.includes("Page not found"));
  verifica("i dati arrivano come JSON", !testo.includes("is not valid JSON"), testo.slice(0, 80));
  verifica("la scheda mostra lotto e tracciabilita'", testo.includes("Lotto:") && testo.includes("Tracciabilità HACCP"));
  verifica("nessun errore in console", errori.length === 0, errori.join(" | "));
  await pubblica.close();
}

await browser.close();

const falliti = esiti.filter((e) => !e).length;
console.log(`\n${esiti.length - falliti}/${esiti.length} verifiche superate`);
process.exit(falliti === 0 ? 0 : 1);
