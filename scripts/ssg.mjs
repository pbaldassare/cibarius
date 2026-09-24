/**
 * Genera l'HTML statico delle pagine pubbliche, senza browser.
 *
 * Il problema: Cibarius e' una SPA, quindi il file servito e' un guscio che si
 * riempie solo eseguendo JavaScript. Google di solito ce la fa, i crawler dei
 * motori generativi quasi mai. Un primo tentativo usava un browser headless,
 * ma l'ambiente di pubblicazione non ne ha uno e il passaggio veniva saltato.
 *
 * La soluzione: React sa disegnare i componenti anche su Node. Vite compila
 * `src/entry-server.tsx` in un modulo eseguibile, questo script lo importa,
 * disegna ogni pagina e la incolla nel guscio insieme ai suoi metadati.
 * Nessuna dipendenza oltre a quelle che il progetto ha gia'.
 *
 * Gira in coda a `npm run build`. Se qualcosa va storto la pubblicazione non
 * si ferma: resta la SPA, che funziona comunque.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { build } from "vite";

const RADICE = join(import.meta.dirname, "..");
const DIST = join(RADICE, "dist");
const TEMP = join(RADICE, ".ssg");
const SITE_URL = (process.env.VITE_SITE_URL ?? "https://cibarius.online").replace(/\/$/, "");

/** Titoli e descrizioni: gli stessi di `src/lib/site.ts`. */
const META = {
  "/": {
    title: "Cibarius — Scadenze, magazzino e HACCP in un'unica app",
    description:
      "Scadenze e dispensa a casa, magazzino e controlli HACCP al ristorante, piani alimentari dal nutrizionista. Un'unica app, tre modi di usarla.",
  },
  "/ristoranti": {
    title: "HACCP digitale e magazzino per ristoranti | Cibarius",
    description:
      "Controlli HACCP, registro temperature, etichette di preparazione con QR e carico merce dalla bolla. Tutto dal telefono, pronto per l'ispezione.",
  },
  "/utenti": {
    title: "Gestione dispensa e scadenze a casa | Cibarius",
    description:
      "Scansiona la spesa, tieni d'occhio le scadenze e cucina con quello che hai. Cibarius ti avvisa prima che il cibo vada buttato.",
  },
  "/nutrizionisti": {
    title: "Piani alimentari e monitoraggio clienti | Cibarius",
    description:
      "Crea piani alimentari, segui il diario dei clienti e verifica l'aderenza. I tuoi assistiti usano l'app, tu vedi i risultati.",
  },
  "/come-funziona": {
    title: "Come funziona Cibarius, passo per passo",
    description:
      "Dalla registrazione al primo controllo HACCP, dalla spesa scansionata alla ricetta anti-spreco. Cosa succede quando inizi a usare Cibarius.",
  },
  "/prezzi": {
    title: "Prezzi e piani di abbonamento | Cibarius",
    description:
      "Trenta giorni di prova gratuita per i ristoranti, piano gratuito per l'uso domestico. Nessuna carta richiesta per iniziare.",
  },
  "/faq": {
    title: "Domande frequenti su Cibarius",
    description:
      "Risposte su HACCP, privacy dei dati, dispositivi supportati, prova gratuita e differenze fra i tre profili d'uso.",
  },
  "/contatti": {
    title: "Contatta Cibarius",
    description:
      "Scrivici per una dimostrazione sul tuo locale, per un preventivo o per assistenza sull'app. Rispondiamo in italiano, di persona.",
  },
};

const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Sostituisce nel guscio i metadati generici con quelli della pagina. */
const conMetadati = (template, path, { title, description }) => {
  const url = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${esc(description)}">`,
  );
  for (const attr of ["og:title", "twitter:title"]) {
    const chiave = attr.startsWith("og:") ? "property" : "name";
    html = html.replace(
      new RegExp(`<meta ${chiave}="${attr}" content="[^"]*">`),
      `<meta ${chiave}="${attr}" content="${esc(title)}">`,
    );
  }
  for (const attr of ["og:description", "twitter:description"]) {
    const chiave = attr.startsWith("og:") ? "property" : "name";
    html = html.replace(
      new RegExp(`<meta ${chiave}="${attr}" content="[^"]*">`),
      `<meta ${chiave}="${attr}" content="${esc(description)}">`,
    );
  }
  html = html.replace(
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${url}">`,
  );

  // L'indirizzo canonico non c'e' nel guscio: si aggiunge.
  html = html.replace("</head>", `    <link rel="canonical" href="${url}">\n</head>`);

  return html;
};

const main = async () => {
  const template = await readFile(join(DIST, "index.html"), "utf-8");

  // Compilazione del modulo che sa disegnare le pagine su Node.
  await build({
    logLevel: "warn",
    build: {
      ssr: join(RADICE, "src", "entry-server.tsx"),
      outDir: TEMP,
      emptyOutDir: true,
      copyPublicDir: false,
    },
  });

  const { render, paths } = await import(join(TEMP, "entry-server.js"));

  let scritte = 0;
  for (const path of paths()) {
    const meta = META[path];
    if (!meta) {
      console.warn(`  ${path}: metadati mancanti, pagina saltata`);
      continue;
    }

    const corpo = render(path);
    // Il blocco di riserva serve solo quando questo passaggio non gira.
    const guscio = conMetadati(template, path, meta).replace(/<noscript>[\s\S]*?<\/noscript>\s*/, "");
    const html = guscio.replace('<div id="root"></div>', `<div id="root">${corpo}</div>`);

    const dest = path === "/" ? join(DIST, "index.html") : join(DIST, path.slice(1), "index.html");
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, html, "utf-8");
    console.log(`  ${path.padEnd(16)} -> ${dest.replace(DIST, "dist")} (${(html.length / 1024).toFixed(1)} kB)`);
    scritte++;
  }

  await rm(TEMP, { recursive: true, force: true });
  console.log(`\n  ${scritte} pagine statiche scritte in dist/`);
};

main().catch(async (e) => {
  await rm(TEMP, { recursive: true, force: true }).catch(() => {});
  console.warn("\n  generazione statica saltata:", e.message);
  console.warn("  il sito resta una SPA: funziona, ma i crawler senza JavaScript vedono solo il guscio.");
  process.exit(0);
});
