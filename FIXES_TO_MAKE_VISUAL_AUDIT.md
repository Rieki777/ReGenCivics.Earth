# Fixes to Make — Visual Audit Sprint (2026-04-17, Sprint 2)

This document continues from `FIXES_TO_MAKE_2026-04-17.md`.

Scope: route-by-route visual and design audit on desktop browser + iPhone mobile emulator, color palette normalization around the locked organic dark-forest palette, additional world-class UX refinements. Pairs with:

- `client/src/lib/design-tokens.ts` — locked palette and token scale (already written this sprint).
- `DESIGN_SYSTEM.md` — one-page style guide (already written this sprint).

Writing rules apply: no em-dashes, no contrast framing, no banned AI words.

---

## Current state (surveyed 2026-04-17)

The codebase contains **285 unique hex values** across `client/src`. The top 12 colors account for most usage and define the organic palette:

| Hex       | Count | Canonical token      |
| --------- | ----- | -------------------- |
| `#7dd87d` | 3596  | `spring.base`        |
| `#1a472a` | 3235  | `forest.base`        |
| `#4a7c59` | 632   | `forest.sage`        |
| `#d4a574` | 294   | `amber.tan`          |
| `#0d2818` | 229   | `forest.deep`        |
| `#f0f7f0` | 132   | `parchment.whisper`  |
| `#f0ebe3` | 92    | `parchment.base`     |
| `#ffd700` | 86    | `amber.gold`         |
| `#e8e4de` | 86    | `parchment.soft`     |
| `#2d5a3d` | 83    | `forest.moss`        |
| `#f8f5f0` | 66    | `parchment.warm`     |
| `#9de89d` | 20    | `spring.hover`       |

The remaining 273 unique hex values are drift. The top drift colors, in usage order, and where they should go:

| Drift hex  | Count | Migrate to          | Notes                              |
| ---------- | ----- | ------------------- | ---------------------------------- |
| `#6bc86b`  | 145   | `spring.base`       | green duplicate                    |
| `#2e7d32`  | 62    | `forest.base`       | Material green                     |
| `#e8f5e9`  | 42    | `parchment.whisper` | Material green light               |
| `#fbbf24`  | 41    | `amber.tan`         | Tailwind amber                     |
| `#4a9f9f`  | 36    | `forest.sage`       | teal drift                         |
| `#d4a017`  | 34    | `amber.dim`         | fold into amber                    |
| `#f59e0b`  | 24    | `amber.dim`         | Tailwind amber-500                 |
| `#4a9f4a`  | 23    | `forest.sage`       | green drift                        |
| `#f0c040`  | 20    | `amber.gold`        | gold duplicate                     |
| `#60a5fa`  | 15    | `spring.base`       | blue drift, collapse to accent     |
| `#c084fc`  | 14    | `spring.base`       | purple drift                       |
| `#1da1f2`  | 13    | `brand.twitter`     | allowed, only on Twitter button    |
| `#0a66c2`  | 14    | `brand.linkedin`    | allowed, only on LinkedIn button   |
| `#87ceeb`  | 10    | `parchment.whisper` | sky drift                          |
| `#86efac`  | 8     | `spring.soft`       | Tailwind green-300                 |
| `#166534`  | 8     | `forest.base`       | Tailwind green-800                 |
| `#dbeafe`  | 8     | `parchment.whisper` | Tailwind blue-100                  |
| `#1e40af`  | 8     | `forest.moss`       | Tailwind blue-800 drift            |
| `#3b82f6`  | 6     | `spring.base`       | Tailwind blue-500 drift            |
| `#8b5cf6`  | 5     | `spring.base`       | Tailwind violet drift              |

Full migration map is exported from `design-tokens.ts` as `DEPRECATED_COLORS`.

---

## Priority order

