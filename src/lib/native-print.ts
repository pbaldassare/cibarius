import { registerPlugin } from "@capacitor/core";

/** Plugin nativo in android/app/src/main/java/online/cibarius/app/StampaPlugin.java */
const Stampa = registerPlugin<{ stampa(opzioni: { html?: string; titolo?: string }): Promise<void> }>("Stampa");

const titoloDi = (html: string) => /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || document.title;

/**
 * Nella WebView di Android window.print() non fa niente e window.open("")
 * non apre una finestra in cui scrivere. Le pagine stampano etichette e
 * registri proprio cosi', quindi qui le due funzioni vengono sostituite una
 * volta sola invece di toccare ogni pagina:
 *
 * - window.print() stampa la pagina corrente;
 * - window.open() senza indirizzo restituisce una finestra finta che raccoglie
 *   l'HTML scritto con document.write e lo stampa alla chiamata di print().
 *
 * window.open con un indirizzo resta quello di sempre.
 */
export function installaStampaNativa() {
  window.print = () => {
    void Stampa.stampa({ titolo: document.title });
  };

  const apri = window.open.bind(window);
  window.open = (url?: string | URL, ...resto: [string?, string?]) => {
    if (url) return apri(url, ...resto);

    let html = "";
    const finestra = {
      document: {
        write: (pezzo: string) => {
          html += pezzo;
        },
        close: () => {},
      },
      print: () => {
        void Stampa.stampa({ html, titolo: titoloDi(html) });
      },
      close: () => {},
      focus: () => {},
    };
    return finestra as unknown as Window;
  };
}
