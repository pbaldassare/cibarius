import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-sync";
import { isNativeApp } from "./lib/native";
import { installaStampaNativa } from "./lib/native-print";
import { installaDownloadNativi } from "./lib/native-download";
import { installaTastoIndietro } from "./lib/native-back";

initOfflineSync();
if (isNativeApp()) {
  installaStampaNativa();
  installaDownloadNativi();
  installaTastoIndietro();
}

createRoot(document.getElementById("root")!).render(<App />);
