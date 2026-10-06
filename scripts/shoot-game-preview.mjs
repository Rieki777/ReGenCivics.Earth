/**
 * Screenshots and a short motion clip for the /preview/game mockup.
 * Writes to /opt/cursor/artifacts. Not part of the live site.
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = "/opt/cursor/artifacts";
const raw = "/tmp/gx-raw";
const wide = "/tmp/gx-1440";
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
const sheets = [
  ["01-week-board.png", [["01-week-board"]]],
  ["02-reward-moment.png", [["02-reward-moment"]]],
  ["03-character-sheet.png", [["03-character-sheet"]]],
  ["04-quest-log.png", [["04-quest-log"]]],
  ["05-locked-teaser.png", [["05-locked-teaser"]]],
  ["06-paths-hosting.png", [["06-path-select"], ["06-hosting-levels"]]],
  ["07-phone-chrome.png", [["07-phone-before"], ["07-phone-after"]]],
  ["08-session-recap.png", [["08-session-recap"]]],
  ["09-guilds.png", [["09-guilds"]]],
  ["10-pwa.png", [["10-pwa-splash"], ["10-pwa-install"]]],
];
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

fs.mkdirSync(out, { recursive: true });
for (const file of fs.readdirSync(out)) {
  if (file.endsWith(".png") || file.endsWith(".webm")) fs.unlinkSync(path.join(out, file));
}
fs.mkdirSync(raw, { recursive: true });
fs.mkdirSync(wide, { recursive: true });

function pair(phone, desktop, dest) {
  const filter = [
    "[0:v]pad=390:844:0:0:color=0x0d1411[p]",
    "[1:v]pad=1280:844:0:22:color=0x0d1411[d]",
    "[p][d]hstack=inputs=2[row]",
  ].join(";");
  const result = spawnSync("ffmpeg", ["-y", "-i", phone, "-i", desktop, "-filter_complex", filter, "-map", "[row]", dest], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`compose failed ${dest}`);
}

function stack(rows, dest) {
  const inputs = rows.flatMap((row) => ["-i", row]);
  const filter = rows.map((_, index) => `[${index}:v]pad=1686:844:0:0:color=0x0d1411[r${index}]`).join(";")
    + ";"
    + rows.map((_, index) => `[r${index}]`).join("")
    + `vstack=inputs=${rows.length}`;
  const result = spawnSync("ffmpeg", ["-y", ...inputs, "-filter_complex", filter, dest], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`stack failed ${dest}`);
}

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
      const dest = path.join(raw, `${file}-${vp.name}.png`);
      await page.screenshot({ path: dest });
      console.log(dest);
      if (errors.length) problems.push(`${file} ${vp.name}: ${errors.join(" | ")}`);
      await page.close();
    }
    const widePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await widePage.emulateMedia({ reducedMotion: "no-preference" });
    await widePage.goto(`http://localhost:${port}/?story=game-preview&bare=1&chrome=0&shot=1&screen=${id}`, { waitUntil: "networkidle" });
    await widePage.waitForSelector(`[data-screen="${id}"]`, { timeout: 15000 });
    const wideDest = path.join(wide, `${file}.png`);
    await widePage.screenshot({ path: wideDest });
    console.log(wideDest);
    await widePage.close();
  }

  for (const [name, rows] of sheets) {
    const built = [];
    for (const [base] of rows) {
      const rowFile = path.join(raw, `${base}-row.png`);
      pair(path.join(raw, `${base}-phone.png`), path.join(raw, `${base}-desktop.png`), rowFile);
      built.push(rowFile);
    }
    const dest = path.join(out, name);
    if (built.length === 1) fs.copyFileSync(built[0], dest);
    else stack(built, dest);
    console.log(dest);
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
