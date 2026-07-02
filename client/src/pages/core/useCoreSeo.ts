import { useEffect } from "react";

const SITE = "https://core.regencivics.earth";

type SeoOptions = {
  title: string;
  description: string;
  /** Path without host, e.g. "/faith". Defaults to current path. */
  path?: string;
  /** OG image URL. Defaults to the site OG card served by the og router. */
  image?: string;
};

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Minimal per-page head management for the CORE subdomain. Sets title, meta
 * description, canonical, and Open Graph / Twitter tags. Phase 5 points the OG
 * image at the /api/og card for each page; until then it falls back to the
 * home hero share card.
 */
export function useCoreSeo({ title, description, path, image }: SeoOptions) {
  useEffect(() => {
    const fullPath = path ?? window.location.pathname;
    const url = SITE + (fullPath === "/" ? "" : fullPath);
    const ogId = fullPath === "/" ? "home" : fullPath.replace(/^\//, "").split("/")[0];
    const ogImage = image ?? `${SITE}/api/og?type=core&id=${encodeURIComponent(ogId)}`;

    document.title = title;
    setMeta("name", "description", description);
    setLink("canonical", url);

    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "Church of the Regenerative Earth");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", ogImage);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
  }, [title, description, path, image]);
}
