/**
 * Screenshot every harness story.
 *
 *   pnpm ui:shots              all stories
 *   pnpm ui:shots publication-review   just one
 *
 * Boots the harness Vite server itself, shoots each story at desktop and
 * mobile widths into harness/shots/, and fails loudly on any console error so
 * a screenshot can never quietly hide a broken render.
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const SHOTS = path.join(here, "shots");
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// Read the story keys straight off the source so this stays in step with
// stories.tsx without importing TSX into plain Node.
const storySrc = fs.readFileSync(path.join(here, "stories.tsx"), "utf8");
const block = storySrc.split("export const STORIES")[1] ?? "";
const keys = [...block.matchAll(/^\s{2}"([^"]+)":\s*\{/gm)].map((m) => m[1]);
const stories = only ? keys.filter((k) => k === only) : keys;
if (stories.length === 0) {
  console.error(only ? `No story named "${only}". Found: ${keys.join(", ")}` : "No stories found.");
  process.exit(1);
}

fs.mkdirSync(SHOTS, { recursive: true });

const server = await createServer({ configFile: path.join(here, "vite.config.ts") });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch();
const problems = [];

for (const story of stories) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(`http://localhost:${port}/?story=${story}`, { waitUntil: "networkidle" });
    await page.waitForSelector(`[data-harness-story="${story}"]`, { timeout: 10_000 });

    const file = path.join(SHOTS, `${story}.${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ${path.relative(process.cwd(), file)}`);
    if (errors.length) problems.push(`${story} (${vp.name}): ${errors.join(" | ")}`);
    await page.close();
  }
}

await browser.close();
await server.close();

if (problems.length) {
  console.error("\nConsole errors:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log("\nAll stories rendered clean.");
