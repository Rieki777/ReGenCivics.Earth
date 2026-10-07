/**
 * WhatsApp-style sheet of every Season 2 link card.
 * Writes /opt/cursor/artifacts/season2-link-previews.png
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { allSeason2Previews } from "../shared/season2Previews";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const cards = allSeason2Previews()
  .map((preview) => {
    const src = path.resolve("client/public/og/s2", preview.file);
    const label = preview.title.replace(" | ReGen Civics", "");
    return `<article class="card">
      <img src="file://${src}" alt="" />
      <div class="copy">
        <h2>${escapeHtml(label)}</h2>
        <p>${escapeHtml(preview.description)}</p>
        <span>regencivics.earth</span>
      </div>
    </article>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Season 2 link previews</title>
<style>
  body { margin: 0; background: #0b141a; color: #e9edef; font-family: Inter, "Segoe UI", sans-serif; }
  main { padding: 28px 24px 40px; }
  h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
  .lead { margin: 0 0 22px; color: #8696a0; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(3, 340px); gap: 18px; }
  .card { background: #1f2c33; border-radius: 10px; overflow: hidden; }
  img { display: block; width: 340px; height: 178px; object-fit: cover; }
  .copy { padding: 10px 12px 12px; }
  h2 { margin: 0 0 4px; font-size: 15px; line-height: 1.25; font-weight: 700; }
  p { margin: 0 0 8px; color: #d1d7db; font-size: 13px; line-height: 1.35; }
  span { color: #7dd87d; font-size: 12px; }
</style>
</head>
<body>
<main>
  <h1>Season 2 link previews</h1>
  <p class="lead">How each shared URL reads in a WhatsApp-style card.</p>
  <div class="grid">${cards}</div>
</main>
</body>
</html>`;

const htmlPath = "/tmp/season2-link-previews.html";
const outPath = "/opt/cursor/artifacts/season2-link-previews.png";
fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(outPath);