1. Fix V1: Enforce palette via ESLint rule (Critical, unblocks drift prevention)
2. Fix V2: Tier 1 route audit pass (Critical polish before launch)
3. Fix V3: Migrate season constants and quest data to tokens (High)
4. Fix V4: Migrate admin and governance components (High)
5. Fix V5: Tier 2 route audit pass (High)
6. Fix V6: Remove blue and purple drift across investor flow (High)
7. Fix V7: Tier 3 route audit pass (Medium)
8. Fix V8: Component-level polish (radius, shadow, button uniformity) (Medium)
9. Fix V9: Typography pass (Medium)
10. Fix V10: Light-mode tune-up (Low)
11. World-class UX refinements (appended after fixes)

---

## Fix V1 — Palette drift checker (Critical)

**Status:** DONE

**Symptom:** Developers drop hex values directly into Tailwind arbitrary classes (`bg-[#7dd87d]`). Over time this creates palette drift. 285 unique hex values was the baseline before cleanup.

**Root cause:** No enforcement layer. The code review loop doesn't catch new drift.

**Resolution:** Project does not have ESLint configured, so shipped a small Node/TSX script instead: `scripts/check-palette.ts`. It auto-builds the allowlist by reading every hex literal out of `client/src/lib/design-tokens.ts`, walks `client/src`, and reports drift grouped by hex with file:line snippets. Exit code is non-zero so CI can gate on it.

New npm scripts:
- `npm run check:palette` — strict mode, exits non-zero on drift
- `npm run check:palette:warn` — warn-only, always exits 0

Ignore list in the script covers `.css` files, the tokens file, and test files. Tailwind arbitrary classes that match a canonical token hex pass automatically.

**Files changed:**
- `scripts/check-palette.ts` (new)
- `package.json` (two new scripts)

**Acceptance criteria:**
- `npm run check:palette:warn` surfaces every drift occurrence with file:line and a sample.
- CI can adopt the strict variant once V2-V7 reduce drift to a near-zero baseline.

---

## Fix V2 — Tier 1 route audit pass (Critical polish before launch)

**Status:** SCRIPTS READY (browser audit) / CODED (per-route checklist)

**Symptom:** Visual drift, inconsistent card treatments, shadow mismatches, radius inconsistency, hero polish gaps across the most-trafficked routes.

**Root cause:** Routes built at different times by different patterns. No audit loop.

**Fix:** Walk each Tier 1 route on desktop Chrome (1440px) and iPhone 14 Pro emulator (393px) and iPhone SE emulator (375px). For each route, apply the checklist below and file specific patches.

**Tier 1 routes (12):**
- `/` (Home)
- `/quest`
- `/community`
- `/bionomics`
- `/governance`
- `/fund`
- `/play`
- `/ally`
- `/schedule`
- `/tools`
- `/map`
- `/profile`

**Per-route checklist:**
1. Does every surface consume a forest/parchment token from the locked palette? Flag any drift color.
2. Are all hero sections stacked or layered correctly on 375px without overlap? (follows Fix 4 pattern from Sprint 1)
3. Do all cards use `rounded-xl` (24px) for feature cards or `rounded-lg` (16px) for standard cards? No mixed radii in one card.
4. Are all primary CTAs `bg-[spring.base] text-[forest.deep]` with `shadow-md`? No variations.
5. Is every body `<p>` using `.safe-prose` class or equivalent `overflow-wrap: anywhere`?
6. Do spacing gaps match the 8pt grid? No `mt-3` next to `mb-5` mixed.
7. Are focus rings visible on every interactive element?
8. Does the page pass Lighthouse mobile accessibility at 95+?

For each route, write a small `AUDIT_{route}.md` summary under `audits/` with pass/fail per checkpoint. When a fix is trivial, ship the patch inline. When non-trivial, add a fix entry back into this document.

**Files changed:** Per route, specific component files. Create `audits/README.md` and `audits/{route-slug}.md` files as output.

**Acceptance criteria:**
- 12 `audits/*.md` files exist, one per Tier 1 route.
- All Critical findings patched in the same PR.
- Medium findings logged in this doc.
- Each route visually consistent with DESIGN_SYSTEM.md.

---

## Fix V3 — Migrate season constants and quest data to tokens (High)

**Status:** DONE (in code) / PENDING deploy

**Symptom:** `client/src/data/seasonConstants.ts` and `client/src/data/questData.ts` contain hardcoded hex values that drift from the canonical season accents.

