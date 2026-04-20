// scripts/validate-html.mjs
import { parse } from 'parse5';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Add any HTML entry points here
const HTML_FILES = [
  resolve(__dirname, '../client/index.html'),
];

let hasErrors = false;

for (const filePath of HTML_FILES) {
  const html = readFileSync(filePath, 'utf-8');
  const errors = [];

  parse(html, {
    onParseError(err) {
      errors.push(err);
    },
  });

  if (errors.length > 0) {
    console.error(`\n❌ HTML parse errors in ${filePath}:`);
    for (const err of errors) {
      const lines = html.split('\n');
      const line = lines[err.startLine - 1] ?? '';
      console.error(`  [${err.code}] line ${err.startLine}:${err.startCol}`);
      console.error(`  ${line}`);
      console.error(`  ${' '.repeat(err.startCol - 1)}^`);
    }
    hasErrors = true;
  } else {
    console.log(`✅ ${filePath} — HTML valid`);
  }
}

if (hasErrors) {
  process.exit(1);
}
