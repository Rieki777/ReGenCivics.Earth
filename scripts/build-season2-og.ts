/**
 * Build the Season 2 Open Graph cards.
 *
 * Each card is a 1200x630 JPEG under 300KB: existing site art, a forest
 * scrim, a leaf-green glow, and the page title in large type. /join uses
 * the tree-portal photo. Re-run with `npx tsx scripts/build-season2-og.ts`.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { allSeason2Previews } from "../shared/season2Previews";

const OUT_DIR = path.resolve("client/public/og/s2");
const TREE = "/home/ubuntu/.cursor/projects/workspace/uploads/join-hero-tree_ec35.jpg";

const ART: Record<string, string> = {
  "/season2": "client/public/season2/hero.jpg",
  "/season-schedule": "client/public/season2/alliance-network.webp",
  "/interop-sessions": "client/public/season2/who-5-city.jpg",
  "/schedule": "client/public/season2/season2-constellation.webp",
  "/join": TREE,
  "/apply": "client/public/season2/who-1-gardens.jpg",
  "/shape-next-session": "client/public/season2/roadmap.jpg",
  "/apply/status": "client/public/season2/selection-day.jpg",
  "/series/Season 2": "client/public/season2/season2-gathering.webp",
  "/season2/week/1": "client/public/season2/s1-heartland.jpg",
  "/season2/week/2": "client/public/season2/div-canopy.jpg",
  "/season2/week/3": "client/public/season2/who-2-cohousing.jpg",
  "/season2/week/4": "client/public/season2/who-3-ecovillage.jpg",
  "/season2/week/5": "client/public/season2/game-journey.jpg",
  "/season2/week/6": "client/public/season2/who-6-bioregion.jpg",
  "/season2/week/7": "client/public/season2/infinite-games.jpg",
  "/season2/week/8": "client/public/season2/token-swap.jpg",
  "/season2/week/9": "client/public/season2/div-soil.jpg",
  "/season2/week/10": "client/public/season2/who-4-lab.jpg",
  "/season2/week/11": "client/public/season2/s1-finca.jpg",
  "/season2/week/12": "client/public/season2/div-myc.jpg",
  "/season2/week/13": "client/public/season2/launch-game.webp",
};

const GLOW = [
  [18, 28],
  [78, 22],
  [50, 18],
  [30, 36],
  [70, 30],
  [22, 20],
  [84, 40],
  [40, 24],
  [62, 16],
  [15, 42],
  [88, 26],
  [48, 34],
  [26, 18],
  [72, 38],
  [36, 22],
  [58, 40],
  [12, 30],
  [80, 18],
  [44, 28],
  [66, 42],
  [24, 16],
  [54, 32],
];

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(title: string): { size: number; lines: string[] } {
  if (title.length <= 18) return { size: 84, lines: wrap(title, 16) };
  if (title.length <= 32) return { size: 68, lines: wrap(title, 20) };
  if (title.length <= 48) return { size: 56, lines: wrap(title, 26) };
  return { size: 48, lines: wrap(title, 30) };
}

function overlay(kicker: string, title: string, glowAt: number): string {
  const { size, lines } = layout(title);
  const [cx, cy] = GLOW[glowAt % GLOW.length];
  const lineHeight = Math.round(size * 1.12);
  const block = 40 + lines.length * lineHeight;
  const kickerY = 630 - 56 - block;
  const text = lines
    .map((line, i) => {
      const y = kickerY + 48 + i * lineHeight;
      return `<text x="64" y="${y}" font-family="Inter, sans-serif" font-size="${size}" font-weight="700" fill="#ffffff">${xml(line)}</text>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d2818" stop-opacity="0.28"/>
      <stop offset="42%" stop-color="#0d2818" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0d2818" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="glow" cx="${cx}%" cy="${cy}%" r="42%">
      <stop offset="0%" stop-color="#7dd87d" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#7dd87d" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#7dd87d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <text x="64" y="${kickerY}" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="#7dd87d" letter-spacing="3">${xml(kicker)}</text>
  ${text}
  <rect x="0" y="618" width="1200" height="12" fill="#7dd87d"/>
</svg>`;
}

async function writeCard(src: string, dest: string, svg: string): Promise<number> {
  const photo = await sharp(src)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.82, saturation: 1.05 })
    .toBuffer();
  let quality = 74;
  let out = await sharp(photo)
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  while (out.length > 290 * 1024 && quality > 48) {
    quality -= 6;
    out = await sharp(photo)
      .composite([{ input: Buffer.from(svg) }])
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
  fs.writeFileSync(dest, out);
  return out.length;
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const previews = allSeason2Previews();
  for (const [index, preview] of previews.entries()) {
    const src = ART[preview.path];
    if (!src || !fs.existsSync(src)) {
      throw new Error(`Missing art for ${preview.path}: ${src ?? "(unset)"}`);
    }
    const dest = path.join(OUT_DIR, preview.file);
    const bytes = await writeCard(src, dest, overlay(preview.kicker, preview.imageTitle, index));
    const meta = await sharp(dest).metadata();
    console.log(`${preview.file}\t${meta.width}x${meta.height}\t${Math.round(bytes / 1024)}KB\t${preview.path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
