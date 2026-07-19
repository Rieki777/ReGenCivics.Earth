import { useEffect } from "react";

/**
 * Gentle scroll-reveal + hero ambient for CORE sections.
 *
 * Adds `.in` to any `.reveal` element as it enters the viewport, auto-tags the
 * common content blocks so more of the page breathes, injects the living hero
 * ambient (Seed of Life, drifting motes, breathing glow), and gives the nav a
 * soft shadow on scroll.
 *
 * Respects prefers-reduced-motion: when the user asks for less motion,
 * everything is shown immediately, no observer runs, and no ambient is injected.
 * Re-runs whenever `deps` change so lazily rendered pages pick up their nodes.
 */
export function useCoreReveal(deps: unknown[] = []) {
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Auto-tag top-level content blocks so the reveal covers more than the few
    // elements hand-marked in the markup. Skips hero content (it has its own
    // entrance), descendants of blocks that reveal as a whole, and anything
    // hidden inside a collapsed <details>.
    const autoSel =
      ".core-root section .eyebrow, .core-root section h2, .core-root section .lead, " +
      ".core-root .card, .core-root .principle, .core-root .step, .core-root .verse, " +
      ".core-root .facts .row, .core-root .elder";
    document.querySelectorAll<HTMLElement>(autoSel).forEach((el) => {
      if (el.closest(".hero") || el.closest("details:not([open])")) return;
      const container = el.closest(".card, .principle, .step, .elder, .facts");
      if (container && container !== el) return;
      if (!el.classList.contains("reveal")) el.classList.add("reveal");
    });

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(".core-root .reveal"),
    );

    if (prefersReduced || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }

    // Light stagger between reveal-siblings in the same parent.
    nodes.forEach((n) => {
      const parent = n.parentElement;
      if (!parent) return;
      let order = 0;
      for (const child of Array.from(parent.children)) {
        if (child === n) break;
        if (child.classList.contains("reveal")) order++;
      }
      n.style.transitionDelay = Math.min(order, 6) * 0.06 + "s";
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    // Flash-safe: anything already on screen when JS runs is shown at once
    // (auto-tagged blocks were visible before this effect, so hiding then
    // re-revealing them would flicker). Off-screen blocks reveal on scroll.
    const vh = window.innerHeight || 800;
    nodes.forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) n.classList.add("in");
      else io.observe(n);
    });

    injectHeroAmbient();

    // Nav gains a soft shadow once the page scrolls. Guarded so repeated page
    // navigations (the nav persists across routes) don't stack listeners.
    const nav = document.querySelector<HTMLElement>(".core-root .core-nav");
    if (nav && !nav.dataset.coreScroll) {
      nav.dataset.coreScroll = "1";
      const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Inject the ambient layers into each hero once. Every hero gets a breathing
 * glow and a slowly rotating Seed of Life; CSS adapts them to the hero type:
 * parchment heroes get a faint dark seed centered behind the headline, while
 * photo heroes (.hero-image) get a luminous gold seed and a warm glow low in the
 * fade zone, so the imagery melts into the page instead of ending on a flat band.
 * All heroes also get warm drifting motes. The green-to-gold wordmark shimmer
 * stays on parchment heroes only (the photo wordmark is already light + shadowed,
 * and the shimmer's clip would fight that treatment).
 */
function injectHeroAmbient() {
  document.querySelectorAll<HTMLElement>(".core-root .hero").forEach((hero) => {
    if (hero.dataset.coreAmbient) return;
    hero.dataset.coreAmbient = "1";
    const isPhoto = hero.classList.contains("hero-image");

    const glow = document.createElement("div");
    glow.className = "hero-glow";
    glow.setAttribute("aria-hidden", "true");
    hero.appendChild(glow);

    const seed = document.createElement("div");
    seed.className = "hero-seed";
    seed.setAttribute("aria-hidden", "true");
    seed.appendChild(buildSeedOfLife());
    hero.appendChild(seed);

    if (!isPhoto) {
      const kicker = hero.querySelector(".kicker");
      if (kicker) kicker.classList.add("core-shimmer");
    }

    const motes = document.createElement("div");
    motes.className = "hero-motes";
    motes.setAttribute("aria-hidden", "true");
    const count = isPhoto ? 14 : 16;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "hero-mote";
      const z = 2 + Math.random() * 4;
      s.style.left = Math.random() * 100 + "%";
      s.style.width = z + "px";
      s.style.height = z + "px";
      s.style.animationDelay = -Math.random() * 14 + "s";
      s.style.animationDuration = 11 + Math.random() * 10 + "s";
      s.style.setProperty("--d", (Math.random() - 0.5) * 44 + "px");
      s.style.setProperty("--o", (0.2 + Math.random() * 0.4).toFixed(2));
      if (isPhoto) {
        s.style.background = "radial-gradient(circle at 35% 35%, #fff7e0, #f7d27a)";
        s.style.boxShadow = "0 0 8px rgba(247, 210, 122, .55)";
      } else {
        s.style.background = "radial-gradient(circle at 35% 35%, #eafbe6, #7dd87d)";
        s.style.boxShadow = "0 0 8px rgba(125, 216, 125, .55)";
      }
      motes.appendChild(s);
    }
    hero.appendChild(motes);
  });
}

/** Seed of Life: a central circle ringed by six, faint and slowly turning. */
function buildSeedOfLife(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "-200 -200 400 400");
  svg.setAttribute("width", "420");
  svg.setAttribute("height", "420");
  const centers: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    centers.push([Math.cos((Math.PI / 3) * i) * 90, Math.sin((Math.PI / 3) * i) * 90]);
  }
  centers.forEach(([cx, cy]) => {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", String(cx));
    c.setAttribute("cy", String(cy));
    c.setAttribute("r", "90");
    c.setAttribute("fill", "none");
    // currentColor so CSS tints the seed per hero type (dark on parchment,
    // luminous gold on photo heroes) from a single .hero-seed { color } rule.
    c.setAttribute("stroke", "currentColor");
    c.setAttribute("stroke-width", "1.1");
    svg.appendChild(c);
  });
  const big = document.createElementNS(ns, "circle");
  big.setAttribute("cx", "0");
  big.setAttribute("cy", "0");
  big.setAttribute("r", "180");
  big.setAttribute("fill", "none");
  big.setAttribute("stroke", "currentColor");
  big.setAttribute("stroke-width", "0.7");
  big.setAttribute("opacity", "0.6");
  svg.appendChild(big);
  return svg;
}
