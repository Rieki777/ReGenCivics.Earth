/**
 * Comprehensive image optimization script.
 *
 * Strategy:
 *  - Quest / return-card / game / logo / governance PNGs+JPGs  →  WebP (deletes original)
 *  - OG images (og/*.png, og-default.jpg)  →  resize 1200×630, re-save as compressed PNG/JPG
 *    (keep original format — social-media crawlers need PNG/JPG at a known URL)
 *  - Globe textures  →  recompress JPEG in-place (three.js needs JPEG)
 *  - Crowd-pooling-hero.webp + quest *.webp  →  re-compress WebP in-place
 *  - Favicons / app icons  →  skipped (browser compat)
 *
 * Run: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

const PUBLIC = path.resolve('client/public');
const SRC_ROOT = path.resolve('client/src');

// ── helpers ──────────────────────────────────────────────────────────────────
async function fileSize(fp) {
  try { return (await fs.stat(fp)).size; } catch { return null; }
}

async function toWebP(src, { width, height, quality = 82 } = {}) {
  const s = await fileSize(src);
  if (!s) { console.log(`  ! missing: ${src}`); return; }

  const dst = src.replace(/\.(png|jpe?g)$/i, '.webp');
  // Read into buffer so sharp releases file handle before we delete the source
  const inputBuf = await fs.readFile(src);
  let inst = sharp(inputBuf).rotate();
  if (width || height) inst = inst.resize(width ?? null, height ?? null, { fit: 'inside', withoutEnlargement: true });
  const buf = await inst.webp({ quality, effort: 6 }).toBuffer();

  if (buf.length < s * 0.97 || dst !== src) {
    await safeWrite(dst, buf);
    if (dst !== src && existsSync(src)) await fs.unlink(src);
    console.log(`  ✓ ${rel(src)} → ${path.basename(dst)}  ${kb(s)} → ${kb(buf.length)}`);
    return { from: src, to: dst };
  } else {
    console.log(`  - ${rel(src)}  ${kb(s)} (already optimal)`);
    return null;
  }
}

async function safeWrite(dest, buf) {
  // Write to a tmp file then rename — avoids Windows file-lock issues
  const tmp = dest + '.tmp';
  await fs.writeFile(tmp, buf);
  try {
    await fs.rename(tmp, dest);
  } catch {
    // On Windows rename can fail if dest is locked; try copy+delete
    await fs.copyFile(tmp, dest);
    await fs.unlink(tmp);
  }
}

async function recompressJpeg(src, { width, height, quality = 78 } = {}) {
  const s = await fileSize(src);
  if (!s) { console.log(`  ! missing: ${src}`); return; }
  let inst = sharp(src).rotate();
  if (width || height) inst = inst.resize(width ?? null, height ?? null, { fit: 'cover', position: 'attention' });
  const buf = await inst.jpeg({ quality, mozjpeg: true }).toBuffer();
  if (buf.length < s * 0.97) {
    await safeWrite(src, buf);
    console.log(`  ✓ ${rel(src)}  ${kb(s)} → ${kb(buf.length)}`);
  } else {
    console.log(`  - ${rel(src)}  ${kb(s)} (already optimal)`);
  }
}

async function recompressPng(src, { width, height } = {}) {
  const s = await fileSize(src);
  if (!s) { console.log(`  ! missing: ${src}`); return; }
  let inst = sharp(src).rotate();
  if (width || height) inst = inst.resize(width ?? null, height ?? null, { fit: 'cover', position: 'attention' });
  const buf = await inst.png({ compressionLevel: 9, palette: false }).toBuffer();
  if (buf.length < s * 0.97) {
    await safeWrite(src, buf);
    console.log(`  ✓ ${rel(src)}  ${kb(s)} → ${kb(buf.length)}`);
  } else {
    console.log(`  - ${rel(src)}  ${kb(s)} (already optimal)`);
  }
}

async function recompressWebP(src, { width, height, quality = 80 } = {}) {
  const s = await fileSize(src);
  if (!s) { console.log(`  ! missing: ${src}`); return; }
  // Read into buffer first so sharp releases the file handle before we write back
  const inputBuf = await fs.readFile(src);
  let inst = sharp(inputBuf).rotate();
  if (width || height) inst = inst.resize(width ?? null, height ?? null, { fit: 'inside', withoutEnlargement: true });
  const buf = await inst.webp({ quality, effort: 6 }).toBuffer();
  if (buf.length < s * 0.97) {
    await safeWrite(src, buf);
    console.log(`  ✓ ${rel(src)}  ${kb(s)} → ${kb(buf.length)}`);
  } else {
    console.log(`  - ${rel(src)}  ${kb(s)} (already optimal)`);
  }
}

function rel(fp) { return path.relative(PUBLIC, fp).replace(/\\/g, '/'); }
function kb(n) { return n > 1024 * 1024 ? `${(n/1024/1024).toFixed(2)}MB` : `${(n/1024).toFixed(0)}KB`; }

// ── collect renamed paths for code-ref patching ──────────────────────────────
const renamed = []; // { from: '/abs/path.png', to: '/abs/path.webp' }

// ── 1. Quest images ───────────────────────────────────────────────────────────
console.log('\n── Quest images ──');
const questNames = [
  'quest-00-fire','quest-01-potion-brewing','quest-02-saving-seeds','quest-03-healing-wholes',
  'quest-04-dreaming-spaces-of-love','quest-05-rites-of-love','quest-06-healing-circles',
  'quest-07-wild-foraging','quest-08-medicine-journey','quest-09-tree-talk',
  'quest-10-communication-patterns','quest-11-coordination-patterns','quest-12-breathplay-future-dreaming',
  'quest-hero','quest-acts','quest-remembers','roles-dialogue',
];
for (const name of questNames) {
  let converted = false;
  for (const ext of ['png','jpg']) {
    const fp = `${PUBLIC}/images/quests/${name}.${ext}`;
    if (existsSync(fp)) {
      const r = await toWebP(fp, { width: 900, quality: 82 });
      if (r) renamed.push(r);
      converted = true;
    }
  }
  // re-compress only if it was already WebP (not just converted)
  if (!converted) {
    const wp = `${PUBLIC}/images/quests/${name}.webp`;
    if (existsSync(wp)) await recompressWebP(wp, { width: 900, quality: 82 });
  }
}

// ── 2. Return card images ─────────────────────────────────────────────────────
console.log('\n── Return card images ──');
const returnCardNames = ['accelerator','community','journey-quests','next-quest','opportunity','schedule'];
for (const name of returnCardNames) {
  let converted = false;
  for (const ext of ['png','jpg']) {
    const fp = `${PUBLIC}/images/return-cards/${name}.${ext}`;
    if (existsSync(fp)) {
      const r = await toWebP(fp, { width: 900, quality: 82 });
      if (r) renamed.push(r);
      converted = true;
    }
  }
  if (!converted) {
    const wp = `${PUBLIC}/images/return-cards/${name}.webp`;
    if (existsSync(wp)) await recompressWebP(wp, { width: 900, quality: 82 });
  }
}

// ── 3. Game page images ───────────────────────────────────────────────────────
console.log('\n── Game images ──');
for (const name of ['game-infinite-forest','game-bridge-worlds']) {
  let converted = false;
  for (const ext of ['jpg','jpeg','png']) {
    const fp = `${PUBLIC}/${name}.${ext}`;
    if (existsSync(fp)) {
      const r = await toWebP(fp, { width: 1400, quality: 78 });
      if (r) renamed.push(r);
      converted = true;
    }
  }
  if (!converted) {
    const wp = `${PUBLIC}/${name}.webp`;
    if (existsSync(wp)) await recompressWebP(wp, { width: 1400, quality: 78 });
  }
}

// ── 4. Logo images ────────────────────────────────────────────────────────────
console.log('\n── Logo images ──');
try {
  const logoDir = `${PUBLIC}/images/logos`;
  const logoFiles = await fs.readdir(logoDir);
  for (const f of logoFiles) {
    if (/\.(png|jpe?g)$/i.test(f)) {
      const fp = path.join(logoDir, f);
      const r = await toWebP(fp, { quality: 85 });
      if (r) renamed.push(r);
    }
    // skip already-webp logos
  }
} catch {}

// ── 5. Governance diagrams ────────────────────────────────────────────────────
console.log('\n── Governance images ──');
for (const name of ['rcvoice-vs-rgvoice']) {
  let converted = false;
  for (const ext of ['png','jpg']) {
    const fp = `${PUBLIC}/images/governance/${name}.${ext}`;
    if (existsSync(fp)) {
      const r = await toWebP(fp, { width: 1400, quality: 82 });
      if (r) renamed.push(r);
      converted = true;
    }
  }
  if (!converted) {
    const wp = `${PUBLIC}/images/governance/${name}.webp`;
    if (existsSync(wp)) await recompressWebP(wp, { width: 1400, quality: 82 });
  }
}

// ── 6. Misc standalone images ─────────────────────────────────────────────────
console.log('\n── Misc images ──');
for (const name of ['earned-through-quests']) {
  for (const ext of ['png','jpg']) {
    const fp = `${PUBLIC}/${name}.${ext}`;
    if (existsSync(fp)) {
      const r = await toWebP(fp, { width: 1000, quality: 80 });
      if (r) renamed.push(r);
    }
  }
}
// Thumbnail
for (const ext of ['jpg','jpeg','png']) {
  const fp = `${PUBLIC}/images/thumbnail-welcome-intro.${ext}`;
  if (existsSync(fp)) {
    const r = await toWebP(fp, { width: 800, quality: 80 });
    if (r) renamed.push(r);
  }
}
// Blog hero
for (const ext of ['jpg','jpeg','png']) {
  const fp = `${PUBLIC}/blog-hero-bridging-worlds.${ext}`;
  if (existsSync(fp)) {
    const r = await toWebP(fp, { width: 1400, quality: 80 });
    if (r) renamed.push(r);
  }
}
// Crowd-pooling hero (already WebP, just re-compress)
const cpHero = `${PUBLIC}/images/crowd-pooling-hero.webp`;
if (existsSync(cpHero)) await recompressWebP(cpHero, { width: 1600, quality: 78 });

// ── 6b. Ship inventory item icons ─────────────────────────────────────────────
// Generated by scripts/generate-ship-item-icon.ts as 1K PNGs. They render at
// 48–64px slots (ShipInventory.tsx), so 512px WebP is crisp with retina headroom.
// iconUrl is stored in the DB, not referenced in source, so these are NOT added
// to `renamed` (no code-ref patching needed).
console.log('\n── Ship inventory item icons ──');
try {
  const itemsDir = `${PUBLIC}/images/ship/items`;
  const itemFiles = await fs.readdir(itemsDir);
  for (const f of itemFiles) {
    if (/\.(png|jpe?g)$/i.test(f)) {
      await toWebP(path.join(itemsDir, f), { width: 512, quality: 85 });
    }
  }
} catch {}

// ── 7. OG images — resize + compress, keep original format ────────────────────
console.log('\n── OG images (resize to 1200×630, keep PNG/JPG for social compat) ──');
const ogNames = ['crowd-pooling','map','connect','community','fund','seeds-contributions','seeds-source'];
for (const name of ogNames) {
  const pngFp = `${PUBLIC}/og/${name}.png`;
  const jpgFp = `${PUBLIC}/og/${name}.jpg`;
  if (existsSync(pngFp)) await recompressPng(pngFp, { width: 1200, height: 630 });
  else if (existsSync(jpgFp)) await recompressJpeg(jpgFp, { width: 1200, height: 630, quality: 85 });
}
// og-default
const ogDef = `${PUBLIC}/og-default.jpg`;
if (existsSync(ogDef)) await recompressJpeg(ogDef, { width: 1200, height: 630, quality: 85 });

// ── 8. Globe textures — recompress JPEG in-place ─────────────────────────────
console.log('\n── Globe textures ──');
for (const name of ['earth-blue-marble']) {
  for (const ext of ['jpg','jpeg']) {
    const fp = `${PUBLIC}/globe/${name}.${ext}`;
    if (existsSync(fp)) await recompressJpeg(fp, { width: 1024, quality: 78 });
  }
}
// night-sky is PNG
const nightSky = `${PUBLIC}/globe/night-sky.png`;
if (existsSync(nightSky)) await recompressPng(nightSky, { width: 1024 });
const earthTopo = `${PUBLIC}/globe/earth-topology.png`;
if (existsSync(earthTopo)) await recompressPng(earthTopo);

// ── 9. Patch code references for renamed files ────────────────────────────────
if (renamed.length > 0) {
  console.log(`\n── Patching ${renamed.length} code references ──`);

  // Collect all source files to patch
  async function collectSrc(dir) {
    const result = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        result.push(...await collectSrc(fp));
      } else if (/\.(tsx?|jsx?|css|html|json|md)$/.test(e.name)) {
        result.push(fp);
      }
    }
    return result;
  }

  const sourceFiles = [
    ...(await collectSrc(SRC_ROOT)),
    path.resolve('client/index.html'),
    path.resolve('client/public/sitemap.xml'),
  ];

  for (const sf of sourceFiles) {
    let content;
    try { content = await fs.readFile(sf, 'utf8'); } catch { continue; }
    let updated = content;
    for (const { from, to } of renamed) {
      const fromRel = path.relative(PUBLIC, from).replace(/\\/g, '/');
      const toRel   = path.relative(PUBLIC, to).replace(/\\/g, '/');
      // match both /images/quests/foo.png and images/quests/foo.png patterns
      updated = updated.replaceAll(fromRel, toRel);
      updated = updated.replaceAll('/' + fromRel, '/' + toRel);
      // also match just the filename in case it's referenced without path
      updated = updated.replaceAll(path.basename(from), path.basename(to));
    }
    if (updated !== content) {
      await fs.writeFile(sf, updated);
      console.log(`  patched ${path.relative(process.cwd(), sf)}`);
    }
  }
}

console.log('\nDone! Run pnpm build to verify.');

