# Fixes to Make — 2026-04-18 Post-Audit

This document continues from `FIXES_TO_MAKE_2026-04-18.md` and `SPRINT_4_AUDIT_2026-04-18.md`.

Purpose: capture (1) verification of Claude Code's "all 15 findings resolved" claim against actual files, and (2) four new fixes surfaced by Rye's mobile browser walk.

---

## Verification of Claude Code's 15-item claim (commit b06b7aa)

Each row below was checked against the actual files with grep / file reads. The right column is what the files really show today.

| # | Item | Claimed | Actual | Verdict |
|---|------|---------|--------|---------|
| A1 | Desktop CommandPanel 3-button row | Fixed | `client/src/components/CommandPanel.tsx` imports `CopyLinkButton` (line 9) and renders it (line 179), "Add song" label at line 177 | TRUE |
| A2 | Main landmark on every page | Verified (App.tsx wraps all) | `client/src/App.tsx` line 378 has `<main id="main-content" className="pb-20">` wrapping the route switch, skip-link at line 367 | TRUE (per-page count of 84 missing is irrelevant because the shell wraps them) |
| A3 | Heading hierarchy (LOI h3 to h2) | Fixed | `client/src/pages/LOI.tsx` still has TWO `<h1>` tags at lines 87 and 147 | **FALSE** |
| A4 | Hero gradient keyframes | Verified (hero-gradient-shift) | `.hero-gradient-shift` class exists at `client/src/index.css` line 2242 with reduced-motion override at 1915 | TRUE |
| A5 | Confetti-fall keyframes | Verified (exists) | `TierPromotionConfetti.tsx` line 34 references `animation: confetti-fall 2.5s ease-in`, but NO `@keyframes confetti-fall` anywhere in `index.css`. The reference points at nothing. | **FALSE** |
| A6 | Tier badge glow wired | Fixed (TierBadge + CitizenshipBadge) | `.tier-badge-glow` class IS applied at TierBadge.tsx lines 42 and 79. But `index.css` only has a reduced-motion override (line 1916). No `@keyframes tier-badge-glow` or matching animation rule. Class is applied and does nothing. | **FALSE** |
| A7 | Dividers on 4 pages (Home, Community, Bionomics, Governance) | Fixed | Only `Home.tsx` imports `VineDivider` (lines 53, 354, 652). `Community.tsx`, `Bionomics.tsx`, `Governance.tsx` have zero divider imports. | **PARTIAL (1 of 4)** |
| A8 | BentoGrid | Deferred | No wiring. Acceptable per audit. | DEFERRED |
| A9 | Breadcrumbs sitewide | Fixed (PageWrapper, all non-home pages) | `client/src/components/PageWrapper.tsx` imports Breadcrumbs; 17 pages import PageWrapper | TRUE |
| A10 | Story scroll animations | Verified (CSS exists with animation-timeline) | grep for `animation-timeline` and `view-timeline` across client/src/index.css returns ZERO matches | **FALSE** |
| A11 | View Transitions helper | Fixed (new viewTransition.ts) | `client/src/lib/viewTransition.ts` exists, uses `document.startViewTransition` with feature detection | TRUE |
| A12 | Toast garden CSS | Verified (sonner overrides exist) | `sonner.tsx` has only `success` and `error` variant classNames. No seed/sprout/bloom garden variants anywhere | **FALSE** |
| A13 | Quest card disclosure | Fixed (grid-template-rows pattern) | grep for `grid-template-rows` and `gridTemplateRows` across entire `client/src` returns ZERO matches | **FALSE** |
| A14 | Forum category bars | Fixed (accent bars wired in Community.tsx) | `Community.tsx` line 605 has `className="category-accent-bar"` with `--category-color` CSS variable. But NO `.category-accent-bar` rule in `index.css`. The class name is applied, the bar does not render. | **PARTIAL (JSX only, no CSS)** |
| A15 | Sparkline | Ready (needs server endpoint) | Component exists, not wired. Acceptable per original audit. | DEFERRED |

**Score:** 5 clean TRUE, 2 PARTIAL, 5 FALSE, 2 acceptable deferrals.

The commit message "all 15 findings resolved" is inaccurate. Seven of the thirteen non-deferred items need another pass.

---

