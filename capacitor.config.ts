import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Guscio nativo di Cibarius. Il sito compilato viaggia dentro il pacchetto:
 * l'app si apre senza scaricare la pagina e parte dall'accesso, non dal sito
 * pubblico (vedi `isNativeApp` in src/lib/native.ts).
 *
 * `appId` e' l'identificativo su Play Store e App Store: una volta pubblicata
 * l'app non si cambia piu'.
 */
const config: CapacitorConfig = {
  appId: "online.cibarius.app",
  appName: "Cibarius",
  webDir: "dist",
  // Colore di fondo della WebView mentre la pagina si carica: lo stesso di
  // --background in src/index.css, cosi' non lampeggia il bianco.
  backgroundColor: "#F3F5F8",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // Quasi tutte le schermate aprono con l'intestazione blu del marchio:
      // icone e orologio della barra di stato vanno chiari.
      style: "DARK",
      // Inietta --safe-area-inset-* che src/index.css usa per --sat e --sab.
      insetsHandling: "css",
    },
  },
};

export default config;
