# Claude Code Execution Prompt: QA Fixes 2026-06-23

You are Claude Code working in the `regen-civics` repo. This batch comes from a live QA pass over regencivics.earth plus a source-level link and anchor audit across all routes. There is one P0 (a primary fundraising page is down), two confirmed broken-link / navigation bugs, three medium UX fixes, and a batch of 22 copy fixes against the project writing rules. Source evidence for every item is in `.claude/skills/regen-qa-crawl/runs/2026-06-23/` (`REPORT.md`, `reviewer-findings.md`, and `link-anchor-audit.txt`).

## How to work this batch

1. Read first, in order: `CLAUDE.md`, `.ai/docs/STEERING.md`, then this file.
2. Do Fix 1 (the P0) before anything else. The other fixes are independent and can be batched.
3. Apply the writing rules to anything you touch: no em-dashes, no contrast-framing, no banned AI words, no rhetorical-question openers, no passive-inspiration filler.
4. Run the Ship Gate (bottom of this doc) before marking anything VERIFIED.
5. Update the Status column and the Handoff Breakdown as you go. Use the status vocabulary: `CODED`, `FIXED`, `VERIFIED`, `DONE`, `HUMAN STEP REQUIRED`, `BLOCKED`, `IN PROGRESS`.
6. You cannot push or deploy. Stage everything, then list the exact git command for Rye in the Handoff Breakdown.

---

## Fix 1: /investor renders the Tao error page for verified investors (CRITICAL)

**Status:** FIXED pending your work (diagnosis below is confirmed; the exact throwing line needs the dev error overlay)

**Symptom:** A logged-in or previously-verified investor who opens `/investor` is bounced to `/opportunity`, which renders the error-boundary fallback (`TaoErrorState`: "When we think things are broken, ponder the TAO...") with Return Home / Visit Community buttons. The investor journey and the `/opportunity` investment memorandum are both unreachable for these users. Confirmed live on desktop, logged in, on 2026-06-23.

**Root cause (confirmed by reading the source):**

There is a redirect loop wrapped around a render crash.

1. `client/src/pages/InvestorForm.tsx` (~line 181-186): on mount, if `localStorage.investor_verified === 'true'` (or the session equivalent), it calls `setLocation(returnTo)`, and `returnTo` defaults to `/opportunity`. So any verified investor hitting `/investor` is sent to `/opportunity`.
2. `client/src/App.tsx:231`: `/opportunity` is `<EBRedirect to="/investor"><Opportunity /></EBRedirect>`. `EBRedirect` is an ErrorBoundary whose fallback is `<Redirect to="/investor" />` (`App.tsx:209-215`).
3. `client/src/pages/Opportunity.tsx` throws during render. `EBRedirect` catches it and redirects back to `/investor`, which (verified) redirects to `/opportunity`, which throws again. The loop settles on the Tao fallback.

This is a known, half-fixed bug. There is a developer comment at `Opportunity.tsx:552-558` documenting the same crash ("crashing on mobile for some users (rendering the Tao error page) and made the entire /opportunity URL unreachable"). The earlier fix removed the `/opportunity → /investor` auto-redirect but left the `/investor → /opportunity` redirect in `InvestorForm.tsx`, so verified users still land on the crashing page.

**The crash is diagnosable. The error IS logged.** `components/ErrorBoundary.tsx:68-69` does:
```
console.error("[ErrorBoundary] Caught error:", error?.message || error);
console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
```
The live QA pass missed it only because the redirect loop navigated away before the console was captured. You will see it cleanly in dev.

**Reproduce and find the exact throwing line:**
```bash
pnpm dev
```
Then, with browser devtools console open BEFORE you trigger it:
- Open `/opportunity` directly. If it does not crash, set `localStorage.setItem('investor_verified','true')` in the console, then open `/investor`.
- Read the `[ErrorBoundary] Caught error:` line and the component stack. That names the throwing component and line in `Opportunity.tsx`.

**Likely suspects in `Opportunity.tsx` (verify against the real stack, do not guess-fix):**
- The four `lazy(...)` chart/calculator imports (lines 13, 22-30). `AllocationCalculator` (line 13) is imported but appears unused; confirm and remove if dead. Confirm every rendered lazy component sits under a `<Suspense>` boundary (current Suspense wrappers: 1313, 1669, 1779).
- `useCountUp`, `useMediaQuery`, `useThrottledScroll` hook usage.
- `pageSEO.opportunity` shape passed to `<SEO {...} />`.
- Any access to `submittedData` outside the existing effect.
- `investorName.split(" ")[0]` at line 590 is already guarded by `investorName &&`, so it is not the cause.

**Fix, in three parts:**

