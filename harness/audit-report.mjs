/**
 * Turn two live audit runs into a dated report for docs/planning:
 *
 *   node harness/audit-report.mjs <before-dir> <after-dir> <out.md>
 *
 * Each dir holds user.json and admin.json from harness/audit-live.mjs.
 */
import fs from "fs";
import path from "path";

const [beforeDir, afterDir, out] = process.argv.slice(2);
const load = (dir, as) => JSON.parse(fs.readFileSync(path.join(dir, `${as}.json`), "utf8"));
const u1 = load(beforeDir, "user"), a1 = load(beforeDir, "admin");
const u2 = load(afterDir, "user"), a2 = load(afterDir, "admin");

const total = (all) => all.reduce((s, r) => s + r.failures.length, 0);
const kindOf = (f) => (f.startsWith("colour only") ? "colour only" : f.startsWith("field edge") ? "field edge" : f.startsWith("typed text") ? "typed text" : f.split(/[ :]/)[0]);
const kinds = (all) => {
  const m = new Map();
  for (const r of all) for (const f of r.failures) m.set(kindOf(f), (m.get(kindOf(f)) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
};
const routes = (all) => new Set(all.map((r) => r.route)).size;
const byRoute = (all) => {
  const m = new Map();
  for (const r of all) for (const f of r.failures) {
    if (!m.has(r.route)) m.set(r.route, new Set());
    m.get(r.route).add(`${f} (${r.viewport})`);
  }
  return [...m].sort((a, b) => b[1].size - a[1].size)
    .map(([route, s]) => [`### ${route} (${s.size})`, ...[...s].map((x) => `- ${x}`)].join("\n"))
    .join("\n\n");
};

const date = new Date().toISOString().slice(0, 10);
const doc = `# Site-wide UI readability audit, ${date}

Run with \`pnpm ui:audit:live\` (harness/audit-live.mjs) against a local production build on the scratch database, signed in as a member (${routes(u2)} public routes) and as an admin (${routes(a2)} admin tabs and pages), each at 1280 wide and as a 390-wide touch phone. Checks: contrast, placeholders and typed text, field edges, touch targets (44px on touch, 24px for a mouse), keyboard focus, colour-only signals, sideways scroll, page errors. The loop that grows the checks is in CLAUDE.md, "UI readability gate". ADR-73 has the history.

## Results

| Run | Public (member) | Admin |
|---|---|---|
| First run | ${total(u1)} | ${total(a1)} |
| After the fixes below | ${total(u2)} | ${total(a2)} |

Counts are findings per route and width, so one shared problem on 134 routes counts 134 times. Part of the drop is the audit getting more accurate between runs (it stopped counting the <Link><Button> pattern as a thin strip and stopped measuring screen-reader-only text); the rest is the fixes below.

- First run by kind: public ${kinds(u1)}; admin ${kinds(a1)}.
- Now: public ${kinds(u2)}; admin ${kinds(a2)}.

## What was fixed

- **Admin pages outside the admin layout were unreadable.** /admin/ship and /admin/builders-pool (and the other standalone admin pages) drew the light theme's dark green text on the forest green that index.html's first-paint CSS gives the page body: about 1.1:1. Admin routes now get the light surface in App.tsx.
- **Every dialog's close button** was a 16px target at 70% strength; it is now 32px and full strength (components/ui/dialog.tsx).
- **Field edges.** The shared \`--input\` token was about 1.2:1 (light) and 1.8:1 (dark); it is now 3:1 or better in both themes. A scoped sweep raised hand-rolled field borders and placeholders in 102 files, touching only the opening tags of inputs, selects and textareas.
- **Light cards on dark pages** (the player profile, the alliance form) share one \`LIGHT_CARD_FIELD\` (client/src/lib/fieldStyles.ts); the profile's placeholders were 1.28:1.
- **Footer**: Suggest or Report, Manage Cookies, Email Preferences and the newsletter field. **Breadcrumbs**, and the ship pages' terms link.
- **Two safety nets in index.css**, in the spirit of the existing focus ring: on touch screens, standalone links and buttons in the page body are at least 44px tall (\`.tap-exempt\` opts out); links inside paragraphs are underlined.
- **Keyboard focus** already passed almost everywhere, thanks to the site's global focus ring.

## What the audit learned (each proven on the audit-selftest story)

Focus rings and colour-only signals were added. The focus check starts at the area under test, ignores an outline whose colour changes while it is switched off, and judges the stronger of the site's two rings. Targets are 44px on touch and 24px for a mouse, measured over the whole clickable area (the \`<Link><Button>\` pattern); phones are emulated with touch; screen-reader-only text and controls are skipped.

## Still open, by route

The long tail: one-off colours and sizes in individual components (community filter chips at 34px on phones, a few inline links, fields with hex borders the sweep did not cover). After fixing, rerun \`pnpm ui:audit:live\`; the report regenerates in harness/shots/live/.

## Public (member)

${byRoute(u2)}

## Admin

${byRoute(a2)}
`;
fs.writeFileSync(out, doc);
console.log(`${total(u1)} -> ${total(u2)} public, ${total(a1)} -> ${total(a2)} admin; wrote ${out}`);
