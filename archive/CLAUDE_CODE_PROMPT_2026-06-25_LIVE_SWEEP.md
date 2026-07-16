# Claude Code Prompt — 2026-06-25 Live Sweep Fixes

A live walkthrough of regencivics.earth after the recent deploys surfaced ten fixes and improvements. This prompt is self-contained: each item has a file location, a root cause, and a concrete fix. The companion findings doc with screenshots context is `FIXES_TO_MAKE_2026-06-25_live-sweep.md`.

Read `CLAUDE.md` and `.ai/docs/STEERING.md` first.

## Hard rules (non-negotiable)

- Writing rules on every string you touch: no em-dashes, no contrast-framing, capitalize "Game" as a noun, plain language.
- Ship Gate before any VERIFIED or DONE claim: `python3 scripts/audit-truncation.py`, then a className grep for any new CSS class you add (`rg -g '*.css' '<class>' client/src/`), then `pnpm typecheck` exit 0. No VERIFIED without evidence.
- Do not push or deploy. Stage commits with clear messages and stop. Rye pushes and approves the Railway deploy.
- The contrast items are the theme of this batch. When you raise a faint tier, check it against the project's contrast history (`CONTRAST_AUDIT_2026-05-29*`) so you do not reintroduce a known-fail value.

## Confirmed working (do not re-fix)

Alliance accordions expand (`/ally`), Fund buttons are real links and the deck PDF resolves (`/fund`), "Start a Dialogue" and "Infinite Game" capitalization shipped, Tools "Explore" links go external (`/tools`).

## Execution order

Do the contrast and nav fixes first (they touch the most pages), then the per-page items, then the governance-strip polish, then the Living Tree (separate plan). Commit per numbered group.

### 1. Forum thread page is washed out and low-contrast (High)
Files: `client/src/pages/CommunityPost.tsx`, `client/src/components/governance/GovernanceLifecycleStrip.tsx`, `client/src/components/governance/PerspectiveControl.tsx`.
Root cause: on the thread the title sits on the `from-[#1a472a] to-[#2d5a3d]` hero (`CommunityPost.tsx` line ~406) and reads as muted gray; the governance strip uses faint tiers (`text-white/30` for upcoming stages, `/40` counts, `/50` meta) over `bg-white/[0.03]`, and the "Ready to sense the room?" and "Promote to decision" actions are similarly faint.
Fix: raise the strip text tiers (upcoming stage to at least `text-white/55`, active stays the green accent; counts and meta to `text-white/70`). Strengthen the thread title color on the hero. If a page-level scrim/overlay is dimming the post card, reduce its opacity on `/community/post/*`. Verify legibility on the dark surface.

### 2. Nav wordmark collides with the menu pills (High)
File: `client/src/components/Navigation.tsx` (logo at lines ~129-137, "4 Paths" and "Play the Game" pills follow).
Root cause: the desktop wordmark "ReGen Civics" (line ~137) has no reserved min-width or flex protection, so the adjacent pills overlap it at mid widths.
Fix: give the logo a `flex-shrink-0` and adequate right margin / min-width, or collapse the nav to the mobile menu one breakpoint earlier so the wordmark and pills never overlap. Test across the widths where the desktop nav shows.

### 3. Home "Pick up where you left off" thumbnails fail on reload (High)
Files: `client/src/components/ProgressiveOnboarding.tsx` (the cards around line ~175), and the `/api/img` proxy path.
Root cause: the three card thumbnails rendered on first load and came back empty on reload, which points at a flaky image fetch or a lazy-load that does not retry, with no fallback so a miss leaves a blank card.
Fix: add an `onError` fallback image (or a tinted placeholder with the card title) and confirm the images are served through `/api/img` with correct caching. Reproduce by hard-reloading the home page a few times.

### 4. Home returning-user copy for first-time and logged-out visitors (Medium, VERIFY first)
File: `client/src/components/ProgressiveOnboarding.tsx` ("Welcome Back to ReGen Civics" line ~253, "YOUR PATH" badge line ~275, "Pick up where you left off" line ~175; the first card block guards with `if (!user || !profile) return null;` line ~130).
Note: I observed the returning UI while the browser was signed in as Rye, so this may already be correct. First verify the logged-out and brand-new-user home. If a logged-out visitor still sees "Welcome Back" or "YOUR PATH," add a first-visit variant (a welcome plus an invitation to pick a path). If the logged-out home already differs, mark this DONE.