1. **Make `/opportunity` crash-proof.** Guard the throwing line found from the stack so the page renders for everyone (logged in, logged out, verified, mobile). The page must never trip the boundary.
2. **Break the redirect loop in `InvestorForm.tsx`.** A verified investor should not be bounced into a page that can crash. Pick the cleaner option and note which you chose:
   - Preferred: render the form's "you have already submitted, here is where to go next" state in place, with explicit links to `/opportunity`, `/fund`, and `/loi`, instead of an automatic `setLocation`.
   - Or: change the default `returnTo` away from `/opportunity` to a page that never gated this flow (for example `/fund`).
   The prior `Opportunity.tsx` comment establishes the intent: `/opportunity` should be directly reachable and the binding gate lives on the LOI form, so an auto-redirect into it is not needed.
3. **Verify both directions.** After the fix: `/opportunity` renders directly; `/investor` while verified does not loop and does not show Tao; `/investor` while unverified shows the form.

**Optional hardening (do if quick):** in `ErrorBoundary.tsx`, also forward the caught error to analytics (the same `analytics` util used elsewhere) so the next production crash surfaces without needing a local repro.

**Files:** `client/src/pages/Opportunity.tsx`, `client/src/pages/InvestorForm.tsx`, possibly `client/src/components/ErrorBoundary.tsx`, possibly `client/src/App.tsx`.

**Evidence required for VERIFIED:** the `[ErrorBoundary]` console line showing the original error (paste it into the fix entry), plus confirmation that `/opportunity` and verified `/investor` both render after the fix (screenshot path or console-clean confirmation).

---

## Fix 2: Newsletter form can be re-submitted after success (MEDIUM)

**Status:** CODED pending your work

**Symptom:** On `/newsletter`, after a successful subscribe the success message shows but the email input and Subscribe button stay active (the input resets to its placeholder), so a second click re-submits. Confirmed live: POST `newsletter.subscribe` returned 200 and the form stayed usable.

**Root cause:** `client/src/pages/Newsletter.tsx` sets `status` to `"success"` and clears `email` (lines 23-25) but still renders the form. The success block at line 96 is shown in addition to the form, not in place of it.

**Fix:** When `status === "success"`, replace the form with the success state (or disable the input and button). Keep a way to subscribe another address if that is intended, but a single success should not allow an immediate duplicate submit.

**Files:** `client/src/pages/Newsletter.tsx`

---

## Fix 3: Homepage resume cards show blank thumbnails (MEDIUM)

**Status:** CODED pending your work

**Symptom:** On the logged-in homepage, the three "Pick up where you left off" cards (Journey Quests, Back to the Forum, Seasonal Accelerator) render with blank/dark thumbnail areas.

**Root cause to confirm:** these cards render from `client/src/components/ProgressiveOnboarding.tsx`. Check whether the thumbnail images are missing sources, failing to load, or intentionally empty placeholders.

**Fix:** Either wire up real thumbnails for the three cards or apply an intentional styled placeholder (icon or gradient) so the empty image area does not read as broken. Confirm no 404s for those image URLs in the network tab.

**Files:** `client/src/components/ProgressiveOnboarding.tsx` (and image assets if added)

---

## Fix 4: Low-contrast hero text on /land and /community (LOW)

**Status:** CODED pending your work

**Symptom:** Hero body text is hard to read in two places:
- `/land`: hero body "We help you design the economic, financial, and governance Game..." is white over a light desert sky. Source: `client/src/pages/Land.tsx:247` (and a second variant at line 256).
- `/community`: the "Gathering Grove" heading and its subtitle are faded green on the forest background. Source: `client/src/pages/Community.tsx:320` (heading) and `:324` (subtitle).

**Fix:** Raise contrast to a comfortable level. Options: a text shadow or scrim/overlay behind the hero copy, a darker text color, or increasing opacity of the faded text. Aim for WCAG AA (4.5:1 for body text). Check the result against the actual background image, not a flat color.

**Files:** `client/src/pages/Land.tsx`, `client/src/pages/Community.tsx`

---

## Fix 5: Copy fixes: 22 writing-rule violations (LOW, batch)

**Status:** CODED pending your work

All citations below were spot-verified against source on 2026-06-23. Full list with rewrites is in `.claude/skills/regen-qa-crawl/runs/2026-06-23/reviewer-findings.md`. Apply the suggested rewrites or your own that satisfy the rule. Lead with the affirmative; never define a thing by what it is not.

### Em-dashes (2, RULE 1)
| File:line | Current | Rewrite to |
|---|---|---|
| `Showcase.tsx:474` | `${project.name} — a ReGen Civics land project` | `${project.name}, a ReGen Civics land project` |
| `QuestStoryDetailModal.tsx:202` | `${name} — ${story.questTitle} on ReGen Civics` | `${name}: ${story.questTitle} on ReGen Civics` |

