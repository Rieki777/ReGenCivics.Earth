#!/usr/bin/env node
// Mobile emulation audit. Emulates iPhone 13 (390x844, touch, iOS UA), visits
// routes, screenshots full-page to disk, and detects mobile-specific issues:
// horizontal overflow, small tap targets, tiny text, inputs that trigger iOS
// zoom, and fixed/sticky elements. Logged-out context (fresh).
// Usage: LD_LIBRARY_PATH=/tmp/chromelibs CHROME=<path> node mobile-audit.mjs --routes /,/fund --out ./runs/x
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1]]); return a; }, []));
const base = "https://regencivics.earth";
const routes = (args.routes || "/").split(",");
const outDir = args.out || "./runs/mobile";
mkdirSync(join(outDir, "shots"), { recursive: true });

const detect = () => {
  const vw = window.innerWidth;
  const docW = document.documentElement.scrollWidth;
  const els = [...document.querySelectorAll("*")];
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const overflowing = els.filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 2 && r.width <= docW && visible(el) && getComputedStyle(el).position !== "fixed"; })
    .map((el) => ({ tag: el.tagName, cls: (typeof el.className === "string" ? el.className.slice(0, 50) : ""), right: Math.round(el.getBoundingClientRect().right), w: Math.round(el.getBoundingClientRect().width) }))
    .filter((x, i, arr) => arr.findIndex((y) => y.cls === x.cls && y.tag === x.tag) === i).slice(0, 8);
  const interactive = els.filter((el) => ["A", "BUTTON"].includes(el.tagName) || el.getAttribute("role") === "button" || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName));
  const smallTargets = interactive.filter((el) => { if (!visible(el)) return false; const r = el.getBoundingClientRect(); return (r.width < 40 || r.height < 40); })
    .map((el) => ({ tag: el.tagName, label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) })).slice(0, 12);
  const tinyText = els.filter((el) => { if (!visible(el)) return false; const fs = parseFloat(getComputedStyle(el).fontSize); const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); return hasText && fs < 11; }).length;
  const zoomInputs = [...document.querySelectorAll("input,select,textarea")].filter((el) => visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16)
    .map((el) => ({ type: el.type || el.tagName, fs: getComputedStyle(el).fontSize, ph: (el.placeholder || "").slice(0, 24) })).slice(0, 8);
  const fixed = els.filter((el) => { const s = getComputedStyle(el); return (s.position === "fixed" || s.position === "sticky") && visible(el); })
    .map((el) => ({ tag: el.tagName, cls: (typeof el.className === "string" ? el.className.slice(0, 40) : ""), pos: getComputedStyle(el).position, bottom: getComputedStyle(el).bottom })).filter((x, i, arr) => arr.findIndex((y) => y.cls === x.cls) === i).slice(0, 8);
  const vpMeta = document.querySelector('meta[name=viewport]')?.getAttribute("content") || null;
  return { vw, docW, horizontalOverflow: docW > vw + 1, overflowPx: docW - vw, overflowing, smallTargetCount: smallTargets.length, smallTargets, tinyTextCount: tinyText, zoomInputs, fixed, viewportMeta: vpMeta };
};

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" });
const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_").replace(/[?#].*/, ""));

for (const route of routes) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 160)));
  let rec = { route, status: "ok" };
  try {
    await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2800);
    const data = await page.evaluate(detect);
    await page.screenshot({ path: join(outDir, "shots", slug(route) + ".jpg"), type: "jpeg", quality: 55, fullPage: true });
    rec = { route, finalUrl: page.url(), ...data, consoleErrors: consoleErrors.slice(0, 4) };
    process.stdout.write(`[ok] ${route}  overflow=${data.horizontalOverflow}(${data.overflowPx}px) smallTaps=${data.smallTargetCount} tinyText=${data.tinyTextCount} zoomInputs=${data.zoomInputs.length}\n`);
  } catch (e) {
    rec = { route, status: "FAIL", error: String(e).slice(0, 160) };
    process.stdout.write(`[FAIL] ${route} ${String(e).slice(0, 100)}\n`);
  }
  appendFileSync(join(outDir, "mobile-findings.jsonl"), JSON.stringify(rec) + "\n");
  await page.close();
}
await browser.close();
process.stdout.write("done\n");
