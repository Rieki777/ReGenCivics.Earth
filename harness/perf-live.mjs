/**
 * `pnpm perf:live`: how fast every page answers the people using it.
 *
 *   node harness/perf-live.mjs --base http://localhost:3202                 (public pages)
 *   PERF_SESSION=<cookie> node harness/perf-live.mjs --base ... --as user   (public pages, signed in)
 *   PERF_SESSION=<cookie> node harness/perf-live.mjs --base ... --as admin  (every Admin tab and /admin page)
 *   node harness/perf-live.mjs --base ... --only /community --mobile --cpu 6
 *   node harness/perf-live.mjs --base ... --nav      (time from a link click to the next page's content)
 *
 * Each page loads in Chromium with the CPU slowed (4x by default, about a
 * mid-range phone), settles, and is then measured:
 *   idle     how busy the main thread is while nobody touches the page
 *   motion   endless animations the compositor cannot run (each one costs every frame)
 *   click    the slowest of up to five safe toggles (tabs, accordions, menus,
 *            <summary>), from the press to the next frame on screen
 *   typing   95th-percentile keystroke into the page's first text field
 *   scroll   the longest frame while scrolling three screens down
 * Nothing that sends, saves or deletes is ever clicked, so a run cannot change
 * data. Run signed-in and admin passes against a local server on the scratch
 * database (CLAUDE.md, UI readability gate), never production.
 *
 * Writes harness/shots/perf/<as>-<viewport>.json and .md, worst first, and
 * exits non-zero when any click, keystroke or navigation is over --bar ms.
 * Built 2026-10-14 (STEERING.md section 13); routes and samples follow
 * harness/audit-live.mjs.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]] : acc), []),
);
const BASE = (args.base || "http://localhost:3202").replace(/\/$/, "");
const AS = args.as || "anon";
const ONLY = args.only || null;
const CPU = Number(args.cpu || 4);
const BAR = Number(args.bar || 100);
const MOBILE = args.mobile === "true";
const NAV = args.nav === "true";
const SESSION = process.env.PERF_SESSION || "";
const OUT = path.join(here, "shots", "perf");

/** Routes with parameters, filled with values that exist on a seeded scratch database. */
const SAMPLES = {
  "/tools/:slug": "/tools/hylo",
  "/season2/week/:week": "/season2/week/2",
  "/series/:season": "/series/2",
  "/blog/:slug": "/blog/what-steers-civilization",
  "/learn/:slug": "/learn/nine-forms-of-capital",
  "/community/post/:id": "/community/post/1",
  "/community/c/:slug": "/community/c/general",
};

function routes() {
  const src = fs.readFileSync(path.join(here, "..", "shared", "appRoutes.ts"), "utf8");
  const block = (src.match(/export const APP_ROUTE_PATTERNS[^=]*=\s*\[([\s\S]*?)\n\](?: as const)?;/) || [])[1] || "";
  const all = [...block.matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
  const admin = all.filter((r) => r.startsWith("/admin") && !r.includes(":"));
  const publicRoutes = all.filter((r) => !r.startsWith("/admin") && r !== "/404").map((r) => (r.includes(":") ? SAMPLES[r] : r)).filter(Boolean);
  const adminTsx = fs.readFileSync(path.join(here, "..", "client", "src", "pages", "Admin.tsx"), "utf8");
  const tabs = [...adminTsx.matchAll(/TabsContent value="([^"]+)"/g)].map((m) => `/admin?tab=${m[1]}`);
  const list = AS === "admin" ? [...new Set([...tabs, ...admin.filter((r) => r !== "/admin")])] : [...new Set(publicRoutes)];
  if (args.extra) list.push(...args.extra.split(","));
  return ONLY ? list.filter((r) => ONLY.split(",").some((o) => r.includes(o))) : list;
}

// Words on controls a run must never press: anything that sends, saves,
// deletes, pays or signs someone up.
const DANGER = /submit|send|post|publish|save|delete|remove|archive|confirm|approve|reject|decline|buy|pay|donate|book|join|subscribe|sign|log ?(in|out)|apply|vote|follow|like|claim|invite|upload|reset|clear|start|stop|end |launch|run|import|export|generate|create|add|ban|mute|report|hide|unhide|pin|lock|merge|refund|cancel/i;

const busyMs = async (cdp) => {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "TaskDuration").value * 1000;
};

