#!/usr/bin/env node
/**
 * check-contrast.mjs
 *
 * Scans regencivics.earth (or localhost) for WCAG AA color-contrast failures
 * using Playwright + axe-core. Outputs a grouped, human-readable report.
 *
 * Usage:
 *   node scripts/check-contrast.mjs                  # scans production
 *   node scripts/check-contrast.mjs --local          # scans http://localhost:5173
 *   node scripts/check-contrast.mjs --url https://...  # scans any base URL
 *   node scripts/check-contrast.mjs --open           # trigger interactive elements (dropdowns, popovers)
 *
 * Prerequisites (one-time):
 *   npx playwright install chromium
 *
 * No package.json changes needed — runs via npx.
 */

import { chromium } from 'playwright';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const openInteractive = args.includes('--open');
const urlFlagIdx = args.indexOf('--url');
const customUrl = urlFlagIdx !== -1 ? args[urlFlagIdx + 1] : null;

const BASE_URL = customUrl ?? (useLocal ? 'http://localhost:5173' : 'https://regencivics.earth');

// Pages to scan. Dynamic segments (e.g. :id) are skipped.
const PAGES = [
  '/',
  '/profile',
  '/apply',
  '/community',
  '/community/new',
  '/fund',
  '/quest',
  '/play',
  '/governance',
  '/tokenomics',
  '/team',
  '/seasons',
  '/map',
  '/calculator',
  '/blog',
  '/land',
  '/ally',
  '/opportunity',
  '/connect',
  '/investor',
  '/crowd-pooling',
  '/crowd-pooling-projects',
  '/one-pager/land',
  '/one-pager/alliance',
  '/one-pager/player',
  '/terms-of-use',
  '/privacy-policy',
  '/risk-disclosure',
  '/glossary',
];

// Interactive actions to trigger before scanning — opens hidden UI that would
// otherwise be missed (dropdowns, modals, popovers). Runs when --open is set.
const INTERACTIVE_TRIGGERS = {
  '/profile': async (page) => {
    // Open the "Where do I find this?" popover
    const helpBtn = page.locator('[data-radix-popper-content-wrapper] button, button:has(.lucide-help-circle)').first();
    if (await helpBtn.count()) await helpBtn.click();
  },
  '/community/new': async (page) => {
    // Open the Topic dropdown
    const trigger = page.locator('[role="combobox"]').first();
    if (await trigger.count()) await trigger.click();
  },
  '/apply': async (page) => {
    // Scroll down to reveal form fields
    await page.evaluate(() => window.scrollTo(0, 400));
  },
};

// ---------------------------------------------------------------------------
// axe-core source (fetched inline so no install needed)
// ---------------------------------------------------------------------------