(Note: `HymnBook.tsx:410` uses `"—"` as a null-value placeholder glyph. Low priority; replace with "Untitled" or an en-dash only if you want strict zero-tolerance on glyphs.)

### Contrast-framing (11, RULE 2, the dominant pattern)
| File:line | Current | Rewrite to |
|---|---|---|
| `Game.tsx:787` | "The point is not just the tokens, it's to form an ecosystem that represents us all..." | "The point is to form an ecosystem that represents us all, helps us coordinate, raise capital, and move together." |
| `Game.tsx:1243` | "But regeneration isn't about winning; it's about thriving together indefinitely." | "Regeneration is about thriving together indefinitely." |
| `Game.tsx:1383` | "Play isn't just effective, it's joyful." | "Play is joyful, and it works." |
| `Game.tsx:1614` (dup `Land.tsx:1034`) | "Governance is not a one-time setup but an ongoing 'game within the game.'" | "Governance is an ongoing 'game within the game.'" |
| `Governance.tsx:1305` | "...we're not just managing a fund and a Game - we're demonstrating what's possible..." | "...we're demonstrating what's possible when we trust people to make wise decisions about their own futures." (also fix the ` - ` dash) |
| `CrowdPoolingCampaigns.tsx:117` | "...contribute what they actually need, not just money" | "...contribute what they actually need: tools, time, skills, materials, and money." |
| `CustomGames.tsx:21` | "...a living foundation, not just a website." | "...a living foundation to gather around." |
| `LOI.tsx:146` | "This is not a binding commitment, but helps us understand the level of interest..." | "This is a non-binding way to tell us you're interested so we can plan accordingly." |
| `Opportunity.tsx:2024` | "...not just capital... because we bring the entire alliance ecosystem, not just money." | "Projects seek us out for the coordination infrastructure, the support network, and the capital. We bring the entire alliance ecosystem." |
| `SEO.tsx:308` (meta description) | "A network built on shared values, not just shared logos." | "A network built on shared values and real collaboration." |
| `StructuredData.tsx:162` (JSON-LD FAQ) | "...lasting positive impact for generations, not just short-term returns." | "...lasting positive impact that compounds across generations." |

### Rhetorical-question openers (3, RULE 4)
| File:line | Note |
|---|---|
| `Bionomics.tsx:468` | "What if we spent that money..." origin-story seed question. **Confirm with Rye before stripping**. This may be deliberate framing. Suggested statement form in reviewer-findings.md. |
| `Bionomics.tsx:1287` | Second instance of the same seed question. Same note. |
| `Game.tsx:369` | "Imagine if the vast majority of our days were spent..." Rewrite to lead with the concrete vision. |

### Passive-inspiration filler (3, RULE 5)
| File:line | Current | Rewrite to |
|---|---|---|
| `Ally.tsx:249` | "Together we can do what none of us can do alone." | "Each org brings something the others can't. Pooled, that becomes real capacity for land projects." |
| `EmailTemplateSelector.tsx:73` | "...join us on this regenerative journey." | "...we're glad to have you in the next incubator season. Here's what happens next." |
| `Game.tsx:369` | (same line as the RULE 4 "Imagine if") | fix once |

**Files:** `Game.tsx`, `Land.tsx`, `Governance.tsx`, `CrowdPoolingCampaigns.tsx`, `CustomGames.tsx`, `LOI.tsx`, `Opportunity.tsx`, `Bionomics.tsx`, `Ally.tsx`, `Showcase.tsx`, `QuestStoryDetailModal.tsx`, `components/SEO.tsx`, `components/StructuredData.tsx`, `components/EmailTemplateSelector.tsx`.

---

## Fix 6: Two internal links point at routes that do not exist (HIGH)

**Status:** FIXED pending your work (both confirmed live as 404s on 2026-06-23)

Found by a source-level link audit across all routes, then confirmed live. Two navigations send users to a route that has no match, so they hit the "Page Not Found" page.

1. **`client/src/pages/CampaignManage.tsx:142` and `:338`** call `navigate(`/campaigns/${id}`)` (plural). The only matching routes are `/campaigns` (an exact redirect to `/crowd-pooling-projects`) and `/campaign/:id` (singular). `/campaigns/<id>` matches neither and 404s. **Fix:** change both to `navigate(`/campaign/${id}`)`. These are the "back to campaign" / permission-denied buttons on the campaign manage page.
2. **`client/src/pages/MyApplications.tsx:129` and `:173`** call `navigate(`/application/${app.id}`)` on the application card click and the "View Details" button. There is no `/application/:id` route (only `/admin/application/:id`). So a user clicking their own application 404s. **Fix:** point these at the correct user-facing destination. Confirm the intended page first: likely `/apply/status` (the `ApplyStatus` page) with the application id, or a user-facing application-detail route that needs to be added. Do not send users to the `/admin/...` route.

