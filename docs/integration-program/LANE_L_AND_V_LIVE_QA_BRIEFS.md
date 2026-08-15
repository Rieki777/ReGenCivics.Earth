# Lanes L and V: live QA briefs (staged, dispatch when M+Q are observed live)

Written 2026-08-15 by the coordinator. Dispatch condition: Lanes M (store) and Q (fixes) are
DONE — CI green on the landed SHA and the live `/health` build marker matches. Fill in `<SHA>`
at dispatch. Rye's addition (his words): "ensuring we have another QA lane that's mobile
first - as most of our audience will be mobile on safari" — that is Lane V, a first-class lane,
not a viewport pass inside Lane L.

## Shared discipline (both lanes)

- Target: `https://amora.regencivics.earth` at build `<SHA>`. Every finding carries the build
  marker it was measured at, a route, an element chain, and a one-line repro.
- **Production write discipline.** The live village is a real community's data. Read/render QA
  only on live. Interactive write-path QA (forms, enables, deletes) runs against a LOCAL build
  of the same SHA with a scratch schema, never against live. No test members are created on
  live. The one exception: if Rye supplies a designated test account, its actions stay inside
  that account.
- Report format: severity-ranked findings (HIGH broken/data-losing, MED degraded/confusing,
  LOW cosmetic); an explicit list of every category checked and found CLEAN; a count of what
  could NOT be measured and why — that last line is the most important in the report.
- Tooling lies to brief in: **Playwright `networkidle` never fires on this app** (the pulse
  endpoint and notification poller keep the connection busy) — use `domcontentloaded` + a fixed
  ~3.5s settle and write results incrementally per viewport; the Browser-pane resize silently
  stays desktop (drive Playwright directly for real viewports); a hidden browser pane reports successful clicks that never
  fired (verify state via injected JS, not click success); an empty grep/scan is not a negative
  until the same pipeline proves it returns matches on a known-present case; a contrast checker
  that cannot parse a color reports it as passing — count unmeasured nodes.
- Fix phase: findings are fixed in a worktree (`wt-liveqa` / `wt/live-qa-fixes` from
  origin/main), gated by the same eleven cold gates, pushed as a branch for the coordinator to
  land. HIGH findings fix first. A finding in another lane's live surface is reported, not
  fixed, if it would reopen their zones — coordinator routes it.

## Lane L — functional live QA (four dimensions)

Fan out by dimension, not by page: (1) functional — every nav route loads, API surfaces answer,
console/network clean, the round-2 store surfaces render from the registry, the memory
citation line renders in JourneyToLaunch; (2) responsive/visual at desktop 1280 and tablet 768;
(3) accessibility — keyboard reachability, focus visibility, contrast (count what the tooling
could not measure), landmarks/labels on the store and admin surfaces; (4) content/data
integrity — module cards against the registry, support lines and pills truthful per tier,
prices render as authored, no vendor identity in `/api/platform/info` or
`/.well-known/village.json` (byte-check against the enabled-module expectation), 404-vs-503
semantics per the contract. Both auth states where possible without live writes: signed-out
everywhere; signed-in only if a designated account exists.

## Lane V — mobile-first QA (Safari-shaped, the primary audience)

Engine: **Playwright WebKit** (`pnpm exec playwright install webkit` if absent — official
Playwright binaries only), device profile iPhone 14/15 (390×844, DPR 3, touch enabled, iOS
Safari user agent), plus 375×812 and a narrow 360 pass. WebKit is the Safari engine; what it
cannot reproduce (real iOS chrome, the dynamic URL bar, the software keyboard) goes in the
could-not-measure list, never silently skipped.

Mobile-first checklist, in order of audience pain:
1. **Every primary journey at 390px**: landing → join/login views, quests, gratitude, map,
   forum, profile, the module store pages, JourneyToLaunch. No horizontal scroll anywhere; no
   clipped or overlapping fixed elements.
2. **Touch targets**: every interactive element ≥ 44×44 CSS px (measure, don't eyeball); no
   hover-only affordances without a touch path (WebKit touch mode makes these visible).
3. **Safari-specific hazards**: 100vh/URL-bar viewport traps (prefer svh/dvh or JS-measured
   heights), `position: fixed` bottom bars, safe-area-inset padding on notched profiles,
   momentum scroll containers, iOS date/select inputs, tap-highlight and double-tap zoom on
   controls, form zoom-on-focus (inputs < 16px font).
4. **The store on a phone**: catalog browse/filter usable one-handed; listing detail readable;
   tier pills and support lines legible at DPR 3; price display not truncated.
5. **Performance on mobile profile**: throttled CPU×4 first-load of the landing and store
   routes; report LCP-ish paint timing and total JS transferred against the 700 KB main budget.
6. **Screenshots as evidence**: real-viewport captures per journey (the Playwright path, not
   the browser-pane resize), attached to findings.

Lane V's fixes follow the shared fix discipline; client-only CSS/layout fixes are its own
zone (`client/`), coordinated with the coordinator if any file is contested.
