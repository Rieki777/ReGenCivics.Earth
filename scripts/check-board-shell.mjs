/**
 * Week board shell check. Boots the UI harness and measures the live board
 * at the viewports where stage 4 used to leave a band of empty ground under
 * the footer. Body scroll stays inside the viewport, and the footer's bottom
 * sits on the viewport edge.
 *
 *   node scripts/check-board-shell.mjs
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.BOARD_SHOTS || "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: "1024x560", width: 1024, height: 560 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

const server = await createServer({ configFile: path.join(root, "harness/vite.config.ts") });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch();
const failures = [];

async function measure(page) {
  await page.keyboard.press("End");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  return page.evaluate(() => {
    const foot = document.querySelector(".sb-foot");
    const box = foot ? foot.getBoundingClientRect() : null;
    return {
      scrollHeight: document.body.scrollHeight,
      innerHeight: window.innerHeight,
      footBottom: box ? Math.round(box.bottom) : null,
      total: document.querySelector(".sb-agenda-total")?.textContent ?? null,
    };
  });
}

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/?story=week-board-village&bare=1`, { waitUntil: "networkidle" });
    await page.waitForSelector(".sb-foot", { timeout: 15_000 });
    const m = await measure(page);
    const dead = m.scrollHeight - m.innerHeight;
    const footOk = m.footBottom != null && Math.abs(m.footBottom - m.innerHeight) <= 2;
    const scrollOk = dead <= 1;
    console.log(`stage4 ${vp.name}: scroll ${m.scrollHeight}/${m.innerHeight} dead ${dead}px foot ${m.footBottom}`);
    if (!scrollOk || !footOk) failures.push(`stage4 ${vp.name}: dead ${dead}px foot ${m.footBottom}`);
    if (errors.length) failures.push(`stage4 ${vp.name} errors: ${errors.join(" | ")}`);
    const file = path.join(outDir, `stage4-${vp.name}.png`);
    await page.screenshot({ path: file });
    await page.close();
  }

  const welcome = await browser.newPage({ viewport: { width: 1024, height: 560 } });
  welcome.on("pageerror", (e) => failures.push(`welcome: ${e}`));
  await welcome.goto(`http://localhost:${port}/?story=week-board-welcome&bare=1`, { waitUntil: "networkidle" });
  await welcome.waitForSelector(".sb-agenda-total", { timeout: 15_000 });
  const w = await measure(welcome);
  console.log(`welcome: total ${w.total} scroll ${w.scrollHeight}/${w.innerHeight}`);
  await welcome.screenshot({ path: path.join(outDir, "welcome-1024x560.png") });
  if (process.env.EXPECT_TOTAL && w.total !== process.env.EXPECT_TOTAL) {
    failures.push(`welcome total ${w.total}, expected ${process.env.EXPECT_TOTAL}`);
  }
  await welcome.close();
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("board shell holds the viewport");
