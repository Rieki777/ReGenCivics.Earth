/**
 * `pnpm ui:audit`: the readability checks (harness/audit-checks.mjs) on
 * harness stories, at desktop and phone widths, in the theme the app uses.
 *
 *   node harness/audit.mjs story-a story-b ...     (no names: every story)
 *
 * For the running app, route by route, use `pnpm ui:audit:live`
 * (harness/audit-live.mjs). The loop that grows the checks is in CLAUDE.md.
 * Exits non-zero when anything fails, so it can gate a change; the
 * `audit-selftest` story is meant to fail (it proves each check still bites)
 * and only runs when named.
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { revealAll, runFocusChecks, runPageChecks } from "./audit-checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(here, "shots");
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  // A touch phone, so pointer-coarse styles (the 44px sizing) apply as on a real one.
  { name: "mobile", width: 390, height: 844, touch: true },
];
const ROOT = "[data-harness-story]";

const storySrc = fs.readFileSync(path.join(here, "stories.tsx"), "utf8");
const block = storySrc.split("export const STORIES")[1] ?? "";
const keys = [...block.matchAll(/^\s{2}"([^"]+)":\s*\{/gm)].map((m) => m[1]);
const wanted = process.argv.slice(2);
const stories = wanted.length ? keys.filter((k) => wanted.includes(k)) : keys.filter((k) => k !== "audit-selftest");

/** Story-specific steps before measuring (e.g. try to send so the errors show). */
const BEFORE = {
  "alliance-apply-tools": async (page) => {
    await page.getByRole("button", { name: /Send my application/ }).click();
    await page.waitForTimeout(200);
  },
  // Week 3 (2026-10-14): the states people reach by tapping, not on arrival.
  "week3-checkin": async (page) => {
    await page.getByRole("button", { name: "Change project" }).click();
    await page.getByRole("button", { name: /Not on the list\? Add your project/ }).click();
    await page.getByRole("textbox", { name: "Project name" }).fill("Hill Farm");
    await page.waitForTimeout(200);
  },
  "week3-checkin-host": async (page) => {
    await page.getByText("Facilitators: link, merge and hide cards").click();
    await page.waitForTimeout(200);
  },
  "week3-prompt": async (page) => {
    await page.getByRole("textbox", { name: /Just for you/ }).fill("I feel stretched because I need");
    await page.getByRole("button", { name: "Ease", exact: true }).click();
    await page.waitForTimeout(200);
  },
  "week3-needs-meet": async (page) => {
    await page.getByRole("article", { name: /Vitality/ }).getByRole("button", { name: /A market/ }).click();
    await page.waitForTimeout(200);
  },
  "week3-tellus": async (page) => {
    await page.getByRole("textbox", { name: /What do you want to dig into/ }).fill("How to price a membership so nobody is priced out");
    await page.getByRole("checkbox", { name: /Share this with the cohort/ }).check();
    await page.waitForTimeout(200);
  },
  "profile-weekly-sessions": async (page) => {
    await page.getByRole("button", { name: /Week 2:/ }).click();
    await page.waitForTimeout(200);
  },
  "profile-guest-claim": async (page) => {
    await page.locator("[data-sonner-toast]").first().waitFor({ timeout: 5_000 });
  },
  "admin-session-export": async (page) => {
    await page.getByRole("button", { name: /See each week's summary/ }).click();
    await page.getByTestId("export-week").first().waitFor({ timeout: 5_000 });
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(200);
  },
};

fs.mkdirSync(SHOTS, { recursive: true });
const server = await createServer({ configFile: path.join(here, "vite.config.ts"), logLevel: "error" });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch();
let total = 0;

for (const story of stories) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch });
    try {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/?story=${story}`, { waitUntil: "networkidle" });
    await page.waitForSelector(`[data-harness-story="${story}"]`, { timeout: 10_000, state: "attached" });
    // The app runs public pages with <html class="dark"> and admin light
    // (App.tsx ThemeProvider). Miss that taught this: shared components carry
    // dark: styles, so stories measured without the class passed while the
    // live page showed grey fields.
    if (!/^(admin|alliance-admin|alliance-inquiry)/.test(story)) {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    }
    await page.waitForTimeout(400);
    if (BEFORE[story]) await BEFORE[story](page);
    await revealAll(page);
    const failures = [...errors.map((e) => `page error: ${e}`), ...(await runPageChecks(page, ROOT))];
    // Keyboard focus is checked once, at desktop width.
    if (vp.name === "desktop") failures.push(...(await runFocusChecks(page, ROOT)));
    const unique = [...new Set(failures)];
    await page.screenshot({ path: path.join(SHOTS, `${story}.${vp.name}.png`), fullPage: true });
    console.log(`${unique.length ? "✗" : "✓"} ${story} (${vp.name})${unique.length ? `: ${unique.length}` : ""}`);
    for (const f of unique) console.log(`    ${f}`);
    total += unique.length;
    } catch (err) {
      console.log(`✗ ${story} (${vp.name}): could not run: ${String(err).split("\n")[0]}`);
      total += 1;
    }
    await page.close();
  }
}

await browser.close();
await server.close();
console.log(total ? `\n${total} finding(s).` : "\nNo findings.");
process.exit(total ? 1 : 0);
