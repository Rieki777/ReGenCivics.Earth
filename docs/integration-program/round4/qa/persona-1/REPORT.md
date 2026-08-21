# Lane L8 persona 1: first-time visitor on a phone, deciding whether to visit

Lane L8 persona 1: first-time visitor. Live build start / end: `2026-07-28-wave1-335058f` / `2026-07-28-wave1-335058f` (unchanged; re-confirmed after the last run). Tip SHA: 335058f (worktree `wt-r4-qa1`, detached, scripts only, nothing committed). Engine: Playwright 1.62.1, WebKit iPhone 14 DPR3 touch at 390x844 / 390x664 / 375x812 / 360x800, Chromium 1280x800 desktop second (and as the labelled layout-shift proxy). Signed out for every request; live was read/render only: no account, no form submitted, no enable, no write. Detector validation 21/21 with negative controls; contrast measured by the round-2-validated checker reused as-is. Journey: `/`, `/visit`, `/stay`, `/map`, `/map/circles`, `/modules`, `/modules/quests`, `/events` (list, month, moons, week, wheel, the public .ics), `/team`, `/circles`, `/how-we-create`, `/seasonal-festivals`, `/messages`, `/login`, `/quests`, `/gratitude`, a garbage URL, the header drawer, the bottom bar, and the desktop nav.

Machine-readable evidence sits beside this file: `findings.json`, `verdicts.json`, `unmeasured.json`, `shots/` (27 screenshots). Raw probe JSON and scripts live in the persona scratchpad `lane-l8-p1/`.

## Harm-metric verdict table

| # | Metric | Verdict | Count | Worst example | NOT MEASURABLE |
|---|---|---|---|---|---|
| a | R26 class: control partially visible above the fixed bar, centre dead under it, at first paint | **FAIL** | 9 | `/events` Month view at 390x844: six day buttons (days 2-7) show a 27px sliver above the tab bar, centres under it; a tap lands on the tab bar (`events-iph14-390x844.png`) | 0 |
| b | Tap targets under 44px (owned hit area, elementFromPoint walk, strict ownership) | **FAIL** | 338 of 644 probed at 390x844 | Site footer link rows measure 40px tall on every page (~14-16 per route); drawer rows 36/32/24px. Each collapses to one shared component | 9 (occlusion-unresolved) |
| c | Horizontal overflow | **PASS** (app) | 0 across 17 routes x 5 viewports | Map iframe interior is 790px at vw 390 (+400px, unchanged round-2 B8, owner: map session) | 0 |
| d | Text under 14px | **FAIL** | 240 instances at 390x844 | 10px weekday headers and event pills on `/events` (59), 12px chip labels on `/quests` (49), 12px badges on `/` (28) | 0 |
| e | Contrast (rendered pixels, AA) | **FAIL** | 8 unique pairs | `/gratitude` subhead 3.67:1 at 16px; then 4.03-4.50 near-misses (`Find your path`, `Contact Team`, modules links, `Spring`) | 199 (160 checker-declared + 38 text-over-sibling-image + 1 zero-measure cell) |
| f | Dead ends | **PASS** | 0 | The 404 page's only onward path is a JS button (it works, verified landing `/`), zero anchor links, no chrome | 0 |
| g | Broken back | **PASS** | 0 | `/modules` to detail and back restores the 20-card grid; `/login?next=/messages` and back returns; view/lens state is deliberately outside the URL (see P1-13) | 1 (drawer-link pair, harness) |
| h | 404s (network and soft) | **FAIL** | 2 | Garbage URL returns HTTP 200 with the 404 card (soft 404, round-2 deferred, still true at this build); intermittent 401 `/api/messages` on signed-out `/messages` at 360 | 0 |
| i | Console errors | **FAIL** | 1 | The same 401 resource error, one cell, intermittent (absent on retry); every other cell clean | 0 |
| j | Images that fail or stretch | **PASS** | 0 | 0 broken, 0 distorted across 65 `<img>` at 390x844 | 1 class (CSS background photos) |
| k | Layout shift | **FAIL** | 5 routes past 0.25 | `/modules/quests` CLS 0.50, `/modules` 0.45, `/map/circles` 0.39, `/stay` 0.36, `/events` 0.35 (desktop Chromium proxy, labelled) | 68 (all WebKit cells; no layout-shift API) |

Raw counts are not defect counts: rows b and d are each dominated by one shared component (footer, drawer, calendar type scale), triaged in the ranked list.

## Ranked improvement list (HIGH 3 / MED 5 / LOW 6)

Severity is audience pain for this persona: HIGH blocks the goal or breaks trust, MED degrades or confuses, LOW is cosmetic. No fixes here; each entry names a direction and the surface the coordinator should route.