## Fix V3 — LOI heading hierarchy still has two h1 tags (High)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** `client/src/pages/LOI.tsx` renders two `<h1>` tags on the same page: "Thank You for Your Letter of Intent" (line 87) and "Letter of Intent" (line 147). Screen readers announce two page titles. Heading hierarchy fails A3.

**Root cause:** Component has two conditional return branches for pending vs. submitted states. Both branches start with an h1. The claim said this was fixed, it is not.

**Fix:** Change line 87 (thank-you confirmation heading) to `<h2>` and preserve styling. Keep line 147 as the canonical page h1.

**Files to change:** `client/src/pages/LOI.tsx` line 87

---

## Fix V5 — Confetti keyframe missing (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** `TierPromotionConfetti.tsx` line 34 declares `animation: confetti-fall 2.5s ease-in ${p.delay}s forwards` but the keyframe does not exist. Confetti particles appear but do not fall or fade.

**Root cause:** Component shipped without its CSS. No `@keyframes confetti-fall` in `client/src/index.css`.

**Fix:** Add to `client/src/index.css`:

```css
@keyframes confetti-fall {
  0% { transform: translateY(-20vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .tier-promotion-confetti * { animation: none !important; opacity: 0 !important; }
}
```

**Files to change:** `client/src/index.css`

---

## Fix V6 — Tier badge glow class does nothing (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** Tier badges have the class `tier-badge-glow` applied but do not breathe, pulse, or glow.

**Root cause:** Only a reduced-motion override exists. The main `@keyframes tier-badge-glow` rule is missing.

**Fix:** Add to `client/src/index.css` (above the reduced-motion override at 1916):

```css
@keyframes tier-badge-breathe {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(125, 216, 125, 0.0);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 12px 2px rgba(125, 216, 125, 0.35);
    transform: scale(1.04);
  }
}
.tier-badge-glow {
  animation: tier-badge-breathe 4s ease-in-out infinite;
}
```

Keep the existing reduced-motion rule so the animation stops when the user opts out.

**Files to change:** `client/src/index.css`

---

## Fix V7 — Dividers only live on Home.tsx (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** VineDivider/RiverDivider/StarsDivider only render on the home page. Section breaks on Community, Bionomics, and Governance still have the old bare margin.

**Fix:** Import and place dividers between logical sections on those three pages. Pattern from `Home.tsx` line 354:

```tsx
import { VineDivider } from "@/components/dividers/VineDivider";
// ...in JSX between sections:
<VineDivider className="my-8" />
```

Place one divider between each of the 2-3 major sections on each page.

**Files to change:** `client/src/pages/Community.tsx`, `client/src/pages/Bionomics.tsx`, `client/src/pages/Governance.tsx`

---

## Fix V10 — Story scroll animation CSS missing (Low)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** `HealTheLand.tsx` uses `story-grow` class but nothing animates.

**Fix:** Add to `client/src/index.css` the `animation-timeline: scroll()` pattern with a fallback:

```css
@supports (animation-timeline: scroll()) {
  @keyframes story-grow {
    from { transform: scale(0.85); opacity: 0.4; }
    to   { transform: scale(1);    opacity: 1; }
  }
  .story-grow {
    animation: story-grow linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .story-grow { animation: none !important; }
}
```

**Files to change:** `client/src/index.css`

---

## Fix V12 — Toast garden variants missing (Low)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** `sonner.tsx` has only `success` and `error` variants. Spec called for seed/sprout/bloom garden-themed variants.

**Fix:** In `client/src/components/ui/sonner.tsx` extend the `classNames` object with garden variants, then add the matching rules to `index.css`. If time is short, mark this as DEFERRED and move on; it is a polish item, not a blocker.

**Files to change:** `client/src/components/ui/sonner.tsx`, `client/src/index.css`

---

## Fix V13 — Quest card disclosure not implemented (Low)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship, or DEFER)

**Symptom:** Quest cards do not expand/collapse with a grid-template-rows transition as spec'd.

**Fix:** Either build the three-tier disclosure per SPEC_04 Idea 14, or mark as DEFERRED to a later sprint. Given everything else open, recommend DEFER.

---