async function newContext(browser) {
  const context = await browser.newContext(
    MOBILE
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: "block" }
      : { viewport: { width: 1280, height: 900 }, serviceWorkers: "block" },
  );
  if (SESSION && AS !== "anon") await context.addCookies([{ name: "app_session_id", value: SESSION, domain: new URL(BASE).hostname, path: "/", httpOnly: true }]);
  await context.addInitScript(() => {
    try {
      localStorage.setItem("onboarding_complete", "true");
      localStorage.setItem("regen-intro-seen", "true");
      localStorage.setItem("rc_cookie_consent", `${Date.now()}:declined`);
      sessionStorage.setItem("exitIntentDismissed", "true");
    } catch {}
    window.__perf = { inter: new Map(), loaf: [] };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.interactionId) continue;
          const prev = window.__perf.inter.get(e.interactionId) || 0;
          window.__perf.inter.set(e.interactionId, Math.max(prev, e.duration));
        }
      }).observe({ type: "event", durationThreshold: 16, buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__perf.loaf.push({ t: e.startTime, d: e.duration, scripts: (e.scripts || []).slice(0, 3).map((s) => `${(s.sourceURL || "").split("/").pop()}:${s.sourceFunctionName || s.invoker || ""} ${Math.round(s.duration)}ms`) });
        }
      }).observe({ type: "long-animation-frame", buffered: true });
    } catch {}
  });
  return context;
}

/** The slowest interaction since `mark` (a count of interactions seen so far). */
const slowestSince = (page, mark) => page.evaluate((m) => {
  const vals = [...window.__perf.inter.entries()].filter(([id]) => id > m).map(([, d]) => d);
  return vals.length ? Math.max(...vals) : 0;
}, mark);
const lastId = (page) => page.evaluate(() => Math.max(0, ...window.__perf.inter.keys()));

