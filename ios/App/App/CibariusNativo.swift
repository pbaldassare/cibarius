import UIKit
import WebKit
import Capacitor

/// Il view controller dell'app (Main.storyboard punta qui): registra i plugin
/// locali, gli stessi dell'app Android. Il lato JavaScript sta in
/// src/lib/native-print.ts, native-download.ts e native-share.ts.
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StampaPlugin())
        bridge?.registerPluginInstance(SalvaPlugin())
        bridge?.registerPluginInstance(CondividiPlugin())
    }
}

/// Stampa dalla WebView, che da sola non sa farlo: window.print() li' non fa
/// niente. Apre il dialogo di stampa di iOS (AirPrint o PDF).
///
/// Con `html` stampa quel documento, come le finestre che le pagine aprono per
/// etichette e registri HACCP; senza, stampa la pagina corrente.
@objc(StampaPlugin)
public class StampaPlugin: CAPPlugin, CAPBridgedPlugin, WKNavigationDelegate {
    public let identifier = "StampaPlugin"
    public let jsName = "Stampa"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "stampa", returnType: CAPPluginReturnPromise)
    ]

    /// La WebView del documento deve restare viva finche' la stampa la legge.
    private var documento: WKWebView?
    private var titolo = "Cibarius"

    @objc func stampa(_ call: CAPPluginCall) {
        let html = call.getString("html")
        titolo = call.getString("titolo") ?? "Cibarius"
        DispatchQueue.main.async {
            if let html = html {
                // Fuori dallo schermo ma nella gerarchia: una WebView staccata
                // a volte stampa pagine bianche.
                let web = WKWebView(frame: CGRect(x: -10000, y: 0, width: 800, height: 1100))
                web.navigationDelegate = self
                self.bridge?.viewController?.view.addSubview(web)
                self.documento = web
                web.loadHTMLString(html, baseURL: nil)
            } else if let web = self.bridge?.webView {
                self.avvia(web.viewPrintFormatter())
            }
            call.resolve()
        }
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        avvia(webView.viewPrintFormatter())
    }

    private func avvia(_ formatter: UIPrintFormatter) {
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = titolo
        info.outputType = .general
        let stampa = UIPrintInteractionController.shared
        stampa.printInfo = info
        stampa.printFormatter = formatter
        stampa.present(animated: true) { _, _, _ in
            self.documento?.removeFromSuperview()
            self.documento = nil
        }
    }
}

/// Salva un file, come il download del browser. La WebView ignora i link con
/// `download`, quindi gli export CSV e i PDF non partirebbero: qui si apre
/// "Salva in File" e l'utente sceglie la cartella.
@objc(SalvaPlugin)
public class SalvaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SalvaPlugin"
    public let jsName = "Salva"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "salva", returnType: CAPPluginReturnPromise)
    ]

    @objc func salva(_ call: CAPPluginCall) {
        guard let dati = Data(base64Encoded: call.getString("dati") ?? "") else {
            return call.reject("Dati non validi")
        }
        // Il nome arriva dalla pagina: niente percorsi, solo il nome del file.
        let nome = (call.getString("nome") ?? "file").replacingOccurrences(of: "/", with: "-")
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(nome)
        do {
            try dati.write(to: file, options: .atomic)
        } catch {
            return call.reject("Salvataggio non riuscito", nil, error)
        }
        DispatchQueue.main.async {
            let scelta = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
            self.bridge?.viewController?.present(scelta, animated: true)
            call.resolve()
        }
    }
}

/// Pannello di condivisione di iOS, al posto del copia-link (vedi
/// src/lib/native-share.ts). Solo testo e link.
@objc(CondividiPlugin)
public class CondividiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CondividiPlugin"
    public let jsName = "Condividi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "condividi", returnType: CAPPluginReturnPromise)
    ]

    @objc func condividi(_ call: CAPPluginCall) {
        let testo = call.getString("testo") ?? ""
        DispatchQueue.main.async {
            let pannello = UIActivityViewController(activityItems: [testo], applicationActivities: nil)
            if let vista = self.bridge?.viewController?.view {
                pannello.popoverPresentationController?.sourceView = vista
                pannello.popoverPresentationController?.sourceRect = CGRect(x: vista.bounds.midX, y: vista.bounds.maxY, width: 0, height: 0)
            }
            self.bridge?.viewController?.present(pannello, animated: true)
            call.resolve()
        }
    }
}
