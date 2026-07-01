# Claude Code Prompt — Speed, Responsiveness, Beauty Sprint (2026-06-26)

You are working in the `regen-civics` repo. Goal: dramatically improve site speed,
responsiveness, and visual polish while preserving every feature and element. This
doc is the plan. Work top to bottom by phase. Each fix lists the files, the change,
and the evidence required before you can mark it past `CODED`.

This audit was run against the live source and the committed `dist/public/assets`
build on 2026-06-26. The foundation is already strong (route-level lazy loading,
PWA service worker, self-hosted fonts with `font-display: swap`, a WebP image proxy
with immutable caching, hero preloads). These fixes are the next level up.

## Read first

1. `CLAUDE.md` (token model, ship gate, writing rules)
2. `.ai/docs/STEERING.md` (hard constraints)
3. `DESIGN_SYSTEM.md` and `client/src/lib/design-tokens.ts` (before any beauty work)
4. `FIXES_TO_MAKE_2026-06-25_mobile_profile_button.md` (spec for Fix 10)

## Hard rules for this sprint

- Preserve all features. No route, page, component, or capability may be removed.
- Writing rules apply to any copy you touch: no em-dashes, no contrast-framing, no
  AI filler words. See `CLAUDE.md`.
- Ship gate is mandatory before any `VERIFIED` or `DONE` claim:
  ```bash
  python3 scripts/audit-truncation.py          # gate 1: no truncated files
  rg -g '*.css' '<new-className>' client/src/   # gate 2: per new className / keyframe
  pnpm typecheck                                # gate 3: exit 0
  ```
- Every fix needs an Evidence entry (file:line, grep output, screenshot path, or
  build-stat line). No evidence means status stays `CODED`.
- Commit per phase with a clear message. Do not bundle unrelated phases.
- For bundle-size claims, run `pnpm build` once at the end of a speed phase and cite
  the chunk sizes from `dist/public/assets` as evidence.

---

## Phase 1 — Fast, low-risk, high-visibility

### Fix 1 — LCP hero preload version mismatch (Critical, trivial)

**Status:** CODED-pending

**Symptom:** The homepage hero downloads twice on first paint, hurting LCP.

**Root cause:** `client/index.html` preloads `home-desktop.webp?v=5` and
`home-mobile.webp?v=5`, but the app code references `?v=14`. The browser preloads
the `v=5` URL, then the app requests `v=14`, so the hero is fetched twice.

**Fix:** Align the version. Grep the codebase for the canonical hero version
(`grep -rn "home-desktop.webp" client/src client/index.html`) and set both the
preload tags and the code references to the same `?v=N`. Consider a single shared
constant so they cannot drift again.

**Files:** `client/index.html`, plus wherever the background version is set (likely
`client/src/components/PageBackground*` or a backgrounds config).

**Evidence:** grep showing preload and code reference share one version string.

### Fix 2 — AdminAIAssistant width overflow on mobile (High, trivial)

**Status:** CODED-pending

**Symptom:** The admin AI assistant panel overflows a 375px viewport.

**Root cause:** Fixed `w-[380px]` wider than the smallest phone safe area.

**Fix:** Replace with `max-w-[min(380px,calc(100vw-2rem))] w-full`. Find it with
`rg "w-\[380px\]" client/src`.

**Files:** the AdminAIAssistant component (path from the grep).

**Evidence:** grep showing the new constraint; screenshot at 375px with no overflow.

### Fix 3 — Replace 10s polling with the existing SSE stream (High)

**Status:** CODED-pending

**Symptom:** Every signed-in user fires ~360 requests/hour for unread counts, with
extra mobile battery drain.

**Root cause:** `client/src/components/Navigation.tsx` runs
`trpc.messages.unreadCount.useQuery(..., { refetchInterval: 10_000 })`.

**Fix:** Feed the unread count from the existing SSE stream
(`client/src/hooks/useUserStream.ts`) instead of interval polling. Keep the badge
behavior identical. If the stream does not yet emit unread counts, extend it server
side rather than hand-rolling new polling.

**Files:** `client/src/components/Navigation.tsx`, `client/src/hooks/useUserStream.ts`,
and the SSE source in `server/_core/` if the event needs adding.

**Evidence:** Navigation no longer sets `refetchInterval`; network tab shows the
count updating over the SSE channel.

