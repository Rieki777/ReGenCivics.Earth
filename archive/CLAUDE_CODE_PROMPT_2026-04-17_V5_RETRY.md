# Claude Code Prompt — V5 Retry + Visual Audit Polish (2026-04-17)

This prompt consolidates everything flagged in the Sprint 2 post-deploy audit.
Commit `a5dfd31 "restore 51 files corrupted by formatter"` silently reverted the
V5 drift sweep and the V6c Alliance color change. The Alliance change has since
been re-landed (amber gold reversed, `#4a9f9f` promoted to `alliance.teal`).
The drift sweep needs to be re-run, plus a handful of additional polish items
found during the Tier 1 and Tier 3 live-site walk.

Everything below is safe for Claude Code to do autonomously. Rye only has to
push the final commit and do a physical iPhone walk.

---

## Fix A2 — V5 drift hex re-sweep (High)

**Status:** CODED (needs re-run)

**Symptom:** Drift hexes re-appeared in the codebase after commit `a5dfd31`.
Current counts from `Grep -c` across `client/src`:

| Hex | Count | Maps to |
|---|---|---|
| `#6bc86b` | 50 | `#9de89d` (spring.hover) |
| `#f0c040` | 17 | `#ffd700` (amber.gold) |
| `#6cc86c` | 15 | `#9de89d` (spring.hover) |
| `#4a9f4a` | 13 | `#4a7c59` (forest.sage) |
| `#87ceeb` | 11 | `#f0f7f0` (parchment.whisper) |
| `#2e7d32` | ~ | `#1a472a` (forest.base) |
| `#a5d6a7` | ~ | `#a8e6a8` (spring.soft) |
| `#e8f5e9` | ~ | `#f0f7f0` (parchment.whisper) |
| `#fbbf24` | ~ | `#d4a574` (amber.tan) |
| `#60a5fa` | ~ | `#7dd87d` (spring.base) |
| `#c084fc` | ~ | `#7dd87d` (spring.base) |

**Files to exclude from the sweep:**
- `client/src/lib/design-tokens.ts` (the mapping table lives here)
- `archive/`
- anything inside `node_modules/` and `.git/`
- `drizzle/` migrations

**Commands to run** (case-insensitive, then case-sensitive for completeness):

```bash
# Case-insensitive sed across client/src, excluding design-tokens.ts
cd client/src

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.html" \) \
  ! -path "*/node_modules/*" \
  ! -name "design-tokens.ts" \
  -print0 | xargs -0 sed -i -E '
    s/#6[bB][cC]86[bB]/#9de89d/g;
    s/#6[cC][cC]86[cC]/#9de89d/g;
    s/#4[aA]9[fF]4[aA]/#4a7c59/g;
    s/#2[eE]7[dD]32/#1a472a/g;
    s/#[aA]5[dD]6[aA]7/#a8e6a8/g;
    s/#[eE]8[fF]5[eE]9/#f0f7f0/g;
    s/#[fF][bB][bB]f24/#d4a574/g;
    s/#[fF]0[cC]040/#ffd700/g;
    s/#60[aA]5[fF][aA]/#7dd87d/g;
    s/#[cC]084[fF][cC]/#7dd87d/g;
    s/#87[cC][eE][eE][bB]/#f0f7f0/g;
  '
```

**After running the sed**, verify with:

```bash
cd ../..
npx tsx scripts/check-palette.ts
```

Expected output: zero drift hits. If any remain, either they are inside
`DEPRECATED_COLORS` in `design-tokens.ts` (safe) or the sed missed a case
variant and needs a targeted follow-up.

---

## Fix A1 — WhoHoldsVoteChart refactor (High)

**Status:** CODED (pie chart color already correct, but the array is duplicated)

**Symptom:** `client/src/components/governance/WhoHoldsVoteChart.tsx` defines
its own local `slices` array with hardcoded hex strings. This is why the
Alliance color originally drifted (V6c change to `design-tokens.ts` did not
propagate). The fix already landed the hex change directly in this file, but
the duplication is the underlying bug.

