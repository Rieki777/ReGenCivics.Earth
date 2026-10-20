/**
 * `pnpm perf:typing`: how long each keystroke takes to reach the screen.
 *
 *   node harness/typing-bench.mjs --base http://localhost:3202
 *   TYPING_SESSION=<session cookie> node harness/typing-bench.mjs --base ... --signed-in \
 *     --extra /community/post/12,/messages?userId=4
 *   node harness/typing-bench.mjs --base ... --only /glossary --cpu 6 --mobile
 *
 * Opens each page in Chromium with the CPU slowed (4x by default, about a
 * mid-range phone), waits for the page to settle, measures how busy the main
 * thread is while nobody touches it, then types a sentence into the page's
 * first field at a person's pace. Every keystroke's delay comes from the
 * browser's Event Timing API: from the key press to the next frame on screen.
 * Exits non-zero when any page's 95th-percentile keystroke is over --bar ms.
 *
 * Built on 2026-10-14 when typing lagged site-wide (STEERING.md section 13).
 * Run it against a local server on the scratch database (CLAUDE.md, UI
 * readability gate) for signed-in pages; it types but never submits.
 */
import { chromium } from "playwright";
import fs from "fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]] : acc), []),
);
const BASE = (args.base || "http://localhost:3202").replace(/\/$/, "");
const CPU = Number(args.cpu || 4);
const BAR = Number(args.bar || 100);
const MOBILE = args.mobile === "true";
const SESSION = process.env.TYPING_SESSION || "";
const DELAY = Number(args.delay || 90); // ms between keys, about 130 words a minute

// Each page's first visible field of these kinds gets typed into.
const FIELDS = [
  "main [contenteditable=true]",
  "main textarea",
  "main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=number]):not([type=date])",
  "footer input[type=email]",
];
const PUBLIC = ["/", "/glossary", "/community", "/map", "/custom-games/apply"];
const SIGNED_IN = ["/community/new", "/community/members", "/apply", "/crowd-pooling"];
let paths = args["signed-in"] === "true" ? [...PUBLIC, ...SIGNED_IN] : PUBLIC;
if (args.extra) paths = [...paths, ...args.extra.split(",")];
if (args.only) paths = args.only.split(",");

const TEXT = "Our land project restores a creek and grows food for forty families nearby.";
const pct = (arr, p) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);
const busy = async (cdp) => {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "TaskDuration").value * 1000;
};

let browser;
try {
  // The full Chromium build composites on the real GPU; the headless shell
  // draws in software and overstates every frame's cost.
  browser = await chromium.launch({ headless: true, channel: "chromium" });
} catch {
  browser = await chromium.launch({ headless: true });
}

const rows = [];
for (const path of paths) {
  const context = await browser.newContext(
    MOBILE
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: "block" }
      : { viewport: { width: 1280, height: 800 }, serviceWorkers: "block" },
  );
  if (SESSION) await context.addCookies([{ name: "app_session_id", value: SESSION, domain: new URL(BASE).hostname, path: "/", httpOnly: true }]);
  await context.addInitScript(() => {
    try {
      localStorage.setItem("onboarding_complete", "true");
      localStorage.setItem("regen-intro-seen", "true");
      localStorage.setItem("rc_cookie_consent", `${Date.now()}:declined`);
      sessionStorage.setItem("exitIntentDismissed", "true");
    } catch {}
    window.__keys = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (e.interactionId) window.__keys.push({ id: e.interactionId, dur: e.duration });
      }).observe({ type: "event", durationThreshold: 16, buffered: true });
    } catch {}
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
  } catch (e) {
    rows.push({ path, error: `did not load: ${e.message.split("\n")[0]}` });
    await context.close();
    continue;
  }
  await page.waitForTimeout(5000); // lazy shell layers, fonts, queries
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });

  const idle0 = await busy(cdp);
  await page.waitForTimeout(3000);
  const idleBusy = Math.round(((await busy(cdp)) - idle0) / 30); // percent of 3s

  let field = null;
  for (const sel of FIELDS) {
    const f = page.locator(sel).filter({ visible: true }).first();
    if (await f.count()) { field = f; break; }
  }
  if (!field) {
    rows.push({ path, error: "no visible field" });
    await context.close();
    continue;
  }
  await field.scrollIntoViewIfNeeded();
  await field.click();
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__keys = []; });
  await page.keyboard.type(TEXT, { delay: DELAY });
  await page.waitForTimeout(1000);
  const keys = await page.evaluate(() => window.__keys);
  // One keystroke is one interaction (keydown to keyup); keep its slowest event.
  const byId = new Map();
  for (const k of keys) byId.set(k.id, Math.max(byId.get(k.id) || 0, k.dur));
  // Keys under 16ms never reach the observer; count them as 16.
  const durs = [...byId.values()];
  while (durs.length < TEXT.length) durs.push(16);
  rows.push({ path, p50: pct(durs, 50), p95: pct(durs, 95), max: Math.max(...durs), idleBusy, errors: errors.length });
  await context.close();
}
await browser.close();

if (args.json) fs.writeFileSync(args.json, JSON.stringify(rows, null, 1));
console.log(`\nKeystroke to screen, ms (CPU ${CPU}x slower, ${MOBILE ? "phone" : "desktop"}; bar: 95th percentile under ${BAR}ms)\n`);
console.log("page".padEnd(28) + "p50".padStart(6) + "p95".padStart(6) + "max".padStart(6) + "   idle main thread");
let failed = 0;
for (const r of rows) {
  if (r.error) { failed++; console.log(`${r.path.padEnd(28)}  ${r.error}`); continue; }
  const over = r.p95 > BAR;
  if (over) failed++;
  console.log(`${(over ? "✗ " : "✓ ") + r.path}`.padEnd(28) + String(r.p50).padStart(6) + String(r.p95).padStart(6) + String(r.max).padStart(6) + `   ${r.idleBusy}% busy` + (r.errors ? `, ${r.errors} page error(s)` : ""));
}
process.exit(failed ? 1 : 0);
