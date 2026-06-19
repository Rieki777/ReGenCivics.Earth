#!/usr/bin/env node
/**
 * WCAG 2.x color-contrast audit. Visits each route in PUBLIC_ROUTES,
 * injects an inline checker that mirrors axe-core's color-contrast rule,
 * and reports any text element whose foreground/background ratio is below
 * 4.5:1 (normal) or 3:1 (large text: 18pt+ or 14pt+ bold).
 *
 * Designed to run in CI:
 *   1. Spin up the production preview (vite preview or `pnpm preview`).
 *   2. Run `node scripts/contrast-audit.mjs --baseUrl=http://localhost:4173`.
 *   3. The script writes a JSON report with per-route findings and exits 0
 *      with a warning footer.
 *
 * The CI workflow at .github/workflows/contrast-audit.yml posts the diff
 * against main's findings as a PR comment but does NOT block merge (per
 * 2026-05-29 audit decision: warn-only rollout).
 *
 * The checker is the same one used in the manual 2026-05-29 audit via
 * Claude in Chrome; see CONTRAST_AUDIT_2026-05-29.md for the baseline.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const BASE_URL = args.baseUrl || process.env.CONTRAST_AUDIT_BASE_URL || 'http://localhost:4173';
const OUT_FILE = args.out || 'audits/contrast-report.json';

const PUBLIC_ROUTES = [
  '/', '/quest', '/community', '/fund', '/opportunity', '/apply',
  '/play', '/game', '/governance', '/seasons', '/team', '/blog',
  '/tools', '/hymn-book', '/economy', '/local-food-economy',
  '/tokenomics', '/glossary', '/socials', '/co-creators-guide',
  '/schedule', '/loi', '/investor', '/claim-seeds', '/connect',
];

const CHECKER_SRC = `(function runContrastAudit() {
  const RESULTS = [];
  function parseColor(str) {
    if (!str) return null;
    const m = str.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts.length === 4 ? parts[3] : 1 };
  }
  function avgGradientColor(bgImage) {
    if (!bgImage || bgImage === 'none') return null;
    const rgbs = [...bgImage.matchAll(/rgba?\\(([^)]+)\\)/g)].map(m => {
      const parts = m[1].split(',').map(s => parseFloat(s.trim()));
      return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts.length === 4 ? parts[3] : 1 };
    });
    if (rgbs.length === 0) return null;
    return { r: rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length, g: rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length, b: rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length, a: 1 };
  }
  function hasImageBg(bgImage) {
    if (!bgImage || bgImage === 'none') return false;
    return /url\\(/i.test(bgImage);
  }
  function composite(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return { r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a, g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a, b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a, a };
  }
  function effectiveBg(el) {
    let cur = el; let acc = { r: 0, g: 0, b: 0, a: 0 }; let imageInPath = false;
    while (cur) {
      const cs = getComputedStyle(cur);
      if (hasImageBg(cs.backgroundImage)) imageInPath = true;
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0) { acc = composite(acc, bg); if (acc.a >= 0.999) return { bg: acc, imageInPath }; }
      const grad = avgGradientColor(cs.backgroundImage);
      if (grad) { acc = composite(acc, grad); if (acc.a >= 0.999) return { bg: acc, imageInPath }; }
      cur = cur.parentElement;
    }
    return { bg: composite(acc, { r: 255, g: 255, b: 255, a: 1 }), imageInPath };
  }
  function relLum({ r, g, b }) {
    const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function contrastRatio(c1, c2) {
    const l1 = relLum(c1), l2 = relLum(c2);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function isLargeText(cs) {
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    return px >= 24 || (px >= 18.66 && bold);
  }
  function hasVisibleText(el) {
    if (!el) return false;
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && (node.textContent || '').trim().length > 0) return true;
    }
    return false;
  }
  function isVisible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) return false;
    return true;
  }
  function isGradientText(cs) {
    return (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text');
  }
  function buildSelector(el) {
    if (!el) return '';
    if (el.id) return '#' + el.id;
    const parts = []; let cur = el; let depth = 0;
    while (cur && depth < 4) {
      let p = cur.tagName.toLowerCase();
      if (cur.className && typeof cur.className === 'string') {
        const cls = cur.className.split(/\\s+/).filter(Boolean).slice(0, 3);
        if (cls.length) p += '.' + cls.join('.');
      }
      parts.unshift(p); cur = cur.parentElement; depth++;
    }
    return parts.join(' > ');
  }
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (!hasVisibleText(el) || !isVisible(el)) continue;
    const cs = getComputedStyle(el);
    if (isGradientText(cs)) continue;
    const fg = parseColor(cs.color);
    if (!fg) continue;
    if (fg.a < 0.05) continue;
    const { bg, imageInPath } = effectiveBg(el);
    if (imageInPath) continue;
    let fgComposed = fg;
    if (fg.a < 1) { fgComposed = composite(fg, bg); }
    if (bg.a < 0.05) continue;
    const ratio = contrastRatio(fgComposed, bg);
    const large = isLargeText(cs);
    const threshold = large ? 3.0 : 4.5;
    if (ratio < threshold) {
      RESULTS.push({
        sel: buildSelector(el),
        text: (el.textContent || '').trim().slice(0, 80),
        ratio: Math.round(ratio * 100) / 100,
        threshold, large,
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        fg: \`rgba(\${Math.round(fgComposed.r)},\${Math.round(fgComposed.g)},\${Math.round(fgComposed.b)},\${fgComposed.a.toFixed(2)})\`,
        bg: \`rgba(\${Math.round(bg.r)},\${Math.round(bg.g)},\${Math.round(bg.b)},\${bg.a.toFixed(2)})\`,
      });
    }
  }
  const seen = new Set();
  const dedupe = RESULTS.filter(r => { const k = r.sel + '|' + r.ratio; if (seen.has(k)) return false; seen.add(k); return true; });
  return { url: location.pathname, failures: dedupe.length, items: dedupe.sort((a, b) => a.ratio - b.ratio) };
})()`;

async function main() {
  console.log(`Running contrast audit against ${BASE_URL}`);
  console.log(`Routes: ${PUBLIC_ROUTES.length}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const allFindings = {};
  let totalFailures = 0;

  for (const route of PUBLIC_ROUTES) {
    const url = BASE_URL.replace(/\/$/, '') + route;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
      await new Promise(r => setTimeout(r, 800));
      const result = await page.evaluate(CHECKER_SRC);
      allFindings[route] = result.items;
      totalFailures += result.failures;
      console.log(`  ${route}: ${result.failures} failures`);
    } catch (e) {
      console.error(`  ${route}: failed to load (${e.message})`);
      allFindings[route] = { error: e.message };
    }
  }

  await browser.close();

  const report = {
    auditedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    routes: PUBLIC_ROUTES,
    totalFailures,
    findings: allFindings,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${OUT_FILE}`);
  console.log(`Total failures: ${totalFailures}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