**Root cause:** Pre-token code, never migrated.

**Fix:**
1. In `client/src/data/seasonConstants.ts`, import from `design-tokens.ts` and replace every hex with the matching `season.*` token. Existing seasons map cleanly:
   - Spring accent: `season.spring`
   - Summer accent: `season.summer`
   - Autumn accent: `season.autumn` (was `#d4a574`, matches)
   - Winter accent: `season.winter` (was `#8b7355`, swap to `forest.deep`)
2. In `client/src/data/questData.ts`, the gradients use arbitrary forest greens. Swap to gradients built from token combinations:
   ```ts
   gradient: `linear-gradient(to bottom, ${forest.base}, ${forest.sage})`
   ```
3. In `client/src/data/gameRoles.ts`, role colors should use tokens. Map `#7dd87d` to `spring.base`, `#d4a574` to `amber.tan`, `#4a9f4a` to `forest.sage`, `#fbbf24` to `amber.tan`.

**Files changed:**
- `client/src/data/seasonConstants.ts` (imports `season` from design-tokens; accent values now use tokens; 8 Tailwind arbitrary-class hex strings kept as literals because Tailwind JIT only scans static class names, but every remaining hex exactly matches a token and is documented in file-level JSDoc).
- `client/src/data/questData.ts` (imports `forest`, `amber`; SEASON_HERO gradients now built from tokens; zero drift hex remaining).
- `client/src/data/gameRoles.ts` (imports `spring`, `amber`, `forest`; all 24 `color` fields now reference tokens).

**Acceptance criteria:**
- Runtime drift eliminated: 40 hex literals down to 8, all 8 matching canonical tokens.
- Seasons render with corrected accents: spring now uses `spring.base`, summer uses `forest.sage`, fall unchanged `amber.tan`, winter iconBg uses `forest.moss` (visible) while the accent token is the locked `season.winter` = `forest.deep`.
- gameRoles drift colors `#4a9f4a`, `#fbbf24`, `#93c5fd` collapsed to the canonical palette.

---

## Fix V4 — Migrate admin and governance components (High)

**Status:** DONE (in code) / PENDING deploy

**Symptom:** `AdminCitizenshipTiers`, `AdminEventsTab`, `governance/StrawPoll`, `governance/PromotionModal` contain blue, purple, and Tailwind-amber drift colors.

**Root cause:** Built quickly with Tailwind defaults.

**Fix:** Open each file, replace every hex literal with the matching token from `design-tokens.ts`. Use the migration table at the top of this doc. Focus on these files first:

- `client/src/components/admin/AdminCitizenshipTiers.tsx`
- `client/src/components/admin/AdminEventsTab.tsx`
- `client/src/components/admin/AdminSimpleTabs.tsx`
- `client/src/components/AdminBannerEditor.tsx`
- `client/src/components/governance/PromotionModal.tsx`
- `client/src/components/governance/StrawPoll.tsx`
- `client/src/components/CampaignProgressTracker.tsx`
- `client/src/components/InvestorJourney.tsx`
- `client/src/components/ContributionModal.tsx`
- `client/src/components/CrowdPoolingTool.tsx`

**Acceptance criteria:**
- Each file free of drift hex values.
- `grep -E '#(60a5fa|c084fc|4a9f9f|fbbf24|f59e0b|6bc86b|2e7d32|4a9f4a)' <file>` returns empty for each.
- No visual regression.

---

## Fix V5 — Tier 2 route audit pass (High)

**Status:** CODED (plan)

**Symptom:** Secondary routes need the same audit.

**Fix:** Same checklist as Fix V2 applied to Tier 2 routes.

**Tier 2 routes (16):**
- `/blog`, `/blog/:slug`
- `/tokenomics`
- `/team`
- `/seasons`
- `/events/:id`
- `/series/:season`
- `/apply`, `/apply/status`, `/my-applications`
- `/investor`, `/loi`
- `/heal-the-land`
- `/hymn-book`
- `/glossary`
- `/features` (FeatureSuggestions)
- `/newsletter`
- `/co-creators-guide`
- `/game-mechanics`