### Fix 4 — MycelialBackground responsive on mobile (Medium)

**Status:** CODED-pending

**Symptom:** The atmosphere layer thins out and breaks on portrait phones.

**Root cause:** Hardcoded SVG `viewBox="0 0 1920 1080"` in
`client/src/components/MycelialBackground.tsx`; it does not adapt below desktop.

**Fix:** Make the node network scale to the viewport. Either compute the viewBox
from window size, add a mobile-tuned node layout, or set
`preserveAspectRatio` so density holds on narrow screens. Keep the reduced-motion
guard intact.

**Files:** `client/src/components/MycelialBackground.tsx`.

**Evidence:** screenshots at 375px and 1440px showing coherent density at both.

### Fix 5 — Complete reduced-motion coverage (Medium)

**Status:** CODED-pending

**Symptom:** Motion-sensitive users still get animation on several pages.

**Root cause:** The `useReducedMotion` hook exists and the background respects it,
but `animate-*` usage on content-heavy pages (Home, Quest) is not all gated.

**Fix:** Audit `rg "animate-(pulse|spin|bounce|ping)" client/src`. For each
non-essential animation, gate behind `prefers-reduced-motion` (CSS media query in
`index.css` or the hook). Do not remove animations for default users.

**Files:** `client/src/index.css`, affected page and component files.

**Evidence:** with `prefers-reduced-motion: reduce` set, listed animations stop;
default experience unchanged.

---

## Phase 2 — Bundle and load speed

### Fix 6 — Tame the streamdown dependency (Critical, biggest payoff)

**Status:** CODED-pending

**Symptom:** Opening the AI chat or admin banner editor downloads several megabytes
of code.

**Root cause:** `streamdown` (used only in `client/src/components/AIChatBox.tsx` and
`client/src/components/AdminBannerEditor.tsx`) bundles Shiki's full grammar set and
Mermaid. Confirmed chunks in `dist/public/assets`: `emacs-lisp` 762KB, `cpp` 611KB,
`wasm` 608KB, `mermaid` 534KB, `mermaid.core` 388KB, `cytoscape` 431KB, `wolfram`
256KB, plus `treemap` and `sheet`. These are lazy, so initial load is fine, but the
two surfaces that use them pull the full set.

**Fix:** Pick the lightest path that preserves rendering:
1. Configure Shiki to a small language allowlist (the languages you actually render
   in chat and banners, likely `markdown`, `ts`, `js`, `bash`, `json`), and disable
   Mermaid if those surfaces do not render diagrams. Prefer this if streamdown
   exposes the config.
2. If streamdown does not allow trimming, render those two surfaces with
   `react-markdown` (already a dependency) plus a minimal highlighter.

Do not change what users see. Verify the AI chat still renders code blocks and the
banner editor still previews correctly.

**Files:** `client/src/components/AIChatBox.tsx`,
`client/src/components/AdminBannerEditor.tsx`, possibly a shared markdown wrapper.

**Evidence:** `pnpm build` chunk list showing the Shiki grammar and Mermaid chunks
gone or sharply reduced; before/after KB totals cited.

### Fix 7 — Keep recharts behind the admin boundary (Medium)

**Status:** CODED-pending

**Symptom:** The 588KB main `index` chunk and a 348KB `PieChart` chunk suggest
Recharts may leak toward the shared graph.

**Root cause:** `client/src/components/ui/chart.tsx` wraps Recharts and is imported
by analytics components.

**Fix:** Confirm Recharts only loads on `/admin` and analytics routes. If any shared
or shell component imports `ui/chart` or `recharts` directly, move it behind a lazy
boundary. Verify with the build chunk graph.

**Files:** `client/src/components/ui/chart.tsx` and its importers (grep
`@/components/ui/chart` and `recharts`).

**Evidence:** build output showing Recharts is not in `react-vendor` or the main
`index` chunk; it loads only on admin/analytics chunks.

### Fix 8 — Add AVIF output to the /api/img proxy (Medium)

**Status:** CODED-pending

**Symptom:** Photographic images ship as WebP only, missing 10-20% extra savings.

**Root cause:** The proxy in `server/routes/global.ts` (around lines 156-275)
negotiates WebP via the `Accept` header but never serves AVIF.