**Fix:** Replace the local `slices` array with an import from
`~/lib/design-tokens`. Future palette changes then flow automatically.

**File:** `client/src/components/governance/WhoHoldsVoteChart.tsx`

**Current (lines 1-10):**

```ts
import { useMemo } from "react";

type Slice = { label: string; share: number; color: string };

const slices: Slice[] = [
  { label: "Stewardship Council", share: 40, color: "#4a7c59" },
  { label: "Investors",           share: 20, color: "#7dd87d" },
  { label: "Land Projects",       share: 20, color: "#f0ebe3" },
  { label: "Alliance Partners",   share: 20, color: "#4a9f9f" },
];
```

**Replace with:**

```ts
import { useMemo } from "react";
import { governanceSlices } from "~/lib/design-tokens";

type Slice = { label: string; share: number; color: string };

const slices: Slice[] = governanceSlices.map((s) => ({
  label: s.label,
  share: s.share,
  color: s.color,
}));
```

Leave the rest of the component untouched. `governanceSlices` is declared
`as const`, so the `.map` produces a fresh mutable array that satisfies the
`Slice[]` type.

---

## Fix A4 — Exotic hex investigation (Medium)

**Status:** NEEDS DECISION

**Symptom:** The deep hex scan surfaced several off-palette colors that are
not in `DEPRECATED_COLORS` and are not canonical tokens. They are likely
intentional decoratives (illustrations, character art, seasonal accents) but
they should be either promoted to tokens or replaced.

| Hex | Count | Likely meaning | Proposed action |
|---|---|---|---|
| `#f472b6` | 8 | pink accent (character art?) | investigate source, add to `amber` namespace or new `accent.pink` if kept |
| `#4a3728` | 14 | deep brown (character art) | promote to `earth.deep` token namespace |
| `#c17f3a` | 9 | warm brown | promote to `earth.warm` |
| `#e8c088` | 8 | tan | map to `amber.tan` (`#d4a574`) if close enough, or add `earth.sand` |
| `#8b6914` | 8 | deep gold | map to `amber.dim` (`#d4a017`) |
| `#dbeafe` | 8 | light blue | map to `parchment.whisper` (`#f0f7f0`) |

**What to do:**
1. `Grep -rn "#f472b6" client/src --include="*.tsx"` and similar for each hex.
2. If the hex appears only in character art components or decorative SVGs,
   add an `earth` namespace to `design-tokens.ts` and replace the hexes with
   token references. Do not sed blindly; replace by hand once.
3. If the hex appears in UI chrome (cards, buttons, navs), replace with the
   closest canonical token.
4. If kept, extend `DEPRECATED_COLORS` to `canonical` mapping is NOT needed
   for these; instead add them as first-class tokens.

If Claude Code is unsure about any single hex, leave it alone and add a note
to this document describing which file it appeared in.

---

## Fix A5 — /map h1 missing (Low, a11y)

**Status:** CODED

**Symptom:** `/map` page has no `<h1>`. Minor a11y issue. Reasonable for a
full-screen map, but still worth a visually-hidden heading.

**File:** `client/src/pages/Map.tsx` (confirm path via `Glob` if needed)

**Fix:** Add a visually-hidden `<h1>` at the top of the page component:

```tsx
<h1 className="sr-only">ReGen Civics Project Map</h1>
```

Place inside the main container, before the map canvas.

---

## Fix A6 — Pre-commit palette guard (Medium)

**Status:** NEEDS CREATION

**Symptom:** Commit `a5dfd31` silently reverted the V5 drift sweep when a
formatter was run. Without a gate, the same pattern can repeat.

**Fix:** Add a husky + lint-staged pre-commit hook that runs
`scripts/check-palette.ts` on any staged `.ts`, `.tsx`, or `.css` file. If
drift is detected, block the commit.

