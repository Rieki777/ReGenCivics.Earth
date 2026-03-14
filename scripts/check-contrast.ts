#!/usr/bin/env npx tsx
/**
 * Basic contrast checker -- scans TSX files for common low-contrast patterns
 * Usage: npx tsx scripts/check-contrast.ts
 *
 * For a full browser-based WCAG audit (recommended), use scripts/check-contrast.mjs instead.
 */
import { glob } from 'glob';
import { readFileSync } from 'fs';

const LOW_CONTRAST_PATTERNS = [
  /text-white\/[123][0-9]?\b/g,      // text-white/10 through text-white/39
  /text-black\/[123][0-9]?\b/g,
  /text-gray-[23]00/g,               // very light grays
];

async function main() {
  const files = await glob('client/src/**/*.tsx');
  let findings = 0;
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const pattern of LOW_CONTRAST_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`${file}: ${matches.join(', ')}`);
        findings += matches.length;
      }
    }
  }
  console.log(`\nTotal low-contrast instances: ${findings}`);
}

main();
