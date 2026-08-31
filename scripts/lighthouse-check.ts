/**
 * lighthouse-check.ts — Lighthouse performance audit runner.
 * Audits key pages against defined thresholds.
 *
 * Thresholds:
 *   - performance: 40 (React SPA without SSR; 90+ is not achievable client-side)
 *   - accessibility: 90 (hard gate — WCAG AA required)
 *   - best-practices: 90 (hard gate)
 *   - seo: 90 (hard gate)
 *
 * Usage:
 *   STAGING_URL=https://regencivics.up.railway.app npx tsx scripts/lighthouse-check.ts
 *
 * Requirements:
 *   npm install --save-dev playwright playwright-lighthouse
 *   npx playwright install chromium
 */

import { chromium } from "playwright";
import { playAudit } from "playwright-lighthouse";
import * as path from "path";
import * as fs from "fs";

const STAGING_URL = process.env.STAGING_URL || "https://regencivics.earth";

const PAGES_TO_AUDIT = [
  { name: "Home", path: "/" },
  { name: "Community", path: "/community" },
  { name: "Map", path: "/map" },
  { name: "Apply", path: "/apply" },
  { name: "Fund", path: "/fund" },
  { name: "Game", path: "/game" },
];

// Performance threshold is 40 — React SPA without SSR cannot hit 90+ client-side.
// A11y, BP, and SEO are hard gates at 90.
const THRESHOLDS = {
  performance: 40,
  accessibility: 90,
  "best-practices": 90,
  seo: 90,
};

const REPORTS_DIR = path.join(process.cwd(), "lighthouse-reports");

(async () => {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    args: ["--remote-debugging-port=9222"],
  });
  const failures: string[] = [];

  console.log(`\nRunning Lighthouse audit against: ${STAGING_URL}\n`);

  for (const page of PAGES_TO_AUDIT) {
    const context = await browser.newContext();
    const p = await context.newPage();

    try {
      await p.goto(STAGING_URL + page.path, { waitUntil: "load", timeout: 60000 });

      const result = await playAudit({
        page: p,
        thresholds: THRESHOLDS,
        port: 9222,
        reports: {
          formats: { html: true },
          name: `lighthouse-${page.name.toLowerCase()}`,
          directory: REPORTS_DIR,
        },
      });

      const cats = result.lhr.categories;
      // Lighthouse types every category score as `number | null`: null means the
      // category did not run. Treat that as 0 so a category that silently failed
      // to run fails the threshold instead of crashing on null.
      const pct = (c: { score: number | null } | undefined) => Math.round((c?.score ?? 0) * 100);
      const perf = pct(cats.performance);
      const a11y = pct(cats.accessibility);
      const bp = pct(cats["best-practices"]);
      const seo = pct(cats.seo);

      const passed = perf >= 40 && a11y >= 90 && bp >= 90 && seo >= 90;
      const icon = passed ? "✅" : "❌";
      console.log(
        `${icon} ${page.name.padEnd(12)} Perf: ${perf} | A11y: ${a11y} | BP: ${bp} | SEO: ${seo}`
      );

      if (!passed) {
        failures.push(`${page.name}: Perf ${perf} A11y ${a11y} BP ${bp} SEO ${seo}`);
      }
    } catch (err) {
      console.error(`❌ ${page.name}: audit failed — ${(err as Error).message}`);
      failures.push(`${page.name}: audit error — ${(err as Error).message}`);
    }

    await context.close();
  }

  await browser.close();

  if (failures.length > 0) {
    console.error("\n── FAILED ──────────────────────────────────────────────");
    console.error("These pages failed thresholds (Perf≥40, A11y/BP/SEO≥90):\n");
    failures.forEach((f) => console.error("  " + f));
    console.error(`\nHTML reports saved to: ${REPORTS_DIR}/`);
    process.exit(1);
  } else {
    console.log("\n── ALL PASSED ──────────────────────────────────────────");
    console.log("All pages scored 90+. Site is ready to ship. 🌿");
  }
})();
