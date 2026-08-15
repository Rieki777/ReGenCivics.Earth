# Lane V — mobile-first Safari QA report (adopted in substance)

Build: `2026-07-28-wave1-5f3cf0b`, verified live at start and end; local build identical SHA.
Engine: Playwright WebKit 1.60.0 (webkit-2336), iPhone 14 descriptor, DPR 3, touch, iOS UA;
viewports 390×844, 375×812, 360×780, plus 390×664 (Safari with URL bar visible). Detector
validation before any zero was trusted: 16 detectors flag known-bad fixtures, 5 negative
controls clean — 21/21; occlusion sweep validated against a fixture overlay separately.

## HIGH — unusable/broken on a phone
| # | Finding | Where | Evidence |
|---|---|---|---|
| H1 | **`/login` "Sign In" button is covered by the fixed mobile tab bar at first paint** at 390×664 (URL bar visible), scrollY=0. Button y 579–627; tab bar (`nav.md:hidden.fixed.bottom-0`, z-50) starts at 599 — only the top 20px of 48 is live; `elementFromPoint` at the button centre returns the tab bar's **Gratitude** link, and a control tap there navigated away. Clean at 390×844 | live | `login-urlbar-visible.png` |
| H2 | **`/map` removes all in-app navigation on mobile**: shell `div.fixed.inset-0.z-50.h-[100dvh].w-screen.overflow-hidden` holds one iframe; outer shell has 0 links / 0 buttons, no header, `body{overflow:hidden}`; every hit-test probe returns the IFRAME. Reached from top nav + landing hero; only Safari's back gesture escapes, which the pannable canvas may consume | live, all viewports | `map-390.png`, `map-390-annotated.png` |
| H3 | **The map iframe's own document overflows to 790px in a 390px viewport**: `scrollWidth 790` vs `clientWidth 390`; a ✕ close control (28×28) sits at left=750 (off-screen), another at top=1096 (below fold). The parent's `overflow-hidden` hides this from outer scans | live | measured inside the frame |
| H4 | **Primary CTAs on three more routes are tap-stolen by the tab bar at scrollY=0** (390×844): `/quests` "Propose a Quest" (48px @ top 808) → Gratitude; `/login` "Create Account" (52px @ 779) → Gratitude; `/feed` reaction buttons (44px @ 761) → Home/Quests. 19 genuine thefts across 13 routes in `occlusion.json`; these plus H1 need no scrolling | live | `occlusion.json` |

## MED
| # | Finding | Where |
|---|---|---|
| M5 | ~~Tab bar has no safe-area inset padding~~ **COORDINATOR CORRECTION: NOT A FINDING.** `MobileTabBar.tsx:29` sets `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}` inline; V measured 0px because WebKit-on-Windows reports every inset as 0 (V's own could-not-measure #3). The safe-area handling exists; what does NOT exist is reserved page-bottom space equal to the bar's height on the routes in H1/H4 — that is the real defect and it is folded into the H1/H4 fix | code |
| M6 | **Store catalog scrolls horizontally at 360px**: `scrollWidth 380` vs `clientWidth 360`; 18 cards 308px wide from left=72 (56px admin icon rail + padding) to right=380, not in any clipping container. Clean at 390 | local (same SHA) — `store-catalog-360-local.png` |
| M7 | `/register` inputs have no `autocomplete` (all four empty) while `/login` sets `email`/`current-password` — iOS offers no Keychain suggestion on the form where it matters most; `/admin` login likewise bare | live |
| M8 | Worst touch targets (getBoundingClientRect, 390×844): `/admin` password-reveal 16×16; `/tools` "More" 31.5×16; `/feed` 8 hashtag filter buttons ×19px tall; `/quests` 7 sticky filter pills ×24px tall; `/admin` rail menu items 40px; store on/off toggles 40.6×44 (3.4px short); map "Enter the Land" 167×38. Inline prose links and the sr-only skip link correctly excluded | live/local |
| M9 | Perf: main bundle 502.8 KB (under 700); but `/admin` ships 863.6 KB JS (main + 328 KB Admin chunk). WebKit FCP: landing 2856ms, `/tools` 2317, `/admin` 1918, `/quests` 2141. CPU×4 (Chromium proxy — WebKit has no CDP throttling) landing FCP 15272ms. Landing payload 1245.8 KB (383 KB images) | live |

## LOW
L10 tab-bar labels 11px, badges/store pills 10px — crisp at DPR3, not truncated (legibility judgement only) · L11 `/quests` one console 404 (= Lane L's M2) · L12 `/quests` 6 images without alt (note: Lane L found zero site-wide with a different detector — one of the two detectors is wrong; resolve at fix time) · L13 no `-webkit-tap-highlight-color` and no `overscroll-behavior` anywhere.

## Checked and CLEAN
Horizontal scroll: 16 routes × 3 viewports = 48 renders, `overflowBy: 0` on a fixture-validated detector (only exceptions H3 inside the iframe, M6 at 360). Form zoom-on-focus: all 11 live inputs + both store controls compute to exactly 16px — Lane M's `text-base min-h-[44px]` intent holds (store search 302×44, filter select 250.9×44). Viewport meta correct (`viewport-fit=cover`, pinch-zoom allowed, max-scale 5). `touch-action: manipulation` global on controls. Tab bar 5 items 76.4×64 all hit-testable. Store at 390: no overflow, single column, pills do not wrap, nothing truncates, 0 console errors. MobileFab correctly safe-area lifted and inert when closed. Images 0 overflowing. `h-[100dvh]` on the map shell (6 dvh + 2 svh declarations app-wide). Console/network clean on 15/16 routes. No hover-only affordances found. 360 and 375 identical to 390 elsewhere.

## Disproven during the run (not reported)
"Store UI missing from live" — first grep hit the main bundle; the store lives in the lazy `Admin-*.js` chunk where Lane M's class strings are byte-identical. "Overlapping footer links" — 0 overlapping pairs; phantom from a debug query that ignored `opacity:0` (the closed FAB's inert links).

## Could NOT measure — 14
Real iOS URL-bar dynamics (modelled as two static extremes); software keyboard / visualViewport; **safe-area insets (WebKit-on-Windows reports 0)**; `maxTouchPoints` reports 0 despite touch; LCP (not exposed); first-paint; **CPU throttling impossible in WebKit** (proxy numbers are Chromium); tap-highlight/double-tap rendering; momentum scroll physics; **store tiers beyond included never rendered** (local seed has only core modules — vendor pills/support lines unverified on mobile); perceptual legibility of 10–11px at DPR3; iOS native select picker; PWA/standalone behaviour on `/map` (would make H2 unescapable; `apple-mobile-web-app-capable` absent mitigates); cold-cache timing beyond `/`.

## Discipline
Read/render only on live; no accounts, submissions, enables. Auth-gated work on local same-SHA build (`wt-liveqa-v`, scratch `amora_lanev`, since dropped). Nothing committed/pushed. 99 screenshots + JSON evidence in the coordinator scratchpad `lane-v/`.

## V's own triage notes (adopted)
H1/H4 (+ the real half of M5) are one root cause — the fixed tab bar reserves no page-bottom space — one fix in `MobileTabBar.tsx` + per-page bottom padding closes five findings. H2/H3 live in the map iframe artifact, which is outside `client/` — ownership confirmed by the coordinator: `docs/prototypes/grounds-v0.html`, ~4 MB self-contained, served by the server, owned by the map lane (active in other sessions).
