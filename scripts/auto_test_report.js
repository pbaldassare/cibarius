/**
 * Giro di prova automatico su Cibarius: sito pubblico, registrazione, login e
 * app consumer. Salva uno screenshot per schermata in report/screenshots/ e
 * un riepilogo in report/results.json per la stesura del report.
 *
 * Uso:
 *   node scripts/auto_test_report.js
 *   DEMO_EMAIL=... DEMO_PASSWORD=... SKIP_SIGNUP=1 node scripts/auto_test_report.js
 *     (riprende dal login, utile se l'account va confermato a mano)
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5182";
const OUT = join(process.cwd(), "report", "screenshots");
const STAMP = Date.now();
const EMAIL = process.env.DEMO_EMAIL ?? `demo_tester_${STAMP}@example.com`;
const PASSWORD = process.env.DEMO_PASSWORD ?? "DemoTester2026!";
const FULL_NAME = "Demo Tester";
const SKIP_SIGNUP = process.env.SKIP_SIGNUP === "1";

const results = [];
let shot = 0;
let consoleErrors = [];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Screenshot numerato + riga di report. Non interrompe mai il giro. */
async function capture(page, title, notes = []) {
  shot += 1;
  const file = `${String(shot).padStart(2, "0")}_${slug(title)}.png`;
  const errors = [...consoleErrors];
  consoleErrors = [];
  try {
    await page.screenshot({ path: join(OUT, file), fullPage: false });
  } catch (e) {
    notes.push(`screenshot fallito: ${e.message}`);
  }
  const entry = {
    n: shot,
    title,
    file,
    url: page.url().replace(BASE, ""),
    heading: await page.locator("h1").first().innerText({ timeout: 1500 }).catch(() => ""),
    notes,
    consoleErrors: errors,
  };
  results.push(entry);
  console.log(`  [${entry.n}] ${title} — ${entry.url}${errors.length ? ` (${errors.length} errori console)` : ""}`);
  return entry;
}

/** Attende che la SPA abbia finito di montare la rotta. */
async function settle(page, ms = 1200) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(ms);
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => {
    console.log(`  ! goto ${path}: ${e.message}`);
  });
  await settle(page);
}

/**
 * Toglie di mezzo quello che copre la schermata: il tour di benvenuto, che al
 * primo accesso si prende tutto lo schermo, e il banner di installazione PWA.
 */
