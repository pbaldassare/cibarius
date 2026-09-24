/**
 * Genera l'HTML statico delle pagine del sito pubblico.
 *
 * Perche' serve: Cibarius e' una SPA, quindi il file servito e' un guscio
 * vuoto che si riempie solo dopo aver eseguito JavaScript. Google di solito ce
 * la fa, i crawler dei motori generativi quasi mai: senza questo passaggio le
 * pagine risultano prive di contenuto proprio a chi dovrebbe citarle.
 *
 * Come: si serve la build appena fatta su una porta locale, la si visita con
 * un browser headless e si salva il DOM risultante in `dist/<pagina>/index.html`.
 * Il file mantiene i riferimenti agli script, quindi nel browser l'app si
 * riattacca normalmente; chi non esegue JavaScript legge comunque il testo.
 *
 * Uso: gira in coda a `npm run build`. Se l'ambiente di pubblicazione non ha
 * un browser installato il passaggio si salta con un avviso e la build va
 * avanti: resta la SPA, che funziona comunque.
 *
 * Sitemap e llms.txt non si generano qui: sono file statici in `public/`, cosi'
 * vengono pubblicati a ogni build senza dipendere da questo passaggio.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";

const ROOT = join(import.meta.dirname, "..", "dist");
const PORT = Number(process.env.PRERENDER_PORT ?? 5199);

/* Le pagine pubbliche, nello stesso ordine di `src/lib/site.ts`. Sono poche e
   cambiano di rado: duplicarle qui evita di far girare TypeScript solo per
   leggere una costante. */
const PAGES = [
  "/",
  "/ristoranti",
  "/utenti",
  "/nutrizionisti",
  "/come-funziona",
  "/prezzi",
  "/faq",
  "/contatti",
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** Server statico con ripiego su index.html, come in produzione. */
const avviaServer = () =>
  new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      const rel = normalize(url).replace(/^(\.\.[/\\])+/, "");
      const file = join(ROOT, rel);
      if (file.startsWith(ROOT)) {
        const info = await stat(file).catch(() => null);
        if (info?.isFile()) {
          res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
          return res.end(await readFile(file));
        }
        // Pagina pre-renderizzata: /ristoranti -> dist/ristoranti/index.html.
        // Gli hosting statici lo fanno di default, e senza questo tentativo
        // ogni percorso ricadrebbe sulla home.
        const indice = join(file, "index.html");
        const infoIndice = await stat(indice).catch(() => null);
        if (infoIndice?.isFile()) {
          res.writeHead(200, { "Content-Type": TYPES[".html"] });
          return res.end(await readFile(indice));
        }
      }
      res.writeHead(200, { "Content-Type": TYPES[".html"] });
      res.end(await readFile(join(ROOT, "index.html")));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });

const main = async () => {
  /* Importazione dinamica: se l'ambiente di pubblicazione non ha Playwright,
     l'errore si cattura qui invece di far fallire il caricamento del modulo
     e con esso l'intera build. */
  const { chromium } = await import("playwright");

  const server = await avviaServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  let scritte = 0;
  for (const path of PAGES) {
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: "networkidle" });
    // Il titolo lo scrive il componente Seo: se c'e', la pagina e' pronta.
    await page.waitForFunction(() => document.title.length > 0 && !!document.querySelector("h1"), {
      timeout: 15000,
    });

    /* Via il blocco di riserva di index.html: serve solo quando il
       pre-rendering non gira, e qui ripeterebbe contenuti gia' presenti. */
    const html = ("<!DOCTYPE html>\n" + (await page.evaluate(() => document.documentElement.outerHTML)))
      .replace(/<noscript>[\s\S]*?<\/noscript>/, "");
    const dest = path === "/" ? join(ROOT, "index.html") : join(ROOT, path.slice(1), "index.html");
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, html, "utf-8");
    console.log(`  ${path.padEnd(16)} -> ${dest.replace(ROOT, "dist")} (${(html.length / 1024).toFixed(1)} kB)`);
    scritte++;
  }

  await browser.close();
  server.close();

  console.log(`\n  ${scritte} pagine statiche scritte in dist/`);
};

/*
 * Non deve mai far fallire la pubblicazione.
 *
 * Playwright non e' fra le dipendenze del progetto: se l'ambiente di build non
 * ha un browser, il passaggio viene saltato con un avviso e resta la SPA, che
 * funziona comunque. Meglio un sito senza HTML statico che un deploy rotto.
 */
main().catch((e) => {
  console.warn("\n  pre-rendering saltato:", e.message);
  console.warn("  il sito resta una SPA: per l'HTML statico serve `npx playwright install chromium`.");
  process.exit(0);
});
