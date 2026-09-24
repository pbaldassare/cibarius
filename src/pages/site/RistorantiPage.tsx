import { Link } from "react-router-dom";
import {
  ClipboardCheck, Thermometer, QrCode, Boxes, FileText, ArrowRight,
  ShieldCheck, TrendingDown, Trash2,
} from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading, FeatureGrid, CallToAction } from "@/components/site/sections";
import { pageByPath, absoluteUrl } from "@/lib/site";
import { SIGNUP_PATH } from "@/lib/routes";

const FUNZIONI = [
  {
    icon: ClipboardCheck,
    title: "Controlli giornalieri",
    text: "Pulizie, verifiche e scadenze in una griglia settimanale. Ogni registrazione porta data, ora e nome di chi l'ha fatta.",
  },
  {
    icon: Thermometer,
    title: "Registro temperature",
    text: "Celle, frigoriferi e abbattitori con la loro soglia. Fuori soglia l'app segnala l'anomalia e la evidenzia nel registro.",
  },
  {
    icon: QrCode,
    title: "Etichette di preparazione",
    text: "Codice lotto, data di produzione e termine di conservazione. Il QR porta a una pagina pubblica con ingredienti, allergeni e documento di origine.",
  },
  {
    icon: FileText,
    title: "Bolle e DDT",
    text: "Fotografi il documento, l'AI legge fornitore, numero e articoli. Un tocco e la merce entra a magazzino con il riferimento al documento.",
  },
  {
    icon: Boxes,
    title: "Magazzino a lotti",
    text: "Giacenze per prodotto, scadenza più vicina e registro di carico, consumo, spreco e rettifica.",
  },
  {
    icon: TrendingDown,
    title: "Stima di esaurimento",
    text: "Dai consumi reali l'app calcola quanto se ne va al giorno e quando la merce finisce, così ordini prima di restare a secco.",
  },
];

const RistorantiPage = () => {
  const page = pageByPath("/ristoranti")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Cibarius per ristoranti",
    serviceType: "Gestione HACCP e magazzino per ristorazione",
    url: absoluteUrl("/ristoranti"),
    description: page.description,
    areaServed: "IT",
    provider: { "@type": "Organization", name: "Cibarius" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Funzioni per la ristorazione",
      itemListElement: FUNZIONI.map((f) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: f.title, description: f.text },
      })),
    },
  };

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/ristoranti"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Ristoranti", path: "/ristoranti" }]}
      />

      <section className="bg-brand-gradient">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-primary-foreground/80">
            Per la ristorazione
          </p>
          <h1 className="mt-2 max-w-3xl text-[30px] font-bold leading-tight text-primary-foreground sm:text-[42px]">
            L'HACCP smette di vivere su un quaderno
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-primary-foreground/90 sm:text-[18px]">
            Controlli, temperature, etichette e magazzino nello stesso posto. Quello che il
            personale registra in cucina diventa il documento che serve in sede di verifica.
          </p>
          <Link
            to={SIGNUP_PATH}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-[14px] bg-card px-6 text-[15px] font-semibold text-foreground active:scale-[0.98] transition-transform"
          >
            Prova 30 giorni <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Il problema"
          title="I registri cartacei si compilano a fine turno"
          lead="E quando arriva un controllo, la lacuna si vede. Cibarius chiede la registrazione nel momento in cui il lavoro viene fatto, dal telefono che lo staff ha già in tasca."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Tracciabilità reale", d: "Ogni riga porta chi, quando e con quale valore. Niente compilazioni a memoria." },
            { icon: Trash2, t: "Sprechi misurati", d: "Consumo e spreco restano due movimenti distinti: sai davvero quanto butti." },
            { icon: FileText, t: "Documenti pronti", d: "Storico controlli, temperature e movimenti esportabili quando servono." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-[18px] bg-card p-5 shadow-card">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-[16px] font-semibold text-foreground">{t}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading eyebrow="Le funzioni" title="Cosa trovi nell'area ristorante" />
        <FeatureGrid items={FUNZIONI} />
      </Section>

      <Section className="pt-0">
        <div className="rounded-[18px] bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-[20px] font-bold text-foreground sm:text-[24px]">
            Dalla bolla al piatto, senza riscrivere niente
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            La merce entra fotografando il documento di trasporto. Da lì il lotto è collegato al
            fornitore, e quando quel lotto finisce in una preparazione l'etichetta stampata porta
            il riferimento al documento di origine. Se qualcuno inquadra il QR, vede la catena
            completa.
          </p>
          <Link
            to="/come-funziona"
            className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-primary"
          >
            Guarda il percorso completo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      <CallToAction
        title="Trenta giorni per provarlo in cucina"
        text="Attivi l'account, configuri i controlli dal modello e cominci. Nessuna carta di credito richiesta."
      />
    </>
  );
};

export default RistorantiPage;
