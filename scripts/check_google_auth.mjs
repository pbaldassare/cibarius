/**
 * Verifica a video del flusso "accedi/registrati con Google".
 *
 * Il provider puo' essere spento sul progetto Supabase: la risposta di
 * /auth/v1/settings viene quindi sostituita, cosi' si possono provare
 * entrambi gli stati senza toccare la configurazione vera.
 *
 *   node scripts/check_google_auth.mjs [baseUrl] [--con-account]
 *
 * Con --con-account viene anche provato il ritorno dal redirect, l'unico
 * pezzo che tocca davvero il database: serve un account usa e getta, che
 * resta sul progetto e va cancellato a mano.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const BASE = (process.argv[2] ?? "http://127.0.0.1:5182").replace(/\/$/, "");
const CON_ACCOUNT = process.argv.includes("--con-account");
const SHOTS = "report/screenshots/google-auth";

const esiti = [];
const verifica = (descrizione, superato, dettaglio = "") => {
  esiti.push({ descrizione, superato, dettaglio });
  console.log(`${superato ? "  ok  " : " FAIL "} ${descrizione}${dettaglio ? ` — ${dettaglio}` : ""}`);
};

/** Finge che il provider Google sia acceso (o spento) sul progetto. */
const fingiProvider = (page, acceso) =>
  page.route("**/auth/v1/settings", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.external = { ...body.external, google: acceso };
    await route.fulfill({ response, json: body });
  });

