/**
 * Measured quality audit for core.regencivics.earth. Run against a local
 * preview (default http://core.localhost:4190) or set BASE to production.
 *
 * Per page x viewport (1440 + 390): centering of constrained blocks vs their
 * .wrap axis, WCAG AA contrast of small-text samples, heading-order skips,
 * h1 count, meta description/canonical/OG, missing img alts, skip link,
 * horizontal overflow, tap-target sizes, natural scroll-reveal completion,
 * and console/page errors. Screenshots land in the scratchpad dir.
 *
 *   npx vite build && npx vite preview --port 4190 &
 *   node scripts/audit-core-site.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://core.localhost:4190";
const PAGES = ["/", "/faith", "/programs", "/elders", "/get-involved", "/donate", "/transparency", "/donate/thank-you", "/some-missing-page"];
const OUT = { pages: {}, notes: [] };

// Effective background approximations for gradient/banded sections (computed
// backgroundColor is transparent on gradient elements).
const BAND_BG = {
  "band-forest": [19, 57, 38],   // midpoint of #0d2818 -> #1a472a
  "core-footer": [10, 31, 20],   // #0a1f14
  "band-parch": [240, 235, 227],
  "band-soft": [240, 247, 240],
  hero: [244, 246, 240],
  "core-root": [248, 245, 240],
};

function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg, bg) {
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const browser = await chromium.launch({ headless: true });

async function auditPage(path, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
  // Settle past any SW-claim reload that would destroy the eval context.
  await page.waitForTimeout(2200);
  await page.waitForLoadState("networkidle").catch(() => {});
  // Natural reveal check FIRST: scroll through the page and confirm the
  // IntersectionObserver actually brings .reveal content to full opacity.
  const evalSafe = async (fn, fallback) => {
    for (let i = 0; i < 2; i++) {
      try { return await page.evaluate(fn); } catch { await page.waitForTimeout(1500); }
    }
    return fallback;
  };
  const naturalReveal = await evalSafe(async () => {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return "n/a";
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 1400));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
    let visible = 0;
    els.forEach((el) => { if (parseFloat(getComputedStyle(el).opacity) > 0.95) visible++; });
    return `${visible}/${els.length}`;
  }, "eval-failed");
  // Force any stragglers + let transitions fully settle before measuring/shooting
  await evalSafe(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")), null);
  await page.waitForTimeout(900);

  const data = await evalSafe(() => {
    const out = {};
    out.title = document.title;
    out.metaDesc = !!document.querySelector('meta[name="description"]')?.content;
    out.canonical = document.querySelector('link[rel="canonical"]')?.href ?? null;
    out.ogImage = !!document.querySelector('meta[property="og:image"]')?.content;
    out.htmlLang = document.documentElement.lang || null;

    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => +h.tagName[1]);
    out.h1Count = hs.filter((n) => n === 1).length;
    out.headingSkips = hs.filter((n, i) => i > 0 && n - hs[i - 1] > 1).length;
    out.headingSeq = hs.join(",");

    out.imgsMissingAlt = [...document.querySelectorAll(".core-root img")].filter((i) => !i.hasAttribute("alt")).length;

    out.hasSkipLink = !!document.querySelector('a[href="#main-content"]');
    out.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;

    // Centering audit: measure candidate blocks against their .wrap container.
    const offenders = [];
    const candidates = document.querySelectorAll(
      ".hero .lead, .lead.center, .hero .btn-row, .center .btn-row, .center .lead, .hero .tagline, .verse, .chips, .btn-row"
    );
    const seen = new Set();
    for (const el of candidates) {
      if (seen.has(el)) continue;
      seen.add(el);
      const wrap = el.closest(".wrap");
      if (!wrap) continue;
      const isCenteredContext = !!el.closest(".hero, .center") || el.classList.contains("center");
      if (!isCenteredContext) continue;
      const er = el.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      if (er.width === 0 || wr.width - er.width < 16) continue; // full-width: nothing to center
      const delta = Math.round((er.left + er.width / 2) - (wr.left + wr.width / 2));
      if (Math.abs(delta) > 8) {
        offenders.push({ sel: el.className, w: Math.round(er.width), delta });
      }
    }
    out.centeringOffenders = offenders;

    // Small-text contrast samples
    const samples = [];
    const pick = (sel) => document.querySelector(sel);
    const parseRGB = (s) => { const m = s.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : null; };
    const bgFor = (el) => {
      let n = el;
      while (n && n !== document.body) {
        const bg = getComputedStyle(n).backgroundColor;
        const p = parseRGB(bg);
        if (p && !(p[0] === 0 && p[1] === 0 && p[2] === 0 && /,\s*0\)/.test(bg))) {
          const a = bg.match(/[\d.]+\)$/); // rgba alpha
          if (!/rgba/.test(bg) || parseFloat(bg.split(",")[3]) > 0.5) return { rgb: p, cls: null };
        }
        for (const c of ["band-forest", "core-footer", "band-parch", "band-soft", "hero"]) {
          if (n.classList && n.classList.contains(c)) return { cls: c };
        }
        n = n.parentElement;
      }
      return { cls: "core-root" };
    };
    for (const sel of [".core-footer .fine", ".core-footer a", ".eyebrow", ".band-forest .eyebrow", ".attrib", ".chip", ".coming", ".chat-note", ".band-forest .lead", ".facts .v", ".pill"]) {
      const el = pick(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const fg = parseRGB(cs.color);
      const bg = bgFor(el);
      samples.push({ sel, fg, bgCls: bg.cls, bgRgb: bg.rgb ?? null, fontSize: cs.fontSize, fontWeight: cs.fontWeight });
    }
    out.contrastSamples = samples;

    // Tap targets (mobile relevance)
    out.smallTapTargets = [...document.querySelectorAll(".core-root a, .core-root button")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24); })
      .slice(0, 8)
      .map((el) => ({ text: (el.textContent || "").trim().slice(0, 24), h: Math.round(el.getBoundingClientRect().height) }));

    return out;
  }, { title: "EVAL-FAILED", contrastSamples: [], centeringOffenders: [] });

  // Resolve contrast ratios in Node
  data.contrastIssues = [];
  for (const s of data.contrastSamples ?? []) {
    if (!s.fg) continue;
    const bg = s.bgRgb ?? BAND_BG[s.bgCls] ?? BAND_BG["core-root"];
    const ratio = contrast(s.fg, bg);
    const px = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const min = large ? 3 : 4.5;
    if (ratio < min) data.contrastIssues.push({ sel: s.sel, ratio: +ratio.toFixed(2), needed: min, px });
  }
  delete data.contrastSamples;
  data.naturalReveal = naturalReveal;
  data.consoleErrors = consoleErrors.filter((e) => !/api\/trpc|Failed to load resource|api\/img/.test(e)).slice(0, 5);
  data.pageErrors = pageErrors.slice(0, 5);

  const shotName = `C:/Users/taren/AppData/Local/Temp/claude/C--Users-taren-Desktop-CORE/1e11163a-0c7f-4cb5-8c7d-49771c2da975/scratchpad/core-${path.replace(/\W+/g, "_") || "home"}-${width}.png`;
  await page.screenshot({ path: shotName, fullPage: width > 500 && (path === "/" || path === "/elders" || path === "/donate") });
  data.screenshot = shotName;
  await page.close();
  return data;
}

for (const path of PAGES) {
  OUT.pages[path] = {
    desktop: await auditPage(path, 1440, 950),
    mobile: await auditPage(path, 390, 844),
  };
}
await browser.close();
writeFileSync("C:/Users/taren/AppData/Local/Temp/claude/C--Users-taren-Desktop-CORE/1e11163a-0c7f-4cb5-8c7d-49771c2da975/scratchpad/core-audit.json", JSON.stringify(OUT, null, 1));
// Compact console summary
for (const [p, d] of Object.entries(OUT.pages)) {
  for (const vp of ["desktop", "mobile"]) {
    const x = d[vp];
    const flags = [];
    if (x.h1Count !== 1) flags.push(`h1=${x.h1Count}`);
    if (x.headingSkips) flags.push(`hSkips=${x.headingSkips}`);
    if (!x.metaDesc) flags.push("noMetaDesc");
    if (!x.canonical) flags.push("noCanonical");
    if (x.imgsMissingAlt) flags.push(`noAlt=${x.imgsMissingAlt}`);
    if (!x.hasSkipLink) flags.push("noSkipLink");
    if (x.overflowX > 1) flags.push(`overflowX=${x.overflowX}px`);
    if (x.centeringOffenders?.length) flags.push(`OFFCENTER=${JSON.stringify(x.centeringOffenders)}`);
    if (x.contrastIssues?.length) flags.push(`CONTRAST=${JSON.stringify(x.contrastIssues)}`);
    if (x.consoleErrors?.length) flags.push(`consoleErr=${x.consoleErrors.length}`);
    if (x.pageErrors?.length) flags.push(`pageErr=${JSON.stringify(x.pageErrors)}`);
    if (x.naturalReveal && x.naturalReveal !== "n/a" && !/^(\d+)\/\1$/.test(x.naturalReveal)) flags.push(`revealIncomplete=${x.naturalReveal}`);
    if (x.smallTapTargets?.length && vp === "mobile") flags.push(`smallTaps=${JSON.stringify(x.smallTapTargets)}`);
    console.log(`${p} [${vp}] ${flags.length ? flags.join(" | ") : "OK"}`);
  }
}