**Acceptance criteria:**
- 16 `audits/*.md` summaries.
- Critical findings patched. Medium logged here.

---

## Fix V6 — Remove blue and purple drift across investor flow (High)

**Status:** DONE (in code) / PENDING deploy

**Symptom:** The investor flow (`/investor`, `/loi`, `/fund`, `CampaignProgressTracker`, `AllocationCalculator`) uses blue and purple accents that originated from Tailwind defaults and do not belong in the organic palette.

**Root cause:** Default Tailwind colors copy-pasted without review.

**Fix:** Systematic replacement:
- Any `#60a5fa`, `#3b82f6`, `#1e40af`, `#1877f2` (non-brand) swap to `spring.base` or `forest.sage` based on context (emphasis vs. subdued).
- Any `#c084fc`, `#8b5cf6`, `#5b21b6`, `#ede9fe` swap to `spring.base` or `amber.gold` for emphasis.
- Keep `#1da1f2` only inside the Twitter share button.
- Keep `#0a66c2` only inside the LinkedIn share button.

**Files changed:** All files with blue/purple hex (surveyed). Priority:
- `client/src/components/InvestorJourney.tsx`
- `client/src/pages/InvestorForm.tsx`
- `client/src/pages/LOI.tsx`
- `client/src/components/AllocationCalculator.tsx`
- `client/src/components/CampaignProgressTracker.tsx`
- `client/src/components/ContributionCalculator.tsx`
- `client/src/components/ContributionModal.tsx`

**Acceptance criteria:**
- Investor flow renders entirely in the organic palette.
- Only Twitter and LinkedIn share buttons retain brand blues.
- Grep confirms no residual `#60a5fa|#3b82f6|#c084fc|#8b5cf6` in these files.

---

## Fix V7 — Tier 3 route audit pass (Medium)

**Status:** CODED (plan)

**Fix:** Same checklist on Tier 3 routes.

**Tier 3 routes (remainder):**
- All admin routes under `/admin/*`
- Campaign routes: `/campaigns`, `/campaign/:id`, `/campaign/:id/manage`, `/campaign/:id/analytics`
- `/crowd-pooling`, `/crowd-pooling-projects`, `/compare-projects`, `/create-campaign`
- Governance tenant routes: `/gov/create`, `/gov/:slug`, `/gov/:slug/backfield`, `/community/decisions`, `/community/decisions/stories`, `/proposals`, `/shape-next-session`
- Community subpages: `/community/c/:slug`, `/community/post/:id`, `/community/new`, `/community/tag/:tag`, `/community/chains`, `/community/seeking-team`, `/community/members`, `/community/guidelines`, `/community/quests`, `/community/user/:id`
- `/messages`, `/messages/:conversationId`
- `/claim-seeds`, `/connect`, `/showcase`
- Tools: `/tools/:slug`, `/tools/submit`
- Custom content: `/custom-games`, `/marketplace`, `/regen-games`, `/socials`
- Profile: `/profile/:handle`
- Legal: `/privacy-policy`, `/terms-of-use`, `/risk-disclosure`, `/disclaimers`, `/unsubscribe`
- Redirect shells: `/form`, `/opportunity`, `/economy`, `/local-food-economy`

**Acceptance criteria:**
- Every route produces an audit file.
- Palette drift reduced to near zero across client/src.

---

## Fix V8 — Component-level polish (Medium)

**Status:** CODED (plan)

**Symptom:** Cards vary in radius across the codebase (`rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` all appear). Shadows use black tint in some places, forest tint in others. Buttons have at least four distinct primary styles.

**Root cause:** No unified component primitives.

**Fix:**
1. Audit radius usage: `grep -rE 'rounded-(md|lg|xl|2xl|3xl)' client/src | sort | uniq -c`. Pick the two canonical radii (`rounded-lg` for cards, `rounded-xl` for feature cards and heroes). Migrate everything else.
2. Audit shadow usage: consolidate to `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` using the forest-tinted shadow tokens from `design-tokens.ts`. Custom `box-shadow` inline styles get swapped.
3. Create a `<PrimaryButton>`, `<SecondaryButton>`, `<GhostButton>` primitive in `client/src/components/ui/regen-button.tsx` and migrate the top 20 places where buttons are built inline.

