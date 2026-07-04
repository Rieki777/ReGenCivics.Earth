import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import "./core.css";
import CoreNav from "./CoreNav";
import CoreFooter from "./CoreFooter";
import CoreJsonLd, { CHURCH_ORG_JSONLD } from "./CoreJsonLd";

/**
 * CoreApp is the entire route tree for the CORE subdomain
 * (core.regencivics.earth). App.tsx renders this instead of the main site
 * chrome when the host starts with "core.". It has its own nav, footer, and
 * visual world (scoped under .core-root) and never mounts the main app's
 * navigation, background effects, or providers beyond what already wraps <App/>.
 */
const Home = lazy(() => import("./Home"));
const Faith = lazy(() => import("./Faith"));
const Programs = lazy(() => import("./Programs"));
const Elders = lazy(() => import("./Elders"));
const GetInvolved = lazy(() => import("./GetInvolved"));
const Donate = lazy(() => import("./Donate"));
const ThankYou = lazy(() => import("./ThankYou"));
const Reconciliation = lazy(() => import("./Reconciliation"));
const Transparency = lazy(() => import("./Transparency"));
const NotFound = lazy(() => import("./NotFound"));

function CoreScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);
  return null;
}

/**
 * Give the church tab its own identity: the CORE seed emblem as favicon (served
 * same-origin through /api/img) and a parchment theme-color for mobile browser
 * chrome. Runs once; the main site's icons are untouched on its own host.
 */
function useCoreIdentity() {
  useEffect(() => {
    const href = "/api/img?url=" + encodeURIComponent("https://assets.regencivics.earth/core/core-crest-128.webp") + "&w=128";
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((l) => l.remove());
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/webp";
    icon.href = href;
    document.head.appendChild(icon);

    let theme = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.name = "theme-color";
      document.head.appendChild(theme);
    }
    theme.content = "#f8f5f0";
  }, []);
}

export default function CoreApp() {
  // Only opt into hide-then-reveal when JS is running, IntersectionObserver
  // exists, and the user allows motion. Computed during the first render (before
  // paint) so there is no flash of hidden content. Otherwise content stays
  // visible by default and the reveal is a no-op.
  const [revealReady] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!("IntersectionObserver" in window)) return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  });
  useCoreIdentity();

  return (
    <div className={`core-root${revealReady ? " reveal-ready" : ""}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <CoreJsonLd id="org" data={CHURCH_ORG_JSONLD} />
      <CoreScrollToTop />
      <CoreNav />
      <main id="main-content">
        <Suspense fallback={<div style={{ minHeight: "70vh" }} aria-hidden="true" />}>
          <Switch>
            <Route path="/"><Home /></Route>
            <Route path="/faith"><Faith /></Route>
            <Route path="/programs"><Programs /></Route>
            <Route path="/elders"><Elders /></Route>
            <Route path="/get-involved"><GetInvolved /></Route>
            <Route path="/donate"><Donate /></Route>
            <Route path="/donate/thank-you"><ThankYou /></Route>
            <Route path="/donate/reconciliation"><Reconciliation /></Route>
            <Route path="/transparency"><Transparency /></Route>
            <Route><NotFound /></Route>
          </Switch>
        </Suspense>
      </main>
      <CoreFooter />
    </div>
  );
}
