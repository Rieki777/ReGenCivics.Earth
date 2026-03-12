/**
 * lighthouse-check.ts — Lighthouse performance audit runner.
 * Audits key pages against 90+ threshold on all four Lighthouse categories.
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

const THRESHOLDS = {
  performance: 90,
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
      const perf = Math.round(cats.performance.score * 100);
      const a11y = Math.round(cats.accessibility.score * 100);
      const bp = Math.round(cats["best-practices"].score * 100);
      const seo = Math.round(cats.seo.score * 100);

      const passed = perf >= 90 && a11y >= 90 && bp >= 90 && seo >= 90;
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
    console.error("These pages are below 90. Do NOT ship until fixed:\n");
    failures.forEach((f) => console.error("  " + f));
    console.error(`\nHTML reports saved to: ${REPORTS_DIR}/`);
    process.exit(1);
  } else {
    console.log("\n── ALL PASSED ──────────────────────────────────────────");
    console.log("All pages scored 90+. Site is ready to ship. 🌿");
  }
})();