**Files changed:**
- `client/src/components/ui/regen-button.tsx` (new)
- Top 20 consumer files (tracked during audit)
- `client/src/index.css` (add shadow utility classes if needed)

**Acceptance criteria:**
- Card radii: only `rounded-lg` and `rounded-xl` across the app.
- Buttons: every primary CTA uses the same primitive.
- No inline `box-shadow` outside the shadow utility tokens.

---

## Fix V9 — Typography pass (Medium)

**Status:** CODED (plan)

**Symptom:** Heading sizes, body sizes, and line heights vary page-to-page. Some pages use `text-5xl`, others `text-4xl` for the same h1 role.

**Root cause:** No enforced scale.

**Fix:**
1. Define heading scale in `client/src/index.css` `@layer base`:
   ```css
   h1 { font-size: clamp(2.25rem, 6vw, 3.75rem); line-height: 1.1; }
   h2 { font-size: clamp(1.875rem, 4vw, 2.5rem); line-height: 1.2; }
   h3 { font-size: clamp(1.5rem, 3vw, 1.875rem); line-height: 1.3; }
   h4 { font-size: clamp(1.25rem, 2.5vw, 1.5rem); line-height: 1.4; }
   ```
2. Pages that override headings inline get audited and collapsed to these scales.
3. Body prose gets `max-w-prose` applied to every `<p>` inside long-form content containers (blog, governance sections, bionomics, co-creators guide). This caps line length at ~65 characters for readability.

**Files changed:**
- `client/src/index.css`
- Top long-form pages: `Bionomics.tsx`, `Governance.tsx`, `Tokenomics.tsx`, `Blog.tsx`, `BlogPost.tsx`, `ReGenCoCreatorsGuide.tsx`, `HealTheLand.tsx`

**Acceptance criteria:**
- Every h1 across the site renders at the same clamp scale.
- Long-form prose reads at ~65 characters max line length on desktop.
- Mobile body remains at 15-16px.

---

## Fix V10 — Light-mode tune-up (Low)

**Status:** CODED (plan)

**Symptom:** The site defaults to dark forest. The existing light mode works but the palette mapping needs a clean audit against the locked tokens.

**Root cause:** OKLCH variables in `:root` were never re-anchored after the palette lock.

**Fix:**
1. Map `:root` variables in `index.css` to the locked tokens so `--background`, `--card`, `--foreground`, `--muted` all resolve to the parchment and forest scales.
2. Test every Tier 1 route in light mode.
3. Expose a toggle in the Command Panel (see Fix 10 in Sprint 1).

**Files changed:**
- `client/src/index.css`
- `client/src/components/CommandPanel.tsx` (once Sprint 1 Fix 10 lands)