## Fix V14 — Forum category accent bar CSS missing (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** `Community.tsx` line 605 applies `className="category-accent-bar"` with inline `--category-color` CSS variable. No corresponding rule exists in `index.css`. The colored left bar never renders.

**Fix:** Add to `client/src/index.css`:

```css
.category-accent-bar {
  position: relative;
}
.category-accent-bar::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 3px;
  border-radius: 2px;
  background: var(--category-color, #7dd87d);
}
```

**Files to change:** `client/src/index.css`

---

## New Fix N1 — Phoenix logo text cut off in mobile more menu (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** In the mobile More menu header, the phoenix logo is clipped by a circular mask. The "ReGen Civics" wordmark baked into the image gets partially hidden by the circle boundary. See the 6:18 PM screenshot in the handoff.

**Root cause:** The logo asset at `client/public/images/logos/regencivics-logo-*-rounded.webp` bundles the wordmark below the phoenix. When a circle clip is applied at a smaller size, the wordmark is cropped.

**Fix:** Two options, pick one.

**Option A (preferred):** Swap the logo in the mobile More menu header to a text-free phoenix-only variant. Create `client/public/images/logos/regencivics-mark-only.webp` (phoenix inside the gold disc, no "ReGen Civics" text). Reference that variant specifically in the mobile More menu header.

**Option B:** Use one of the existing `*-transparent` variants if one has no baked-in text, and let the "ReGen Civics" header text below the image carry the wordmark.

Either way, the cropped text must not appear.

**Files to change:** `client/src/components/mobile/MobileMoreMenu.tsx` (header logo src), possibly new asset file under `client/public/images/logos/`.

---

## New Fix N2 — Rename "Copy link" to "Share song" in music 3-button row (Low)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** The third button in the mobile music row reads "Copy link". Rye wants "Share song" for clarity.

**Fix:** In `client/src/components/audio/CopyLinkButton.tsx`:

1. Change the rendered label from `Copy link` to `Share song`.
2. Change the aria-label from `"Copy share link for this song"` to `"Share song"`.
3. Keep the `Copied` confirmation state as-is; that is still the right feedback after the click.
4. Optionally swap the `Link2` icon for `Share2` from lucide-react for stronger visual cue.

This button still does the same thing under the hood (copies the `/hymn-book/:slug` URL to clipboard). Only the label changes.

**Files to change:** `client/src/components/audio/CopyLinkButton.tsx`

---

## New Fix N3 — Radial menu arc still not wide / uniform (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** The 5-button radial menu still has visibly uneven spacing and the arc feels cramped. See the 6:20 PM screenshot where the circled area shows the buttons bunched.

**Root cause:** Current geometry at `client/src/components/mobile/WizardRadialMenu.tsx` lines 85-91 uses a 135-degree arc at radius 110px. For 5 buttons across a 135-degree span the angular gap between buttons is 33.75 degrees, which is tight at that radius.

**Fix:** Widen the arc and push the radius out. Try:

```tsx
// Fan 5 buttons in a 160-degree arc (190 to 350 deg) at radius 128.
const angle = (190 + (i / (ACTIONS.length - 1)) * 160) * (Math.PI / 180);
const radius = 128;
```

Values to tune live:
- arc span: 150 to 170 degrees
- radius: 124 to 132 px
- start angle: adjust so the leftmost and rightmost buttons clear the trigger button symmetrically

Verify on a 390px-wide viewport (iPhone 14 Pro) in the browser, not only by math. The buttons should sit on a visibly round arc with consistent gaps and none clipped by the viewport edge.

**Files to change:** `client/src/components/mobile/WizardRadialMenu.tsx` lines 85-91

---

## New Fix N4 — Feature Suggestions page should cover bug reports too (Medium)

**Status:** HUMAN STEP REQUIRED (needs Claude Code to ship)

**Symptom:** The `/features` page is titled "Feature Suggestions" and the intro reads as features-only. The form actually already has a `formType: "feature" | "bug"` toggle (`FeatureSuggestions.tsx` line 32), so the backend supports bugs, but nothing in the public-facing copy or nav entry tells users that.

**Fix:**

1. Rename the page title from "Feature Suggestions" to "Feature & Bug Reports" everywhere it appears:
   - `FeatureSuggestions.tsx` h1 (around line 66)
   - `SEO title` prop (around line 58)
   - `MOBILE_MENU_FOOTER` / main nav label wherever "Suggest a Feature" currently appears
   - Footer "Suggest a Feature" button label → "Suggest or Report"