### HIGH

**P1-01: Route changes wipe the whole app into a spinner, sometimes for seconds.**
Design/perf · any lazy route (observed on `/visit`, `/quests`, `/gratitude`, `/map/circles`, `/how-we-create`) · worst evidence at 375x812 · `shots/visit-iph14-375x812.png` (a full screen of nothing but a spinner: no header, no tab bar).
Repro: open a content page cold on a phone profile; in 6 of ~90 loads on a fast line the page was still a bare spinner at 3.5s (all filled by 6.5s). The route-level lazy fallback replaces the entire shell, and late-mounting data sections then jump the layout (row k: CLS 0.35-0.50 on five routes).
Direction: keep the shell (header + tab bar) mounted through chunk loads; give data sections reserved-height skeletons. Route to the App.tsx route wrapper and the five pages named in row k.
Persona line: "I tapped Plan a Visit and the whole app disappeared into a spinner."

**P1-02: The calendar's bottom grid row is visible and dead under the tab bar at first paint.**
Design · `/events` Month view (the default) · 390x844 · `shots/events-iph14-390x844.png`.
Repro: open `/events` at 390x844. Days 2-7 in the second visible row poke 27px above the fixed bar; every centre is under it (barTop 779, centres 780). The tap goes to the tab bar. This is the R26 harm class the round-2 login fix closed, reappearing on the calendar.
Direction: bottom spacing on the calendar card so no interactive row straddles the bar at any of the three heights. Route to Events/MonthView.
Persona line: "I tapped a day I could see and landed on Gratitude instead."

**P1-03: Placeholder names and raw system ids on the public calendar.**
Copy/config · `/events` every view · all viewports · `shots/events-moons-390x844.png`, `shots/events-feedcard-390x844.png`.
Repro: signed out, today's chip reads "Sturgeon Moon (example name)", the month and moon headers carry a yellow EXAMPLE NAME badge, and the upcoming list includes "Gratitude cycle lunar-000330 ends, settlement is a human act after this". The Stay page shows how to do honest examples (a labelled explainer card); the calendar's markers come with no explanation and read as an unfinished product.
Direction: name the moons in village config or suppress the marker publicly; give system-generated events a human title. This is config and seed copy work.
Persona line: "The calendar told me today is in Sturgeon Moon (example name). Is this place real yet?"

### MED

**P1-04: The 404 page is off-brand and chrome-less.**
Design/routing · any garbage URL · all viewports · `shots/zzz-qa-not-a-page-4f7q-iph14-390x844.png`.
Repro: generic template card (red alert icon, bright blue Go Home button) on a site that is otherwise entirely teal and cream; no header, no tab bar, no footer; Go Home is a JS button with no href (it does work); HTTP status is 200 (soft 404, deferred in round 2 and still true).
Direction: restyle NotFound in the site palette with normal chrome and real links; revisit the deferred status code. Route to NotFound.tsx.
Persona line: "A wrong link dropped me somewhere that does not look like the village at all."

**P1-05: Layout shift on the five data pages.**
Design · `/modules/quests` 0.50, `/modules` 0.45, `/map/circles` 0.39, `/stay` 0.36, `/events` 0.35 · desktop Chromium proxy (WebKit cannot measure) · `shots/modules-iph14-390x844.png`.
Same root-cause family as P1-01; kept separate because it needs per-page space reservation rather than the shell fix.
Persona line: "The page kept jumping while I was reading it."

**P1-06: Signed-out `/messages` still fires the messages fetch.**
Polish · `/messages` · seen at 360x800, intermittent · `shots/messages-signedout-390x844.png`.
Repro: the sign-in card renders correctly (never a 404, the R36 pattern holds), and sometimes a 401 `/api/messages` lands in the console first. Rows h and i count it.
Direction: skip the fetch until a token exists. Route to Messages.tsx gate order.

**P1-07: The map's lens band is invisible on phones; two map-internal nits.**
Navigation · `/map` · 390x844 · `shots/map-now-390x844.png`, `shots/map-vision-390x844.png`.
Repro: Now mode is on by default and the map is glorious, but `#lyNow/#lyVision/#lyOrg/#lyFlows` measure 0x0 at phone widths; the lenses are reachable only through the map's MORE sheet (programmatic clicks work, so the controls exist). The iframe interior document is 790px at vw 390 (+400, the unchanged round-2 B8), and the HELP tab renders a red "0" badge (a zero-count badge is noise).
Direction: owner is the map session (`docs/prototypes/grounds-v0.html`) per the brief's non-findings; routed to that owner.
Persona line: "I read about Now and Vision modes and could not find them on my phone."

