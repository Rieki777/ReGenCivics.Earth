/**
 * Generates the OG/social share image for the SEEDS contributions blog post.
 *
 * Usage:
 *   1. Save the Jeremy Fenske landscape image to client/public/og/seeds-source.jpg
 *   2. Run: node scripts/generate-seeds-og.mjs
 *   3. Output: client/public/og/seeds-contributions.webp
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';

const SOURCE = 'client/public/og/seeds-source.jpg';
const OUTPUT = 'client/public/og/seeds-contributions.webp';

const W = 1200;
const H = 630;

if (!existsSync(SOURCE)) {
  console.error(`Source image not found: ${SOURCE}`);
  console.error('Save the Jeremy Fenske landscape image to that path and re-run.');
  process.exit(1);
}

// SVG overlay: dark gradient at bottom + centered title text in gold/green
const overlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark gradient scrim — bottom heavy so text reads clearly -->
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="45%" stop-color="#000000" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0d1f0d" stop-opacity="0.75"/>
    </linearGradient>
    <!-- Gold-to-green glow for title -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#scrim)"/>

  <!-- ReGen Civics label (small, top of text block) -->
  <text
    x="${W / 2}"
    y="${H - 130}"
    text-anchor="middle"
    font-family="Georgia, serif"
    font-size="22"
    font-weight="400"
    letter-spacing="4"
    fill="#7dd87d"
    opacity="0.9"
  >REGEN CIVICS</text>

  <!-- Main title line 1 -->
  <text
    x="${W / 2}"
    y="${H - 85}"
    text-anchor="middle"
    font-family="Georgia, serif"
    font-size="54"
    font-weight="700"
    fill="#FFD700"
    filter="url(#glow)"
    letter-spacing="-1"
  >Claim Contributions to SEEDS</text>

  <!-- Main title line 2 -->
  <text
    x="${W / 2}"
    y="${H - 28}"
    text-anchor="middle"
    font-family="Georgia, serif"
    font-size="54"
    font-weight="700"
    fill="#FFD700"
    filter="url(#glow)"
    letter-spacing="-1"
  >in ReGen Civics</text>
</svg>
`;

const svgBuffer = Buffer.from(overlay);

sharp(SOURCE)
  .resize(W, H, { fit: 'cover', position: 'center' })
  .composite([{ input: svgBuffer, top: 0, left: 0 }])
  .webp({ quality: 85 })
  .toFile(OUTPUT)
  .then(info => {
    console.log(`✓ Generated: ${OUTPUT}`);
    console.log(`  ${info.width}x${info.height} — ${Math.round(info.size / 1024)}KB`);
  })
  .catch(err => {
    console.error('Sharp error:', err.message);
    process.exit(1);
  });
