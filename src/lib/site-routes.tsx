import HomePage from "@/pages/site/HomePage";
import RistorantiPage from "@/pages/site/RistorantiPage";
import UtentiPage from "@/pages/site/UtentiPage";
import NutrizionistiPage from "@/pages/site/NutrizionistiPage";
import ComeFunzionaPage from "@/pages/site/ComeFunzionaPage";
import PrezziPage from "@/pages/site/PrezziPage";
import FaqPage from "@/pages/site/FaqPage";
import ContattiPage from "@/pages/site/ContattiPage";

/**
 * Rotte del sito pubblico, in un solo elenco.
 *
 * Lo usano sia `App.tsx` nel browser sia la generazione dell'HTML statico in
 * fase di build: due elenchi separati vorrebbero dire una pagina raggiungibile
 * nell'app ma assente dai file generati, o viceversa.
 *
 * Le pagine si importano subito e non con `lazy`: il render lato server non
 * sa attendere un componente differito, e sono comunque le prime schermate
 * che un visitatore vede.
 */
export const SITE_ROUTES: { path: string; element: React.ReactElement }[] = [
  { path: "/", element: <HomePage /> },
  { path: "/ristoranti", element: <RistorantiPage /> },
  { path: "/utenti", element: <UtentiPage /> },
  { path: "/nutrizionisti", element: <NutrizionistiPage /> },
  { path: "/come-funziona", element: <ComeFunzionaPage /> },
  { path: "/prezzi", element: <PrezziPage /> },
  { path: "/faq", element: <FaqPage /> },
  { path: "/contatti", element: <ContattiPage /> },
];
