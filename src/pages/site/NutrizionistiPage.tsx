import { Link } from "react-router-dom";
import {
  ClipboardList, Users, LineChart, MessageSquare, CalendarClock, FileUp, ArrowRight,
} from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading, FeatureGrid, CallToAction } from "@/components/site/sections";
import { pageByPath, absoluteUrl, CONTACT_EMAIL } from "@/lib/site";
import { SIGNUP_PATH } from "@/lib/routes";

const FUNZIONI = [
  {
    icon: ClipboardList,
    title: "Piani alimentari",
    text: "Costruisci il piano per giorni e pasti, con obiettivi di macronutrienti. Il cliente lo vede nella sua app, non in un PDF da cercare nelle email.",
  },
  {
    icon: FileUp,
    title: "Import da PDF",
    text: "Hai già i tuoi schemi? Caricali e l'app li trasforma in un piano modificabile invece di farteli riscrivere.",
  },
  {
    icon: Users,
    title: "Elenco assistiti",
    text: "Tutti i clienti collegati, con lo stato del loro piano e l'ultimo accesso al diario.",
  },
  {
    icon: LineChart,
    title: "Aderenza verificabile",
    text: "Vedi cosa hanno registrato davvero, non cosa dicono di aver mangiato. Le differenze saltano fuori da sole.",
  },
  {
    icon: MessageSquare,
    title: "Note e suggerimenti",
    text: "Lasci indicazioni sul singolo pasto o sulla settimana, il cliente le trova nel punto giusto.",
  },
  {
    icon: CalendarClock,
    title: "Appuntamenti",
    text: "Le visite di controllo restano accanto alla scheda del cliente, senza un secondo calendario da tenere allineato.",
  },
];

const NutrizionistiPage = () => {
  const page = pageByPath("/nutrizionisti")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Cibarius per nutrizionisti",
    serviceType: "Gestione piani alimentari e monitoraggio assistiti",
    url: absoluteUrl("/nutrizionisti"),
    description: page.description,
    areaServed: "IT",
    audience: { "@type": "Audience", audienceType: "Nutrizionisti, dietisti e dietologi" },
    provider: { "@type": "Organization", name: "Cibarius" },
  };

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/nutrizionisti"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Nutrizionisti", path: "/nutrizionisti" }]}
      />

      <section className="bg-brand-gradient">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-primary-foreground/80">
            Per i professionisti
          </p>
          <h1 className="mt-2 max-w-3xl text-[30px] font-bold leading-tight text-primary-foreground sm:text-[42px]">
            Il piano lo scrivi tu, il diario lo tiene l'app
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-primary-foreground/90 sm:text-[18px]">
            I tuoi assistiti registrano quello che mangiano dal telefono. Tu apri la scheda e vedi
            l'aderenza reale, senza rincorrere nessuno fra una visita e l'altra.
          </p>
          <Link
            to={SIGNUP_PATH}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-[14px] bg-card px-6 text-[15px] font-semibold text-foreground active:scale-[0.98] transition-transform"
          >
            Crea il profilo professionale <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Il lavoro quotidiano"
          title="Cosa trovi nella suite professionale"
        />
        <FeatureGrid items={FUNZIONI} />
      </Section>

      <Section className="pt-0">
        <div className="rounded-[18px] bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-[20px] font-bold text-foreground sm:text-[24px]">
            I tuoi clienti arrivano dal tuo link
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Ogni professionista ha una pagina con il proprio indirizzo. Chi si registra da lì
            resta collegato al tuo profilo, e il collegamento vale anche se completa
            l'iscrizione nei giorni successivi.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Informazioni%20profilo%20professionale`}
            className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-primary"
          >
            Chiedi una dimostrazione <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Section>

      <CallToAction
        title="Vuoi vederlo sui tuoi casi?"
        text="Scrivici e organizziamo una dimostrazione con i tuoi schemi alimentari."
      />
    </>
  );
};

export default NutrizionistiPage;
