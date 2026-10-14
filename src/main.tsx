import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-sync";
import { bloccaZoomIos, isNativeApp } from "./lib/native";
import { installaStampaNativa } from "./lib/native-print";
import { installaDownloadNativi } from "./lib/native-download";
import { installaTastoIndietro } from "./lib/native-back";
import { installaCondivisioneNativa } from "./lib/native-share";

initOfflineSync();
if (isNativeApp()) {
  bloccaZoomIos();
  installaStampaNativa();
  installaDownloadNativi();
  installaTastoIndietro();
  installaCondivisioneNativa();
}

createRoot(document.getElementById("root")!).render(<App />);
