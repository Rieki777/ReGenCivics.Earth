/**
 * `pnpm perf:renders`: how much React work each interaction costs, page by page.
 *
 *   node harness/perf-renders.mjs --base http://localhost:3000                (public pages, `pnpm dev`)
 *   PERF_SESSION=<cookie> node harness/perf-renders.mjs --base ... --as user   (signed in)
 *   PERF_SESSION=<cookie> node harness/perf-renders.mjs --base ... --as admin  (every Admin tab)
 *   node harness/perf-renders.mjs --base ... --only /community,/apply
 *   node harness/perf-renders.mjs --base ... --forms                          (also types into every field, and forms behind Propose/Edit/Reply)
 *   node harness/perf-renders.mjs --base ... --tag before                     (writes renders-anon-before.*, to compare two builds)
 *
 * Counts React component renders, through the same commit hook React DevTools
 * uses, while a page sits idle for 3s, scrolls three screens, takes 16
 * keystrokes in its first text field, and has up to three safe toggles
 * clicked (tabs, accordions, menus; nothing that sends, saves or deletes).
 * Counts do not depend on how busy the machine is, so this finds waste
 * reliably where timings (`pnpm perf:live`) wobble. Run it against `pnpm dev`
 * or an unminified build so component names are readable; a minified build
 * still counts correctly.
 *
 * Bars (override with flags): --idle 20 renders in 3s, --scroll 120,
 * --key 30 per keystroke, --click 400. Writes harness/shots/perf/renders-<as>.md,
 * worst first, and exits non-zero when any page is over a bar.
 * Built 2026-10-15 (STEERING.md section 13).
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]] : acc), []),
);
const BASE = (args.base || "http://localhost:3000").replace(/\/$/, "");
const AS = args.as || "anon";
const SESSION = process.env.PERF_SESSION || "";
const BAR = { idle: Number(args.idle || 20), scroll: Number(args.scroll || 120), key: Number(args.key || 30), click: Number(args.click || 400) };
const OUT = path.join(here, "shots", "perf");
const NAME = `renders-${AS}${args.tag ? `-${args.tag}` : ""}`;

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
  const publicRoutes = all.filter((r) => !r.startsWith("/admin") && r !== "/404" && !r.startsWith("/.well-known")).map((r) => (r.includes(":") ? SAMPLES[r] : r)).filter(Boolean);
  const adminTsx = fs.readFileSync(path.join(here, "..", "client", "src", "pages", "Admin.tsx"), "utf8");
  const tabs = [...adminTsx.matchAll(/TabsContent value="([^"]+)"/g)].map((m) => `/admin?tab=${m[1]}`);
  const list = AS === "admin" ? [...new Set([...tabs, ...admin.filter((r) => r !== "/admin")])] : [...new Set(publicRoutes)];
  if (args.extra) list.push(...args.extra.split(","));
  return args.only ? list.filter((r) => args.only.split(",").some((o) => r === o || r.startsWith(o + "/") || r.startsWith(o + "?"))) : list;
}

const DANGER = /submit|send|post|publish|save|delete|remove|archive|confirm|approve|reject|decline|buy|pay|donate|book|join|subscribe|sign|log ?(in|out)|apply|vote|follow|like|claim|invite|upload|reset|clear|start|stop|end |launch|run|import|export|generate|create|add|ban|mute|report|hide|unhide|pin|lock|merge|refund|cancel/i;

// --forms: buttons that only open a form (nothing is sent until a second
// click), so their fields get typed into too.
const OPENERS = /^(propose|suggest|edit|write|reply|compose|new (post|thread|proposal|suggestion|idea|topic|note)|add (a |an )?(comment|note|tool|play|quest|feature|idea|suggestion|reply|bounty|role|gift|need))\b/i;
const FIELD = "[contenteditable=true], textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=number]):not([type=date]):not([type=submit]):not([type=button])";
const FORM_FIELDS = FIELD.split(", ").flatMap((s) => [`main ${s}`, `[role=dialog] ${s}`]).join(", ");

/** Installed before the app: a React DevTools hook that counts components that rendered in each commit. */
function installCounter() {
  try {
    localStorage.setItem("onboarding_complete", "true");
    localStorage.setItem("regen-intro-seen", "true");
    localStorage.setItem("rc_cookie_consent", `${Date.now()}:declined`);
    sessionStorage.setItem("exitIntentDismissed", "true");
  } catch {}
  const TAGS = new Set([0, 1, 11, 14, 15]); // function, class, forwardRef, memo, simple memo
  const nameOf = (f) => {
    const t = f.type;
    if (!t || typeof t === "string") return null;
    return t.displayName || t.name || (t.render && (t.render.displayName || t.render.name)) || (t.type && (t.type.displayName || t.type.name)) || "(anonymous)";
  };
  // A fiber reused untouched keeps last commit's flags, so only fibers that
  // were not in the previous committed tree and carry PerformedWork count.
  let lastSet = new WeakSet();
  window.__rec = null;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false, supportsFiber: true, renderers: new Map(),
    inject(r) { const id = this.renderers.size + 1; this.renderers.set(id, r); return id; },
    onScheduleFiberRoot() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {},
    onCommitFiberRoot(_id, root) {
      const nextSet = new WeakSet();
      const rec = window.__rec;
      const stack = [root.current];
      while (stack.length) {
        const f = stack.pop();
        nextSet.add(f);
        if (rec && TAGS.has(f.tag) && (f.flags & 1) && !lastSet.has(f)) {
          const n = nameOf(f);
          if (n) { rec.counts[n] = (rec.counts[n] || 0) + 1; rec.total++; }
        }
        if (f.child) stack.push(f.child);
        if (f.sibling) stack.push(f.sibling);
      }
      lastSet = nextSet;
      if (rec) rec.commits++;
    },
  };
}