**Fix:** Add AVIF to the content negotiation: if the request `Accept` includes
`image/avif`, encode AVIF with Sharp (`.avif({ quality: ~50-60 })`), else fall back
to the current WebP/PNG/JPEG path. Keep the `Vary: Accept` header and the immutable
cache headers. Keep the alpha-channel PNG fallback.

**Files:** `server/routes/global.ts`.

**Evidence:** request with `Accept: image/avif` returns `content-type: image/avif`
and a smaller body than the WebP equivalent; WebP-only clients unchanged.

### Fix 9 — Wire optimize-images.mjs into the build (Medium)

**Status:** CODED-pending

**Symptom:** Optimized image output drifts because the script runs only by hand.

**Root cause:** `scripts/optimize-images.mjs` is a manual `npm run optimize:images`
step, not part of `build`.

**Fix:** Make image optimization part of the pipeline. Safest option: add a
pre-build or CI step that runs the optimizer and fails if it produces uncommitted
changes (so unoptimized images cannot ship). Do not slow every `pnpm dev`. Keep the
OG-image and globe-texture format exceptions the script already handles.

**Files:** `package.json` scripts, `scripts/optimize-images.mjs`, possibly a
`.github/workflows/*` file.

**Evidence:** CI or build log showing the optimizer runs and the gate works on a
test image.

---

## Phase 3 — Responsiveness UX

### Fix 10 — Mobile profile and sign-in button (High)

**Status:** CODED-pending

**Symptom:** On mobile, signed-in users cannot quickly reach their profile and
signed-out users cannot sign in from the home menu.

**Root cause:** `client/src/components/mobile/MobileMoreMenu.tsx` has no auth-aware
control, only a close button.

**Fix:** Follow the existing spec in
`FIXES_TO_MAKE_2026-06-25_mobile_profile_button.md`. Wire `useAuth`, add the avatar
(signed in) or a golden Sign In button (signed out), and connect the AuthDialog.
Keep tap targets at `min-h-[44px]`.

**Files:** `client/src/components/mobile/MobileMoreMenu.tsx` plus auth dialog wiring.

**Evidence:** screenshots at 375px in both auth states; sign-in flow works from the
menu.

---

## Phase 4 — Beauty and structure

This phase is the deepest payoff and the gate for light mode. Work it in small,
reviewable batches. Do not attempt all of it in one commit.

### Fix 11 — Migrate hardcoded colors to design tokens (High, batched)

**Status:** CODED-pending

**Symptom:** Visual inconsistency and ad-hoc opacity retrofits across the site.

**Root cause:** ~10,400 hardcoded hex values and ~650 arbitrary `[Npx]` Tailwind
values across `.tsx`, despite a real token system in
`client/src/lib/design-tokens.ts`.

**Fix:** Map tokens to Tailwind theme classes once (e.g. `bg-forest-base` resolving
to the token), then migrate component by component. Start with the worst offenders
(admin components: `AdminApplicationsTab`, `AdminAIAssistant`, `AdminAutomationsPanel`).
Then add a warn-only CI lint that flags new `text-[#`, `bg-[#`, and `[Npx]` patterns
so drift stops. Do not change rendered colors; this is a like-for-like swap to tokens.

**Files:** `client/src/lib/design-tokens.ts`, Tailwind theme config,
`client/src/index.css`, admin components first, then the rest in later batches; a new
lint rule under `scripts/` or eslint config.

**Evidence:** per batch, grep showing hardcoded hex count dropping in the migrated
files; visual diff screenshots showing no color change; lint runs warn-only in CI.

### Fix 12 — Reading measure and line-height on prose (Medium)

**Status:** CODED-pending

**Symptom:** Desktop long-form text runs 75-80+ characters per line.

**Root cause:** Blog, governance, and long-form pages have no max prose width.

**Fix:** Add `max-w-[70ch]` (or a `prose` width token) to long-form content
containers, and set body line-height to the design-system value (1.6). Mobile is
already constrained by viewport, so this mainly affects desktop.

**Files:** Blog, governance, and long-form page components; `index.css` if a shared
prose class is cleaner.

**Evidence:** screenshots of a blog post and a governance page at 1440px showing
comfortable measure.

### Fix 13 — Standardize spacing and radius (Medium)

**Status:** CODED-pending

**Symptom:** Cards and sections mix `gap-6/8/12/16`, `p-4/p-6`, and
`rounded-lg/xl` by hand.