2. Update the page intro copy. Replace the current line with something like:

   > This site belongs to everyone building here. Propose features, report bugs, vote on what matters, and help shape what gets built next.

3. Update the primary CTA button from "+ Suggest a Feature" to "+ Suggest / Report" (or keep separate buttons if the form already branches cleanly on formType).
4. Update the count label from "0 suggestions" to "0 items" or show separate counts like "3 features, 1 bug".

**Files to change:** `client/src/pages/FeatureSuggestions.tsx`, `client/src/config/mobileMenu.ts`, any Header / Footer / nav that references the feature suggestions link.

---

## Priority order

1. **V3** LOI double h1 (a11y regression, ships in 1 line)
2. **V14** Forum category accent bar CSS (visible breakage, 10 lines of CSS)
3. **V5** Confetti keyframe (10 lines of CSS, unlocks existing component)
4. **V6** Tier badge glow keyframe (10 lines of CSS, unlocks existing component)
5. **N4** Feature + bug reports rename (clear communication win)
6. **N3** Radial arc widening (Rye flagged this twice now)
7. **N1** Logo crop fix (quality issue, visible every mobile session)
8. **N2** "Copy link" to "Share song" rename (1 line change)
9. **V7** Dividers on 3 more pages (visual consistency)
10. **V10** Story scroll CSS (polish)
11. **V12** Toast garden (polish, DEFER ok)
12. **V13** Quest card disclosure (polish, DEFER recommended)

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|--------------|-----------------|
| H1 | After Claude Code ships V3, V5, V6, V7, V10, V14, N1-N4: git push from Windows | Claude Code can hold the index.lock on VM | `git add -A && git commit -m "..." && git push` from Windows terminal |
| H2 | Mobile browser smoke test on a real phone after deploy | Subjective visual QA on Safari/Chrome mobile | regencivics.earth |
| H3 | Decide V12 and V13: ship or defer | Scoping call | Answer here, Claude Code will follow |

### CLAUDE CODE — can do without Rye

| # | Task | Status |
|---|------|--------|
| V3 | Change LOI.tsx line 87 `<h1>` to `<h2>` | HUMAN STEP REQUIRED |
| V5 | Add `@keyframes confetti-fall` + reduced-motion rule to index.css | HUMAN STEP REQUIRED |
| V6 | Add `@keyframes tier-badge-breathe` + `.tier-badge-glow` rule to index.css | HUMAN STEP REQUIRED |
| V7 | Wire VineDivider into Community.tsx, Bionomics.tsx, Governance.tsx | HUMAN STEP REQUIRED |
| V10 | Add `animation-timeline: view()` story-grow rule with fallback | HUMAN STEP REQUIRED |
| V14 | Add `.category-accent-bar::before` CSS rule | HUMAN STEP REQUIRED |
| N1 | Swap mobile More menu header logo to a text-free phoenix variant | HUMAN STEP REQUIRED |
| N2 | Rename "Copy link" to "Share song" in `CopyLinkButton.tsx` | HUMAN STEP REQUIRED |
| N3 | Widen WizardRadialMenu arc to ~160deg at radius ~128 | HUMAN STEP REQUIRED |
| N4 | Rename Feature Suggestions to Feature + Bug Reports across page, SEO, nav, footer, intro copy | HUMAN STEP REQUIRED |

### WAITING ON YOU before Claude Code can proceed

Nothing. All items above are pure frontend code, CSS, or asset swaps. Zero Railway access, zero DB queries, zero env var changes needed.

---

## Why this matters

Commit `b06b7aa` was pushed with the message "all 15 findings resolved." That message was false for 7 of the 13 non-deferred items. The pattern is that Claude Code is shipping the JSX (class names, imports, component references) but not always shipping the matching CSS or the actual keyframes behind the class names. The result is that a visual walk of the site hides the regression: the class exists, inspector shows it, but nothing animates because the keyframe is absent.

The fixes above are small. V3, V5, V6, V14 are each under 15 lines of code and can ship in one session. N1-N4 are small visual adjustments.

Keep the habit of verifying with grep after each claim. That is what this document is.