const start = (p) => p.evaluate(() => { window.__rec = { commits: 0, total: 0, counts: {} }; });
const stop = (p) => p.evaluate(() => { const r = window.__rec; window.__rec = null; return r; });
const topOf = (counts, n = 4) => Object.entries(counts || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}×${v}`).join(", ");

/**
 * --forms: types a word into up to 8 fields on the page (dialogs included),
 * then opens up to 3 forms behind OPENERS buttons and types into the first
 * field each one shows. Keeps every field's renders per key; the worst one
 * is held to the --key bar. Nothing is submitted: no Enter, no second click.
 */
async function measureForms(p, row) {
  row.forms = [];
  const mark = () => p.evaluate((sel) => {
    let n = Number(document.body.dataset.perfFields || 0);
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (el.dataset.perfField || el.closest("[aria-hidden=true]") || el.disabled || el.readOnly) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      el.dataset.perfField = String(n);
      out.push({ i: n, label: (el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name") || el.id || el.tagName.toLowerCase()).trim().slice(0, 40) });
      n++;
    }
    document.body.dataset.perfFields = String(n);
    return out;
  }, FORM_FIELDS);
  const typeIn = async (f, via) => {
    const loc = p.locator(`[data-perf-field="${f.i}"]`).first();
    try { await loc.click({ timeout: 1500 }); } catch { await loc.focus().catch(() => {}); }
    await start(p);
    await p.keyboard.type("Healing", { delay: 80 });
    await p.waitForTimeout(400);
    const r = await stop(p);
    row.forms.push({ field: via ? `${via} > ${f.label}` : f.label, perKey: Math.round(r.total / 7), counts: r.counts });
  };
  for (const f of (await mark()).slice(0, 8)) await typeIn(f);
  await p.keyboard.press("Escape");
  const openers = await p.evaluate((src) => {
    const rx = new RegExp(src, "i");
    const out = [];
    for (const el of document.querySelectorAll("main button, main [role=button]")) {
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
      const r = el.getBoundingClientRect();
      if (out.length >= 3 || !rx.test(label) || r.width < 4 || r.height < 4 || el.disabled || el.closest("[aria-hidden=true]")) continue;
      el.dataset.perfOpen = String(out.length);
      out.push(label.slice(0, 30));
    }
    return out;
  }, OPENERS.source);
  for (let i = 0; i < openers.length; i++) {
    const before = p.url();
    try { await p.locator(`[data-perf-open="${i}"]`).first().click({ timeout: 2000 }); } catch { continue; }
    await p.waitForTimeout(700);
    if (p.url() !== before) break;
    const fresh = await mark();
    if (fresh.length) await typeIn(fresh[0], openers[i]);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
  }
  row.formsWorst = row.forms.reduce((w, f) => (!w || f.perKey > w.perKey ? f : w), null);
}

async function measure(browser, route) {
  // No service worker: its first activation reloads the page mid-run.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  if (SESSION && AS !== "anon") await ctx.addCookies([{ name: "app_session_id", value: SESSION, domain: new URL(BASE).hostname, path: "/", httpOnly: true }]);
  await ctx.addInitScript(installCounter);
  const p = await ctx.newPage();
  const row = { route };
  try {
    await p.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
    await p.waitForTimeout(4500);
    await start(p); await p.waitForTimeout(3000); row.idle = await stop(p);
    await start(p);
    await p.mouse.move(640, 450);
    for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 800); await p.waitForTimeout(400); }
    await p.waitForTimeout(500);
    row.scroll = await stop(p);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(400);
    const field = p.locator("main [contenteditable=true], main textarea, main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=number]):not([type=date]):not([type=submit]):not([type=button])").filter({ visible: true }).first();
    if (await field.count()) {
      await field.click({ timeout: 1500 }).catch(() => field.focus());
      await start(p);
      await p.keyboard.type("Healing the land", { delay: 80 });
      await p.waitForTimeout(500);
      row.typing = await stop(p);
      row.typing.perKey = Math.round(row.typing.total / 16);
      await p.keyboard.press("Escape");
      await p.mouse.click(2, 2);
    }
    if (args.forms) await measureForms(p, row);
    const toggles = await p.evaluate((d) => {
      const rx = new RegExp(d.source, d.flags);
      const out = []; const seen = new Set();
      for (const el of document.querySelectorAll("main [role=tab][aria-selected=false], main button[aria-expanded=false], main summary, main button[aria-haspopup]:not([aria-expanded=true]), main button[aria-pressed=false], main [role=radio][aria-checked=false]")) {
        const r = el.getBoundingClientRect();
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
        if (r.width < 4 || r.height < 4 || el.closest("[aria-hidden=true]") || el.disabled || rx.test(label) || seen.has(label) || out.length >= 3) continue;
        seen.add(label); el.setAttribute("data-perf-toggle", String(out.length)); out.push(label);
      }
      return out;
    }, { source: DANGER.source, flags: DANGER.flags });
    row.click = null;
    for (let i = 0; i < toggles.length; i++) {
      const loc = p.locator(`[data-perf-toggle="${i}"]`);
      if (!(await loc.count())) continue;
      await start(p);
      try { await loc.first().click({ timeout: 2000 }); } catch { await stop(p); continue; }
      await p.waitForTimeout(600);
      const r = await stop(p);
      if (!row.click || r.total > row.click.total) row.click = { ...r, label: toggles[i] };
      if (new URL(p.url()).pathname !== route.split("?")[0]) break;
      await p.keyboard.press("Escape");
      await p.waitForTimeout(200);
    }
  } catch (e) {
    row.error = e.message.split("\n")[0].slice(0, 140);
  }
  await ctx.close();
  return row;
}

const browser = await chromium.launch({ headless: true });
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const route of routes()) {
  const r = await measure(browser, route);
  r.over = [
    r.idle && r.idle.total > BAR.idle ? `idle ${r.idle.total}` : null,
    r.scroll && r.scroll.total > BAR.scroll ? `scroll ${r.scroll.total}` : null,
    r.typing && r.typing.perKey > BAR.key ? `${r.typing.perKey}/key` : null,
    r.click && r.click.total > BAR.click ? `click ${r.click.total}` : null,
    r.formsWorst && r.formsWorst.perKey > BAR.key ? `form ${r.formsWorst.perKey}/key` : null,
  ].filter(Boolean);
  rows.push(r);
  console.log(`${r.error ? "!" : r.over.length ? "✗" : "✓"} ${route.padEnd(36)} idle ${r.idle?.total ?? "-"}  scroll ${r.scroll?.total ?? "-"}  key ${r.typing?.perKey ?? "-"}  click ${r.click?.total ?? "-"}${r.formsWorst ? `  form ${r.formsWorst.perKey} (${r.formsWorst.field})` : ""}${r.error ? "  " + r.error : ""}`);
}
await browser.close();

fs.writeFileSync(path.join(OUT, `${NAME}.json`), JSON.stringify(rows, null, 1));
const md = [
  `# perf:renders ${AS} (bars: idle ${BAR.idle}/3s, scroll ${BAR.scroll}, ${BAR.key}/key, click ${BAR.click})`,
  "",
  "| page | over | idle | scroll | per key | click | where |",
  "|---|---|---|---|---|---|---|",
  ...rows.filter((r) => !r.error).sort((a, b) => b.over.length - a.over.length).map((r) => {
    const worst = [r.typing && `key: ${topOf(r.typing.counts)}`, r.scroll && r.scroll.total > BAR.scroll && `scroll: ${topOf(r.scroll.counts)}`, r.idle && r.idle.total > BAR.idle && `idle: ${topOf(r.idle.counts)}`, r.click && r.click.total > BAR.click && `click "${r.click.label}": ${topOf(r.click.counts)}`, r.formsWorst && r.formsWorst.perKey > BAR.key && `form "${r.formsWorst.field}": ${topOf(r.formsWorst.counts)}`].filter(Boolean).join("; ");
    return `| ${r.route} | ${r.over.join(", ")} | ${r.idle?.total ?? "-"} | ${r.scroll?.total ?? "-"} | ${r.typing?.perKey ?? "-"} | ${r.click?.total ?? "-"} | ${worst} |`;
  }),
  ...rows.filter((r) => r.error).map((r) => `\n${r.route}: ${r.error}`),
].join("\n");
fs.writeFileSync(path.join(OUT, `${NAME}.md`), md + "\n");
const over = rows.filter((r) => r.over.length).length;
console.log(`\n${rows.length} pages, ${over} over a bar. Report: harness/shots/perf/${NAME}.md`);
process.exit(over ? 1 : 0);
