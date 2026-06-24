#!/usr/bin/env node
// Driver breadth pass. Visits every static public route, screenshots desktop +
// mobile, captures console errors, failed network requests, redirects, and page
// text. Does NOT submit forms (that stays with the interactive Driver agent so
// test data is deliberate). Requires: npm i playwright && npx playwright install chromium.
//
// Usage: node crawl.mjs --base https://regencivics.earth --out ./runs/2026-06-23
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1]]);
    return a;
  }, [])
);
const base = (args.base || "https://regencivics.earth").replace(/\/$/, "");
const outDir = resolve(args.out || "./runs/latest");
const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, "routes.json"), "utf8"));

const targets = manifest.routes.filter((r) => !r.hasParam && !r.redirectOnly && !r.needsAuth);
const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"));

mkdirSync(join(outDir, "screenshots"), { recursive: true });
mkdirSync(join(outDir, "pagetext"), { recursive: true });

const results = [];
const browser = await chromium.launch();

for (const route of targets) {
  const url = base + route.path;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const netFailures = [];
  page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text().slice(0, 300)));
  page.on("response", (res) => {
    if (res.status() >= 400) netFailures.push(`${res.status()} ${res.url().slice(0, 120)}`);
  });
  let status = "ok";
  let finalUrl = url;
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    finalUrl = page.url();
    await page.waitForTimeout(800);
    const bodyText = await page.evaluate(() => document.body.innerText || "");
    if (/something went wrong|error boundary|page not found|404/i.test(bodyText.slice(0, 600))) {
      status = "error-boundary-or-404";
    }
    if (resp && resp.status() >= 400) status = `http-${resp.status()}`;
    writeFileSync(join(outDir, "pagetext", slug(route.path) + ".txt"), bodyText);
    // counts of interactive elements for the report
    const counts = await page.evaluate(() => ({
      links: document.querySelectorAll("a[href]").length,
      buttons: document.querySelectorAll("button, [role=button]").length,
      imgsBroken: Array.from(document.querySelectorAll("img")).filter((i) => i.complete && i.naturalWidth === 0).length,
      forms: document.querySelectorAll("form").length,
    }));
    await page.screenshot({ path: join(outDir, "screenshots", slug(route.path) + "_desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(outDir, "screenshots", slug(route.path) + "_mobile.png"), fullPage: true });
    results.push({ path: route.path, finalUrl, status, ...counts, consoleErrors, netFailures });
    process.stdout.write(`[ok] ${route.path}  links=${counts.links} btns=${counts.buttons} brokenImg=${counts.imgsBroken} errs=${consoleErrors.length}\n`);
  } catch (e) {
    status = "load-failed";
    results.push({ path: route.path, finalUrl, status, error: String(e).slice(0, 200), consoleErrors, netFailures });
    process.stdout.write(`[FAIL] ${route.path}  ${String(e).slice(0, 120)}\n`);
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(outDir, "driver-raw.json"), JSON.stringify(results, null, 2));
const broken = results.filter((r) => r.status !== "ok");
process.stdout.write(`\nDone. ${results.length} routes. ${broken.length} with issues.\n`);
process.stdout.write(`Artifacts in ${outDir}\n`);
