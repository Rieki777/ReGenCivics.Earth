/**
 * Readability audit for harness stories: WCAG AA text contrast measured
 * against the real background each piece of text sits on, 44px touch targets,
 * and sideways scrolling, at desktop and phone widths.
 *
 *   node harness/audit.mjs story-a story-b ...     (no names: every story)
 *
 * Contrast walks up from each text element to the first ancestor with a solid
 * background (alpha layers blended on the way, gradients read from their
 * first colour stop), so a white/70 label on a forest card is measured on the
 * forest card. Thresholds: 4.5:1 for body text, 3:1 for large text (24px, or
 * 18.66px bold). Placeholders are measured too, because people read them.
 *
 * Exits non-zero when anything fails, so it can gate a change.
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(here, "shots");
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const storySrc = fs.readFileSync(path.join(here, "stories.tsx"), "utf8");
const block = storySrc.split("export const STORIES")[1] ?? "";
const keys = [...block.matchAll(/^\s{2}"([^"]+)":\s*\{/gm)].map((m) => m[1]);
const wanted = process.argv.slice(2);
const stories = wanted.length ? keys.filter((k) => wanted.includes(k)) : keys;

/** Runs in the page: returns every failure on the current story. */
function auditPage() {
  const root = document.querySelector("[data-harness-story]");
  // Let the browser convert any colour syntax (rgb, oklab, oklch, color(),
  // hex) by painting it on a 1px canvas and reading the pixel back. Tailwind 4
  // writes gradients in oklab, which a regex for rgb() never sees.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const parse = (c) => {
    if (!c || c === "transparent") return null;
    if (cache.has(c)) return cache.get(c);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const out = d[3] === 0 ? null : { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    cache.set(c, out);
    return out;
  };
  const firstStop = (img) => {
    if (!img || img === "none") return null;
    const m = img.match(/(rgba?|oklab|oklch|lab|lch|hsla?|color)\([^()]*\)|#[0-9a-fA-F]{3,8}/);
    return m ? parse(m[0]) : null;
  };
  const blend = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      let c = parse(cs.backgroundColor);
      if ((!c || c.a === 0) && cs.backgroundImage && cs.backgroundImage !== "none") c = firstStop(cs.backgroundImage);
      const op = Number(cs.opacity);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 0.99) break;
      }
      if (op < 1 && n === el) { /* element opacity handled on text */ }
    }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
    return out;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const label = (el) => (el.innerText || el.getAttribute("placeholder") || el.getAttribute("aria-label") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60);
  const failures = [];
  const seen = new Set();

  // Text contrast: elements that own a text node.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || !visible(el)) continue;
    seen.add(el);
    if (el.closest("[aria-hidden='true']") || el.closest("svg")) continue;
    const cs = getComputedStyle(el);
    let fg = parse(cs.color);
    if (!fg) continue;
    let opacity = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
    // Still mid-reveal or deliberately hidden: not something a reader sees.
    if (opacity < 0.05) continue;
    const bg = bgOf(el);
    fg = blend({ ...fg, a: fg.a * opacity }, bg);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const r = ratio(fg, bg);
    const disabled = el.closest("button[disabled], [aria-disabled='true']");
    if (r < need && !disabled) failures.push(`contrast ${r.toFixed(2)} < ${need}: "${label(el)}" (${size}px)`);
  }
  // Placeholders.
  for (const el of root.querySelectorAll("input[placeholder], textarea[placeholder]")) {
    if (!visible(el)) continue;
    const ph = parse(getComputedStyle(el, "::placeholder").color);
    if (!ph) continue;
    const bg = bgOf(el);
    const r = ratio(blend(ph, bg), bg);
    if (r < 4.5) failures.push(`placeholder ${r.toFixed(2)} < 4.5: "${el.getAttribute("placeholder").slice(0, 50)}"`);
  }
  // Field outlines (WCAG 1.4.11): a text field's edge must reach 3:1 against
  // what is around it, or people cannot see where to type.
  for (const el of root.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const width = parseFloat(cs.borderBottomWidth);
    const border = parse(cs.borderBottomColor);
    const fill = parse(cs.backgroundColor);
    const around = el.parentElement ? bgOf(el.parentElement) : { r: 255, g: 255, b: 255, a: 1 };
    const fieldFill = fill && fill.a > 0 ? blend(fill, around) : around;
    const edge = width >= 1 && border ? blend(border, around) : fieldFill;
    const r = Math.max(ratio(edge, around), ratio(fieldFill, around));
    if (r < 3) failures.push(`field edge ${r.toFixed(2)} < 3: "${label(el)}"`);
    // What people type is text too, read against the field's own fill.
    if (el.value) {
      const ink = parse(cs.color);
      if (ink) {
        const tr = ratio(blend(ink, fieldFill), fieldFill);
        if (tr < 4.5) failures.push(`typed text ${tr.toFixed(2)} < 4.5: "${label(el)}"`);
      }
    }
  }
  // Touch targets.
  for (const el of root.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=radio], [role=checkbox]")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.matches("input[type=checkbox], input[type=radio], [role=checkbox], [role=switch]")) {
      // Wrapped in its label, or labelled from beside it in a full-height row.
      const lab = el.closest("label") || (el.id && document.querySelector('label[for="' + el.id + '"]') ? el.parentElement : null);
      if (lab && lab.getBoundingClientRect().height >= 44) continue;
    }
    // Links inside running text are exempt (WCAG 2.5.8 inline exception).
    // An inline link counts as "in a sentence" when its parent has more text than the link.
    if (
      el.matches("a") &&
      getComputedStyle(el).display === "inline" &&
      el.parentElement &&
      el.parentElement.textContent.trim().length > el.textContent.trim().length + 3
    ) continue;
    if (r.height < 44 && r.width < 44) failures.push(`target ${Math.round(r.width)}x${Math.round(r.height)}: "${label(el)}"`);
    else if (r.height < 44 && !el.matches("textarea")) failures.push(`target height ${Math.round(r.height)}: "${label(el)}"`);
  }
  // Sideways scroll.
  const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (over > 1) failures.push(`page scrolls sideways by ${over}px`);
  return failures;
}