async function measureRoute(browser, route) {
  const context = await newContext(browser);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  const row = { route };
  try {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 });
  } catch (e) {
    await context.close();
    return { route, error: `did not load: ${e.message.split("\n")[0]}` };
  }
  await page.waitForTimeout(4500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });

  // Idle.
  const b0 = await busyMs(cdp);
  await page.waitForTimeout(2000);
  row.idle = Math.round(((await busyMs(cdp)) - b0) / 20);

  // Motion the compositor cannot run.
  row.motion = await page.evaluate(() => {
    const ok = new Set(["opacity", "transform", "translate", "rotate", "scale", "filter", "backdrop-filter", "offset-distance", "offset-rotate"]);
    let n = 0;
    for (const a of document.getAnimations()) {
      const eff = a.effect;
      const t = eff && eff.target;
      if (a.playState !== "running" || !t || eff.getComputedTiming().endTime !== Infinity) continue;
      const props = new Set();
      for (const kf of eff.getKeyframes()) for (const k of Object.keys(kf)) if (!["offset", "computedOffset", "easing", "composite"].includes(k)) props.add(k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));
      const svg = t instanceof SVGElement && !(t instanceof SVGSVGElement);
      if (svg || [...props].some((p) => !ok.has(p))) n++;
    }
    return n + [...document.querySelectorAll("animate, animateTransform, animateMotion")].filter((e) => e.getAttribute("repeatCount") === "indefinite").length;
  });

  // Clicks on safe toggles.
  const toggles = await page.evaluate((danger) => {
    const rx = new RegExp(danger.source, danger.flags);
    const seen = new Set();
    const out = [];
    const sel = "[role=tab][aria-selected=false], button[aria-expanded=false], summary, button[aria-haspopup]:not([aria-expanded=true]), button[aria-pressed=false], [role=radio][aria-checked=false]";
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
      if (r.width < 4 || r.height < 4 || el.closest("[aria-hidden=true]") || el.disabled) continue;
      if (rx.test(label) || seen.has(label) || out.length >= 5) continue;
      seen.add(label);
      el.setAttribute("data-perf-toggle", String(out.length));
      out.push(label);
    }
    return out;
  }, { source: DANGER.source, flags: DANGER.flags });
  row.click = 0;
  row.clickLabel = "";
  for (let i = 0; i < toggles.length; i++) {
    const loc = page.locator(`[data-perf-toggle="${i}"]`);
    if (!(await loc.count())) continue;
    const mark = await lastId(page);
    try {
      await loc.first().click({ timeout: 2500 });
    } catch {
      continue;
    }
    await page.waitForTimeout(700);
    const ms = await slowestSince(page, mark);
    if (ms > row.click) { row.click = Math.round(ms); row.clickLabel = toggles[i]; }
    if (new URL(page.url()).pathname !== new URL(BASE + route).pathname) break; // it navigated
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }

  // Typing into the first text field.
  const field = page.locator("main [contenteditable=true], main textarea, main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=number]):not([type=date]):not([type=submit]):not([type=button])").filter({ visible: true }).first();
  row.typing = null;
  if (await field.count()) {
    try {
      await field.scrollIntoViewIfNeeded({ timeout: 2000 });
      // Something can sit over a field (a reveal wrapper, a sticky bar); the
      // keystrokes only need focus.
      await field.click({ timeout: 1500 }).catch(() => field.focus());
      const mark = await lastId(page);
      await page.keyboard.type("Healing the land together", { delay: 90 });
      await page.waitForTimeout(600);
      const durs = await page.evaluate((m) => [...window.__perf.inter.entries()].filter(([id]) => id > m).map(([, d]) => d), mark);
      while (durs.length < 25) durs.push(16);
      durs.sort((a, b) => a - b);
      row.typing = Math.round(durs[Math.floor(durs.length * 0.95)]);
      await page.keyboard.press("Escape");
      await page.mouse.click(2, 2);
    } catch (e) {
      row.typingError = e.message.split("\n")[0].slice(0, 120);
    }
  }

  // Scrolling.
  await page.evaluate(() => { window.scrollTo(0, 0); window.__perf.loaf = []; });
  await page.mouse.move(640, 400);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, MOBILE ? 600 : 800);
    await page.waitForTimeout(350);
  }
  const loaf = await page.evaluate(() => window.__perf.loaf);
  row.scroll = Math.round(Math.max(0, ...loaf.map((f) => f.d)));
  row.scrollWho = loaf.sort((a, b) => b.d - a.d)[0]?.scripts?.join(" | ") || "";
  row.errors = errors.length;
  await context.close();
  return row;
}

