# Lane V2 — closing proof for the round-2 mobile fixes (2026-08-15)

Measured against live `c09c172` (verified at start and throughout); the deployment advanced to
`72a7fca` mid-run and the two residual harms reproduce identically there. Playwright WebKit 1.60.0,
iPhone 14 DPR3 touch, 390×844 / 390×664 / 375×812 (+360×780 for the store). Signed-out live;
admin/store surfaces via a ≤24h token for `integration-qa` (GET/render only). Nothing pushed.
Detector validation 34/34 incl. negative controls; three harness defects found and fixture-covered
before any zero was trusted (see §Harness).

## Harm-metric verdicts (F1's correction: harm metrics, not raw counts)
| Metric | Result | Verdict |
|---|---|---|
| Every named CTA owns its centre at first paint | 1 named CTA + 2 primary controls under the bar (see residuals) | FAIL (narrow) |
| Zero controls with no tappable position | 1,710 probed → 0 (39 flags all the `sr-only` skip link, correct markup) | PASS |

## Finding by finding
| # | BEFORE (`5f3cf0b`) | AFTER (`c09c172`) | Verdict |
|---|---|---|---|
| V-H1 `/login` | Sign In centre → tab bar "Gratitude"; tap navigated away | `/login` renders 0 fixed bottom bars (BARE_ROUTES); Sign In / Forgot / Create Account all own their centres (Create Account below the fold at 390×664 — nothing covers it) | **CLOSED** |
| V-H4 `/quests` | Propose a Quest → Gratitude | 390×844 clears (tap lands `/propose-quest`); 390×664 below fold; **375×812: rect 772–820 wholly under the bar (top 747); real tap → `/gratitude`** | **OPEN at 375×812** |
| V-H4 `/feed` | reaction buttons → Home/Quests | **390×844: both reaction controls 47×44 @794 wholly under the bar (top 779)** — not tapped (a tap sends a recognition); below fold at the other two | **OPEN at 390×844** |
| V-H2 `/map` | 0 shell controls; every probe → IFRAME | `Back to the village` 190×44 fixed @(12,44) owns its centre at all three; real tap `/map` → `/`; deep-link hash forwarded into the iframe | **CLOSED** |
| V-H3 map prototype | 790/390, ✕ at 750 and 1096 | unchanged (overflowBy 400; ✕ off-screen) | **UNCHANGED (B8, map owner)** |
| V-M6 store 360 | 380/360 (20 px); cards 308 | **370/360 (10 px)**; 18 cards fixed at 298 wide from left=72 (do not respond to viewport at 360/375); 375 and 390 = 0 | **IMPROVED, not closed** (regression class: something added since F3 reintroduced a min-content floor — F3 measured 272 at 360) |
| V-M6 toggles/search/contrast | 40.6×44; unnamed; 2.49:1 | toggles HIT 127×45; `aria-label="Search the catalog"` 302×44 @16px; contrast 0/150 failures (`18 of 18` 7.23, `always on` 7.23, `Core` 6.87) | **CLOSED** |
| V-M7 `/register` | bare | name/email/new-password/new-password, all 294×50 @16px; `/login` email/current-password | **CLOSED** |
| V-M8 targets | chips 19px, pills 24px, More 31.5×16 | feed chips HIT ×45; quests pills HIT ×44; `/tools` More HIT 49×45 (measured by elementFromPoint walk); store toggles HIT 127×45 | **CLOSED** |
| L-M5 / L-L3 / L-L4 | 44 unlabelled; 4 skips; <4.5:1 | 0 / 0 / 6.87:1 | **CLOSED** |
| Alt (`hasAttribute`) | V claimed 6 missing | 0 missing; 14 decorative `alt=""` + 2 described; **14/14 posters resolve** (naturalWidth>0), 0 console errors | **CLOSED** (also L-M2/V-L11) |
| L-M1 headers | absent | nosniff, referrer-policy strict-origin-when-cross-origin, X-Frame-Options SAMEORIGIN, CSP frame-ancestors 'self', permissions-policy camera/mic/geo denied; `x-powered-by` absent; HSTS absent (deliberate) | **CLOSED** |
| L-M3 `/admin/mint` | admin fetches signed out | sign-in prompt; 0 admin fetches, 0 4xx, 0 console errors | **CLOSED** |
| L-L1 robots/sitemap | — | text/plain 200; application/xml 200; soft-404 still 200 (deferred, as recorded) | **CLOSED / deferred** |

Occlusion sweep context (13 routes × 3 viewports × 4 offsets, 2,061 samples): 51 thefts total —
tab bar 21, **sticky top header 29**, FAB 1; first-paint 6. Context only.

## Coordinator ruling on the two residuals (R26)
The harm class F1 identified is a control **partially visible above the bar with its centre
under it** (the login shape: the user sees a button and it does not respond). Both residuals are
**wholly** under the bar at first paint — invisible, and reachable by scroll (reachability PASS)
— so they are "below the effective fold", not dead-visible. They are still a UX loss on the
primary CTA of `/quests` at 375 and are routed as small fixes (F1 resume: `/quests` CTA
placement above the grid on mobile / not in the last 65px of the first viewport at any of the
three heights; `/feed` first-card actions accepted as below-fold unless a cheap layout move
exists). The store 10px overflow at 360 is a regression from a later landing (D's #10 store card
additions are the suspect) → F3 resume, Admin.tsx store region.

## New flags (report only)
Admin sign-in form still bare (autocomplete null, no labels) — queue 27 confirmed OPEN → F3
resume. GameMechanics z-70 proposal bar: source confirms it deliberately sits above the z-50 tab
bar; needs a staged change to render (production write) — could-not-measure, queue 28 stands.

## Could NOT measure (11)
safe-area insets (WebKit-Windows reads 0); CPU throttling; real iOS URL-bar dynamics; software
keyboard/visualViewport; GameMechanics bar; `/feed` reaction tap destination (a write); non-included
store tiers (all 18 listings Core — vendor pills/support lines never rendered); maxTouchPoints=0;
LCP/first-paint; momentum/tap-highlight/native select; PWA standalone on `/map`.

## Harness — three defects caught before any zero was trusted
1. `owns()` accepted an ANCESTOR hit (`hit.contains(el)`), so `<body>` "owned" every probe and
   every hit area measured the whole viewport → strict ownership for hit-area/reachability.
2. `scrollIntoView` is async under CSS `scroll-behavior: smooth`; reading the rect immediately
   after flagged 36/46 landing-page controls unreachable — the true number is 0 → force
   `scroll-behavior:auto`; never flag a control with zero probe points.
3. A "partially covered" fixture was fully covered — a valid assertion failed against a bad
   fixture.
Note: `locator.click()` times out on `/map` (animating canvas defeats actionability); use a raw
`mouse.click` at the centre for map proofs.

Evidence: 26 screenshots + 10 JSON under the coordinator scratchpad `lane-v2/`.