Live evidence: `/campaigns/qa-test-id` and `/application/qa-test-id` both render "Page Not Found | ReGen Civics".

(Not a bug, checked and cleared: `/docs/regencivics-cowork-onboarding.md`, `/downloads/create-your-play-prompt.md`, and `/regen-civics-all-events.ics` all exist in `client/public/` and are served by `express.static`. The `/components` link in `ComponentShowcase.tsx` is dead, but that page is not in the router and is unreachable in production, so leave it or delete the page.)

**Files:** `client/src/pages/CampaignManage.tsx`, `client/src/pages/MyApplications.tsx`.

---

## Fix 7: Anchor deep-links do not scroll to their section (MEDIUM)

**Status:** FIXED pending your work (confirmed live)

**Symptom:** Opening a URL with a hash fragment lands the user at the top of the page instead of at the target section. Confirmed: `/local-food-economy` redirects to `/bionomics#local-food-economies` and the user stays at `scrollY 0` with the target section about 11,900px down. Reproduced on direct navigation to `/bionomics#local-food-economies` with a 6 second wait. The target element exists (`Bionomics.tsx:1279` has `id="local-food-economies"`), so the destination is right but the scroll position is wrong.

**Root cause in code:** `client/src/components/ScrollToTop.tsx:14-16` runs `window.scrollTo({ top: 0, behavior: "instant" })` on every route change with no check for `window.location.hash`. It cancels the browser's native anchor scroll on load.

**Fix:** In `ScrollToTop`, when `window.location.hash` is present, scroll to that element instead of to the top. Because these pages load content asynchronously (hero loaders, lazy sections), the target element often does not exist yet when the effect fires, so scrolling once on mount is not enough. Wait for the element (a short retry loop or a `MutationObserver` that resolves once `document.getElementById(hash)` exists, then `scrollIntoView`), and only fall back to scroll-to-top when there is no hash.

**Verify in dev which element actually scrolls.** In the automated test, programmatic `window.scrollTo` and `documentElement.scrollTop` did not move the page even though the site scrolls fine by mouse wheel, which suggests the active scroller may not be `window`. Confirm in dev whether the scroller is the window or a wrapper element, and make both the hash handler and the existing "back to top" button (`ScrollToTop.tsx:27-29`, also `window.scrollTo`) target the real scroller. Re-test the "back to top" button while you are there.

**Verify after fix:** `/bionomics#local-food-economies` and `/local-food-economy` both land with the "Local food economies" section in view. Pick one more in-page anchor (for example a Table of Contents link on `/fund` or `/opportunity`) and confirm it scrolls correctly.

**Files:** `client/src/components/ScrollToTop.tsx` (and confirm any Table of Contents component that relies on hash navigation).

---

## Priority order

1. Fix 1 (P0, the crash + loop).
2. Fix 6 (two user-facing 404s) and Fix 7 (anchor deep-links).
3. Fix 2, Fix 3, Fix 4 (medium/low UX, independent of each other).
4. Fix 5 (copy batch). Hold the two `Bionomics` seed-question rewrites until Rye confirms.

---

## Ship Gate (MANDATORY before any VERIFIED or DONE claim)

```bash
python3 scripts/audit-truncation.py    # gate 1: no truncated source files
rg -g '*.css' '<className-you-added>' client/src/   # gate 2, per change
pnpm typecheck                          # gate 3: exit 0
node scripts/audit-links.mjs            # gate 4: links/anchors resolve, exit 0
```
For Fix 1 also paste the `[ErrorBoundary] Caught error:` line and confirm `/opportunity` and verified `/investor` render without the Tao page. No evidence means status stays `CODED`.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Confirm the two `Bionomics` seed-question rewrites | Editorial call | `Bionomics.tsx:468,1287` |
| 2 | Push and deploy | Claude Code cannot push | `git add -A && git commit && git push` |
| 3 | Verify on production after deploy | Browser action on live site | Open `/investor` (logged in) and `/opportunity` |
| 4 | Remove the QA test newsletter subscriber | DB/admin action | Delete `rye+qatest@regencivics.earth` |

### CLAUDE CODE: can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | Fix 1: guard the crash + break the redirect loop | CODED |
| 2 | Fix 2: newsletter success state | CODED |
| 3 | Fix 3: homepage resume-card thumbnails | CODED |
| 4 | Fix 4: hero contrast on Land + Community | CODED |
| 5 | Fix 5: 20 of 22 copy fixes | CODED |
| 6 | Fix 6: repoint the two dead route links | CODED |
| 7 | Fix 7: hash-aware scroll in ScrollToTop | CODED |
| 8 | Run the Ship Gate (4 gates) and attach evidence | IN PROGRESS |

### WAITING ON YOU

- The two `Bionomics` seed-question rewrites are `BLOCKED` on Rye's editorial confirmation. Everything else proceeds.
