// Rende le tavole di design/app-store.html in PNG dentro design/app-store/finali/.
//
//   node scripts/render-app-store.mjs
//
// Ogni elemento [data-out] della pagina diventa un file con quel nome, a
// 1320x2868 (iPhone 6,9" per App Store Connect), senza trasparenza: Apple
// rifiuta gli screenshot con il canale alfa. Le schermate dentro i telefoni
// sono le stesse della scheda Play (scripts/cattura-play-store.mjs).

import { chromium } from "@playwright/test";
import sharp from "sharp";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const radice = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = resolve(radice, "design/app-store.html");
const destinazione = resolve(radice, "design/app-store/finali");
mkdirSync(destinazione, { recursive: true });

// CHROMIUM: percorso di un Chromium gia' scaricato, se la versione attesa da Playwright manca.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 8200, height: 6000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(sorgente).href);
await page.waitForSelector("body[data-pronto]");
await page.waitForTimeout(300);

const tavole = page.locator("[data-out]");
const totale = await tavole.count();
for (let i = 0; i < totale; i++) {
  const tavola = tavole.nth(i);
  const nome = await tavola.getAttribute("data-out");
  const png = await tavola.screenshot({ type: "png" });
  const { width, height } = await sharp(png).flatten({ background: "#F3F5F8" }).removeAlpha().toFile(resolve(destinazione, nome));
  console.log(`${nome}  ${width}x${height}`);
}
await browser.close();
