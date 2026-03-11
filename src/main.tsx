import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-sync";

initOfflineSync();

createRoot(document.getElementById("root")!).render(<App />);