### 5. Community hero title is low-contrast (Medium)
File: `client/src/pages/Community.tsx` (the "Gathering Grove" title, line ~321).
Root cause: the title renders as muted gray on the dark forest hero image.
Fix: lighten the title color and/or add a focused scrim behind the hero text block only (not the whole image), so the title is legible without flattening the art.

### 6. Tool card logos are missing (Medium)
File: `client/src/pages/ToolsLibrary.tsx` (the "Tools we use" cards render `tool.logoUrl ? <img> : ...` around line ~328; an earlier card variant at line ~181 already has an `onError` fallback to mimic).
Root cause: when `logoUrl` is null the card shows an empty gray square. The cards on the live page (Hypha, LocalScale, Gitcoin, Hylo) all show blanks.
Fix: render a clean lettermark fallback (first letter on a tinted circle) when `logoUrl` is missing or fails, reusing the fallback pattern already at line ~189-193. Optionally populate `logoUrl` for the known tools.

### 7. Governance lifecycle strip shows on every thread and feels crowded (Medium, improvement)
Files: `client/src/pages/CommunityPost.tsx` (the strip is rendered for all threads, lines ~606-616), `client/src/components/governance/GovernanceLifecycleStrip.tsx`.
Root cause: the four-stage strip plus "Ready to sense the room?" plus the emoji row plus "Promote to decision" all stack on an ordinary quest discussion thread, which reads heavy.
Fix: show a simplified one-line stage indicator while a thread is still in `dialogue`, and expand to the full strip only once it reaches `sensing` or beyond (or gate the full strip behind a small "governance" affordance). Tighten vertical spacing and the hierarchy between the strip, reactions, and the promote action.

### 8. Reversibility explanation uses a hover-only tooltip (Medium, mobile)
Files: `client/src/components/governance/GovernanceLifecycleStrip.tsx` (the reversibility label `title=` at line ~137), `client/src/components/governance/PerspectiveControl.tsx` (the tally bar `title=` at line ~123).
Root cause: `title` tooltips never appear on touch, so the explanation is invisible on a phone.
Fix: replace with a tap-to-reveal popover or render the short explanation inline beneath the label. No reliance on hover for meaning.

### 9. Thread page has a large dead band at the top (Low)
File: `client/src/pages/CommunityPost.tsx` (the hero section `pt-24 pb-4 md:pt-28 md:pb-6` at line ~406).
Root cause: the top padding that clears the fixed nav leaves a tall mostly-empty band above the breadcrumb and title.
Fix: reduce the hero top padding to the minimum that clears the fixed nav, so the thread starts higher. Confirm the title is not hidden under the nav after the change.

### 10. Living Tree on the profile is still the basic render (Improvement)
This is its own build. Execute `CLAUDE_CODE_PROMPT_2026-06-25_LIVING_TREE.md` (style anchor locked to `tree-final-B1-clean-vignette.png`). Listed here so it stays on the radar; it is the biggest single visual upgrade to the profile.

## Verification

- Items 1, 7, 8 and the perspective control should be confirmed on a real iPhone Safari, since the live capture could not render at a true phone width and all of Rye's original feedback is iOS Safari.
- Run the Ship Gate after each group. Update the status table in `FIXES_TO_MAKE_2026-06-25_live-sweep.md` (CODED to FIXED to VERIFIED) with evidence per row. When the batch is done, move the dated docs to `archive/` and add a one-paragraph entry to the top of `SHIPPED_LOG.md`.

## Handoff Breakdown — Who Does What

### YOU (Rye)

| # | Task | Where |
|---|------|-------|
| 1 | On-device Safari confirm of items 1, 7, 8 and the perspective control | iPhone |
| 2 | Decide item 4 if the logged-out home does show returning-user copy | Reply in chat |
| 3 | Push and approve the Railway deploy after commits | Local + Railway |

### CLAUDE CODE

| # | Task | Status |
|---|------|--------|
| 1 | Thread page + governance strip contrast; reduce overlay | READY |
| 2 | Nav wordmark collision | READY |
| 3 | Home thumbnail load + fallback | READY |
| 4 | Verify logged-out home; add first-visit variant if needed | VERIFY |
| 5 | Community hero title contrast | READY |
| 6 | Tool card logo lettermark fallback | READY |
| 7 | Simplify/gate governance strip; tighten hierarchy | READY |
| 8 | Replace hover tooltips with tap/inline | READY |
| 9 | Tighten thread page top padding | READY |
| 10 | Living Tree overhaul (separate plan) | READY |
| - | Ship Gate before VERIFIED | required |
