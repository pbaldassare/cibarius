import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-sync";
import { isNativeApp } from "./lib/native";
import { installaStampaNativa } from "./lib/native-print";

initOfflineSync();
if (isNativeApp()) installaStampaNativa();

createRoot(document.getElementById("root")!).render(<App />);