**Root cause:** No shared section primitive; spacing chosen per component.

**Fix:** Add a small `PageSection` wrapper that applies tokenized horizontal padding
(`px-md md:px-xl`) and standard vertical rhythm, then adopt it on the main pages.
Standardize card radius per `DESIGN_SYSTEM.md`. Keep layouts visually equivalent.

**Files:** new `client/src/components/PageSection.tsx`, then Home, Quest, and other
main pages.

**Evidence:** before/after screenshots of two pages showing consistent rhythm and no
layout regressions.

### Fix 14 — Extract a SectionDivider component (Low)

**Status:** CODED-pending

**Symptom:** Dividers are hand-rolled per page with hardcoded opacity.

**Fix:** Create `client/src/components/SectionDivider.tsx` using a sage token at the
standard opacity, and replace the hand-rolled dividers.

**Files:** new component plus the pages that used inline dividers.

**Evidence:** grep showing inline divider markup replaced by the component.

### Fix 15 — Ship the light-mode toggle (Large, depends on Fix 11)

**Status:** BLOCKED (start after Fix 11 batches land)

**Symptom:** Light mode is fully designed in CSS but has no user toggle.

**Root cause:** `.dark` class and OKLch light values exist in `index.css`;
`client/src/contexts/ThemeContext.tsx` has the logic, but there is no UI control and
no persistence.

**Fix:** Add the toggle UI, persist the preference (local storage first; a DB column
if you want it to follow the user across devices), and verify contrast holds in light
mode using the patterns from `CONTRAST_AUDIT_2026-05-29.md`. If you add a DB column,
write the migration but do not run it (see handoff).

**Files:** `client/src/contexts/ThemeContext.tsx`, a toggle component, Navigation,
and a Drizzle migration in `drizzle/` if persisting server side.

**Evidence:** toggle flips theme and persists across reload; contrast spot-check in
light mode passes WCAG AA on Home, Community, and Quest.

---

## Suggested commit / phase order

1. Phase 1 (Fixes 1-5): one commit per fix or a small grouped commit.
2. Phase 2 (Fixes 6-9): commit Fix 6 alone (run a build to prove the bundle drop).
3. Phase 3 (Fix 10): one commit.
4. Phase 4 (Fixes 11-15): one commit per batch; Fix 15 last.

Run the ship gate before marking anything `VERIFIED`. Update this doc's statuses as
you go and move it to `archive/` with a `SHIPPED_LOG.md` entry when the sprint closes.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | `git add -A && git commit && git push` after each phase | Claude Code may hold `index.lock`; push triggers Railway | repo root |
| H2 | Approve the Railway production deploy | Dashboard login required | Railway dashboard |
| H3 | Run the light-mode DB migration if Fix 15 adds a column | Railway MySQL is only reachable from your Windows machine | `npx tsx scripts/run-migration.ts drizzle/NNNN_theme_pref.sql` |
| H4 | Confirm live LCP and bundle wins after deploy | Needs production URL and real network | regencivics.earth, or ask Claude in Chrome to verify |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | LCP hero preload version mismatch | CODED-pending |
| 2 | AdminAIAssistant width overflow | CODED-pending |
| 3 | Replace 10s polling with SSE | CODED-pending |
| 4 | MycelialBackground responsive | CODED-pending |
| 5 | Reduced-motion coverage | CODED-pending |
| 6 | Tame streamdown (Shiki + Mermaid) | CODED-pending |
| 7 | Keep recharts behind admin boundary | CODED-pending |
| 8 | Add AVIF to /api/img proxy | CODED-pending |
| 9 | Wire optimize-images.mjs into build | CODED-pending |
| 10 | Mobile profile and sign-in button | CODED-pending |
| 11 | Token migration + warn-only lint | CODED-pending |
| 12 | Prose measure and line-height | CODED-pending |
| 13 | PageSection + spacing/radius | CODED-pending |
| 14 | SectionDivider component | CODED-pending |
| 15 | Light-mode toggle (write migration only) | BLOCKED on Fix 11 |

### WAITING ON YOU before Claude Code can proceed

- Nothing blocks Phases 1-4 coding. All source work can proceed without you.
- Deploy verification (H2, H4) and the Fix 15 migration run (H3) are the only steps
  that need you, and only after the code lands.
