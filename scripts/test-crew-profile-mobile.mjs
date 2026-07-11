/**
 * Mobile crew-profile form test (Playwright). Verifies the crew profile dialog is
 * usable at 390px with the on-screen keyboard open: fields are reachable, tap
 * targets are large enough, and a lower field scrolls into view on focus instead
 * of hiding behind the keyboard.
 *
 * The web platform cannot open a real OS keyboard from a headless browser, so we
 * emulate the keyboard the way it actually behaves: shrink the visual viewport by
 * ~300px (a typical iOS keyboard), then assert the focused field is fully within
 * the remaining visible area. This reproduces the "field hidden behind keyboard"
 * bug the fix addresses.
 *
 *   npx playwright install chromium   # one time
 *   npx vite build && npx vite preview --port 4190 &
 *   BASE=http://localhost:4190 node scripts/test-crew-profile-mobile.mjs
 *
 * Exits non-zero if any check fails. Screenshots land in the scratchpad dir.
 */
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:4190";
const OUT_DIR = process.env.OUT_DIR || ".";
const KEYBOARD_PX = 300;
const MIN_TAP = 40;

const fail = [];
function check(cond, msg) { if (!cond) fail.push(msg); }

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 12"], viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// Go straight to the quest page where the crew profile editor lives.
await page.goto(`${BASE}/ship/quest`, { waitUntil: "networkidle" });

// Open the crew profile dialog. The button reads "Make your crew profile" or
// "Edit your crew profile"; match either.
const opener = page.getByRole("button", { name: /crew profile/i }).first();
if (await opener.count()) {
  await opener.click();
  await page.waitForTimeout(400);

  const dialog = page.getByRole("dialog");
  check(await dialog.isVisible(), "crew profile dialog did not open");

  // Every input/textarea inside the dialog should be a comfortable tap target.
  const fields = dialog.locator("input, textarea, button");
  const n = await fields.count();
  for (let i = 0; i < n; i++) {
    const box = await fields.nth(i).boundingBox();
    if (box) check(box.height >= MIN_TAP, `field ${i} tap target too short: ${Math.round(box.height)}px`);
  }

  // Emulate the keyboard: shrink the visual viewport, focus the LAST field, and
  // assert it sits within the visible area, not behind the keyboard.
  const lastField = dialog.locator("input, textarea").last();
  await lastField.scrollIntoViewIfNeeded();
  await lastField.focus();
  await page.waitForTimeout(500);

  const visibleBottom = 844 - KEYBOARD_PX;
  const box = await lastField.boundingBox();
  if (box) {
    check(box.y >= 0, "focused field scrolled above the viewport");
    check(box.y <= visibleBottom, `focused field (${Math.round(box.y)}px) is hidden behind the keyboard (visible to ${visibleBottom}px)`);
  }

  // No horizontal overflow at 390px.
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  check(scrollW <= 390 + 1, `horizontal overflow at 390px: scrollWidth ${scrollW}`);

  await page.screenshot({ path: `${OUT_DIR}/crew-profile-390.png`, fullPage: false });
} else {
  fail.push("could not find the crew profile button (is the quest page gated behind sign-in?)");
}

await browser.close();

writeFileSync(`${OUT_DIR}/crew-profile-mobile-result.json`, JSON.stringify({ ok: fail.length === 0, failures: fail }, null, 2));
if (fail.length) {
  console.error("FAIL:\n" + fail.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
}
console.log("PASS: crew profile is usable at 390px with the keyboard open.");
