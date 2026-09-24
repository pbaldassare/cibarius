import { Link } from "react-router-dom";
import { Mail, LogIn, HelpCircle, Store } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading } from "@/components/site/sections";
import { pageByPath, absoluteUrl, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import { LOGIN_PATH } from "@/lib/routes";

const ContattiPage = () => {
  const page = pageByPath("/contatti")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absoluteUrl("/contatti"),
    name: page.title,
    description: page.description,
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      email: CONTACT_EMAIL,
      url: absoluteUrl("/"),
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "assistenza clienti",
        email: CONTACT_EMAIL,
        availableLanguage: "Italian",
      },
    },
  };

  const canali = [
    {
      icon: Store,
      titolo: "Vuoi vederlo in cucina",
      testo: "Organizziamo una dimostrazione sul tuo caso: i tuoi controlli, le tue bolle, le tue preparazioni.",
      azione: "Chiedi una dimostrazione",
      href: `mailto:${CONTACT_EMAIL}?subject=Richiesta%20dimostrazione`,
    },
    {
      icon: HelpCircle,
      titolo: "Hai un problema con l'app",
      testo: "Scrivici cosa stavi facendo e su quale schermata. Più sei preciso, prima lo risolviamo.",
      azione: "Segnala un problema",
      href: `mailto:${CONTACT_EMAIL}?subject=Assistenza`,
    },
  ];

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/contatti"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Contatti", path: "/contatti" }]}
      />

      <Section>
        <SectionHeading
          eyebrow="Contatti"
          title="Parliamone"
          level={1}
          lead="Rispondiamo in italiano, di persona, e diciamo anche quando l'app non fa quello che serve."
        />

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          {canali.map(({ icon: Icon, titolo, testo, azione, href }) => (
            <div key={titolo} className="flex flex-col rounded-[18px] bg-card p-6 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 text-[17px] font-semibold text-foreground">{titolo}</h2>
              <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-muted-foreground">{testo}</p>
              <a
                href={href}
                className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[12px] bg-primary text-[14px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
              >
                <Mail className="h-4 w-4" /> {azione}
              </a>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-[18px] bg-card p-6 shadow-card">
          <h2 className="text-[17px] font-semibold text-foreground">Sei già cliente?</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            L'assistenza si apre anche dal profilo, dentro l'app: la richiesta arriva già
            collegata al tuo account.
          </p>
          <Link
            to={LOGIN_PATH}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] border border-border px-5 text-[14px] font-semibold text-foreground active:scale-[0.98] transition-transform"
          >
            <LogIn className="h-4 w-4" /> Entra nell'area riservata
          </Link>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-[14px] text-muted-foreground">
          Oppure scrivi direttamente a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </>
  );
};

export default ContattiPage;