const run = async () => {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  const erroriConsole = [];
  context.on("console", (m) => m.type() === "error" && erroriConsole.push(m.text()));

  // ── Provider spento: niente pulsante, nessun vicolo cieco ──────────────
  {
    const page = await context.newPage();
    await fingiProvider(page, false);
    await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
    verifica(
      "provider spento: il pulsante Google non compare sul login",
      (await page.getByRole("button", { name: /Google/i }).count()) === 0,
    );
    await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
    verifica(
      "provider spento: il pulsante Google non compare sulla registrazione",
      (await page.getByRole("button", { name: /Google/i }).count()) === 0,
    );
    await page.close();
  }

  // ── Provider acceso: login ─────────────────────────────────────────────
  const page = await context.newPage();
  await fingiProvider(page, true);

  // L'ultima tappa prima di Google viene intercettata: il consenso vero
  // richiederebbe un account Google, qui interessa l'indirizzo costruito.
  let authorizeUrl = null;
  await page.route("**/auth/v1/authorize*", async (route) => {
    authorizeUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>consenso Google</body></html>" });
  });

  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  const loginButton = page.getByRole("button", { name: "Accedi con Google" });
  verifica("login: il pulsante 'Accedi con Google' c'e'", (await loginButton.count()) === 1);
  verifica("login: il pulsante e' cliccabile", await loginButton.isEnabled());
  await page.screenshot({ path: `${SHOTS}/login.png`, fullPage: true });

  await loginButton.click();
  await page.waitForTimeout(2500);
  verifica("login: la richiesta parte verso Supabase", !!authorizeUrl, authorizeUrl ?? "nessuna richiesta");
  if (authorizeUrl) {
    const params = new URL(authorizeUrl).searchParams;
    verifica("login: provider=google", params.get("provider") === "google");
    verifica(
      "login: si torna su /auth/callback",
      (params.get("redirect_to") ?? "").endsWith("/auth/callback"),
      params.get("redirect_to") ?? "",
    );
    verifica("login: Google chiede quale account usare", params.get("prompt") === "select_account");
    verifica("login: nessuna intenzione lasciata in giro", (await leggiIntento(page)) === null);
  }

  // ── Provider acceso: registrazione di un utente privato ────────────────
  authorizeUrl = null;
  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  const googleSignup = page.getByRole("button", { name: "Registrati con Google" });
  verifica("registrazione: il pulsante Google c'e'", (await googleSignup.count()) === 1);
  verifica("registrazione: resta spento finche' non scegli il tipo", await googleSignup.isDisabled());
  await page.screenshot({ path: `${SHOTS}/signup-step1.png`, fullPage: true });

  await page.getByText("Gestisci la tua alimentazione e dispensa").click();
  verifica("registrazione: scelto 'Utente', il pulsante si accende", await googleSignup.isEnabled());
  await googleSignup.click();
  await page.waitForTimeout(2500);
  verifica("utente privato: si parte subito per Google", !!authorizeUrl);
  verifica("utente privato: l'intenzione salvata e' role=user", (await leggiIntento(page))?.role === "user");

  // ── Provider acceso: registrazione di un ristorante ────────────────────
  authorizeUrl = null;
  await dimenticaIntento(page);
  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  await page.getByText("Gestisci il tuo ristorante e il magazzino").click();
  await page.getByRole("button", { name: "Registrati con Google" }).click();
  await page.waitForTimeout(500);

  verifica(
    "ristorante: si salta la schermata di email e password",
    await page.getByText("Il tuo ristorante").isVisible(),
  );
  verifica("ristorante: i pallini di avanzamento diventano due", (await page.locator(".h-2.rounded-full").count()) === 2);
  const continua = page.getByRole("button", { name: "Continua con Google" });
  verifica("ristorante: 'Continua con Google' e' spento senza i dati", await continua.isDisabled());

  await page.getByPlaceholder("Nome del ristorante").fill("Osteria del Sole");
  await page.getByPlaceholder("Indirizzo (consigliato)").fill("Via Indipendenza 5, Bologna");
  await page.getByPlaceholder("Telefono ristorante").fill("0511234567");
  verifica("ristorante: compilati i dati, il pulsante si accende", await continua.isEnabled());
  await page.screenshot({ path: `${SHOTS}/signup-ristorante.png`, fullPage: true });

  await continua.click();
  await page.waitForTimeout(2500);
  const intento = await leggiIntento(page);
  verifica("ristorante: si parte per Google", !!authorizeUrl);
  verifica("ristorante: l'intenzione porta con se' il ruolo", intento?.role === "restaurant_owner", JSON.stringify(intento));
  verifica("ristorante: l'intenzione porta con se' il nome del locale", intento?.restaurant_name === "Osteria del Sole");
  verifica("ristorante: l'intenzione porta con se' indirizzo e telefono",
    intento?.restaurant_address === "Via Indipendenza 5, Bologna" && intento?.restaurant_phone === "0511234567");

  // ── Il tasto Indietro riporta alla scelta del tipo di account ──────────
  await dimenticaIntento(page);
  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  await page.getByText("Segui i tuoi clienti come nutrizionista").click();
  await page.getByRole("button", { name: "Registrati con Google" }).click();
  await page.waitForTimeout(400);
  verifica("professionista: si arriva al profilo professionale", await page.getByText("Il tuo profilo professionale").isVisible());
  await page.getByRole("button", { name: /Indietro/ }).click();
  await page.waitForTimeout(400);
  verifica("indietro: si torna alla scelta del tipo di account", await page.getByText("Chi sei?").isVisible());
  verifica(
    "indietro: torna disponibile anche la via con email e password",
    await page.getByRole("button", { name: /Avanti/ }).isVisible(),
  );

  if (CON_ACCOUNT) await verificaRitornoDalRedirect(context, page);

  verifica("nessun errore in console", erroriConsole.length === 0, erroriConsole.join(" | "));

  await browser.close();

  const falliti = esiti.filter((e) => !e.superato);
  console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate`);
  process.exit(falliti.length === 0 ? 0 : 1);
};

/** Indirizzo e chiave stanno gia' nel client dell'app: ricopiarli qui li farebbe divergere. */
const leggiConfigSupabase = async () => {
  const sorgente = await readFile("src/integrations/supabase/client.ts", "utf8");
  return {
    url: sorgente.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)[1],
    key: sorgente.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)[1],
  };
};

/**
 * Il ritorno dal redirect, che e' il pezzo che tocca davvero il database.
 *
 * Il consenso Google non e' automatizzabile, ma cio' che l'app riceve al
 * ritorno e' una sessione su un profilo appena creato e ancora al ruolo
 * predefinito: la stessa cosa che produce una registrazione con email senza
 * 'role' nei metadati. Da li' in poi il percorso e' identico.
 */
const verificaRitornoDalRedirect = async (context, page) => {
  const { url, key } = await leggiConfigSupabase();
  const email = `oauth.callback.${Date.now()}@cibarius.online`;
  const password = "OauthSim2026!";

  const signup = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { full_name: "Paolo Google", email } }),
  }).then((r) => r.json());

  verifica("ritorno: l'account di prova nasce con ruolo predefinito", !!signup.access_token, email);
  if (!signup.access_token) return;

  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await page.waitForURL("**/app", { timeout: 15000 });

  // Cio' che il pulsante Google avrebbe messo da parte prima di partire.
  await page.evaluate(() => {
    localStorage.setItem(
      "cibarius.signup-intent",
      JSON.stringify({
        savedAt: Date.now(),
        intent: {
          role: "restaurant_owner",
          restaurant_name: "Trattoria del Redirect",
          restaurant_address: "Piazza Maggiore 1, Bologna",
          restaurant_phone: "0519998877",
        },
      }),
    );
  });

  await page.goto(`${BASE}/auth/callback`);
  await page.waitForURL("**/restaurant", { timeout: 15000 }).catch(() => {});
  verifica("ritorno: si atterra sul cruscotto del ristorante", new URL(page.url()).pathname === "/restaurant", page.url());
  verifica("ritorno: l'intenzione viene consumata", (await leggiIntento(page)) === null);

  const intestazioni = { apikey: key, Authorization: `Bearer ${signup.access_token}` };
  const [profilo] = await fetch(`${url}/rest/v1/profiles?select=role,full_name&id=eq.${signup.user.id}`, {
    headers: intestazioni,
  }).then((r) => r.json());
  const ristoranti = await fetch(`${url}/rest/v1/restaurants?select=name,address,phone&owner_id=eq.${signup.user.id}`, {
    headers: intestazioni,
  }).then((r) => r.json());

  verifica("ritorno: il ruolo e' diventato ristoratore", profilo?.role === "restaurant_owner", profilo?.role);
  verifica("ritorno: il locale e' stato creato", ristoranti[0]?.name === "Trattoria del Redirect", JSON.stringify(ristoranti));
  verifica("ritorno: indirizzo e telefono del locale sono arrivati",
    ristoranti[0]?.address === "Piazza Maggiore 1, Bologna" && ristoranti[0]?.phone === "0519998877");

  console.log(`\n  account di prova da cancellare: ${email}`);
};

/**
 * Dopo il click la pagina e' sull'origine di Supabase, dove localStorage e'
 * un altro: per rileggere l'intenzione bisogna prima tornare sull'app.
 */
const leggiIntento = async (page) => {
  if (!page.url().startsWith(BASE)) {
    await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
  }
  return page.evaluate(() => {
    const raw = localStorage.getItem("cibarius.signup-intent");
    return raw ? JSON.parse(raw).intent : null;
  });
};

const dimenticaIntento = async (page) => {
  if (!page.url().startsWith(BASE)) {
    await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
  }
  await page.evaluate(() => localStorage.removeItem("cibarius.signup-intent"));
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
