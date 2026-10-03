import { useEffect } from "react";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * Metadati della pagina, scritti direttamente nel `<head>`.
 *
 * Il progetto non usa una libreria tipo react-helmet: qui basta un effetto che
 * aggiorna i tag esistenti. Serve comunque, anche con il pre-rendering: il
 * browser headless che genera l'HTML statico esegue questo codice, quindi i
 * metadati finiscono nel file salvato e i crawler che non eseguono
 * JavaScript li leggono lo stesso.
 */

const setMeta = (attr: "name" | "property", key: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
};

const setLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

interface SeoProps {
  title: string;
  description: string;
  path: string;
  /** Dati strutturati aggiuntivi, oltre a quelli comuni a tutto il sito. */
  jsonLd?: Record<string, unknown>;
  /** Titoli della briciola di pane, dalla radice alla pagina corrente. */
  breadcrumb?: { label: string; path: string }[];
}

const Seo = ({ title, description, path, jsonLd, breadcrumb }: SeoProps) => {
  useEffect(() => {
    const url = absoluteUrl(path);
    document.title = title;

    setMeta("name", "description", description);
    setLink("canonical", url);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    // I motori generativi leggono la lingua per decidere se citare la fonte.
    document.documentElement.lang = "it";
  }, [title, description, path]);

  /*
   * I dati strutturati sono resi come elementi, non iniettati da un effetto.
   *
   * In fase di build le pagine vengono disegnate da React su Node, dove gli
   * effetti non vengono eseguiti: iniettandoli da `useEffect` sparirebbero
   * proprio dai file che i crawler leggono. Un blocco JSON-LD e' valido
   * ovunque nel documento, quindi puo' stare qui.
   */
  const blocchi: { id: string; dati: unknown }[] = [];

  if (breadcrumb?.length) {
    blocchi.push({
      id: "breadcrumb",
      dati: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.label,
          item: absoluteUrl(b.path),
        })),
      },
    });
  }

  if (jsonLd) blocchi.push({ id: "page", dati: jsonLd });

  return (
    <>
      {blocchi.map(({ id, dati }) => (
        <script
          key={id}
          type="application/ld+json"
          data-seo={id}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dati) }}
        />
      ))}
    </>
  );
};

export default Seo;
