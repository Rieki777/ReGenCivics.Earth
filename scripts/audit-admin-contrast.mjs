/**
 * Local visual audit: login to admin, screenshot overview vs applications,
 * check html.dark, Harvest/Funding placement, scrollbar count.
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.AUDIT_URL || "http://localhost:3000";
const OUT = "/tmp/admin-contrast-audit";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log("SHOT", path);
}

async function metrics(label) {
  const info = await page.evaluate(() => {
    const htmlDark = document.documentElement.classList.contains("dark");
    const harvest = (document.body.innerText || "").includes("Compose, fact-check, and publish");
    const funding = (document.body.innerText || "").includes("All 117 researched funders");
    const scrollers = [...document.querySelectorAll("*")].filter(el => {
      const s = getComputedStyle(el);
      return (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4;
    }).map(el => ({
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 80),
      sh: el.scrollHeight,
      ch: el.clientHeight,
    }));
    return {
      htmlDark,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      harvest,
      funding,
      scrollers,
      title: document.title,
      knowledgeMap: (document.body.innerText || "").includes("Knowledge Map"),
      claims: (document.body.innerText || "").includes("Stewardship Claims"),
      bodyText: document.body.innerText.slice(0, 800),
    };
  });
  console.log("METRICS", label, JSON.stringify(info, null, 2));
  return info;
}

await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1500);
await shot("01-admin-login");

const pwd = page.locator('input[type="password"]');
if (await pwd.count()) {
  await pwd.fill("333");
  await page.getByRole("button", { name: /access dashboard/i }).click();
}
await page.waitForSelector(".admin-root", { timeout: 25000 });
await shot("02-admin-after-login");
const overview = await metrics("overview");

// Applications tab via URL
await page.goto(`${BASE}/admin?tab=applications`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector(".admin-root", { timeout: 25000 });
await shot("03-applications");
const apps = await metrics("applications");

await page.goto(`${BASE}/admin?tab=settings`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector(".admin-root", { timeout: 25000 });
await page.evaluate(() => {
  const scroller = document.querySelector(".flex-1.min-h-0.overflow-y-auto");
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
});
await page.waitForTimeout(800);
await shot("04-settings");
const settings = await metrics("settings");

await page.goto(`${BASE}/connect`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1500);
await shot("05-connect");
const connectDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
console.log("CONNECT_DARK", connectDark);

await browser.close();

if (overview.htmlDark) {
  console.error("FAIL overview still has html.dark");
  process.exit(1);
}
if (!overview.harvest || !overview.funding) {
  console.error("FAIL overview missing Harvest or Funding cards", overview.harvest, overview.funding);
  process.exit(1);
}
if (apps.harvest || apps.funding) {
  console.error("FAIL applications tab still shows Harvest/Funding", apps.harvest, apps.funding);
  process.exit(1);
}
if (!connectDark) {
  console.error("FAIL public /connect lost dark theme");
  process.exit(1);
}
console.log("AUDIT_OK");
