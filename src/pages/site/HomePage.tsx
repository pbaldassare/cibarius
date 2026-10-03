import { Link } from "react-router-dom";
import {
  ArrowRight, LogIn, ClipboardCheck, Thermometer, QrCode, Boxes,
  Clock, ChefHat, FileText, Utensils, Store, HeartPulse,
} from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading, FeatureGrid, Steps, CallToAction } from "@/components/site/sections";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_URL, absoluteUrl, pageByPath } from "@/lib/site";
import { LOGIN_PATH, SIGNUP_PATH } from "@/lib/routes";

const PUBBLICO = [
  {
    icon: Store,
    titolo: "Ristoranti",
    testo:
      "Controlli HACCP giornalieri, temperature, etichette di preparazione con QR e magazzino che si carica dalla bolla.",
    to: "/ristoranti",
  },
  {
    icon: Utensils,
    titolo: "A casa",
    testo:
      "Scansiona la spesa, tieni d'occhio le scadenze e trova ricette con quello che hai già in dispensa.",
    to: "/utenti",
  },
  {
    icon: HeartPulse,
    titolo: "Nutrizionisti",
    testo:
      "Piani alimentari per i tuoi assistiti, diario condiviso e verifica dell'aderenza senza rincorrere nessuno.",
    to: "/nutrizionisti",
  },
];

const FUNZIONI = [
  {
    icon: Clock,
    title: "Scadenze sempre sotto controllo",
    text: "Ogni lotto ha la sua data. L'app mostra prima quello che sta per scadere e avvisa per email quando mancano pochi giorni.",
  },
  {
    icon: ClipboardCheck,
    title: "HACCP senza fogli di carta",
    text: "Attività giornaliere, settimanali o a intervallo scelto da te. Quelle saltate restano in evidenza finché non le registri.",
  },
  {
    icon: Thermometer,
    title: "Temperature con soglie",
    text: "Registri la lettura, l'app segnala l'anomalia rispetto alla soglia della cella e tiene lo storico esportabile.",
  },
  {
    icon: QrCode,
    title: "Etichette di preparazione",
    text: "Ogni preparazione riceve un codice lotto e un QR: chi lo inquadra vede ingredienti, allergeni e documento di provenienza.",
  },
  {
    icon: Boxes,
    title: "Magazzino che si spiega",
    text: "Carico, consumo, spreco e rettifica finiscono in un registro. Da lì esce il consumo medio e la stima di quando finisce la merce.",
  },
  {
    icon: FileText,
    title: "Bolle lette dall'AI",
    text: "Fotografi il documento di trasporto, l'app estrae fornitore e articoli e li porta a magazzino con un tocco.",
  },
];

const PASSI = [
  { title: "Crea l'account", text: "Scegli se usare Cibarius a casa, al ristorante o come professionista. Bastano email e password." },
  { title: "Porta dentro i dati", text: "Scansiona un codice a barre, fotografa una bolla o aggiungi a mano. L'inventario si popola in pochi minuti." },
  { title: "Lavora ogni giorno", text: "Spunti i controlli, scarichi la merce usata, stampi le etichette. Tutto resta registrato da solo." },
  { title: "Esci con i documenti", text: "Storico controlli, registro temperature e movimenti pronti da esportare quando serve." },
];

const HomePage = () => {
  const page = pageByPath("/")!;

  /*
   * Dati strutturati.
   *
   * Servono ai motori classici per la scheda del risultato e ai motori
   * generativi per capire cos'e' Cibarius senza doverlo dedurre dal testo.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "it-IT",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
        featureList: FUNZIONI.map((f) => f.title),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "Prova gratuita di 30 giorni per i ristoranti, uso domestico gratuito.",
        },
      },
    ],
  };

  return (
    <>
      <Seo title={page.title} description={page.description} path="/" jsonLd={jsonLd} />

      {/* ── Apertura ── */}
      <section className="bg-brand-gradient">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-[32px] font-bold leading-tight text-primary-foreground sm:text-[44px]">
            {SITE_TAGLINE}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-primary-foreground/90 sm:text-[18px]">
            Cibarius tiene insieme quello che oggi vive su quaderni e fogli di calcolo: date di
            scadenza, giacenze, controlli sanitari e tracciabilità delle preparazioni.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={SIGNUP_PATH}
              className="flex h-12 items-center gap-2 rounded-[14px] bg-card px-6 text-[15px] font-semibold text-foreground active:scale-[0.98] transition-transform"
            >
              Inizia gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={LOGIN_PATH}
              className="flex h-12 items-center gap-2 rounded-[14px] border border-primary-foreground/40 px-6 text-[15px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
            >
              <LogIn className="h-4 w-4" /> Area riservata
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-primary-foreground/80">
            Trenta giorni di prova per i ristoranti. Nessuna carta di credito.
          </p>
        </div>
      </section>

      {/* ── Tre modi di usarla ── */}
      <Section>
        <SectionHeading
          eyebrow="Un'app, tre profili"
          title="Chi usa Cibarius"
          lead="Lo stesso impianto, tre interfacce diverse. Ognuno vede solo quello che gli serve."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PUBBLICO.map(({ icon: Icon, titolo, testo, to }) => (
            <Link
              key={titolo}
              to={to}
              className="group rounded-[18px] bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-[18px] font-semibold text-foreground">{titolo}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{testo}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary">
                Scopri <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Funzioni ── */}
      <Section className="pt-0">
        <SectionHeading
          eyebrow="Cosa fa"
          title="Le funzioni su cui si lavora ogni giorno"
          lead="Niente moduli da compilare due volte: quello che registri in cucina alimenta magazzino, registro e documenti."
        />
        <FeatureGrid items={FUNZIONI} />
      </Section>

      {/* ── Come funziona ── */}
      <Section className="pt-0">
        <SectionHeading eyebrow="In pratica" title="Dal primo accesso al primo controllo" />
        <Steps items={PASSI} />
        <div className="mt-8 text-center">
          <Link to="/come-funziona" className="inline-flex items-center gap-1 text-[15px] font-semibold text-primary">
            Vedi il percorso completo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      <CallToAction />
    </>
  );
};

export default HomePage;