async function dismissOverlays(page) {
  const skip = page.getByRole("button", { name: /^salta$/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  const close = page.getByRole("button", { name: /chiudi|non ora|più tardi/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

/** Testo del primo avviso a comparsa, senza aspettare se non ce n'è. */
async function toastText(page) {
  return page
    .locator("[data-sonner-toast], [role='status']")
    .first()
    .innerText({ timeout: 2500 })
    .catch(() => "");
}

/**
 * Contesto pulito, con la procedura guidata di benvenuto già contrassegnata
 * come vista: altrimenti si prende tutto lo schermo e ogni screenshot
 * mostrerebbe il suo pannello invece della schermata sotto.
 */
async function openSession(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: "it-IT",
    permissions: [],
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("cibarius_tour_done", "1");
      localStorage.setItem("cibarius_onboarding_done", "1");
    } catch {}
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 300)}`));
  return { context, page };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  let { context, page } = await openSession(browser);

  // La password resta solo in report/.account.json, che non finisce nel repo.
  const summary = { email: EMAIL, base: BASE, signup: null, login: null };

  // ─── 1. Sito pubblico ───────────────────────────────────────────────
  console.log("\n== Sito pubblico ==");
  const sitePages = [
    ["/", "Home sito pubblico"],
    ["/utenti", "Sito - Utenti"],
    ["/ristoranti", "Sito - Ristoranti"],
    ["/nutrizionisti", "Sito - Nutrizionisti"],
    ["/come-funziona", "Sito - Come funziona"],
    ["/prezzi", "Sito - Prezzi"],
    ["/faq", "Sito - Domande frequenti"],
    ["/contatti", "Sito - Contatti"],
  ];
  for (const [path, title] of sitePages) {
    await goto(page, path);
    const notes = [];
    // Interazione: conta i link di navigazione e le call to action presenti.
    const navLinks = await page.locator("header a").count().catch(() => 0);
    const ctas = await page.locator('a[href="/auth/signup"], a[href="/auth/login"]').count().catch(() => 0);
    notes.push(`link di navigazione: ${navLinks}`, `call to action verso l'area riservata: ${ctas}`);
    if (path === "/faq") {
      const acc = page.locator("button").filter({ hasText: /\?/ }).first();
      if (await acc.isVisible().catch(() => false)) {
        await acc.click().catch(() => {});
        await page.waitForTimeout(400);
        notes.push("aperta la prima domanda dell'elenco");
      }
    }
    if (path === "/contatti") {
      const email = page.locator('input[type="email"]').first();
      if (await email.isVisible().catch(() => false)) {
        await email.fill("demo_tester@example.com").catch(() => {});
        notes.push("compilato il campo email del modulo di contatto");
      }
    }
    await capture(page, title, notes);
  }

  // ─── 2. Registrazione ───────────────────────────────────────────────
  if (!SKIP_SIGNUP) {
    console.log("\n== Registrazione ==");
    await goto(page, "/auth/signup");
    await capture(page, "Registrazione - scelta del tipo di account", [
      "tre tipi disponibili: Utente, Ristorante, Professionista",
    ]);

    await page.getByRole("button", { name: /Utente/ }).first().click().catch(() => {});
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Avanti/ }).click().catch(() => {});
    await page.waitForTimeout(600);

    await page.getByPlaceholder("Nome e cognome").fill(FULL_NAME).catch(() => {});
    await page.getByPlaceholder("Email").fill(EMAIL).catch(() => {});
    await page.getByPlaceholder(/^Password/).fill(PASSWORD).catch(() => {});
    await page.getByPlaceholder("Conferma password").fill(PASSWORD).catch(() => {});
    await capture(page, "Registrazione - dati dell'account", [`account demo: ${EMAIL}`]);

    await page.getByRole("button", { name: /Registrati/ }).click().catch(() => {});
    await page.waitForTimeout(4000);
    const toast = await toastText(page);
    summary.signup = { url: page.url().replace(BASE, ""), toast: toast.slice(0, 200) };
    await capture(page, "Registrazione - esito", [
      toast ? `messaggio a schermo: ${toast.replace(/\s+/g, " ").slice(0, 160)}` : "nessun messaggio rilevato",
      `destinazione dopo la registrazione: ${page.url().replace(BASE, "")}`,
    ]);

    // Un account appena creato ha dispensa e scadenze vuote: le schermate non
    // mostrerebbero nulla. Qui il giro si ferma per dare modo di caricare
    // qualche prodotto di prova, e riparte appena compare il file sentinella.
    await writeFile(join(process.cwd(), "report", ".account.json"), JSON.stringify({ email: EMAIL, password: PASSWORD }, null, 2));
    const sentinel = join(process.cwd(), "report", ".seeded");
    console.log(`  … in attesa dei dati di prova per ${EMAIL} (sentinella: report/.seeded)`);
    for (let i = 0; i < 90 && !existsSync(sentinel); i += 1) {
      await page.waitForTimeout(2000);
    }
    console.log(existsSync(sentinel) ? "  … dati di prova pronti" : "  … nessun dato di prova, proseguo con l'account vuoto");
  }

  // ─── 3. Login ───────────────────────────────────────────────────────
  console.log("\n== Login ==");
  // La registrazione lascia la sessione aperta in localStorage: la pagina di
  // accesso rimanderebbe subito all'app. Un contesto nuovo di zecca è il modo
  // più affidabile di ripartire da sloggati.
  if (!SKIP_SIGNUP) {
    await context.close();
    ({ context, page } = await openSession(browser));
  }
  await goto(page, "/auth/login");
  await capture(page, "Accesso", ["modulo con email, password e recupero credenziali"]);

  await page.getByPlaceholder(/email/i).first().fill(EMAIL).catch(() => {});
  await page.locator('input[type="password"]').first().fill(PASSWORD).catch(() => {});
  await page.getByRole("button", { name: /Accedi/i }).first().click().catch(() => {});
  await page.waitForTimeout(5000);

  const loginToast = await toastText(page);
  const loggedIn = !page.url().includes("/auth/login");
  summary.login = { ok: loggedIn, landing: page.url().replace(BASE, ""), toast: loginToast.slice(0, 200) };
  await capture(page, "Esito accesso", [
    loggedIn ? `accesso riuscito, atterraggio su ${page.url().replace(BASE, "")}` : "accesso non riuscito",
    loginToast ? `messaggio: ${loginToast.replace(/\s+/g, " ").slice(0, 160)}` : "",
  ].filter(Boolean));

  if (!loggedIn) {
    console.log("\n!! Accesso non riuscito: salto le schermate riservate.");
    await writeFile(join(process.cwd(), "report", "results.json"), JSON.stringify({ summary, results }, null, 2));
    await browser.close();
    return;
  }

  // ─── 4. App consumer ────────────────────────────────────────────────
  console.log("\n== App consumer ==");
  await dismissOverlays(page);

  const appPages = [
    ["/app", "App - Home giornata", async () => {
      const tiles = await page.locator("a[href], button").count().catch(() => 0);
      return [`elementi interattivi nella schermata: ${tiles}`];
    }],
    ["/expiry", "App - Scadenze", async () => ["elenco dei prodotti ordinati per data di scadenza"]],
    ["/pantry", "App - Dispensa", async () => {
      const add = page.getByRole("button").filter({ hasText: /aggiungi/i }).first();
      if (await add.isVisible().catch(() => false)) {
        await add.click().catch(() => {});
        await page.waitForTimeout(1200);
        return ["aperto il flusso di aggiunta prodotto"];
      }
      return ["nessun pulsante di aggiunta visibile in questa schermata"];
    }],
    ["/products", "App - Prodotti", async () => {
      const search = page.locator('input[type="search"], input[placeholder*="erca" i]').first();
      if (await search.isVisible().catch(() => false)) {
        await search.fill("pomodoro").catch(() => {});
        await page.waitForTimeout(1500);
        return ["ricerca di prova con il termine 'pomodoro'"];
      }
      return ["campo di ricerca non trovato"];
    }],
    ["/freezer", "App - Congelatore", async () => ["scorte congelate, separate dalla dispensa"]],
    ["/scan", "App - Scansione", async () => ["lettura del codice a barre: senza fotocamera resta in attesa"]],
    ["/recipes", "App - Ricette pubbliche", async () => {
      const first = page.locator("a[href^='/recipes/']").first();
      if (await first.isVisible().catch(() => false)) return ["catalogo ricette con apertura del dettaglio"];
      return ["catalogo ricette"];
    }],
    ["/my-recipes", "App - Ricette dalla dispensa", async () => ["proposte generate dagli ingredienti disponibili"]],
    ["/anti-waste", "App - Anti spreco", async () => ["suggerimenti per consumare i prodotti in scadenza"]],
    ["/shopping-list", "App - Lista della spesa", async () => {
      const input = page.locator('input[type="text"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill("Latte").catch(() => {});
        await page.waitForTimeout(400);
        return ["inserita una voce di prova nella lista"];
      }
      return ["lista della spesa"];
    }],
    ["/preparations", "App - Preparazioni", async () => ["preparazioni salvate dall'utente"]],
    ["/favorites", "App - Preferiti", async () => ["prodotti e ricette messi da parte"]],
    ["/reminders", "App - Promemoria", async () => ["avvisi su scadenze e pasti"]],
    ["/subscription", "App - Abbonamento", async () => ["piani disponibili e stato dell'abbonamento"]],
    ["/profile", "App - Profilo", async () => {
      const tabs = await page.locator('[role="tab"]').count().catch(() => 0);
      return [`schede presenti nel profilo: ${tabs}`];
    }],
  ];

  for (const [path, title, interact] of appPages) {
    await goto(page, path);
    await dismissOverlays(page);
    let notes = [];
    try {
      notes = (await interact()) ?? [];
    } catch (e) {
      notes = [`interazione non completata: ${e.message.slice(0, 120)}`];
    }
    await capture(page, title, notes);
    // Chiude eventuali pannelli aperti dall'interazione.
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(200);
  }

  // ─── 5. Controllo dei permessi per ruolo ────────────────────────────
  console.log("\n== Permessi ==");
  for (const [path, title] of [["/restaurant", "Area ristorante senza permessi"], ["/admin", "Area amministrazione senza permessi"]]) {
    await goto(page, path);
    await capture(page, title, [
      `un account 'utente' che apre ${path} finisce su ${page.url().replace(BASE, "")}`,
    ]);
  }

  await writeFile(join(process.cwd(), "report", "results.json"), JSON.stringify({ summary, results }, null, 2));
  console.log(`\nFatto: ${results.length} schermate in report/screenshots/`);
  await browser.close();
}

main().catch(async (e) => {
  console.error("Giro interrotto:", e);
  await writeFile(join(process.cwd(), "report", "results.json"), JSON.stringify({ error: String(e), results }, null, 2)).catch(() => {});
  process.exit(1);
});
