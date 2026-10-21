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
import { revealAll, runFocusChecks, runFocusReturnChecks, runPageChecks } from "./audit-checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(here, "shots");
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  // A touch phone, so pointer-coarse styles (the 44px sizing) apply as on a real one.
  { name: "mobile", width: 390, height: 844, touch: true },
];
const ROOT = "[data-harness-story]";
// How long a story may take to load. Other worktrees' typechecks can pin this
// machine's CPU, and a 30 second load limit then failed every story with
// nothing wrong in it (2026-10-20). AUDIT_LOAD_MS changes it.
const LOAD_MS = Number(process.env.AUDIT_LOAD_MS ?? 120_000);

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
  // Week 4 (2026-10-21): the add forms and the card's text, reached by tapping.
  "week4-seats": async (page) => {
    await page.getByRole("button", { name: /Add a seat for Vitality/ }).click();
    const name = page.getByRole("textbox", { name: "Seat name" });
    await name.fill("Seed saver");
    // Enter (the phone's Next) moves on and never saves a half-written seat.
    await name.press("Enter");
    const at = await page.evaluate(() => document.activeElement?.tagName);
    if (at !== "SELECT") throw new Error(`Enter on Seat name moved focus to ${at}, not the circle select`);
    if (!(await name.isVisible())) throw new Error("Enter on Seat name closed the form");
    await page.getByRole("textbox", { name: "What it works toward" }).fill("Seeds for every bed");
    await page.getByRole("button", { name: "Someone on our team holds it" }).click();
    // A half-written seat survives leaving the stage and coming back (week3/drafts.ts).
    await page.locator(".sb-rail-btn").nth(6).click();
    await page.waitForTimeout(200);
    await page.locator(".sb-rail-btn").nth(7).click();
    await page.waitForTimeout(300);
    const kept = await page.getByRole("textbox", { name: "Seat name" }).inputValue().catch(() => "");
    const aim = await page.getByRole("textbox", { name: "What it works toward" }).inputValue().catch(() => "");
    if (kept !== "Seed saver" || aim !== "Seeds for every bed") throw new Error(`the seat's words were lost on a stage change ("${kept}", "${aim}")`);
    if ((await page.locator("form.sb-card-form[data-unsaved]").count()) !== 1) throw new Error("the unsaved seat form isn't marked, so the room would move away from it");
    await page.waitForTimeout(200);
  },
  "week4-quests": async (page) => {
    await page.getByRole("button", { name: "Add a quest" }).click();
    const quest = page.getByRole("textbox", { name: "The quest" });
    await quest.fill("Plant the hedge");
    // Enter moves to the human need it grows; it never tags the quest to the first one by itself.
    await quest.press("Enter");
    const at = await page.evaluate(() => document.activeElement?.tagName);
    if (at !== "SELECT") throw new Error(`Enter on the quest moved focus to ${at}, not the human need select`);
    await page.waitForTimeout(200);
  },
  "week4-pending": async (page) => {
    await page.getByRole("button", { name: "Start without Week 3" }).click();
    // Lupine Hollow has no human needs yet, so the stage opens on where to name them.
    await page.getByText(/Name your project's human needs first/).waitFor({ timeout: 5_000 });
  },
  "week4-needs": async (page) => {
    await page.getByRole("button", { name: "Add a human need of your own" }).click();
    await page.getByRole("textbox", { name: "The human need" }).fill("Wisdom");
    await page.waitForTimeout(200);
  },
  "week4-decide": async (page) => {
    await page.getByRole("button", { name: /Add what a circle decides: Food & Fertility/ }).click();
    await page.waitForTimeout(200);
  },
  // Village profile (ADR-77): a steward writing their own words, and the purpose with its word count.
  "village-profile-editing": async (page) => {
    await page.getByRole("listitem").filter({ hasText: "Its tagline" }).getByRole("button", { name: "Write your own" }).click();
    await page.getByRole("textbox", { name: "Its tagline" }).fill("Twelve families living well on healed land");
    await page.getByRole("listitem").filter({ hasText: "Your governing purpose" }).getByRole("button", { name: "Write your own" }).click();
    await page.waitForTimeout(200);
  },
  "admin-village-profiles": async (page) => {
    await page.getByRole("button", { name: "See every project's profile" }).click();
    await page.getByRole("table").waitFor({ timeout: 5_000 });
  },
  "week4-built": async (page) => {
    await page.getByText("Show what's in it").first().click();
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
  // The progress map (2026-10-20): Enter and Space open a landmark, and a tap
  // beside one, inside its 44px disc, opens it too. On a phone the Trailhead
  // is drawn 23px wide, so 16px left of its centre is off the picture.
  "progress-map": async (page) => {
    const opened = page.getByTestId("map-opened");
    await page.getByRole("button", { name: /^Seed Vault/ }).focus();
    await page.keyboard.press("Enter");
    if (!/Seed Vault/.test(await opened.innerText())) throw new Error("Enter on a landmark didn't open it");
    await page.getByRole("button", { name: /^Gathering Grove/ }).focus();
    await page.keyboard.press(" ");
    if (!/Gathering Grove/.test(await opened.innerText())) throw new Error("Space on a landmark didn't open it");
    const map = page.locator("[data-harness-story] svg").first();
    await map.scrollIntoViewIfNeeded();
    const box = await map.boundingBox();
    const s = Math.min(box.width / 1200, box.height / 800);
    const x = box.x + (box.width - 1200 * s) / 2 + 150 * s - 16;
    const y = box.y + (box.height - 800 * s) / 2 + 650 * s;
    if (await page.evaluate(() => matchMedia("(pointer: coarse)").matches)) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    if (!/Trailhead/.test(await opened.innerText())) throw new Error("a tap 16px beside the Trailhead, inside its disc, didn't open it");
    await page.waitForTimeout(200);
  },
  "progress-map-open": async (page) => {
    await page.getByRole("button", { name: /^The Great Terrace/ }).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const at = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName);
    if (!/^The Great Terrace/.test(at ?? "")) throw new Error(`Enter on a landmark left focus on ${at}, not its card`);
    await page.keyboard.press("Tab");
    const next = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (next !== "Close detail") throw new Error(`Tab from the card went to ${next}, not its Close`);
  },
  "admin-session-export": async (page) => {
    await page.getByRole("button", { name: /See each week's summary/ }).click();
    await page.getByTestId("export-week").first().waitFor({ timeout: 5_000 });
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(200);
  },
  // Bioregion pickers (2026-10-21): their lists open in a popover outside the
  // story, which the page checks now measure too.
  "bioregion-picker": async (page) => {
    await page.locator("[data-harness-story] button[aria-expanded]").first().click();
    const search = page.getByRole("combobox", { name: "Search bioregions" });
    await search.waitFor({ timeout: 5_000 });
    // The second row highlighted, with its realm note, and the chosen row checked.
    await search.press("ArrowDown");
    await page.waitForTimeout(200);
  },
  "bioregion-multi-picker": async (page) => {
    await page.getByRole("button", { name: /Add a bioregion/ }).click();
    await page.getByRole("combobox", { name: "Search bioregions" }).waitFor({ timeout: 5_000 });
    await page.waitForTimeout(200);
  },
  "bioregion-multi-empty": async (page) => {
    await page.getByRole("button", { name: /Add a bioregion/ }).click();
    await page.getByRole("combobox", { name: "Search bioregions" }).fill("Hill Country");
    await page.getByRole("button", { name: /Suggest "Hill Country"/ }).waitFor({ timeout: 5_000 });
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
    await page.goto(`http://localhost:${port}/?story=${story}`, { waitUntil: "networkidle", timeout: LOAD_MS });
    await page.waitForSelector(`[data-harness-story="${story}"]`, { timeout: LOAD_MS, state: "attached" });
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
    await page.screenshot({ path: path.join(SHOTS, `${story}.${vp.name}.png`), fullPage: true });
    // Then the controls that take themselves away, each on a fresh copy of the story.
    if (vp.name === "desktop") {
      failures.push(...(await runFocusReturnChecks(page, ROOT, async () => {
        await page.goto(`http://localhost:${port}/?story=${story}`, { waitUntil: "networkidle", timeout: LOAD_MS });
        await page.waitForSelector(`[data-harness-story="${story}"]`, { timeout: LOAD_MS, state: "attached" });
        if (!/^(admin|alliance-admin|alliance-inquiry)/.test(story)) await page.evaluate(() => document.documentElement.classList.add("dark"));
        await page.waitForTimeout(400);
        if (BEFORE[story]) await BEFORE[story](page);
      })));
    }
    const unique = [...new Set(failures)];
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
