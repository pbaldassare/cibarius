import { Link } from "react-router-dom";
import {
  ScanLine, Clock, ChefHat, Bell, Snowflake, ShoppingCart, ArrowRight,
} from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading, FeatureGrid, CallToAction } from "@/components/site/sections";
import { pageByPath, absoluteUrl } from "@/lib/site";
import { SIGNUP_PATH } from "@/lib/routes";

const FUNZIONI = [
  {
    icon: ScanLine,
    title: "Scansiona e aggiungi",
    text: "Inquadri il codice a barre e il prodotto entra in dispensa con nome, marca e valori nutrizionali già compilati.",
  },
  {
    icon: Clock,
    title: "Scadenze in ordine",
    text: "Home aperta, prima cosa che vedi: cosa scade oggi, cosa fra tre giorni, cosa è già andato.",
  },
  {
    icon: Bell,
    title: "Avvisi per email",
    text: "Un promemoria quando qualcosa sta per scadere, così te ne accorgi prima di aprire il frigo.",
  },
  {
    icon: ChefHat,
    title: "Ricette anti-spreco",
    text: "Suggerimenti costruiti su quello che hai in casa, con la precedenza agli ingredienti in scadenza.",
  },
  {
    icon: Snowflake,
    title: "Dispensa, frigo e congelatore",
    text: "Tre luoghi separati, ognuno con le sue regole di conservazione e i suoi tempi.",
  },
  {
    icon: ShoppingCart,
    title: "Lista della spesa",
    text: "Quello che sta finendo passa in lista senza doverlo ricordare a mente.",
  },
];

const UtentiPage = () => {
  const page = pageByPath("/utenti")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Cibarius per la casa",
    serviceType: "Gestione dispensa domestica e scadenze alimentari",
    url: absoluteUrl("/utenti"),
    description: page.description,
    areaServed: "IT",
    provider: { "@type": "Organization", name: "Cibarius" },
  };

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/utenti"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Per te", path: "/utenti" }]}
      />

      <section className="bg-brand-gradient">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-primary-foreground/80">
            A casa
          </p>
          <h1 className="mt-2 max-w-3xl text-[30px] font-bold leading-tight text-primary-foreground sm:text-[42px]">
            Sai sempre cosa hai e cosa sta per scadere
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-primary-foreground/90 sm:text-[18px]">
            La spesa entra con una scansione, le scadenze si ordinano da sole e quando qualcosa
            sta per andare a male l'app ti propone come usarlo.
          </p>
          <Link
            to={SIGNUP_PATH}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-[14px] bg-card px-6 text-[15px] font-semibold text-foreground active:scale-[0.98] transition-transform"
          >
            Inizia gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Perché serve"
          title="Il cibo si butta perché ci si dimentica"
          lead="Non per distrazione: perché quello che sta in fondo al frigo non si vede. Cibarius lo tiene in prima fila finché non lo usi."
        />
        <FeatureGrid items={FUNZIONI} />
      </Section>

      <Section className="pt-0">
        <div className="rounded-[18px] bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-[20px] font-bold text-foreground sm:text-[24px]">
            Se segui un piano alimentare
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Quando il tuo nutrizionista usa Cibarius, il piano arriva direttamente nell'app: vedi
            i pasti previsti, segni quello che mangi e lui vede l'andamento senza doverti chiedere
            niente.
          </p>
          <Link
            to="/nutrizionisti"
            className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-primary"
          >
            Come funziona per i professionisti <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      <CallToAction
        title="L'uso in casa è gratuito"
        text="Crei l'account e cominci ad aggiungere prodotti. Le funzioni avanzate restano opzionali."
      />
    </>
  );
};

export default UtentiPage;