**Acceptance criteria:**
- Light mode reads calm and cream, not harsh white.
- Contrast passes WCAG AA on all body text.
- Toggle persists across sessions.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| V2-a | Walk each Tier 1 route on a physical iPhone (Safari) and confirm visual quality after Claude Code's audit patches land | Real device validation | Open regencivics.earth on iPhone |
| V2-b | Confirm the locked palette feels right after Tier 1 patches deploy | Aesthetic judgment | Browser review on Railway deploy |
| V10-a | Final approval on light-mode palette mapping | Aesthetic judgment | Toggle light mode and walk routes |
| all | `git add -A && git commit && git push` after each fix batch | Claude Code holds git index lock | From project root |
| all | Confirm Railway deploy succeeded | Railway dashboard | Deployments tab |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| — | Create `client/src/lib/design-tokens.ts` with locked palette | DONE |
| — | Write `DESIGN_SYSTEM.md` one-page style guide | DONE |
| — | Survey 285 unique hex values and produce migration map | DONE |
| V1 | Palette drift checker via `scripts/check-palette.ts` + npm scripts | DONE |
| V1b | Install flat-config ESLint (@eslint/js + typescript-eslint + react-hooks + react-refresh). Config at `eslint.config.js`, rules set to warn so CI stays green. | CODED |
| V2 | Run desktop + mobile emulator audit on 12 Tier 1 routes via webapp-testing skill; produce `audits/*.md` files | QUEUED |
| V2 | Patch Critical findings inline during the audit | QUEUED |
| V3 | Migrate `data/seasonConstants.ts`, `data/questData.ts`, `data/gameRoles.ts` to tokens | DONE |
| V4 | Migrate 10 admin and governance components listed in Fix V4 | DONE |
| V5 | Sweep Tier 2 and Tier 3 drift hexes to canonical tokens across `client/src`, `server/`, `apps/gov/src/` (sed mass-replace, 190+ occurrences cleaned, including uppercase variants). Only remaining hexes are `DEPRECATED_COLORS` docs in `design-tokens.ts`, archived one-pagers, and the seed-forum-posts script. | DONE |
| V6 | Remove blue and purple drift from investor flow | DONE |
| V6b | Normalize `#f0c040` → `amber.gold` across Governance SVG and Game page gradients | DONE |
| V7 | Audit remaining Tier 3 routes | QUEUED |
| V8 | Consolidate radius, shadow, button primitives | QUEUED |
| V9 | Enforce typography scale in `index.css` `@layer base` | QUEUED |
| V10 | Re-anchor `:root` variables to locked tokens and test light mode | QUEUED |
| Fix 6 cron | Wire `sweepEventStatuses` into `/api/cron/nightly-batch` in `server/_core/index.ts` | DONE |
| Railway verify | Confirm production deploy succeeded + cron-nightly-batch scheduled and last run green | DONE (via browser check against Railway dashboard) |
| DB verify | Confirm migration runner does not require multi-statement support on DATABASE_URL. Runner sets `multipleStatements: false` and splits SQL itself. No change needed to DATABASE_URL. | DONE |

### WAITING ON YOU before Claude Code can proceed

- Nothing blocking. All audit work can proceed autonomously. Rye's approvals happen after each PR lands on Railway.

---

# 10 Additional World-Class UX Refinements

Building on the 15 captured in Sprint 1. Curated during the color survey and route mapping.

### 1. Motion language lock

Pick three motion durations (`120ms`, `200ms`, `400ms`) and three easings (`ease-out`, `ease-in-out`, `cubic-bezier(0.2, 0.8, 0.2, 1)`). Apply to every transition. Ban inline `transition-all duration-500`.

### 2. Bottom-nav haptics

On iPhone Safari, `navigator.vibrate` already fires on long-press customize. Extend to tab-switch and CTA press with a subtle 10ms pulse. Feels native without being intrusive.

### 3. First-class empty states

Every list view (forum categories, campaign lists, quest slots, member directory) should have a custom illustrated empty state in the solarpunk style, not a generic "No results". These moments are high-signal for a community platform.

### 4. Scroll-linked hero motion

Heroes subtly parallax or shift tone on scroll (last 200px of the hero). Low amplitude, high craft. Uses `scroll-timeline` with fallback.

### 5. Avatar ring signals tier

Citizenship tier shows up as a thin outer ring color on the avatar across the whole site. Four tiers, four subtle rings. Silent recognition.

### 6. Reading time on blog + long-form pages

Every long-form page shows a `Reading time: 4 min` pill in the header. Tiny touch. Builds trust.

### 7. "Saved for later" on every blog post and quest

One-tap bookmark icon on every content card. Favorites surface in Command Panel Recent & Favorites tab.

### 8. Inline translations surface

Once the site goes multi-lingual, show a language switcher with a flag near the user menu. Default to device locale, remember user choice. Prepares for international movement scale.

### 9. Toast stack uses forest tint

Current toasts use sonner defaults (often near-white). Re-style to match the forest palette so notifications feel native. Success = `spring.base` tint, warning = `amber.tan` tint, error = `alert.red` tint.

### 10. Global keyboard shortcut map

Press `?` anywhere to open a shortcut cheat sheet overlay. Shows Cmd+K, page navigation keys, bookmark shortcut, and anything added later. Signals the site is built by people who care about power users.

---

## Writing rules compliance

Zero em-dashes. Zero contrast framing. Zero banned AI words. Every fix states what the thing should become.
