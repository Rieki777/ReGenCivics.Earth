/**
 * Phone width of the week board. The header used to size the page to its
 * content (about 590px) and overflow-x: clip cut the rest off, so the timer,
 * the Ended label, and the later stage dots sat past a 390px screen.
 *
 *   node scripts/test-session-board-phone.mjs
 *   BASE=http://127.0.0.1:3000 node scripts/test-session-board-phone.mjs
 *
 * Needs the dev server. Talks to a mocked board, so it does not write week 2.
 * Exits non-zero when any element box (outside the scrolling stage rail) is
 * wider than the viewport, a stage dot is under 44px, or the current dot
 * cannot be brought into view.
 */
import { chromium } from "playwright";
import superjson from "superjson";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const OUT = process.env.OUT || "/tmp/session-board-phone.json";
const WIDTHS = [320, 360, 390, 430];

function ok(data) {
  return { result: { data: superjson.serialize(data) } };
}

function board(mode) {
  const now = Date.now();
  const started = mode === "host" ? now - 10 * 60_000 : now - 3 * 3600_000;
  return {
    week: 2,
    status: "open",
    version: 1,
    serverNow: now,
    canFacilitate: mode === "host",
    notes: [],
    hands: {},
    offers: {},
    offerPeople: null,
    projects: [{
      id: 1,
      name: "Amora",
      place: "Costa Rica",
      phase: "sprout",
      whereNow: "The land is held, and the first people are living there.",
      ready: ["land"],
      needsText: "",
      offersText: "",
    }],
    items: [],
    facilitatorLists: null,
    state: {
      stage: 0,
      stageStartedAt: started,
      sessionStartedAt: started,
      endedAt: null,
      plan: [5, 8, 10, 10, 8, 42, 12, 15, 7, 3, 1],
      breath: { pattern: "settle", rounds: 6, startedAt: null },
      speaker: { projectId: 1, secs: 180, startedAt: null, accum: 0 },
    },
  };
}

const schedule = {
  sessions: [
    { week: 3, title: "Week 3", startTime: "2026-10-12T17:00:00.000Z", endTime: null, status: "upcoming" },
  ],
  scheduled: { key: "mon", hourPT: 10 },
};

async function attach(context, mode) {
  const live = board(mode);
  await context.route("**/api/trpc/**", async (route) => {
    const request = route.request();
    const procs = decodeURIComponent(new globalThis.URL(request.url()).pathname.replace(/^\/api\/trpc\//, "")).split(",");
    if (request.method() === "POST") {
      try {
        const sent = JSON.parse(request.postData() || "{}");
        for (const part of Object.values(sent)) {
          const action = part?.json?.action;
          if (action?.type === "go" && Number.isInteger(action.stage)) live.state = { ...live.state, stage: action.stage, stageStartedAt: Date.now() };
        }
      } catch { /* a read that arrived as POST */ }
    }
    const body = procs.map((p) => {
      if (p === "sessionBoard.get") return ok({ ...live, serverNow: Date.now() });
      if (p === "sessionBoard.version") return ok({ version: 1, status: "open" });
      if (p === "sessionBoard.whoami") return ok({ itemIds: [], projectIds: [], votes: [], hands: [], offers: [], canFacilitate: mode === "host" });
      if (p === "seasonSchedule.state") return ok(schedule);
      if (p.startsWith("sessionBoard.")) return ok({ ok: true, state: live.state });
      return ok(null);
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function measure(page, vw) {
  return page.evaluate((vw) => {
    const app = document.querySelector(".sb-app");
    const rail = document.querySelector(".sb-rail");
    const offenders = [];
    if (app) {
      for (const el of app.querySelectorAll("*")) {
        if (el.closest("svg")) continue;
        if (rail && el.closest(".sb-rail")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 && r.height < 1) continue;
        if (r.right > vw + 1 || r.left < -1) {
          const cls = typeof el.className === "string" ? el.className : "";
          offenders.push({ cls: cls.slice(0, 80), l: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
        }
      }
    }
    const dots = [...document.querySelectorAll(".sb-rail-btn")].map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    const nowBtn = document.querySelector(".sb-rail li.sb-now .sb-rail-btn");
    const nowBox = nowBtn ? nowBtn.getBoundingClientRect() : null;
    const railBox = rail ? rail.getBoundingClientRect() : null;
    return {
      col: app ? getComputedStyle(app).gridTemplateColumns : "",
      offenders,
      dotMin: dots.reduce((a, d) => Math.min(a, d.w, d.h), 999),
      nowInView: !!(nowBox && nowBox.left >= -1 && nowBox.right <= vw + 1),
      railInside: !!(railBox && railBox.left >= -1 && railBox.right <= vw + 1),
    };
  }, vw);
}

const fail = [];
function check(cond, msg) { if (!cond) fail.push(msg); }

const browser = await chromium.launch({ headless: true });
const report = {};

for (const mode of ["guest", "host"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await attach(context, mode);
  const page = await context.newPage();
  await page.goto(`${BASE}/season2/week/2`, { waitUntil: "domcontentloaded" });
  const cookies = page.getByRole("button", { name: "Accept All Cookies" });
  if (await cookies.count()) await cookies.click().catch(() => {});
  await page.locator(".sb-pill").waitFor({ timeout: 15000 });
  report[mode] = {};

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.locator(".sb-rail").evaluate((rail) => { rail.scrollLeft = 0; });
    const labels = await page.locator(".sb-rail-btn").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    check(labels.length === 11, `${mode} ${w}: expected 11 stages, got ${labels.length}`);
    for (const label of labels) {
      await page.locator(`.sb-rail-btn[aria-label="${label}"]`).evaluate((el) => el.click());
      await page.waitForTimeout(200);
      const m = await measure(page, w);
      check(m.col === `${w}px`, `${mode} ${w} ${label}: column ${m.col}`);
      check(m.offenders.length === 0, `${mode} ${w} ${label}: ${m.offenders.map((o) => o.cls).join(", ")}`);
      check(m.nowInView, `${mode} ${w} ${label}: current stage dot is outside the screen`);
      check(m.railInside, `${mode} ${w} ${label}: stage rail is outside the screen`);
      check(m.dotMin >= 44, `${mode} ${w} ${label}: stage dot ${m.dotMin}px`);
    }
    const reached = await page.locator(".sb-rail").evaluate((rail) => {
      rail.scrollLeft = rail.scrollWidth;
      const last = rail.querySelector("li:last-child .sb-rail-btn");
      if (!last) return { ok: false };
      const railBox = rail.getBoundingClientRect();
      const box = last.getBoundingClientRect();
      return {
        ok: box.width >= 44 && box.right <= railBox.right + 1 && box.left >= railBox.left - 1,
        left: Math.round(box.left),
        right: Math.round(box.right),
      };
    });
    check(reached.ok, `${mode} ${w}: last stage dot cannot scroll into the rail (${reached.left}-${reached.right})`);
    report[mode][w] = "ok";
  }
  await context.close();
}

await browser.close();
writeFileSync(OUT, JSON.stringify({ ok: fail.length === 0, failures: fail, report }, null, 2));
if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log(`session board phone widths ok (${WIDTHS.join(", ")}px, guest and host)`);