**Steps:**
1. `pnpm add -D husky lint-staged` (if not already present)
2. `pnpm dlx husky init`
3. Edit `.husky/pre-commit` to:
   ```sh
   #!/usr/bin/env sh
   . "$(dirname -- "$0")/_/husky.sh"
   pnpm exec lint-staged
   ```
4. Add to `package.json`:
   ```json
   "lint-staged": {
     "*.{ts,tsx,css}": ["pnpm exec tsx scripts/check-palette.ts"]
   }
   ```
5. Confirm `scripts/check-palette.ts` exits with non-zero on drift. If it
   currently only logs, patch it to `process.exit(1)` when drift count > 0.

**Why this matters:** a formatter reverting a color sweep is a recoverable
mistake; a formatter silently reverting a color sweep AND passing CI is a
repeat offender.

---

## Verification — run before handing back to Rye

Run in order. All must pass.

```bash
# 1. No drift remains
npx tsx scripts/check-palette.ts

# 2. No stray Alliance gold
grep -rn "#ffd166" client/src --include="*.tsx" --include="*.ts"
grep -rn "ffd166" client/src/components/governance

# 3. WhoHoldsVoteChart imports from design-tokens
grep -n "governanceSlices" client/src/components/governance/WhoHoldsVoteChart.tsx

# 4. /map has an h1
grep -n "<h1" client/src/pages/Map.tsx

# 5. Build doesn't break
pnpm build
```

If all five checks pass, commit as:

```
V5-retry: drift sweep + WhoHoldsVoteChart refactor + /map h1 + pre-commit guard

- Re-run V5 drift sweep for 11 hex mappings reverted by a5dfd31
- Refactor WhoHoldsVoteChart.tsx to import governanceSlices from design-tokens
- Add sr-only h1 to /map for a11y
- Add husky + lint-staged pre-commit guard running check-palette.ts
- Investigate and promote/replace 6 exotic hex colors surfaced in audit
```

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|---|---|---|
| 1 | `git add -A && git commit && git push` after Claude Code finishes | Claude Code's session holds the working tree; your terminal pushes | Run in `regen-civics-clean` root |
| 2 | Confirm Railway deploy succeeds | Railway dashboard access | https://railway.app |
| 3 | Physical iPhone walk of `/governance`, `/`, `/community`, `/map` after deploy | Real device viewport, not Chrome DevTools | iPhone Safari |
| 4 | Decide on exotic hex direction if Claude Code surfaces ambiguous cases | Visual design judgment | Review Claude Code notes in A4 |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|---|---|
| A2 | Re-run V5 drift sweep (sed commands above) | SCRIPTS READY |
| A1 | Refactor WhoHoldsVoteChart.tsx to import governanceSlices | CODED |
| A4 | Investigate 6 exotic hex colors and promote/replace | IN PROGRESS |
| A5 | Add sr-only h1 to /map | CODED |
| A6 | Add husky + lint-staged pre-commit palette guard | NEEDS CREATION |
| V | Run verification checklist 1-5 and confirm all pass | IN PROGRESS |

### WAITING ON YOU before Claude Code can proceed

None. Claude Code has everything it needs. Run the sweep, verify, commit
locally, and hand back a diff summary.

---

## Notes from the Sprint 2 audit

Tier 1 routes walked (all clean):
`/`, `/community`, `/bionomics`, `/tokenomics`, `/game`, `/land`, `/ally`,
`/schedule`, `/apply`, `/crowd-pooling`, `/governance`.

Tier 3 routes walked (all clean except /map h1):
`/quest`, `/fund`, `/seasons`, `/team`, `/blog`, `/connect`,
`/co-creators-guide`, `/calculator`, `/map`, `/heal-the-land`,
`/game-mechanics`, `/regen-games`, `/tools`, `/marketplace`, `/proposals`,
`/glossary`, `/hymn-book`, `/crowd-pooling-projects`, `/newsletter`.

Governance pie chart verified via live DOM: Alliance slice now renders
`rgb(74, 159, 159)` = `#4a9f9f`. Fix A1 locks in this color
architecturally so it cannot drift again.
