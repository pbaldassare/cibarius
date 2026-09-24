/**
 * Dati del sito pubblico.
 *
 * Sito e software vivono sullo stesso dominio: la radice e' il sito, l'area
 * riservata e' il software gia' esistente. Indirizzo, nome e descrizioni
 * stanno qui perche' finiscono in troppi posti (URL canonici, sitemap, dati
 * strutturati, anteprime social): ripeterli significherebbe vederli divergere.
 *
 * Quando il progetto passera' a un dominio proprio basta cambiare SITE_URL,
 * oppure valorizzare VITE_SITE_URL senza toccare il codice.
 */

/** Indirizzo di produzione, senza barra finale. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? "https://cibarius.online"
).replace(/\/$/, "");

export const SITE_NAME = "Cibarius";

export const SITE_TAGLINE = "Scadenze, magazzino e HACCP in un'unica app";

export const SITE_DESCRIPTION =
  "Scadenze e dispensa a casa, magazzino e controlli HACCP al ristorante, piani alimentari dal nutrizionista. Un'unica app, tre modi di usarla.";

export const CONTACT_EMAIL = "info@cibarius.online";

/** Pagine pubbliche del sito, nell'ordine in cui compaiono nel menu. */
export interface SitePage {
  path: string;
  label: string;
  /** Titolo della scheda del browser e dei risultati di ricerca. */
  title: string;
  description: string;
  /** Peso relativo nella sitemap. */
  priority: number;
  /** Fuori dal menu principale: sta solo nel piede e nella sitemap. */
  footerOnly?: boolean;
}

export const SITE_PAGES: SitePage[] = [
  {
    path: "/",
    label: "Home",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    priority: 1,
  },
  {
    path: "/ristoranti",
    label: "Ristoranti",
    title: "HACCP digitale e magazzino per ristoranti | Cibarius",
    description:
      "Controlli HACCP, registro temperature, etichette di preparazione con QR e carico merce dalla bolla. Tutto dal telefono, pronto per l'ispezione.",
    priority: 0.9,
  },
  {
    path: "/utenti",
    label: "Per te",
    title: "Gestione dispensa e scadenze a casa | Cibarius",
    description:
      "Scansiona la spesa, tieni d'occhio le scadenze e cucina con quello che hai. Cibarius ti avvisa prima che il cibo vada buttato.",
    priority: 0.8,
  },
  {
    path: "/nutrizionisti",
    label: "Nutrizionisti",
    title: "Piani alimentari e monitoraggio clienti | Cibarius",
    description:
      "Crea piani alimentari, segui il diario dei clienti e verifica l'aderenza. I tuoi assistiti usano l'app, tu vedi i risultati.",
    priority: 0.8,
  },
  {
    path: "/come-funziona",
    label: "Come funziona",
    title: "Come funziona Cibarius, passo per passo",
    description:
      "Dalla registrazione al primo controllo HACCP, dalla spesa scansionata alla ricetta anti-spreco. Cosa succede quando inizi a usare Cibarius.",
    priority: 0.7,
  },
  {
    path: "/prezzi",
    label: "Prezzi",
    title: "Prezzi e piani di abbonamento | Cibarius",
    description:
      "Trenta giorni di prova gratuita per i ristoranti, piano gratuito per l'uso domestico. Nessuna carta richiesta per iniziare.",
    priority: 0.9,
  },
  {
    path: "/faq",
    label: "Domande frequenti",
    title: "Domande frequenti su Cibarius",
    description:
      "Risposte su HACCP, privacy dei dati, dispositivi supportati, prova gratuita e differenze fra i tre profili d'uso.",
    priority: 0.6,
  },
  {
    path: "/contatti",
    label: "Contatti",
    title: "Contatta Cibarius",
    description:
      "Scrivici per una dimostrazione sul tuo locale, per un preventivo o per assistenza sull'app. Rispondiamo in italiano, di persona.",
    priority: 0.5,
    footerOnly: true,
  },
];

/** Voci del menu principale. */
export const NAV_PAGES = SITE_PAGES.filter((p) => p.path !== "/" && !p.footerOnly);

export const pageByPath = (path: string): SitePage | undefined =>
  SITE_PAGES.find((p) => p.path === path);

/** URL assoluto di una pagina, per canonici e sitemap. */
export const absoluteUrl = (path: string): string =>
  path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
