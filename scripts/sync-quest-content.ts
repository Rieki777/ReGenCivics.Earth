/**
 * sync-quest-content.ts
 *
 * Parses QUEST_MASTER_SHEET.md and generates client/src/data/questMasterContent.ts.
 * Run: pnpm sync:quest-content (or: npx tsx scripts/sync-quest-content.ts)
 *
 * Deterministic output: sorting by numeric id, 2-space indent, single quotes,
 * trailing commas. Running twice on unchanged input produces byte-identical output.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuestMasterContent {
  id: number | string;
  subtitle: string;
  timeEstimate: string;
  videoUrl?: string;
  pdfUrl?: string;
  storyCard: string[];
  storyTeaser: string[];
  howToSteps: { heading: string; body: string }[];
  deliverable: string;
  tips: string[];
  resources: { label: string; url: string }[];
  connections: {
    comesBefore?: number[];
    referencedBy?: string[];
  };
}

// ── Parser ───────────────────────────────────────────────────────────────────

function parseQuestMasterSheet(md: string): QuestMasterContent[] {
  const quests: QuestMasterContent[] = [];
  const lines = md.split('\n').map(l => l.replace(/\r$/, ''));
  let i = 0;

  while (i < lines.length) {
    // Find quest heading: ### Quest N: Title
    const headingMatch = lines[i].match(/^### Quest (\d+[bB]?):\s+(.+)$/);
    if (!headingMatch) { i++; continue; }

    const rawId = headingMatch[1];
    const id: number | string = rawId.match(/[bB]$/) ? rawId.toLowerCase() : parseInt(rawId);
    i++;

    // Parse metadata lines
    let subtitle = '';
    let timeEstimate = '';
    let videoUrl: string | undefined;
    let pdfUrl: string | undefined;

    while (i < lines.length && !lines[i].startsWith('####') && !lines[i].startsWith('### Quest')) {
      const line = lines[i].trim();
      if (line.startsWith('**Subtitle:**')) subtitle = line.replace('**Subtitle:**', '').trim();
      else if (line.startsWith('**Time:**')) timeEstimate = line.replace('**Time:**', '').trim();
      else if (line.startsWith('**Video:**')) videoUrl = line.replace('**Video:**', '').trim() || undefined;
      else if (line.startsWith('**PDF:**')) pdfUrl = line.replace('**PDF:**', '').trim() || undefined;
      // Also handle Season/Slug/Rewards lines (skip them)
      i++;
    }

    // Parse sections
    let storyCard: string[] = [];
    let howToSteps: { heading: string; body: string }[] = [];
    let deliverable = '';
    let tips: string[] = [];
    let resources: { label: string; url: string }[] = [];
    let connections: { comesBefore?: number[]; referencedBy?: string[] } = {};
    let currentSection = '';

    while (i < lines.length && !lines[i].match(/^### Quest \d/)) {
      const line = lines[i];

      // Section heading
      if (line.startsWith('#### ')) {
        currentSection = line.replace('#### ', '').trim().toLowerCase();
        i++;
        continue;
      }

      // Horizontal rule = end of quest block
      if (line.trim() === '---') { i++; break; }

      const trimmed = line.trim();
      if (!trimmed) { i++; continue; }

      switch (currentSection) {
        case 'story card':
          if (trimmed) storyCard.push(trimmed);
          break;

        case 'how to do this quest': {
          const stepMatch = trimmed.match(/^\*\*Step (\d+): (.+?)\.\*\*\s*(.*)$/);
          if (stepMatch) {
            howToSteps.push({ heading: `Step ${stepMatch[1]}: ${stepMatch[2]}.`, body: stepMatch[3] });
          } else if (howToSteps.length > 0 && trimmed) {
            // Continuation of previous step body
            howToSteps[howToSteps.length - 1].body += ' ' + trimmed;
          }
          break;
        }

        case 'deliverable':
          if (trimmed) deliverable = deliverable ? deliverable + ' ' + trimmed : trimmed;
          break;

        case 'tips':
          if (trimmed.startsWith('- ')) {
            tips.push(trimmed.slice(2));
          } else if (tips.length > 0 && trimmed) {
            tips[tips.length - 1] += ' ' + trimmed;
          }
          break;

        case 'resources':
          if (trimmed.startsWith('- ')) {
            const linkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
              resources.push({ label: linkMatch[1], url: linkMatch[2] });
            } else {
              resources.push({ label: trimmed.slice(2), url: '' });
            }
          }
          break;

        case 'connected to':
          if (trimmed.startsWith('- ')) {
            const bullet = trimmed.slice(2);
            const beforeMatch = bullet.match(/Comes (?:before|after).*Quest (\d+)/);
            if (beforeMatch) {
              if (!connections.comesBefore) connections.comesBefore = [];
              connections.comesBefore.push(parseInt(beforeMatch[1]));
            }
            // Also check for multiple quest references
            const allQuestRefs = [...bullet.matchAll(/Quest (\d+)/g)];
            if (allQuestRefs.length > 0 && !beforeMatch) {
              if (!connections.referencedBy) connections.referencedBy = [];
              connections.referencedBy.push(bullet);
            } else if (!beforeMatch) {
              if (!connections.referencedBy) connections.referencedBy = [];
              connections.referencedBy.push(bullet);
            }
          }
          break;
      }

      i++;
    }

    // Derive storyTeaser from storyCard: first paragraphs up to ~80 words
    const storyTeaser: string[] = [];
    let wordCount = 0;
    for (const para of storyCard) {
      const words = para.split(/\s+/).length;
      if (wordCount + words > 80 && storyTeaser.length > 0) break;
      storyTeaser.push(para);
      wordCount += words;
      if (storyTeaser.length >= 3) break;
    }

    quests.push({
      id,
      subtitle,
      timeEstimate,
      videoUrl,
      pdfUrl,
      storyCard,
      storyTeaser,
      howToSteps,
      deliverable,
      tips,
      resources,
      connections,
    });
  }

  return quests;
}

// ── Emitter ──────────────────────────────────────────────────────────────────

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function emitContent(quests: QuestMasterContent[]): string {
  // Sort: numeric ids first (ascending), then string ids
  quests.sort((a, b) => {
    const aNum = typeof a.id === 'number' ? a.id : parseFloat(a.id);
    const bNum = typeof b.id === 'number' ? b.id : parseFloat(b.id);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return String(a.id).localeCompare(String(b.id));
  });

  const lines: string[] = [
    '// GENERATED FILE. Edit QUEST_MASTER_SHEET.md instead, then run:',
    '//   pnpm sync:quest-content',
    '// Do not edit this file by hand.',
    '',
    'export interface QuestMasterContent {',
    '  id: number | string;',
    '  subtitle: string;',
    '  timeEstimate: string;',
    '  videoUrl?: string;',
    '  pdfUrl?: string;',
    '  storyCard: string[];',
    '  storyTeaser: string[];',
    '  howToSteps: { heading: string; body: string }[];',
    '  deliverable: string;',
    '  tips: string[];',
    '  resources: { label: string; url: string }[];',
    '  connections: {',
    '    comesBefore?: number[];',
    '    referencedBy?: string[];',
    '  };',
    '}',
    '',
    'export const QUEST_MASTER_CONTENT: Record<number | string, QuestMasterContent> = {',
  ];

  for (const q of quests) {
    const key = typeof q.id === 'number' ? String(q.id) : `'${q.id}'`;
    lines.push(`  ${key}: {`);
    lines.push(`    id: ${typeof q.id === 'number' ? q.id : `'${q.id}'`},`);
    lines.push(`    subtitle: '${escapeString(q.subtitle)}',`);
    lines.push(`    timeEstimate: '${escapeString(q.timeEstimate)}',`);
    if (q.videoUrl) lines.push(`    videoUrl: '${escapeString(q.videoUrl)}',`);
    if (q.pdfUrl) lines.push(`    pdfUrl: '${escapeString(q.pdfUrl)}',`);

    lines.push('    storyCard: [');
    for (const p of q.storyCard) lines.push(`      '${escapeString(p)}',`);
    lines.push('    ],');

    lines.push('    storyTeaser: [');
    for (const p of q.storyTeaser) lines.push(`      '${escapeString(p)}',`);
    lines.push('    ],');

    lines.push('    howToSteps: [');
    for (const s of q.howToSteps) {
      lines.push(`      { heading: '${escapeString(s.heading)}', body: '${escapeString(s.body)}' },`);
    }
    lines.push('    ],');

    lines.push(`    deliverable: '${escapeString(q.deliverable)}',`);

    lines.push('    tips: [');
    for (const t of q.tips) lines.push(`      '${escapeString(t)}',`);
    lines.push('    ],');

    lines.push('    resources: [');
    for (const r of q.resources) {
      lines.push(`      { label: '${escapeString(r.label)}', url: '${escapeString(r.url)}' },`);
    }
    lines.push('    ],');

    lines.push('    connections: {');
    if (q.connections.comesBefore?.length) {
      lines.push(`      comesBefore: [${q.connections.comesBefore.join(', ')}],`);
    }
    if (q.connections.referencedBy?.length) {
      lines.push('      referencedBy: [');
      for (const r of q.connections.referencedBy) lines.push(`        '${escapeString(r)}',`);
      lines.push('      ],');
    }
    lines.push('    },');

    lines.push('  },');
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sheetPath = resolve(__dirname, '..', 'QUEST_MASTER_SHEET.md');
const outPath = resolve(__dirname, '..', 'client', 'src', 'data', 'questMasterContent.ts');

const md = readFileSync(sheetPath, 'utf8');
const quests = parseQuestMasterSheet(md);

console.log(`Parsed ${quests.length} quests from QUEST_MASTER_SHEET.md`);
for (const q of quests) {
  console.log(`  Quest ${q.id}: ${q.subtitle || '(no subtitle)'} — ${q.storyCard.length} paragraphs, ${q.howToSteps.length} steps`);
}

const output = emitContent(quests);
writeFileSync(outPath, output, 'utf8');
console.log(`\nWritten to ${outPath}`);
