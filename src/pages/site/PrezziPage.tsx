import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading, CallToAction } from "@/components/site/sections";
import { pageByPath, absoluteUrl, CONTACT_EMAIL } from "@/lib/site";
import { SIGNUP_PATH } from "@/lib/routes";

/**
 * Prezzi allineati alla tabella `subscription_plans`.
 *
 * Sono gli stessi importi che Stripe addebita: se cambiano a database vanno
 * cambiati anche qui, altrimenti il sito promette una cifra e la cassa ne
 * chiede un'altra.
 */
const PIANI = [
  {
    nome: "A casa",
    prezzo: "Gratis",
    periodo: "",
    descrizione: "Per tenere in ordine dispensa e scadenze di famiglia.",
    voci: [
      "Dispensa, frigo e congelatore",
      "Scansione del codice a barre",
      "Avvisi di scadenza via email",
      "Ricette con quello che hai",
    ],
    cta: "Crea un account",
    to: SIGNUP_PATH,
    evidenza: false,
  },
  {
    nome: "Ristorante",
    prezzo: "19,90 €",
    periodo: "al mese",
    descrizione: "HACCP, magazzino e tracciabilità per la cucina professionale.",
    voci: [
      "Controlli HACCP e registro temperature",
      "Etichette di preparazione con QR",
      "Magazzino a lotti e registro movimenti",
      "Lettura automatica di bolle e DDT",
      "Backoffice e documenti esportabili",
    ],
    nota: "Oppure 199 € all'anno. Primi 30 giorni di prova gratuiti.",
    cta: "Prova 30 giorni",
    to: SIGNUP_PATH,
    evidenza: true,
  },
  {
    nome: "Professionisti",
    prezzo: "Su misura",
    periodo: "",
    descrizione: "Per nutrizionisti e dietisti che seguono più assistiti.",
    voci: [
      "Piani alimentari e import da PDF",
      "Diario dei clienti e aderenza",
      "Note, suggerimenti e appuntamenti",
      "Pagina personale per i nuovi clienti",
    ],
    cta: "Parlane con noi",
    to: `mailto:${CONTACT_EMAIL}?subject=Piano%20professionisti`,
    esterno: true,
    evidenza: false,
  },
];

const PrezziPage = () => {
  const page = pageByPath("/prezzi")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cibarius",
    description: page.description,
    url: absoluteUrl("/prezzi"),
    brand: { "@type": "Brand", name: "Cibarius" },
    offers: [
      {
        "@type": "Offer",
        name: "Cibarius a casa",
        price: "0",
        priceCurrency: "EUR",
        description: "Gestione di dispensa e scadenze per uso domestico.",
      },
      {
        "@type": "Offer",
        name: "Cibarius Ristorante, mensile",
        price: "19.90",
        priceCurrency: "EUR",
        description: "HACCP, magazzino e tracciabilità. Trenta giorni di prova gratuita.",
      },
      {
        "@type": "Offer",
        name: "Cibarius Ristorante, annuale",
        price: "199.00",
        priceCurrency: "EUR",
        description: "Stesso piano con pagamento annuale.",
      },
    ],
  };

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/prezzi"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Prezzi", path: "/prezzi" }]}
      />

      <Section>
        <SectionHeading
          eyebrow="Prezzi"
          title="Paghi solo quello che usi davvero"
          level={1}
          lead="L'uso domestico è gratuito. Il piano ristorante si prova per trenta giorni senza carta di credito."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PIANI.map((p) => (
            <div
              key={p.nome}
              className={`flex flex-col rounded-[18px] p-6 shadow-card ${
                p.evidenza ? "bg-card ring-2 ring-primary" : "bg-card"
              }`}
            >
              {p.evidenza && (
                <span className="mb-3 self-start rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                  Il più scelto
                </span>
              )}
              <h3 className="text-[18px] font-semibold text-foreground">{p.nome}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{p.descrizione}</p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[32px] font-bold leading-none text-foreground">{p.prezzo}</span>
                {p.periodo && <span className="text-[14px] text-muted-foreground">{p.periodo}</span>}
              </p>

              <ul className="mt-5 space-y-2.5">
                {p.voci.map((v) => (
                  <li key={v} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-[14px] leading-relaxed text-foreground">{v}</span>
                  </li>
                ))}
              </ul>

              {p.nota && <p className="mt-4 text-[12px] text-muted-foreground">{p.nota}</p>}

              <div className="mt-6 pt-2">
                {p.esterno ? (
                  <a
                    href={p.to}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-[15px] font-semibold text-foreground active:scale-[0.98] transition-transform"
                  >
                    {p.cta}
                  </a>
                ) : (
                  <Link
                    to={p.to}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold active:scale-[0.98] transition-transform ${
                      p.evidenza
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground"
                    }`}
                  >
                    {p.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-muted-foreground">
          Prezzi IVA esclusa. L'abbonamento si disdice quando vuoi, dal profilo.
        </p>
      </Section>

      <CallToAction
        title="Hai dubbi su quale piano serve?"
        text="Raccontaci come lavori e ti diciamo quale profilo ha senso, anche se la risposta è quello gratuito."
      />
    </>
  );
};

export default PrezziPage;