/** From each page, follow an in-page link to the next and time it until the new page has settled. */
async function measureNavigation(browser) {
  // Public pages only: /quest and other signed-in pages send a visitor to sign in.
  const PAIRS = [["/", "/community"], ["/community", "/play"], ["/play", "/"], ["/", "/fund"], ["/fund", "/land"], ["/land", "/ally"], ["/ally", "/map"], ["/map", "/glossary"], ["/glossary", "/season2"], ["/season2", "/"]];
  const context = await newContext(browser);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(BASE + PAIRS[0][0], { waitUntil: "load" });
  await page.waitForTimeout(4500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const rows = [];
  for (const [from, to] of PAIRS) {
    if (new URL(page.url()).pathname !== from) {
      await page.goto(BASE + from, { waitUntil: "load" });
      await page.waitForTimeout(3500);
    }
    // Navigate the way a link does (wouter listens to pushState), then wait
    // until no spinner shows and the page's text has held still for 300ms.
    // A page that reloads the whole document instead is reported as such.
    const ms = await page.evaluate(async (target) => {
      const t0 = performance.now();
      history.pushState({}, "", target);
      dispatchEvent(new PopStateEvent("popstate"));
      const loading = () => {
        const cx = innerWidth / 2, cy = innerHeight / 2;
        for (let el = document.elementFromPoint(cx, cy); el; el = el.parentElement) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" && Number(cs.zIndex) >= 1000 && Number(cs.opacity) > 0.5) return true;
        }
        return [...document.querySelectorAll("[data-loading]")].some((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; });
      };
      let lastLen = -1, stableSince = performance.now();
      while (performance.now() - t0 < 10000) {
        await new Promise((r) => requestAnimationFrame(() => r()));
        const len = (document.querySelector("main")?.innerText || "").length;
        if (len !== lastLen) { lastLen = len; stableSince = performance.now(); }
        if (!loading() && len > 50 && performance.now() - stableSince > 300) return stableSince - t0;
      }
      return 10000;
    }, to).catch(() => null);
    if (ms == null) {
      rows.push({ route: `${from} -> ${to}`, nav: 0, error: "reloaded the whole document" });
      await page.waitForLoadState("load").catch(() => {});
      await page.waitForTimeout(3500);
      continue;
    }
    rows.push({ route: `${from} -> ${to}`, nav: Math.round(ms) });
  }
  await context.close();
  return rows;
}

let browser;
try {
  browser = await chromium.launch({ headless: true, channel: "chromium" });
} catch {
  browser = await chromium.launch({ headless: true });
}
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
if (NAV) {
  rows.push(...(await measureNavigation(browser)));
} else {
  const list = routes();
  for (const route of list) {
    const r = await measureRoute(browser, route);
    rows.push(r);
    const flag = (r.click > BAR || (r.typing || 0) > BAR) ? "✗" : "✓";
    console.log(r.error ? `! ${route} ${r.error}` : `${flag} ${route.padEnd(34)} idle ${String(r.idle).padStart(3)}%  motion ${r.motion}  click ${String(r.click).padStart(4)}ms ${r.clickLabel ? `("${r.clickLabel}")` : ""}  typing ${r.typing ?? "-"}  scroll ${r.scroll}ms`);
  }
}
await browser.close();

const name = `${NAV ? "nav" : AS}-${MOBILE ? "mobile" : "desktop"}`;
fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(rows, null, 1));
const worst = (r) => Math.max(r.click || 0, r.typing || 0, r.nav || 0);
const sorted = [...rows].filter((r) => !r.error).sort((a, b) => worst(b) - worst(a));
const md = [
  `# perf:live ${name} (CPU ${CPU}x slower, bar ${BAR}ms)`,
  "",
  NAV ? "| navigation | ms to settled content |\n|---|---|" : "| page | idle % | endless main-thread motion | slowest click | typing p95 | longest scroll frame |\n|---|---|---|---|---|---|",
  ...sorted.map((r) => NAV ? `| ${r.route} | ${r.nav} |` : `| ${r.route} | ${r.idle} | ${r.motion} | ${r.click}${r.clickLabel ? ` (${r.clickLabel})` : ""} | ${r.typing ?? "-"} | ${r.scroll}${r.scrollWho ? ` (${r.scrollWho})` : ""} |`),
  ...rows.filter((r) => r.error).map((r) => `\n${r.route}: ${r.error}`),
].join("\n");
fs.writeFileSync(path.join(OUT, `${name}.md`), md + "\n");
const over = rows.filter((r) => worst(r) > BAR).length;
console.log(`\n${rows.length} measured, ${over} over ${BAR}ms. Report: harness/shots/perf/${name}.md`);
process.exit(over ? 1 : 0);