**P1-08: Eight sub-AA text pairs on solid backdrops.**
Design tokens · `/gratitude` (3.67:1 at 16px, the worst), `/` "Find your path" 4.30, `/visit` "Contact Team" 4.41, `/modules` builder-guide and pool links 4.03, module-detail backlink and "Core module" note 4.30, `/how-we-create` "Spring" 4.50 on desktop.
Direction: nudge the muted-teal-on-cream token family past 4.5:1; one token likely clears most of the list.

### LOW

**P1-09: Footer rows 40px, drawer rows 36/32/24px.** Polish, site-wide (`shots/drawer2-390x844.png`). 338 of the row-b count collapses into these two shared components. Direction: list-row padding to 44px.

**P1-10: Smallest type steps.** Polish. 10px weekday headers and event pills on `/events`, 12px chips on `/quests`, 12px badges on `/`. Direction: lift the bottom of the type scale (`shots/events-iph14-390x844.png`).

**P1-11: The compass FAB overlaps first-paint content.** Overlapping controls. On `/` it sits on the right end of "Read the Co-Creators Guide" (the CTA's centre still receives its tap; the overlap is visual); on `/events` it covers the calendar grid corner (`shots/home-iph14-390x844.png`). Direction: clear the FAB from first-paint CTAs or reveal on scroll.

**P1-12: Fold-coincidence slivers of the R26 class.** `/messages` footer "Resident" link (3 viewports) and `/seasonal-festivals` inline "Work With Us" (360): 3-6px slivers above the bar with dead centres (`shots/retry-seasonal-festivals-narrow-360x800.png`). Direction: the same bottom-spacer thinking as P1-02.

**P1-13: View and lens state never reaches the URL.** Routing polish on `/events` and `/map/circles`: the remembered-state design is deliberate and pleasant, and it means a copied link cannot carry "moon view" to a friend, and back exits the page rather than stepping views (`shots/events-year-390x844.png`). Direction: an optional `?view=` param seeded by the remembered state.

**P1-14: Two copy nits.** The nav says "What's On", the page h1 says "What is on"; the amber "Main Site" button (drawer + desktop header) is ambiguous for a visitor who believes they are already on the main site (`shots/drawer2-390x844.png`). Direction: align the pair; name the outbound destination.

## What already feels world-class

Honest praise is signal too, and this build has a lot of it:

- **The home hero earns the visit.** "Come co-create paradise", the Costa Rica framing, one primary CTA, and it paints in about a second: DCL ~1.0s on the phone profile with roughly 340KB transferred (165KB JS). That is genuinely lean (`shots/home-iph14-390x844.png`).
- **The Living Map is the best single surface on the site.** Illustrated buildings over real terrain, a legible stat strip, a 44px "Back to the village" exit that owns its tap, and its own coherent bottom nav. A first-time visitor immediately understands this is a real place with real buildings (`shots/map-now-390x844.png`).
- **The calendar's shape is special.** Twelve months and the moons side by side, the two-ring year wheel with solstice markers, Months/Moons remembered, "Times are village time", print buttons that respect the current view, and a public .ics that actually serves (200, text/calendar, 42 events, subscribe card on the page). No mainstream platform ships a lunar-first calendar this considered (`shots/events-year-390x844.png`, `shots/events-moons-390x844.png`).
- **The Module Library answers the persona's question.** "Everything this platform can be, one card at a time. A village turns on what it needs and leaves the rest on the shelf" plus storybook illustrations per module: a visitor learns what the place can become in one scroll (`shots/modules-iph14-390x844.png`).
- **Members-only surfaces degrade with grace.** `/messages` signed out is a warm sign-in card ("This part of the village opens when you sign in"), never a 404; the login route is bare of the tab bar on purpose and carries `?next=/messages` so you return where you were (`shots/messages-signedout-390x844.png`, `shots/login2-390x844.png`).
- **The worked-examples pattern, where it is explained, is disarming.** `/stay` and `/map/circles` both label their sample data in plain language ("These are standing examples. Nobody here made them.") ; honest, warm, and exactly what P1-03 needs on the calendar.
- **Navigation is coherent at both sizes.** Five-slot bottom bar with the drawer as More, seven-entry desktop bar with clean dropdowns, zero horizontal overflow at four mobile widths, zero broken or stretched images, and back behaviour that holds up everywhere it was probed.

## Run discipline

Writes to live: none (GET and render-only view toggles throughout; anonymous; no forms, no enables). Local write pass: not applicable to persona 1. Could NOT measure: 10 items, listed in `unmeasured.json` with counts. Detector validation: 21/21 plus the reused contrast checker's own record. Nothing in `wt-r4-qa1` was committed; nothing in regen-integration was committed (hub files written for the coordinator to commit).

Status: DONE (report-only; per the coordinator amendment, report-only findings need no gates).
