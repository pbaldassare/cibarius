import { Link } from "react-router-dom";
import { ArrowRight, Store, Utensils, HeartPulse } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Section, SectionHeading, Steps, CallToAction } from "@/components/site/sections";
import { pageByPath, absoluteUrl } from "@/lib/site";

const PERCORSI = [
  {
    icon: Store,
    titolo: "Al ristorante",
    to: "/ristoranti",
    passi: [
      { title: "Configura il locale", text: "Nome, indirizzo e attrezzature da controllare. Da un modello pronto escono già le attività HACCP tipiche della tua cucina." },
      { title: "Carica la merce", text: "Fotografi la bolla: fornitore, numero documento e articoli finiscono a magazzino con il riferimento al documento." },
      { title: "Lavora il turno", text: "Spunti i controlli, registri le temperature, stampi le etichette delle preparazioni con il loro QR." },
      { title: "Tieni i conti", text: "Consumi e sprechi restano distinti a registro, e da lì esce la stima di quando finisce ogni prodotto." },
    ],
  },
  {
    icon: Utensils,
    titolo: "A casa",
    to: "/utenti",
    passi: [
      { title: "Svuota la spesa", text: "Scansioni i codici a barre e i prodotti entrano con nome, marca e valori nutrizionali." },
      { title: "Indica dove li metti", text: "Dispensa, frigo o congelatore, con la data di scadenza che trovi sulla confezione." },
      { title: "Guarda la home", text: "Quello che scade presto sta in cima. Un avviso per email ti arriva prima che sia tardi." },
      { title: "Cucina quello che hai", text: "Le ricette proposte partono dagli ingredienti in scadenza, non da una lista della spesa nuova." },
    ],
  },
  {
    icon: HeartPulse,
    titolo: "Con il nutrizionista",
    to: "/nutrizionisti",
    passi: [
      { title: "Collegamento", text: "Ti registri dal link del professionista e il collegamento si crea da solo." },
      { title: "Ricevi il piano", text: "I pasti previsti compaiono nella tua app, giorno per giorno." },
      { title: "Segni cosa mangi", text: "Il diario si compila in pochi tocchi, anche partendo da quello che hai in dispensa." },
      { title: "La visita è più utile", text: "Il professionista arriva all'appuntamento sapendo già come è andata la settimana." },
    ],
  },
];

const ComeFunzionaPage = () => {
  const page = pageByPath("/come-funziona")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Come iniziare a usare Cibarius al ristorante",
    description: page.description,
    url: absoluteUrl("/come-funziona"),
    step: PERCORSI[0].passi.map((p, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: p.title,
      text: p.text,
    })),
  };

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/come-funziona"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Come funziona", path: "/come-funziona" }]}
      />

      <Section>
        <SectionHeading
          eyebrow="Come funziona"
          title="Tre percorsi, lo stesso impianto"
          level={1}
          lead="Cambia quello che vedi dopo l'accesso, non il modo in cui i dati vengono registrati."
        />
      </Section>

      {PERCORSI.map(({ icon: Icon, titolo, to, passi }, i) => (
        <Section key={titolo} className={i === 0 ? "pt-0" : "pt-0"}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-[22px] font-bold text-foreground sm:text-[26px]">{titolo}</h2>
            <Link to={to} className="ml-auto hidden items-center gap-1 text-[14px] font-semibold text-primary sm:flex">
              Dettagli <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Steps items={passi} />
        </Section>
      ))}

      <CallToAction />
    </>
  );
};

export default ComeFunzionaPage;
