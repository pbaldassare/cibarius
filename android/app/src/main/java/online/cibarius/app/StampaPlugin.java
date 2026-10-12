package online.cibarius.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Stampa dalla WebView, che da sola non sa farlo: window.print() li' non fa
 * niente. Apre il dialogo di stampa di Android, da cui si sceglie la
 * stampante (anche di etichette, se ha il suo servizio di stampa) o il PDF.
 *
 * Con `html` stampa quel documento, come le finestre che le pagine aprono per
 * etichette e registri HACCP; senza, stampa la pagina corrente con i suoi
 * stili @media print. Il lato JavaScript sta in src/lib/native-print.ts.
 */
@CapacitorPlugin(name = "Stampa")
public class StampaPlugin extends Plugin {

    /** La WebView fuori schermo deve vivere finche' il job di stampa la legge. */
    private WebView documento;

    @PluginMethod
    public void stampa(PluginCall call) {
        String html = call.getString("html");
        String titolo = call.getString("titolo", "Cibarius");

        getActivity().runOnUiThread(() -> {
            if (html == null) {
                avvia(bridge.getWebView(), titolo);
                call.resolve();
                return;
            }

            documento = new WebView(getContext());
            documento.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    avvia(view, titolo);
                }
            });
            // Stessa origine dell'app, cosi' eventuali percorsi relativi si risolvono.
            documento.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            call.resolve();
        });
    }

    private void avvia(WebView webView, String titolo) {
        PrintManager stampa = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
        stampa.print(titolo, webView.createPrintDocumentAdapter(titolo), new PrintAttributes.Builder().build());
    }
}
