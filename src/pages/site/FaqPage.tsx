import Seo from "@/components/site/Seo";
import { Section, SectionHeading, CallToAction } from "@/components/site/sections";
import { pageByPath, absoluteUrl, CONTACT_EMAIL } from "@/lib/site";

/**
 * Domande frequenti.
 *
 * La pagina serve due pubblici: chi legge, e i motori che rispondono al posto
 * dell'utente. Le risposte sono scritte per essere citabili da sole, senza il
 * contesto della pagina, perche' e' cosi' che vengono estratte.
 */
const DOMANDE: { d: string; r: string }[] = [
  {
    d: "Cibarius sostituisce il manuale HACCP?",
    r: "No. Il manuale di autocontrollo resta il documento redatto per il tuo locale. Cibarius sostituisce i registri cartacei su cui quel manuale ti chiede di annotare controlli, temperature e non conformità, e li tiene in forma esportabile.",
  },
  {
    d: "Serve installare qualcosa?",
    r: "No. Cibarius è un'applicazione web: si apre dal browser del telefono o del computer. Puoi aggiungerla alla schermata principale per usarla come una normale app, ma non passa dagli store.",
  },
  {
    d: "Quanto dura la prova gratuita?",
    r: "Trenta giorni per il piano ristorante, senza carta di credito. L'uso domestico è gratuito e non ha scadenza.",
  },
  {
    d: "Posso usare lo stesso account a casa e al ristorante?",
    r: "No, sono due profili diversi. Ogni account ha un ruolo, e il ruolo decide quale applicazione si apre dopo l'accesso: dispensa personale, area ristorante, suite per professionisti o portale fornitori.",
  },
  {
    d: "Come entra la merce a magazzino?",
    r: "In tre modi: fotografando la bolla o il documento di trasporto, da cui l'AI estrae fornitore e articoli; scansionando il codice a barre del singolo prodotto; oppure a mano con nome, quantità, lotto e scadenza.",
  },
  {
    d: "A cosa serve il QR sulle etichette di preparazione?",
    r: "Chi lo inquadra apre una pagina pubblica con il nome della preparazione, il codice lotto, la data di produzione, il termine di conservazione, gli ingredienti con gli allergeni e il documento di provenienza della merce usata.",
  },
  {
    d: "I dati di chi usa l'app dove stanno?",
    r: "Su un'infrastruttura Postgres gestita, con regole di accesso a livello di riga: ogni ristorante vede soltanto i propri dati e ogni utente soltanto la propria dispensa. Le fotografie e i documenti caricati stanno in uno spazio separato con gli stessi controlli.",
  },
  {
    d: "Posso esportare quello che ho registrato?",
    r: "Sì. Lo storico dei controlli HACCP e il registro delle temperature si esportano in formato stampabile, con filtri per periodo, area e presenza di anomalie.",
  },
  {
    d: "Funziona se in cucina la rete va e viene?",
    r: "Le operazioni fatte senza collegamento vengono messe in coda sul dispositivo e inviate appena la rete torna, quindi non si perde una registrazione per un buco di segnale.",
  },
  {
    d: "Più persone dello staff possono usarlo?",
    r: "Oggi l'accesso all'area ristorante è del titolare. La gestione dei collaboratori con account separati è in lavorazione.",
  },
];

const FaqPage = () => {
  const page = pageByPath("/faq")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: absoluteUrl("/faq"),
    mainEntity: DOMANDE.map(({ d, r }) => ({
      "@type": "Question",
      name: d,
      acceptedAnswer: { "@type": "Answer", text: r },
    })),
  };

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path="/faq"
        jsonLd={jsonLd}
        breadcrumb={[{ label: "Home", path: "/" }, { label: "Domande frequenti", path: "/faq" }]}
      />

      <Section>
        <SectionHeading
          eyebrow="Domande frequenti"
          title="Le risposte che chiedono più spesso"
          level={1}
          lead={`Se quello che cerchi non c'è, scrivici a ${CONTACT_EMAIL}.`}
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {DOMANDE.map(({ d, r }) => (
            <details key={d} className="group rounded-[18px] bg-card p-5 shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-foreground">
                <h2 className="text-[16px] font-semibold">{d}</h2>
                <span className="shrink-0 text-[20px] leading-none text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{r}</p>
            </details>
          ))}
        </div>
      </Section>

      <CallToAction
        title="Non hai trovato la risposta?"
        text="Scrivici: rispondiamo con quello che l'app fa davvero, non con quello che vorremmo facesse."
      />
    </>
  );
};

export default FaqPage;
