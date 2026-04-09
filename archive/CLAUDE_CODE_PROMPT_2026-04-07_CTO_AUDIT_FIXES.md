# Claude Code Prompt: CTO Audit Fixes (2026-04-07)

**Companion doc:** `CTO_VISUAL_AUDIT_2026-04-07.md` (read this first for
full context on every item below)

**Launch:** Earth Day 2026-04-22. You have 15 days. Ship the three
launch blockers first, then work down.

**Operating rules:**
- Writing Rule 1: zero em-dashes. Use comma, colon, period, or rewrite.
- Maximum autonomy. Try things before asking. Only surface `[HUMAN]`
  items when there is literally no way to proceed.
- Use the migration runner (`npx tsx scripts/run-migration.ts ...`) for
  any SQL. Do not write ad-hoc Node scripts.
- Commit in logical chunks with the Claude co-author tag. Do not push.
  Rye will push.

---

## STEP 0: Recover git state

The `.git/index` file is corrupted from a prior sandboxed session.
Before anything else:

```bash
rm -f .git/index .git/index.lock
git reset
git status
```

Expect to see modified files in the working tree from the prior
session, including `client/src/pages/ToolsLibrary.tsx` and
`client/src/pages/HymnBook.tsx`. Do not revert these. They are the
fixes below.

Then run the full test/lint loop and fix anything broken before
starting new work:

```bash
npm run lint
npm run typecheck
npm run test
```

---

## LAUNCH BLOCKERS (do in this order)

### LB-1. Ship the `/tools` page fix

**Already patched in working tree.** Verify, commit, stop.

1. Open `client/src/pages/ToolsLibrary.tsx` and confirm the map
   callback destructures `tool.pricingModel`, `tool.shortSummary`,
   `tool.totalClicks`, and renders `cat.name` from a typed
   `{name, slug, color}[]` array. If the file still has the old shape
   (`tool.pricing`, `{cat}` as a child, `tool.summary`, `tool.clickCount`)
   re-apply the fix described in `CTO_VISUAL_AUDIT_2026-04-07.md` LB-1.
2. Run `npm run dev`, navigate to `/tools`, confirm no error boundary,
   cards render with category pills, "X views" text, and correct
   pricing label ("Free", "Paid", "Freemium", "Open Source").
3. Commit: `fix(tools): render ToolsLibrary against actual trpc shape`

### LB-2. Generate the 7 missing per-route OG images

**Spec:** `SOCIAL_SHARING_SPEC.md`

The following routes are currently falling back to `og-default.jpg` on
every share. Add them to the dynamic OG generator at
`server/routes/og.ts` (or equivalent) so each renders a unique image
from a template at build/request time:

1. `/bionomics`
2. `/land`
3. `/quest`
4. `/community` (the forum route)
5. `/tools`
6. `/hymn-book`
7. `/features`

Each image must be 1200x630 webp with a jpg fallback. The existing
blog-post OG renderer is the pattern to copy. Wire the page's
`<SEO>` component to point at the correct URL for each route.

**Acceptance:**
- `curl -I https://regencivics.earth/og/bionomics.webp` returns 200 for
  all 7 routes.
- Each route's HTML source contains a unique `og:image` URL that
  resolves.