async function getAxeSource() {
  // Try to load from node_modules if installed, otherwise fetch from CDN
  try {
    const req = createRequire(import.meta.url);
    const axePath = req.resolve('axe-core');
    return readFileSync(axePath, 'utf8');
  } catch {
    console.log('  axe-core not in node_modules — fetching from CDN...');
    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js');
    return await res.text();
  }
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function sortBySeverity(violations) {
  return [...violations].sort((a, b) =>
    (SEVERITY_ORDER[a.impact] ?? 9) - (SEVERITY_ORDER[b.impact] ?? 9)
  );
}

function severityIcon(impact) {
  return { critical: '🔴', serious: '🟠', moderate: '🟡', minor: '⚪' }[impact] ?? '⚫';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function scanPage(page, axeSource, url) {
  const results = { url, violations: [], error: null };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Wait for React to hydrate
    await page.waitForTimeout(1500);

    // Trigger interactive elements if requested
    const path = new URL(url).pathname;
    if (openInteractive && INTERACTIVE_TRIGGERS[path]) {
      try {
        await INTERACTIVE_TRIGGERS[path](page);
        await page.waitForTimeout(600); // let animations settle
      } catch (e) {
        // Non-fatal — interactive trigger failed, scan anyway
      }
    }

    // Inject axe-core and run — filter to contrast rules only
    await page.addScriptTag({ content: axeSource });
    const axeResults = await page.evaluate(() => {
      return window.axe.run(document, {
        runOnly: {
          type: 'rule',
          values: ['color-contrast', 'color-contrast-enhanced'],
        },
        resultTypes: ['violations'],
      });
    });

    results.violations = axeResults.violations;
  } catch (err) {
    results.error = err.message;
  }

  return results;
}

function formatReport(allResults) {
  const lines = [];
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════╗');
  lines.push('║         CONTRAST AUDIT — regencivics.earth               ║');
  lines.push(`║  ${timestamp}  ${BASE_URL.padEnd(26)} ║`);
  lines.push('╚══════════════════════════════════════════════════════════╝');
  lines.push('');

  let totalViolations = 0;
  let totalNodes = 0;
  const pagesWithIssues = [];
  const globalIssueMap = {}; // rule id -> { impact, description, pages, nodes }

  for (const result of allResults) {
    if (result.error) {
      lines.push(`⚠️  ${result.url} — ERROR: ${result.error}`);
      continue;
    }

    const sorted = sortBySeverity(result.violations);
    if (!sorted.length) continue;

    pagesWithIssues.push(result.url);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📄  ${result.url}`);
    lines.push('');

    for (const v of sorted) {
      totalViolations++;
      const nodeCount = v.nodes.length;
      totalNodes += nodeCount;

      lines.push(`  ${severityIcon(v.impact)} [${v.impact?.toUpperCase()}] ${v.id}`);
      lines.push(`     ${v.description}`);
      lines.push(`     ${nodeCount} element${nodeCount !== 1 ? 's' : ''} affected`);

      // Show up to 3 example selectors + the actual contrast info
      const examples = v.nodes.slice(0, 3);
      for (const node of examples) {
        const selector = node.target?.join(' > ') ?? '(unknown)';
        const truncated = selector.length > 90 ? selector.slice(0, 87) + '...' : selector;
        lines.push(`     → ${truncated}`);

        // axe puts the actual/expected ratio in node.any or node.all
        const checks = [...(node.any ?? []), ...(node.all ?? [])];
        for (const check of checks) {
          if (check.data?.contrastRatio !== undefined) {
            const { contrastRatio, expectedContrastRatio, fgColor, bgColor } = check.data;
            lines.push(`       contrast: ${contrastRatio}:1  (need ${expectedContrastRatio}:1)  fg:${fgColor}  bg:${bgColor}`);
          }
        }
      }
      if (v.nodes.length > 3) {
        lines.push(`     … and ${v.nodes.length - 3} more`);
      }
      lines.push('');

      // Aggregate for summary
      if (!globalIssueMap[v.id]) {
        globalIssueMap[v.id] = { impact: v.impact, description: v.description, pages: [], nodes: 0 };
      }
      globalIssueMap[v.id].pages.push(result.url);
      globalIssueMap[v.id].nodes += nodeCount;
    }
  }

  // Summary
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('SUMMARY');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const clean = allResults.filter(r => !r.error && !r.violations.length);
  lines.push(`  Pages scanned:        ${allResults.length}`);
  lines.push(`  Pages with issues:    ${pagesWithIssues.length}`);
  lines.push(`  Pages clean:          ${clean.length}`);
  lines.push(`  Total violations:     ${totalViolations}`);
  lines.push(`  Total elements:       ${totalNodes}`);
  lines.push('');

  if (Object.keys(globalIssueMap).length) {
    lines.push('  Most common issues (by element count):');
    const sorted = Object.entries(globalIssueMap)
      .sort(([, a], [, b]) => b.nodes - a.nodes);
    for (const [id, info] of sorted) {
      lines.push(`    ${severityIcon(info.impact)} ${id}: ${info.nodes} elements across ${info.pages.length} page(s)`);
    }
    lines.push('');
  }

  if (clean.length) {
    lines.push('  ✅ Clean pages:');
    for (const r of clean) lines.push(`    ${r.url}`);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('HOW TO FIX');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('  Most issues trace to two root causes in client/src/index.css:');
  lines.push('');
  lines.push('  1. --muted-foreground is too light against --input background.');
  lines.push('     Fix: darken --muted-foreground so contrast ratio ≥ 4.5:1.');
  lines.push('     Light mode suggestion:');
  lines.push('       --muted-foreground: oklch(0.40 0.02 85);  /* was ~0.60 */');
  lines.push('');
  lines.push('  2. Opacity modifiers on labels (text-[#1a472a]/70) drop contrast.');
  lines.push('     Fix: bump to /90 or full opacity on all form label text.');
  lines.push('');
  lines.push('  Run this script again after fixes to verify all pages pass.');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.log(`\n🔍 Starting contrast audit on ${BASE_URL}`);
  console.log(`   Pages to scan: ${PAGES.length}`);
  if (openInteractive) console.log('   Interactive mode: ON (triggering dropdowns/popovers)');
  console.log('');

  const axeSource = await getAxeSource();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'ContrastAuditBot/1.0 (regencivics accessibility scanner)',
  });

  const allResults = [];

  for (const path of PAGES) {
    const url = BASE_URL + path;
    process.stdout.write(`  Scanning ${path.padEnd(35)} `);
    const page = await context.newPage();

    const result = await scanPage(page, axeSource, url);
    await page.close();

    const issueCount = result.violations.reduce((n, v) => n + v.nodes.length, 0);
    if (result.error) {
      process.stdout.write(`ERROR\n`);
    } else if (issueCount === 0) {
      process.stdout.write(`✅ clean\n`);
    } else {
      process.stdout.write(`⚠️  ${issueCount} element${issueCount !== 1 ? 's' : ''}\n`);
    }

    allResults.push(result);
  }

  await browser.close();

  const report = formatReport(allResults);
  console.log(report);

  // Write report to file
  const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'contrast-report.txt');
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, report, 'utf8');
  console.log(`\n📄 Report saved to: contrast-report.txt\n`);

  // Exit with error code if any violations found
  const totalViolations = allResults.reduce((n, r) => n + (r.violations?.length ?? 0), 0);
  process.exit(totalViolations > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
