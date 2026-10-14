/**
 * `pnpm ui:audit:live`: the readability checks (harness/audit-checks.mjs) on
 * the running app, route by route, at desktop and phone widths, as the
 * people who use each page see it.
 *
 *   AUDIT_SESSION=<session cookie> node harness/audit-live.mjs --base http://localhost:3202 --as user
 *   AUDIT_SESSION=<admin cookie>   node harness/audit-live.mjs --base http://localhost:3202 --as admin
 *   node harness/audit-live.mjs --base ... --only /tools          (routes containing /tools)
 *
 * Run it against a local server on the scratch database (CLAUDE.md, UI
 * readability gate), never production: signed-in pages need a session, and
 * the run clicks nothing that writes. Public routes come from
 * shared/appRoutes.ts (routes with parameters use the samples below); admin
 * covers every Admin tab plus the /admin/* pages. The cookie banner, the
 * first-visit welcome and the game intro are pre-dismissed, so the page
 * behind them is what gets measured.
 *
 * Writes harness/shots/live/<as>.json and <as>.md (gitignored). Findings
 * that repeat on most pages are the shared chrome (header, nav, footer) and
 * are listed once, as site-wide.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { revealAll, runFocusChecks, runPageChecks } from "./audit-checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]] : acc), []),
);
const BASE = (args.base || "http://localhost:3202").replace(/\/$/, "");
const AS = args.as || "user";
const ONLY = args.only || null;
const CONCURRENCY = Number(args.concurrency || 3);
const OUT = path.join(here, "shots", "live");
const SESSION = process.env.AUDIT_SESSION || "";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  // A touch phone, so pointer-coarse styles (the 44px sizing) apply as on a real one.
  { name: "mobile", width: 390, height: 844, touch: true },
];

/** Routes with parameters, filled with values that exist on a seeded scratch database. */
const SAMPLES = {
  "/tools/:slug": "/tools/hylo",
  "/season2/week/:week": "/season2/week/2",
  "/series/:season": "/series/2",
  "/blog/:slug": "/blog/what-steers-civilization",
  "/learn/:slug": "/learn/nine-forms-of-capital",
};

function routes() {
  const src = fs.readFileSync(path.join(here, "..", "shared", "appRoutes.ts"), "utf8");
  const block = (src.match(/export const APP_ROUTE_PATTERNS[^=]*=\s*\[([\s\S]*?)\n\](?: as const)?;/) || [])[1] || "";
  const all = [...block.matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
  const admin = all.filter((r) => r.startsWith("/admin") && !r.includes(":"));
  const publicRoutes = all.filter((r) => !r.startsWith("/admin")).map((r) => (r.includes(":") ? SAMPLES[r] : r)).filter(Boolean);
  const adminTsx = fs.readFileSync(path.join(here, "..", "client", "src", "pages", "Admin.tsx"), "utf8");
  const tabs = [...adminTsx.matchAll(/TabsContent value="([^"]+)"/g)].map((m) => `/admin?tab=${m[1]}`);
  const list = AS === "admin" ? [...new Set([...tabs, ...admin.filter((r) => r !== "/admin")])] : [...new Set(publicRoutes)];
  return ONLY ? list.filter((r) => r.includes(ONLY)) : list;
}

async function auditRoute(browser, route) {
  const results = [];
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch });
    if (SESSION && AS !== "anon") {
      const { hostname } = new URL(BASE);
      await context.addCookies([{ name: "app_session_id", value: SESSION, domain: hostname, path: "/" }]);
    }
    await context.addInitScript(() => {
      try {
        localStorage.setItem("regen-intro-seen", "true");
        localStorage.setItem("rc_cookie_consent", `${Date.now()}:essential`);
        localStorage.setItem("regen_game_entered", "true");
      } catch { /* storage blocked */ }
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).split("\n")[0]));
    let failures = [];
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30_000 }).catch(() => page.waitForLoadState("load"));
      await page.waitForTimeout(1200);
      const crashed = await page.evaluate(() => /Something went wrong/.test(document.body.innerText));
      if (crashed) failures.push("page crashed: the error screen showed");
      await revealAll(page);
      failures.push(...(await runPageChecks(page, "body")));
      if (vp.name === "desktop") failures.push(...(await runFocusChecks(page, "body", 120)));
      if (vp.name === "desktop") {
        const file = path.join(OUT, "shots", `${AS}${route.replace(/[^a-z0-9]+/gi, "_")}.png`);
        await page.screenshot({ path: file, fullPage: false });
      }
    } catch (err) {
      failures.push(`could not run: ${String(err).split("\n")[0]}`);
    }
    failures.push(...errors.map((e) => `page error: ${e}`));
    results.push({ route, viewport: vp.name, failures: [...new Set(failures)] });
    await context.close();
  }
  return results;
}

fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });
const list = routes();
console.log(`Auditing ${list.length} route(s) as ${AS} at ${BASE}`);
const browser = await chromium.launch();
const all = [];
let next = 0;
async function worker() {
  while (next < list.length) {
    const route = list[next++];
    const res = await auditRoute(browser, route);
    const n = res.reduce((s, r) => s + r.failures.length, 0);
    console.log(`${n ? "✗" : "✓"} ${route}${n ? ` (${n})` : ""}`);
    all.push(...res);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();

// ─── Report ──────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(OUT, `${AS}.json`), JSON.stringify(all, null, 2));
const pagesWith = new Map();
for (const r of all) for (const f of r.failures) {
  const key = `${f} [${r.viewport}]`;
  if (!pagesWith.has(key)) pagesWith.set(key, new Set());
  pagesWith.get(key).add(r.route);
}
const routeCount = list.length;
const siteWide = [...pagesWith].filter(([, s]) => s.size >= Math.max(3, routeCount * 0.5));
const siteWideKeys = new Set(siteWide.map(([k]) => k));
const kind = (f) => f.replace(/^(\w[\w ]*?)[: ].*$/, "$1");
const byKind = new Map();
for (const [k, s] of pagesWith) {
  if (siteWideKeys.has(k)) continue;
  const t = kind(k);
  byKind.set(t, (byKind.get(t) ?? 0) + s.size);
}
const lines = [];
lines.push(`# Live UI audit: ${AS}`, "", `${BASE}, ${routeCount} route(s), ${new Date().toISOString()}`, "");
lines.push("## Findings by kind (excluding site-wide)", "");
for (const [t, n] of [...byKind].sort((a, b) => b[1] - a[1])) lines.push(`- ${t}: ${n}`);
lines.push("", `## Site-wide (on at least half the routes): ${siteWide.length}`, "");
for (const [k, s] of siteWide.sort((a, b) => b[1].size - a[1].size)) lines.push(`- ${k}: ${s.size} routes`);
lines.push("", "## By route", "");
for (const route of list) {
  const fs_ = all.filter((r) => r.route === route).flatMap((r) => r.failures.map((f) => `${f} [${r.viewport}]`)).filter((k) => !siteWideKeys.has(k));
  if (!fs_.length) continue;
  lines.push(`### ${route} (${fs_.length})`, ...[...new Set(fs_)].map((f) => `- ${f}`), "");
}
const clean = list.filter((route) => !all.some((r) => r.route === route && r.failures.some((f) => !siteWideKeys.has(`${f} [${r.viewport}]`))));
lines.push(`## Clean apart from site-wide: ${clean.length}`, "", clean.join(", "));
fs.writeFileSync(path.join(OUT, `${AS}.md`), lines.join("\n"));
const total = all.reduce((s, r) => s + r.failures.length, 0);
console.log(`\n${total} finding(s); report: ${path.relative(process.cwd(), path.join(OUT, `${AS}.md`))}`);
