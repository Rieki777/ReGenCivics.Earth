/**
 * Screenshots and a short motion clip for the /preview/game mockup.
 * Writes to /opt/cursor/artifacts. Not part of the live site.
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = "/opt/cursor/artifacts";
const shots = [
  ["week", "01-week-board"],
  ["reward", "02-reward-moment"],
  ["sheet", "03-character-sheet"],
  ["quests", "04-quest-log"],
  ["locked", "05-locked-teaser"],
  ["paths", "06-path-select"],
  ["hosting", "06-hosting-levels"],
  ["phone-before", "07-phone-before"],
  ["phone-after", "07-phone-after"],
  ["recap", "08-session-recap"],
  ["guilds", "09-guilds"],
  ["splash", "10-pwa-splash"],
  ["install", "10-pwa-install"],
];
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

fs.mkdirSync(out, { recursive: true });

const server = await createServer({ configFile: path.join(root, "harness/vite.config.ts") });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch();
const problems = [];

try {
  for (const [id, file] of shots) {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      const url = `http://localhost:${port}/?story=game-preview&bare=1&chrome=0&shot=1&screen=${id}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector(`[data-screen="${id}"]`, { timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      const dest = path.join(out, `${file}-${vp.name}.png`);
      await page.screenshot({ path: dest });
      console.log(dest);
      if (errors.length) problems.push(`${file} ${vp.name}: ${errors.join(" | ")}`);
      await page.close();
    }
  }

  const videoDir = path.join(out, ".video-tmp");
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`http://localhost:${port}/?story=game-preview&bare=1&chrome=0&screen=splash`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid='splash-stage']");
  await page.waitForTimeout(3200);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("gx-go", { detail: "week" })));
  await page.waitForSelector("[data-testid='emote-sprout']");
  await page.waitForTimeout(400);
  await page.click("[data-testid='emote-sprout']");
  await page.waitForTimeout(350);
  await page.click("[data-testid='emote-sun']");
  await page.waitForTimeout(350);
  await page.click("[data-testid='emote-heart']");
  await page.waitForTimeout(500);
  await page.click("[data-testid='raise-hand']");
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("gx-go", { detail: "reward" })));
  await page.waitForSelector("[data-testid='add-gift']");
  await page.waitForTimeout(400);
  await page.click("[data-testid='add-gift']");
  await page.waitForTimeout(1700);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("gx-go", { detail: "quests" })));
  await page.waitForSelector("[data-testid='quest-advance']");
  await page.waitForTimeout(400);
  await page.click("[data-testid='quest-advance']");
  await page.waitForTimeout(1500);
  const video = page.video();
  await context.close();
  const raw = await video.path();
  const target = path.join(out, "game-experience-motion.webm");
  fs.copyFileSync(raw, target);
  console.log(target);
} finally {
  await browser.close();
  await server.close();
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
