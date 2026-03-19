/**
 * Compress large PNG/JPG source files to optimized WebP.
 * Writes to new paths alongside the originals.
 * Skips if WebP already exists and is smaller than the threshold.
 */
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const PUBLIC = path.resolve('client/public');

// Files to process: PNG/JPG sources → rewrite their WebP counterparts
// Using PNG sources avoids the write-lock issue when recompressing WebP→WebP
const tasks = [
  // Quest images (from PNG sources)
  ...['quest-00-fire','quest-01-potion-brewing','quest-02-saving-seeds','quest-03-healing-wholes',
      'quest-04-dreaming-spaces-of-love','quest-05-rites-of-love','quest-06-healing-circles',
      'quest-07-wild-foraging','quest-08-medicine-journey','quest-09-tree-talk',
      'quest-10-communication-patterns','quest-11-coordination-patterns','quest-12-breathplay-future-dreaming']
    .map(name => ({
      input: `${PUBLIC}/images/quests/${name}.png`,
      output: `${PUBLIC}/images/quests/${name}.webp`,
      width: 800, quality: 75, label: `quests/${name}`,
    })),

  // Return card images (from PNG sources)
  ...['accelerator','community','journey-quests','next-quest','opportunity','schedule']
    .map(name => ({
      input: `${PUBLIC}/images/return-cards/${name}.png`,
      output: `${PUBLIC}/images/return-cards/${name}.webp`,
      width: 800, quality: 75, label: `return-cards/${name}`,
    })),

  // OG images (from PNG sources)
  ...['crowd-pooling','map','connect','community','fund']
    .map(name => ({
      input: `${PUBLIC}/og/${name}.png`,
      output: `${PUBLIC}/og/${name}.webp`,
      width: 1200, height: 630, quality: 80, label: `og/${name}`,
    })),

  // Root images from JPG sources
  { input: `${PUBLIC}/og-default.jpg`, output: `${PUBLIC}/og-default.webp`, width: 1200, height: 630, quality: 80, label: 'og-default' },
  { input: `${PUBLIC}/game-infinite-forest.jpg`, output: `${PUBLIC}/game-infinite-forest.webp`, width: 1200, quality: 78, label: 'game-infinite-forest' },
  { input: `${PUBLIC}/game-bridge-worlds.jpg`, output: `${PUBLIC}/game-bridge-worlds.webp`, width: 1200, quality: 78, label: 'game-bridge-worlds' },

  // Governance PNG source
  { input: `${PUBLIC}/images/governance/rcvoice-vs-rgvoice.png`, output: `${PUBLIC}/images/governance/rcvoice-vs-rgvoice.webp`, width: 1200, quality: 80, label: 'governance/rcvoice-vs-rgvoice' },

  // Globe assets from PNG/JPG sources
  { input: `${PUBLIC}/globe/night-sky.png`, output: `${PUBLIC}/globe/night-sky.webp`, width: 1024, quality: 75, label: 'globe/night-sky' },
  { input: `${PUBLIC}/globe/earth-blue-marble.jpg`, output: `${PUBLIC}/globe/earth-blue-marble.webp`, width: 1024, quality: 78, label: 'globe/earth-blue-marble' },

  // Misc PNG sources
  { input: `${PUBLIC}/earned-through-quests.png`, output: `${PUBLIC}/earned-through-quests.webp`, width: 800, quality: 78, label: 'earned-through-quests' },
];

let totalBefore = 0;
let totalAfter = 0;

for (const task of tasks) {
  try {
    // Read current WebP output size (if exists) and input size
    let currentWebpSize = Infinity;
    try { currentWebpSize = (await fs.stat(task.output)).size; } catch (_) {}

    let inst = sharp(task.input);
    if (task.width || task.height) {
      inst = inst.resize(task.width ?? null, task.height ?? null, { fit: 'inside', withoutEnlargement: true });
    }
    const buffer = await inst.webp({ quality: task.quality }).toBuffer();
    const afterKB = buffer.length / 1024;
    const beforeKB = currentWebpSize / 1024;

    if (buffer.length < currentWebpSize * 0.95) {
      await fs.writeFile(task.output, buffer);
      totalBefore += currentWebpSize;
      totalAfter += buffer.length;
      const pct = ((1 - afterKB / beforeKB) * 100).toFixed(0);
      console.log(`  ✓ ${task.label}: ${beforeKB.toFixed(0)}KB → ${afterKB.toFixed(0)}KB (${pct}% smaller)`);
    } else {
      console.log(`  - ${task.label}: ${beforeKB.toFixed(0)}KB → ${afterKB.toFixed(0)}KB (already optimal)`);
      totalBefore += currentWebpSize;
      totalAfter += currentWebpSize;
    }
  } catch (e) {
    console.log(`  ! ${task.label}: ${e.message}`);
  }
}

console.log(`\nWebP totals: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB (saved ${((totalBefore-totalAfter)/1024/1024).toFixed(1)}MB)`);
