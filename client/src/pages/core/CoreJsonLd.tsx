import { useEffect } from "react";

/**
 * Injects a JSON-LD <script> into <head> for the CORE subdomain and removes it
 * on unmount, keyed by id so pages can add their own (Organization site-wide,
 * FAQPage on Faith). Structured data helps search + social understand the church.
 */
export default function CoreJsonLd({ id, data }: { id: string; data: Record<string, unknown> }) {
  useEffect(() => {
    const elId = `core-jsonld-${id}`;
    let el = document.getElementById(elId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = elId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      document.getElementById(elId)?.remove();
    };
  }, [id, data]);
  return null;
}

export const CHURCH_ORG_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Church of the Regenerative Earth",
  alternateName: "CORE",
  url: "https://core.regencivics.earth",
  description:
    "A 508(c)(1)(a) faith ministry of land-based regeneration, community, and service to all life. The spiritual heart of ReGen Civics.",
  foundingDate: "2026",
  taxID: "42-3198293",
  sameAs: ["https://regencivics.earth"],
};
