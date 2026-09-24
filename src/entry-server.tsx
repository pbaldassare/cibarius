import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Routes, Route } from "react-router-dom";
import SiteLayout from "@/components/site/SiteLayout";
import { SITE_ROUTES } from "@/lib/site-routes";

/**
 * Disegna una pagina del sito pubblico fuori dal browser.
 *
 * Serve alla generazione dell'HTML statico in fase di build: `scripts/ssg.mjs`
 * importa questo modulo e chiama `render` per ogni indirizzo.
 *
 * Qui si monta soltanto il sito, non l'applicazione: niente providers di
 * autenticazione, di query o del cliente Supabase. Non servono per una pagina
 * di presentazione, e tenerli fuori evita che il render su Node tocchi cose
 * che esistono solo nel browser.
 */
export const render = (path: string): string =>
  renderToString(
    <StaticRouter location={path}>
      <Routes>
        <Route element={<SiteLayout />}>
          {SITE_ROUTES.map(({ path: p, element }) => (
            <Route key={p} path={p} element={element} />
          ))}
        </Route>
      </Routes>
    </StaticRouter>,
  );

/** Indirizzi da generare, letti dallo stesso elenco usato dall'app. */
export const paths = (): string[] => SITE_ROUTES.map((r) => r.path);
