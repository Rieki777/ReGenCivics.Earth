/**
 * Local visual audit: login to admin, screenshot overview vs applications,
 * check html.dark, Harvest/Funding placement, plus a sampled contrast pass
 * on placeholders and cream-on-forest chips.
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

function contrastProbe() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const g = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => {
    try {
      g.clearRect(0, 0, 1, 1);
      g.globalCompositeOperation = "copy";
      g.fillStyle = "#000";
      const probe = g.fillStyle;
      g.fillStyle = css;
      if (g.fillStyle === probe && !/^#000|black|rgb\(0, ?0, ?0\)/i.test(css)) return null;
      g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch {
      return null;
    }
  };
  const over = (top, bottom) => {
    const a = top[3];
    return [0, 1, 2].map((k) => Math.round(top[k] * a + bottom[k] * (1 - a))).concat(1);
  };
  const lum = (c) => {
    const [r, gg, b] = c.slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * gg + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const L1 = lum(a);
    const L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  const backdrop = (el) => {
    const layers = [];
    let e = el;
    while (e && e !== document.documentElement) {
      const cs = getComputedStyle(e);
      const v = rgba(cs.backgroundColor);
      if (v && v[3] > 0) layers.push(v);
      if (v && v[3] >= 0.999) break;
      e = e.parentElement;
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  };

  const fails = [];
  for (const el of document.querySelectorAll("*")) {
    let t = "";
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    t = t.trim();
    if (t.length < 2) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.1) continue;
    const fgRaw = rgba(cs.color);
    if (!fgRaw) continue;
    const bg = backdrop(el);
    const fg = over(fgRaw, bg);
    const cr = ratio(fg, bg);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight) >= 700;
    const floor = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (cr < floor) {
      fails.push({
        text: t.slice(0, 48),
        ratio: +cr.toFixed(2),
        floor,
        size: Math.round(size),
      });
    }
  }

  const placeholders = [];
  for (const el of document.querySelectorAll("input[placeholder], textarea[placeholder]")) {
    const cs = getComputedStyle(el, "::placeholder");
    const fgRaw = rgba(cs.color);
    if (!fgRaw) continue;
    const bg = backdrop(el);
    const fg = over(fgRaw, bg);
    const cr = ratio(fg, bg);
    placeholders.push({
      ph: (el.getAttribute("placeholder") || "").slice(0, 40),
      ratio: +cr.toFixed(2),
      color: cs.color,
    });
  }

  return {
    htmlDark: document.documentElement.classList.contains("dark"),
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    harvest: (document.body.innerText || "").includes("Compose, fact-check, and publish"),
    funding: (document.body.innerText || "").includes("All 117 researched funders"),
    knowledgeMap: (document.body.innerText || "").includes("Knowledge Map"),
    claims: (document.body.innerText || "").includes("Stewardship Claims"),
    failCount: fails.length,
    fails: fails.slice(0, 12),
    placeholders: placeholders.slice(0, 8),
    palePlaceholders: placeholders.filter((p) => p.ratio < 4.5).slice(0, 8),
  };
}

async function metrics(label) {
  const info = await page.evaluate(contrastProbe);
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
await metrics("settings");

await page.goto(`${BASE}/admin?tab=events`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector(".admin-root", { timeout: 25000 });
await shot("05-events");
await metrics("events");

await page.goto(`${BASE}/connect`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1500);
await shot("06-connect");
const connect = await metrics("connect");

await page.goto(`${BASE}/apply`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1500);
await shot("07-apply");
const apply = await metrics("apply");

await page.goto(`${BASE}/investor`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1500);
await shot("08-investor");
const investor = await metrics("investor");

await browser.close();

let failed = false;
if (overview.htmlDark) {
  console.error("FAIL overview still has html.dark");
  failed = true;
}
if (!overview.harvest || !overview.funding) {
  console.error("FAIL overview missing Harvest or Funding cards", overview.harvest, overview.funding);
  failed = true;
}
if (apps.harvest || apps.funding) {
  console.error("FAIL applications tab still shows Harvest/Funding", apps.harvest, apps.funding);
  failed = true;
}
if (!connect.htmlDark) {
  console.error("FAIL public /connect lost dark theme");
  failed = true;
}
if (!apply.htmlDark) {
  console.error("FAIL public /apply lost dark theme");
  failed = true;
}
if (apply.palePlaceholders.length) {
  console.error("FAIL apply form pale placeholders", apply.palePlaceholders);
  failed = true;
}
if (investor.palePlaceholders.length) {
  console.error("FAIL investor form pale placeholders", investor.palePlaceholders);
  failed = true;
}
if (failed) process.exit(1);
console.log("AUDIT_OK");
