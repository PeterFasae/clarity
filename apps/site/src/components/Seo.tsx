import { useEffect } from "react";

interface SeoProps {
  title: string;
  description: string;
  /** path only, e.g. "/accessibility" — used for canonical + og:url */
  path?: string;
}

const SITE_NAME = "Clarity";
const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://clarity.example";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-page document metadata. Runs on the client (this is an SPA), so it updates
 * title/description/OG on every route change. Documented limitation: for crawlers
 * that don't execute JS, these are the values in index.html until hydration — a
 * static-prerender step (vite SSG) would bake them per-route. Noted in the report.
 */
export function Seo({ title, description, path = "/" }: SeoProps) {
  useEffect(() => {
    const fullTitle =
      title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
    const url = `${ORIGIN}${path}`;

    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setCanonical(url);
  }, [title, description, path]);

  return null;
}