- Spot check 2 of the 7 in the Twitter Card Validator
  (https://cards-dev.twitter.com/validator). Report back.

Commit: `feat(og): per-route social share images for 7 primary routes`

### LB-3. Delete Tokenomics duplicate sections

`client/src/pages/Tokenomics.tsx` has two "How Returns Flow" sections
and two "How to Acquire $RCivics" sections. Exact line ranges in the
audit doc under LB-3.

**Decision:** Keep the component versions
(`ReturnsFlowDiagram`, `AcquisitionRoutes`). Delete the static
hand-written expanded blocks that appear second. Rationale: easier to
iterate on later.

If on reading the file you find the component versions are materially
less informative than the static versions, STOP and flag it. Otherwise
proceed.

**Acceptance:**
- Live page `/tokenomics` shows each section exactly once.
- No orphaned imports or dead components left behind.
- `npm run typecheck` clean.

Commit: `refactor(tokenomics): remove duplicate returns-flow and acquire sections`

---

## HIGH (ship before launch)

### H-1. Site-wide em-dash sweep

Run a grep against all content-bearing files and replace every em-dash
with the right punctuation. Do not blind find-replace. Read each hit
and decide case by case (most should become colons or periods).

```bash
grep -rn "—" client/src server/ public/ docs/ README*.md CLAUDE.md \
  --include="*.ts" --include="*.tsx" --include="*.md" \
  --include="*.html" --include="*.json"
```

Skip `archive/` and `node_modules/`. Skip the audit docs and fixes
docs themselves (they describe the rule, they don't violate it in
user-facing copy).

Already fixed this session: `client/src/pages/HymnBook.tsx` (file
header comment + SEO title). Verify those are still clean.

Commit: `chore(copy): remove em-dashes per Writing Rule 1`

### H-2. Wire `.ink-reveal` and `.blur-up` to hero sections

CSS classes already live in `client/src/index.css`. Attach them to the
hero image and/or h1 on:

- `/` (Home)
- `/bionomics`
- `/fund`
- `/game`
- `/tokenomics`
- `/land`
- `/team`

Walk each page in `npm run dev` and confirm the animation fires once on
load, does not replay on scroll, and respects
`prefers-reduced-motion`.

Commit: `feat(anim): wire ink-reveal and blur-up to primary hero sections`

### H-3. Heal-the-Land seeds

Write the Heal-the-Land seed script per POST_CTO H-3 using the
`regen-database-sql` skill. Do NOT run it against prod. Leave it ready
for Rye to invoke via the migration runner.

Place at `drizzle/seeds/heal-the-land.ts` or wherever the existing
seed convention lives. Output a dry-run log of the rows it would
insert.

Commit: `feat(seeds): heal-the-land quest seed script (dry-run ready)`

---

## MEDIUM (if time)

### M-1. Em-dash SQL sweep script (for Rye to run on Railway)

Write a `.sql` file at `scripts/sql/find-em-dashes.sql` containing:

```sql
SELECT id, title FROM forum_threads WHERE title LIKE '%—%';
SELECT id, title FROM quests WHERE title LIKE '%—%';
SELECT id, LEFT(content, 200) AS snippet FROM forum_posts WHERE content LIKE '%—%' LIMIT 100;
SELECT id, name FROM land_projects WHERE name LIKE '%—%' OR description LIKE '%—%';
```

Rye will run it. Do not attempt to run it yourself.

### M-2. Fund page "Join the Movement" rewrite

The closing CTA block on `/fund` trips Writing Rule 5 (passive
inspiration). Draft a rewrite in Rye's voice and leave it in the file
as a comment block above the current copy. Do not replace the live
copy without Rye's sign-off.

### M-3. Citizenship tier nightly batch end-to-end test

Write a Vitest test that seeds one user at `Resident` with an expired
`graceUntil`, runs the `checkCitizenshipTiers` job, and asserts the
user is demoted to `Visitor`. Goal: catch silent tier-demotion bugs
before launch.

Commit: `test(tiers): e2e nightly batch demotion test`

---

## Handoff Breakdown

| Item | Claude Code | Rye |
|---|---|---|
| LB-1 ToolsLibrary fix | Verify, commit | Push to Railway |
| LB-2 OG images x7 | Implement, test | Validate in Twitter Card Validator, push |
| LB-3 Tokenomics dedupe | Implement, test | Review which version survived, push |
| H-1 Em-dash sweep | Grep, edit, commit | Push |
| H-2 Hero animations | Wire, live check, commit | Mobile spot-check, push |
| H-3 Heal-the-Land seeds | Write script | Run via migration runner against Railway |
| M-1 SQL sweep file | Write file | Run against Railway DB |
| M-2 Fund CTA rewrite | Draft in comment block | Decide and swap in |
| M-3 Tier batch test | Write and run locally | Push |
| Sentry DSN | - | Set `SENTRY_DSN` + `VITE_SENTRY_DSN` on Railway |
| GCP Maps key restriction | - | Add `regencivics.earth` referrer restriction in GCP console |
| $1 donation E2E | - | Real Stripe test before launch |
| Mobile spot-check | - | Real phone walk of primary routes |
| `git push` | - | All pushes |

---

## Done criteria for this prompt

- Three launch blockers are merged into main and live on Railway.
- `npm run lint`, `npm run typecheck`, `npm run test` all clean.
- A short report back to Rye listing: what shipped, what Twitter Card
  Validator showed for the 7 OG routes, any deferred items.
- No em-dashes reachable from any primary route.
