/**
 * Recompress existing WebP files using Sharp, then overwrite via PowerShell.
 * Needed on Windows where Node.js fs can't overwrite certain git-tracked files.
 */
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const PUBLIC = path.resolve('client/public');

const tasks = [
  { input: `${PUBLIC}/images/hero-bg-desktop.webp`, width: 1920, quality: 68, label: 'hero-bg-desktop' },
  { input: `${PUBLIC}/og/seeds-contributions.webp`, width: 1200, height: 630, quality: 80, label: 'og/seeds-contributions' },
  { input: `${PUBLIC}/og-default.webp`, width: 1200, height: 630, quality: 80, label: 'og-default' },
  { input: `${PUBLIC}/game-infinite-forest.webp`, width: 1200, quality: 78, label: 'game-infinite-forest' },
  { input: `${PUBLIC}/game-bridge-worlds.webp`, width: 1200, quality: 78, label: 'game-bridge-worlds' },
  { input: `${PUBLIC}/images/governance/rcvoice-vs-rgvoice.webp`, width: 1200, quality: 80, label: 'governance/rcvoice-vs-rgvoice' },
  { input: `${PUBLIC}/globe/earth-blue-marble.webp`, width: 1024, quality: 78, label: 'globe/earth-blue-marble' },
  { input: `${PUBLIC}/globe/night-sky.webp`, width: 1024, quality: 75, label: 'globe/night-sky' },
  { input: `${PUBLIC}/blog-hero-bridging-worlds.webp`, width: 1200, quality: 80, label: 'blog-hero-bridging-worlds' },
  { input: `${PUBLIC}/earned-through-quests.webp`, width: 800, quality: 78, label: 'earned-through-quests' },
];

const tmpDir = os.tmpdir();
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

    if (buffer.length < statBefore.size * 0.95) {
      // Write to temp, then use PowerShell to overwrite
      const tmp = path.join(tmpDir, `opt-${Date.now()}.webp`);
      await fs.writeFile(tmp, buffer);
      const dest = task.input.replace(/\//g, '\\');
      const src = tmp.replace(/\//g, '\\');
      execSync(`powershell -Command "Copy-Item '${src}' '${dest}' -Force"`, { stdio: 'pipe' });
      await fs.unlink(tmp).catch(() => {});
      totalBefore += statBefore.size;
      totalAfter += buffer.length;
      const pct = ((1 - afterKB / beforeKB) * 100).toFixed(0);
      console.log(`  ✓ ${task.label}: ${beforeKB.toFixed(0)}KB → ${afterKB.toFixed(0)}KB (${pct}% smaller)`);
    } else {
      console.log(`  - ${task.label}: ${beforeKB.toFixed(0)}KB (already optimal)`);
      totalBefore += statBefore.size;
      totalAfter += statBefore.size;
    }
  } catch (e) {
    console.log(`  ! ${task.label}: ${e.message}`);
  }
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB (saved ${((totalBefore-totalAfter)/1024/1024).toFixed(1)}MB)`);
