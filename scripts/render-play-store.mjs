// Rende le tavole di design/play-store.html in PNG dentro design/play-store/finali/.
//
//   node scripts/render-play-store.mjs
//
// Ogni elemento [data-out] della pagina diventa un file con quel nome, alle
// dimensioni esatte dell'elemento (1080x1920 per gli screenshot telefono,
// 1024x500 per la feature graphic). Aggiunge l'icona 512 da assets/icon-only.png.
// Le schermate dentro i telefoni si rifanno con scripts/cattura-play-store.mjs.

import { chromium } from "@playwright/test";
import sharp from "sharp";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const radice = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = resolve(radice, "design/play-store.html");
const destinazione = resolve(radice, "design/play-store/finali");
mkdirSync(destinazione, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 6700, height: 4200 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(sorgente).href);
await page.waitForSelector("body[data-pronto]");
await page.waitForTimeout(300);

const tavole = page.locator("[data-out]");
const totale = await tavole.count();
for (let i = 0; i < totale; i++) {
  const tavola = tavole.nth(i);
  const nome = await tavola.getAttribute("data-out");
  const box = await tavola.boundingBox();
  await tavola.screenshot({ path: resolve(destinazione, nome), type: "png" });
  console.log(`${nome}  ${Math.round(box.width)}x${Math.round(box.height)}`);
}
await browser.close();

// Icona per la scheda: quadrata piena, gli angoli li arrotonda Play.
await sharp(resolve(radice, "assets/icon-only.png")).resize(512, 512).flatten({ background: "#35B5DC" }).png().toFile(resolve(destinazione, "icona-512.png"));
console.log("icona-512.png  512x512");
