import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Download, Share, Plus, MoreVertical } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Section } from "@/components/site/sections";
import { USER_HOME } from "@/lib/routes";

/**
 * Invito a installare l'app, sulla home del sito pubblico.
 *
 * Prima di questa sezione l'unico invito stava nel banner che compare dopo
 * il login: per installare bisognava gia' essere utenti, cioe' il contrario
 * di quello che serve.
 *
 * Non tutti i browser sanno aprire la finestra di installazione. Chrome e i
 * browser derivati emettono `beforeinstallprompt` e allora il pulsante la
 * apre davvero; Safari non lo emette e l'operazione resta manuale, quindi
 * li' si mostrano le istruzioni invece di un pulsante che non farebbe nulla.
 * Stessa cosa su Firefox e su qualunque origine non in HTTPS.
 */

const VANTAGGI = [
  "Si apre a tutto schermo, senza la barra del browser",
  "Icona sulla schermata principale, come un'app qualsiasi",
  "Si aggiorna da sola: nessuna versione da scaricare",
];

const IstruzioniIos = () => (
  <ol className="mx-auto mt-5 max-w-md space-y-2.5 text-left text-[14px] leading-relaxed text-muted-foreground lg:mx-0">
    <li className="flex gap-2.5">
      <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>Tocca <strong className="font-semibold text-foreground">Condividi</strong> nella barra in basso di Safari.</span>
    </li>
    <li className="flex gap-2.5">
      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>Scorri e scegli <strong className="font-semibold text-foreground">Aggiungi alla schermata Home</strong>.</span>
    </li>
    <li className="flex gap-2.5">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>Conferma con <strong className="font-semibold text-foreground">Aggiungi</strong>: l'icona compare fra le altre app.</span>
    </li>
  </ol>
);

const IstruzioniGeneriche = () => (
  <ol className="mx-auto mt-5 max-w-md space-y-2.5 text-left text-[14px] leading-relaxed text-muted-foreground lg:mx-0">
    <li className="flex gap-2.5">
      <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>Apri il menu del browser, quello con i tre puntini.</span>
    </li>
    <li className="flex gap-2.5">
      <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>Scegli <strong className="font-semibold text-foreground">Installa app</strong> oppure <strong className="font-semibold text-foreground">Aggiungi alla schermata Home</strong>.</span>
    </li>
    <li className="flex gap-2.5">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>Se la voce non c'è, il browser non supporta l'installazione: Cibarius funziona lo stesso da qui.</span>
    </li>
  </ol>
);

const InstallApp = () => {
  const { canInstall, isInstalled, isIos, install } = usePwaInstall();
  const [mostraIstruzioni, setMostraIstruzioni] = useState(false);
  const [rifiutata, setRifiutata] = useState(false);

  const handleInstall = async () => {
    const accettata = await install();
    // Chiusa la finestra senza installare, l'evento non torna: da qui in poi
    // resta solo la strada manuale, quindi si scoprono le istruzioni.
    if (!accettata) {
      setRifiutata(true);
      setMostraIstruzioni(true);
    }
  };

  return (
    <Section>
      <div className="overflow-hidden rounded-[24px] bg-card shadow-card">
        <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[auto_1fr]">
          <div className="mx-auto lg:mx-0">
            <img
              src="/icons/icon-512.png"
              alt="L'icona di Cibarius come appare sulla schermata principale"
              width={112}
              height={112}
              loading="lazy"
              className="h-28 w-28 rounded-[26px] shadow-card"
            />
          </div>

          <div className="text-center lg:text-left">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-primary">
              Sul telefono
            </p>
            <h2 className="text-[26px] font-bold leading-tight text-foreground sm:text-[32px]">
              {isInstalled ? "Cibarius è già installata" : "Installa Cibarius sul telefono"}
            </h2>

            {isInstalled ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
                  La trovi fra le tue app, sulla schermata principale. Da qui puoi entrare subito.
                </p>
                <div className="mt-7 flex justify-center lg:justify-start">
                  <Link
                    to={USER_HOME}
                    className="flex h-12 items-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
                  >
                    <Check className="h-4 w-4" /> Apri l'app
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
                  Non passa dagli store e non occupa spazio: è la stessa applicazione web, aggiunta
                  alla schermata principale in pochi secondi.
                </p>

                {/* L'elenco resta allineato a sinistra anche dove il resto e'
                    centrato: righe di lunghezza diversa centrate sotto il
                    segno di spunta si leggono a fatica. */}
                <ul className="mx-auto mt-5 max-w-md space-y-2 text-left lg:mx-0">
                  {VANTAGGI.map((v) => (
                    <li key={v} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  {canInstall ? (
                    <button
                      type="button"
                      onClick={handleInstall}
                      className="flex h-12 items-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
                    >
                      <Download className="h-4 w-4" /> Installa l'app
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMostraIstruzioni((v) => !v)}
                      aria-expanded={mostraIstruzioni}
                      className="flex h-12 items-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
                    >
                      <Download className="h-4 w-4" />
                      {mostraIstruzioni ? "Nascondi le istruzioni" : "Come si installa"}
                    </button>
                  )}
                </div>

                {rifiutata && (
                  <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                    Hai chiuso la finestra senza installare. Se cambi idea puoi farlo a mano:
                  </p>
                )}

                {mostraIstruzioni && (isIos ? <IstruzioniIos /> : <IstruzioniGeneriche />)}
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
};

export default InstallApp;