/** Story-specific steps before measuring (e.g. try to send so the errors show). */
const BEFORE = {
  "alliance-apply-tools": async (page) => {
    await page.getByRole("button", { name: /Send my application/ }).click();
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
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/?story=${story}`, { waitUntil: "networkidle" });
    await page.waitForSelector(`[data-harness-story="${story}"]`, { timeout: 10_000 });
    // The app runs public pages with <html class="dark"> and admin light
    // (App.tsx ThemeProvider). Shared components carry dark: styles, so a
    // story measured without the class can pass while the live page fails.
    if (!/^(admin|alliance-admin|alliance-inquiry)/.test(story)) {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    }
    await page.waitForTimeout(400);
    if (BEFORE[story]) await BEFORE[story](page);
    // Scroll-reveal sections start at opacity 0 until they enter the
    // viewport; walk the page so every one has revealed before measuring.
    await page.evaluate(async () => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    const failures = [...errors.map((e) => `page error: ${e}`), ...(await page.evaluate(auditPage))];
    const unique = [...new Set(failures)];
    await page.screenshot({ path: path.join(SHOTS, `${story}.${vp.name}.png`), fullPage: true });
    console.log(`${unique.length ? "✗" : "✓"} ${story} (${vp.name})${unique.length ? `: ${unique.length}` : ""}`);
    for (const f of unique) console.log(`    ${f}`);
    total += unique.length;
    await page.close();
  }
}

await browser.close();
await server.close();
console.log(total ? `\n${total} finding(s).` : "\nNo findings.");
process.exit(total ? 1 : 0);
