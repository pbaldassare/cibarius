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

/** Inserisce o aggiorna un blocco di dati strutturati identificato da `id`. */
const setJsonLd = (id: string, data: unknown) => {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
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

    if (breadcrumb?.length) {
      setJsonLd("breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.label,
          item: absoluteUrl(b.path),
        })),
      });
    }

    if (jsonLd) setJsonLd("page", jsonLd);

    return () => {
      // I dati della pagina non devono sopravvivere al cambio di rotta.
      document.head.querySelector('script[data-seo="page"]')?.remove();
      document.head.querySelector('script[data-seo="breadcrumb"]')?.remove();
    };
  }, [title, description, path, jsonLd, breadcrumb]);

  return null;
};

export default Seo;
