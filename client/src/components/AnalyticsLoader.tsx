/**
 * AnalyticsLoader - Conditionally loads Umami analytics based on cookie consent.
 * Only injects the analytics script when the user has accepted cookies.
 * Removes the script if the user later declines (via Manage Cookies).
 * Also reports Core Web Vitals to Umami as custom events.
 */

import { useEffect } from "react";
import { useCookieConsent } from "./CookieConsent";
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

const ANALYTICS_SCRIPT_ID = "umami-analytics";

export default function AnalyticsLoader() {
  const { hasConsented, hasDeclined } = useCookieConsent();

  useEffect(() => {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;

    if (!endpoint || !websiteId) return;

    if (hasConsented) {
      // Only add if not already present
      if (!document.getElementById(ANALYTICS_SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = ANALYTICS_SCRIPT_ID;
        script.defer = true;
        script.src = `${endpoint}/umami`;
        script.dataset.websiteId = websiteId;
        const nonce = (window as any).__NONCE__;
        if (nonce) script.setAttribute("nonce", nonce);
        document.head.appendChild(script);
      }
    }

    if (hasDeclined) {
      // Remove analytics script if user declined
      const existing = document.getElementById(ANALYTICS_SCRIPT_ID);
      if (existing) {
        existing.remove();
      }
      // Also disable Umami tracking if it was already initialized
      if (typeof (window as any).umami !== "undefined") {
        (window as any).umami = undefined;
      }
    }
  }, [hasConsented, hasDeclined]);

  // Report Core Web Vitals to Umami (consent-gated)
  useEffect(() => {
    if (!hasConsented) return;
    const report = (name: string, value: number) => {
      if (typeof (window as any).umami?.track === 'function') {
        (window as any).umami.track('web-vital', { metric: name, value: Math.round(name === 'CLS' ? value * 1000 : value) });
      }
    };
    onCLS(m => report('CLS', m.value));
    onINP(m => report('INP', m.value));
    onLCP(m => report('LCP', m.value));
    onFCP(m => report('FCP', m.value));
    onTTFB(m => report('TTFB', m.value));
  }, [hasConsented]);

  return null; // This is a side-effect-only component
}
