/**
 * Comprehensive image optimization script.
 * Re-compresses all local WebP/PNG/JPG images with aggressive settings.
 * Skips favicons and files that are already small enough.
 *
 * Run: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const PUBLIC = path.resolve('client/public');

const tasks = [
  // Hero backgrounds — biggest win, large decorative images
  { input: `${PUBLIC}/images/hero-bg-desktop.webp`,   width: 1920, quality: 72, label: 'hero-bg-desktop' },
  { input: `${PUBLIC}/images/hero-bg-mobile.webp`,    width: 768,  quality: 72, label: 'hero-bg-mobile' },

  // Quest images — recompress with lower quality
  ...['quest-00-fire','quest-01-potion-brewing','quest-02-saving-seeds','quest-03-healing-wholes',
      'quest-04-dreaming-spaces-of-love','quest-05-rites-of-love','quest-06-healing-circles',
      'quest-07-wild-foraging','quest-08-medicine-journey','quest-09-tree-talk',
      'quest-10-communication-patterns','quest-11-coordination-patterns','quest-12-breathplay-future-dreaming']
    .map(name => ({
      input: `${PUBLIC}/images/quests/${name}.webp`,
      width: 800, quality: 75, label: `quests/${name}`,
    })),

  // Return card images
  ...['accelerator','community','journey-quests','next-quest','opportunity','schedule']
    .map(name => ({
      input: `${PUBLIC}/images/return-cards/${name}.webp`,
      width: 800, quality: 75, label: `return-cards/${name}`,
    })),

  // OG images (1200x630 optimal for social sharing)
  ...['crowd-pooling','map','connect','community','fund','seeds-contributions']
    .map(name => ({
      input: `${PUBLIC}/og/${name}.webp`,
      width: 1200, height: 630, quality: 80, label: `og/${name}`,
    })),

  // OG default
  { input: `${PUBLIC}/og-default.webp`, width: 1200, height: 630, quality: 80, label: 'og-default' },

  // Game page images
  { input: `${PUBLIC}/game-infinite-forest.webp`, width: 1200, quality: 78, label: 'game-infinite-forest' },
  { input: `${PUBLIC}/game-bridge-worlds.webp`,   width: 1200, quality: 78, label: 'game-bridge-worlds' },

  // Governance diagram
  { input: `${PUBLIC}/images/governance/rcvoice-vs-rgvoice.webp`, width: 1200, quality: 80, label: 'governance/rcvoice-vs-rgvoice' },

  // Globe assets
  { input: `${PUBLIC}/globe/earth-blue-marble.webp`, width: 1024, quality: 78, label: 'globe/earth-blue-marble' },
  { input: `${PUBLIC}/globe/night-sky.webp`,         width: 1024, quality: 75, label: 'globe/night-sky' },

  // Blog hero
  { input: `${PUBLIC}/blog-hero-bridging-worlds.webp`, width: 1200, quality: 80, label: 'blog-hero-bridging-worlds' },

  // Misc
  { input: `${PUBLIC}/earned-through-quests.webp`, width: 800, quality: 78, label: 'earned-through-quests' },
];

let totalBefore = 0;
let totalAfter = 0;

for (const task of tasks) {
  try {
    const statBefore = await fs.stat(task.input);
    const beforeKB = statBefore.size / 1024;

    let inst = sharp(task.input);
    if (task.width || task.height) {
      inst = inst.resize(task.width ?? null, task.height ?? null, { fit: 'inside', withoutEnlargement: true });
    }
    const buffer = await inst.webp({ quality: task.quality }).toBuffer();
    const afterKB = buffer.length / 1024;

    // Only overwrite if we save >5%
    if (buffer.length < statBefore.size * 0.95) {
      await fs.writeFile(task.input, buffer);
      totalBefore += statBefore.size;
      totalAfter += buffer.length;
      const pct = ((1 - afterKB / beforeKB) * 100).toFixed(0);
      console.log(`  ✓ ${task.label}: ${beforeKB.toFixed(0)}KB → ${afterKB.toFixed(0)}KB (${pct}% smaller)`);
    } else {
      console.log(`  - ${task.label}: ${beforeKB.toFixed(0)}KB (already optimal, skipped)`);
      totalBefore += statBefore.size;
      totalAfter += statBefore.size;
    }
  } catch (e) {
    console.log(`  ! ${task.label}: ${e.message}`);
  }
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB (saved ${((totalBefore-totalAfter)/1024/1024).toFixed(1)}MB)`);
