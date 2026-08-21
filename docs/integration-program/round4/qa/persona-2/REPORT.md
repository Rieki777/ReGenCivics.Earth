# Lane L8 persona 2: a new member on a phone, finding their footing

Report only. Nothing was written to live.

Lane L8 persona 2: new member on a phone. Live build start / end: `2026-07-28-wave1-335058f` / `2026-07-28-wave1-335058f` for all five measurement runs; live moved to `2026-07-28-wave1-379d2e7` (PR #27, one commit) after measurement, and the confirm, evidence, and micro passes ran there, labelled per finding. Tip SHA (scripts branch `wt-r4-qa-2`): `a6be79db89ee`. Engine: Playwright WebKit 1.62.1, iPhone 14 descriptor, DPR 3, touch; Chromium 1.62.1 for desktop. Viewports mobile first: 390x844, 390x664, 375x812, 360x800; desktop 1280x800 last.

Signed-in view: the standing QA admin `integration-qa` via a coordinator-pattern token (<= 24h, storage plus document bearer, never printed or persisted). This account is an admin; where admin chrome may colour what a plain member sees, the finding says so. Strictly GET/render: a context-wide guard fulfilled every non-GET locally and logged it; across all runs exactly one POST per run was attempted and intercepted (Cloudflare RUM beacon). Where a write was the natural next step (RSVP, brief opt-out, meet-me, mark-read, Buy, Ask), the surface was rendered and hit-tested only, and the write path is recorded as not exercised on live.

Detector validation: 19/19 on fixtures including negative controls (recorded below in Harness). Could NOT measure: 12, listed in `unmeasured.json` and summarised below. Writes to live: none. Local write pass: none; writes live only in persona 3's brief, and the scratch schema was never touched.

Paths: `docs/integration-program/round4/qa/persona-2/` (REPORT.md, findings.json, findings-raw.json, verdicts.json, unmeasured.json, shots/ with 169 images, raw/ with seven run files including the no-interception control and the 379d2e7 confirm pass).

Status: DONE (report-only; scripts live on branch `wt-r4-qa-2`, no PR unless the coordinator asks).

## Harm-metric verdict table

Every row measured; NOT MEASURABLE counted even at zero. Full machine-readable copy in `verdicts.json`.

| # | Metric | Verdict | Count | Worst example | NOT MEASURABLE |
|---|---|---|---|---|---|
| a | R26: partially visible and dead at first contentful paint, scrollY 0 | FAIL | 12 | `/profile/characters` "Walk this path", the page's primary CTA, dead at 390x844, 375x812, 360x800 | 0 |
| b | Tap targets under 44px effective (expander-aware, strict ownership) | FAIL | 337 rows (~40 unique element classes) | 12x12 checkboxes on `/profile` | 129 |
| c | Horizontal overflow, document | PASS | 0 of 18 routes x 5 viewports | none, including 360px | 0 |
| c2 | Horizontal overflow, map iframe | FAIL | 1 | `/map` iframe +400px (round-2 V-H3 residual; owner: map session; routed) | 0 |
| d | Text under 14px | FAIL | 120 groups | 10.0px moon-day labels on `/events` day cells | 0 |
| e | Contrast below WCAG AA (rendered pixels, alpha-composited) | FAIL | 83 raw; ~48 real after triage | 2.59:1 at 12px, citizenship tier labels on `/profile` | 497 |
| f | Dead ends (no route onward) | PASS | 0 | raw sweep flagged `/map` x5; false positive, its Back control is a button the anchor count cannot see | 0 |
| g | Broken back (`?brief=`, `?focus=`) | PASS | 0 | `?brief=` Back ok x5 (~0.5s to content); `?focus=` Back ok on desktop (31ms) | 1 (phone `?focus=`: no map box below 480 by design) |
| h | 404s (network and soft) | FAIL | 2 | `GET /api/intents/board` 404 on `/introductions`; `/introductions` renders the generic 404 while its module is off | 0 |
| i | Console errors | FAIL | 1 real | 404 resource error on `/introductions` | 0 (3 further signatures proven harness artifacts by the no-interception A/B) |

Row e triage: two big fail classes (~35 rows: home hero, quest card titles) are the checker's stated blind spot, text over sibling photos, and both were verified readable by eye (dark scrims behind white text, `shots/evidence-quest-cards--wk-390x844.jpg`). The real clusters are named in the ranked list.

## Ranked improvement list

HIGH 3 / MED 10 / LOW 9. Top three: P2-01 `/profile/characters` at 390x844/375x812/360x800, P2-02 `/wallet` `/tokens` at 390x844, P2-03 `/events` at 390x844. Full machine-readable copy with element chains and repro steps in `findings.json`; `findings-raw.json` keeps the uncurated sweep output. Build marker is `335058f` unless a finding says `379d2e7`. No fixes here; each entry names where the coordinator should route it.

### HIGH

**P2-01 - overlapping controls - `/profile/characters` - wk-390x844, wk-375x812, wk-360x800 - `shots/02-profile-characters--wk-390x844.jpg`**
The page's primary CTA, "Walk this path" (`button.min-h-11`), shows its top sliver above the fixed tab bar at first paint while its centre sits under the bar; the visible part invites the tap and the tap goes to the bar. Repro: open the route, do not scroll, tap the button (top y756, centre y780, bar top y779 at 390x844). Persona line: "I could see the button that starts my character and my tap opened Gratitude instead." At 390x664 it is wholly below the fold, which R26 rules a UX note, so three of four mobile heights fail. Route to: `client/src/pages/Characters.tsx` (CTA placement at the fold).

**P2-02 - overlapping controls - `/wallet` and `/tokens` (one page, two routes) - wk-390x844 - `shots/14-tokens--wk-390x844.jpg`, close-up `shots/evidence-tokens-exchange--wk-390x844.jpg`**
The example exchange's amount input and its Buy button surface at y772 with centres under the bar at first paint: a member's first sight of the money surface is a Buy button that does not answer. Persona line: "The Buy button looked ready and did nothing I meant." Route to: `client/src/pages/Wallet.tsx` (exchange row clearance).

**P2-03 - overlapping controls - `/events` month grid - wk-390x844 - build `379d2e7` - `shots/03-events--wk-390x844.jpg`**
Six day-cell buttons of the month's last row straddle the bar line at first contentful paint (tops y752, centres y780): tapping the end of the month presses the tab bar. Measured on the confirm pass at `379d2e7`; the `335058f` runs under-counted this page because the harness broke its span fetch (Harness, defect 2), and at `335058f` the same class was already caught on this route via the "Subscribe from your own calendar" toggle (top y746). Persona line: "The last week of the month sat half behind the bar." Route to: `client/src/pages/Events.tsx` (grid bottom clearance above `MobileTabBar`).

### MED

**P2-04 - overlapping controls, systemic - `/modules`, `/messages`, any route whose fold lands on a link row - wk-390x844/375x812/360x800 - `shots/08-modules--wk-390x844.jpg`**
Fold-coincidence members of the same R26 class: whatever link row happens to straddle the bar line renders half visible with a dead centre (Resident at 844, the Call Automation card at 812, Village Steward at 800, Investor on `/messages` at 812). One systemic cause, one systemic cure. Route to: the shared page shell / `MobileTabBar` clearance, `client/src/components/mobile/MobileTabBar.tsx` consumers.

**P2-05 - routing - `/introductions` - all five viewports - `shots/06-introductions--wk-390x844.jpg`**
Signed in, the page renders the generic 404 because the introductions module is off, and ModuleGate makes off and missing deliberately indistinguishable. The posture is recorded in the code; the member cost is real: anyone following a shared introductions link meets a page that says the place does not exist. Routed to the coordinator as posture to weigh, together with P2-17 (the 404 page itself). Also explains the L7 intents card being absent from `/messages` (0 affordances found).

**P2-06 - polish - `/` first navigation - wk-390x844 - `shots/00-home--wk-390x844.jpg`**
Cold first load: DOMContentLoaded 5.3s (333 KB over 24 requests), 11s once during a deploy window; repeat routes are sub-second. Confirmed by the no-interception control run, so this is the member's real first minute. Persona line: "The first screen took long enough that I wondered if my connection was down." Route to: bundle/loading triage (round-4 perf owner).

**P2-07 - design - `/profile` - all mobile - `shots/evidence-profile-path-chips--wk-390x844.jpg`**
The citizenship path tier labels (Immersant, Participant, Member, Contributor, Quest Seeker, ...) render rgb(166,160,155) on white at 12px: 2.59:1 where 4.5:1 is the floor. The site's biggest real contrast cluster (~33 nodes on this page). Persona line: "The names of the levels I could reach were the faintest text on the page." Route to: `client/src/pages/Profile.tsx` tier row styles.

**P2-08 - copy - `/events` month header - all viewports - `shots/events-brief--wk-390x844.jpg`**
"Moon 8, Sturgeon Moon, day 10 of 29" carries a bright "EXAMPLE NAME" badge in the member's calendar. The examples banner pattern elsewhere explains itself ("These are standing examples. Nobody here made them."); this badge explains nothing. Persona line: "The calendar told me the moon's name is an EXAMPLE NAME, and I do not know what that means for me." Route to: calendar month/moon header (L5a/L5b owner).

**P2-09 - design - `/tokens` and `/map/circles` - wk-390x844 - `shots/evidence-tokens-top--wk-390x844.jpg`, `shots/map-circles-settled--wk-390x844.jpg`**
A screen-height empty block sits between the notice banner and the first real card on both pages at phone width; something reserves space and does not render there. Persona line: "A whole screen of nothing made me think the page had failed." Route to: `client/src/pages/Wallet.tsx`, `client/src/pages/VillageMap.tsx` (phone branch spacing).

**P2-10 - overlapping controls - `/` hero - wk-390x844 - `shots/00-home--wk-390x844.jpg`**
The floating compass FAB sits on the right end of "Read the Co-Creators Guide" at first paint. The pill's centre still answers, so it is out of R26, and it still reads as two controls fighting. Route to: `client/src/components/mobile/MobileFab.tsx` (first-paint position vs hero CTAs).

**P2-11 - copy - `/profile`, Your agent - all viewports - `shots/evidence-profile-your-agent--wk-390x844.jpg`**
The section renders, reads in plain sentences, and its two-writes promise ("the village never writes anything until you say yes") is genuinely good. What it never says is what an agent is or that a member who has none can ignore the whole card; the first sentence assumes the concept, and "Mint a token" is jargon where "Create" would do. Scope descriptions in plain words are already there. Persona line: "I do not know what an agent is, and the first sentence assumes I do." Route to: `client/src/components/YourAgentPanel.tsx` intro copy.

**P2-12 - design - `/events` controls - all mobile - `shots/evidence-events-controls--wk-390x844.jpg`**
The calendar's main controls sit under the touch norm: Year/Month/Week/List tabs 49-72 x 32, Earlier/Later steppers 30x30 (expander-aware measurement). The platform's own button component carries `pointer-coarse:min-h-11`; these controls do not use it. Route to: `client/src/pages/Events.tsx` control row.

**P2-13 - design - `/gratitude` hero - all viewports - `shots/10-gratitude--wk-390x844.jpg`**
The subtitle that explains what gratitude is renders rgb(208,229,229) on rgb(21,127,125): 3.67:1 at 16px regular, under the 4.5:1 floor. Route to: `client/src/pages/Gratitude.tsx` hero styles.

### LOW

**P2-14 - design - `/profile` checkboxes - all mobile - `shots/evidence-profile-your-agent-scopes--wk-390x844.jpg`** - Agent scopes and notify prefs use 12x12 native checkboxes. The wrapping labels catch the tap, so LOW; the visual affordance is still a speck on a phone. Route to: shared checkbox styling.

**P2-15 - design - `/badges` - all mobile - `shots/evidence-badges-thats-me--wk-390x844.jpg`** - "That's me", the one-tap way to claim a suggested skill, measures 61x16. Route to: `client/src/pages/Badges.tsx`.

**P2-16 - navigation - notifications bell empty state - all viewports - `shots/home-bell-open--wk-390x844.jpg`** - "Nothing yet. Go be seen." has voice and nowhere to tap; a link into gratitude or quests would finish the sentence. Route to: `client/src/components/NotificationBell.tsx`.

**P2-17 - design - the 404 page - all viewports - `shots/evidence-not-found-page--wk-390x844.jpg`** - Generic blue "Go Home" button, slate palette, Title Case: the one page that greets a lost member looks like a different product. Unknown paths also answer HTTP 200 (soft 404), which round 2 already queued for search engines. Route to: `client/src/pages/NotFound.tsx`.

**P2-18 - polish - `/introductions` console - any - `shots/06-introductions--wk-390x844.jpg`** - The module-off page still fires `GET /api/intents/board` and eats a 404; one gate line stops the console noise. Route to: `client/src/pages/Introductions.tsx`.

**P2-19 - design - site footer - all mobile - `shots/16-roles--wk-390x844.jpg`** - 25-27 stacked link rows at 358x32: usable because they are wide, still a wall, and this list is what the R26 straddler class keeps catching at the fold. Route to: footer layout.

**P2-20 - design - `/quests` sticky filter - wk-390x844 - `shots/evidence-quest-cards--wk-390x844.jpg`** - Card art ghosts through the pinned translucent filter panel while scrolling. Route to: `client/src/pages/Quests.tsx` filter bar backdrop.

**P2-21 - copy - weekly brief season line - all viewports - `shots/events-brief--wk-390x844.jpg`** - An August week's brief opens with "Season of Foundations, Sun 21 Jun."; it is the season's start date, and unlabelled it reads as a stale event. Route to: brief renderer wording (L5b owner).

**P2-22 - design - `/roles` Forming chip - all viewports - `shots/evidence-roles-forming-chip--wk-390x844.jpg`** - 4.31:1 at 12px, just under the floor. Route to: `client/src/pages/Roles.tsx` chip styles.

## The member journey, walked

- **Sign-in state**: loads clean on every route; header keeps bell and menu; Sign Out visible on profile. Admin note: this account sees the power-map setup-walk invitation and may see example scaffolding a fresh member also sees (the examples posture is village-wide until first real data).
- **Profile**: "No path chosen yet. Choose who you will be" plus a YOUR NEXT STEP card gives a newcomer a next move immediately. **Your agent** is present under `/profile` with heading "Your agent" (L6 landed); judgement on its copy is P2-11. Download-my-data and delete-my-account sit in plain words.
- **Characters**: renders with She/He and skin-tone pickers; its CTA is P2-01.
- **Calendar as a member**: Year/Month/Week/List tabs all answer; week view opens with stacked month and moon headers and village time named ("Week of 2026-08-17, village time"). The who-is-here band never rendered: the data window was quiet (nobody arriving or leaving renders nothing by design) and the harness broke its fetch besides, so it stays NOT MEASURABLE rather than passed. My RSVPs: no RSVP-able occurrence existed in the window, 0 controls rendered, nothing pressable to verify; write path out of scope regardless. Meet-me windows: found inside the collapsed community card ("Your calendar: post, meet, bring" > "Meet me", `shots/events-meet-me--wk-390x844.jpg`), render only. The brief panel at `/events?brief=2026-08-17` opens, reads in plain words (season, open seats), carries its opt-out ("Send me this every week") rendered and unpressed, and Back leaves it cleanly at all five viewports.
- **Messages**: inbox renders an honest empty state, "Start one with anybody here", with the DM-to-group sentence. Threads list unverifiable beyond empty (no data). The L7 intents card is absent because the module is off (P2-05, P2-18).
- **Power map `/map/circles`**: below 480px the circles SVG is hidden by design and the page is the accordion list, which works: search ("Who does... kitchen, water, a name"), breadcrumb ("Village"), Now/Vision, decides-by chips, open-seats/my-seats filters, Legend (collapsed; the currency picker lives inside and only after expanding, which is a discoverability note, no extra finding), "seats waiting for someone like you" framing. Search typed "water" filters live; the Ask button (LLM path) was never pressed. Desktop: tapping a circle pushes `?focus=` and Back returns in 31ms.
- **Modules shelf**: 14 cards badge "On in this village", 4 "Always on", grouped shelves with glosses; reads clearly. Ask-your-founders affordance: absent, as designed, even for this admin account.
- **Living Map `/map`**: the iframe renders (its text lives inside the frame, so the shell's near-zero text is posture, no finding); iframe overflow +400px is the standing map-session residual; 4.1 MB wire is inside the artifact budget and still heavy for a phone, noted for the map owner.
- **Gratitude, quests, badges**: all render with real content and good empty-state instincts; quests is the strongest screen on the site (below).
- **Wallet/tokens**: one page on two routes, honest "standing examples" banner, "Nothing yet. Contribution is where value starts."; its Buy row is P2-02.
- **Notifications**: bell 36x36 opens a dropdown with a header and the empty line; unread badge and mark-read could not render (zero unread on this account); the mark-read POST is intercepted by design.

## What already feels world-class

- **The quest shelf.** "A good first quest" hands a newcomer one obvious door; the cards are painted scenes with dark scrims, readable titles, Gratitude ranges, time-boxes, level chips; "Don't see your gift here? Propose a Quest" closes the loop. This screen sells the whole platform.
- **Zero horizontal overflow.** 18 routes, 5 widths down to 360, not one page slides sideways. Rare, and it shows.
- **Back never breaks.** `?brief=` and `?focus=` both live in real history; the map even answers Back in 31ms.
- **Empty states with a voice.** "Nothing yet. Go be seen." / "Start one with anybody here." / "Nothing yet. Contribution is where value starts." The village speaks like a person.
- **Honesty banners.** "These are standing examples. Nobody here made them." is exactly how to seed a world without lying about it.
- **The two-writes agent promise.** "You hold the token; the village never writes anything until you say yes" plus scope words in plain language is a model consent surface.
- **The phone gets its own map.** Below 480 the power map becomes an accordion instead of a squeezed diagram; the right call, cleanly made.
- **Privacy in plain words.** Download everything the village holds about me / Delete my account, one tap deep on the profile.

## Could NOT measure (12)

Full list in `unmeasured.json`: safe-area insets (WebKit-Windows reads 0); who-is-here band (quiet data plus harness fetch artifact); RSVP surfaces on real events (none in window); every write path (by charter); phone `?focus=` zoom (no map box below 480 by design); contrast over photos/gradients (497 nodes, two classes eye-verified readable); 129 tap targets with offscreen centres; real iOS URL bar, keyboard, LCP, momentum scroll; notifications with unread items; intents/introductions member surfaces (module off); modules turn-on/go-live and events admin (persona 3, writes); map iframe internals (map session owner).

## Harness (three defects caught and fixed before any zero was trusted; detector validation 19/19)

1. **The overflow fixture poisoned the geometry fixtures.** A 500px div in a 390px mobile fixture makes WebKit/Chromium zoom the layout viewport out, moving the fixed bar and every hit-test coordinate; the R26 positive stopped firing for a reason that had nothing to do with the detector. Fixtures were split; each detector then flagged its known-bad and passed its negative control, 19/19, including an `::after`-expanded 20px control correctly not flagged, a gradient backdrop counted unmeasurable rather than passed, and a NaN band converted to NOT MEASURABLE.
2. **Interception artifacts, proven by A/B.** Two WebKit console signatures ("Fetch API cannot load ... access control checks" on the events span and who-is-here fetches) and one Beacon queue warning appear only under Playwright routing and are absent in the `--noguard` control run; they were excluded from the console-error verdict as harness artifacts, stated in row i. The broken span fetch also made the `335058f` runs under-count `/events` content, which is why P2-03 carries the confirm-pass marker.
3. **Blank-at-3.5s pages were being measured as pages.** Several routes paint nothing at the 3.5s beat; the probe gained a content wait that records the delay and shoots the blank state. The A/B then showed the recorded delays (1.0-1.6s) were interception-inflated (no-guard: 2-587ms), so no per-route "late render" findings were kept; the one real, member-facing slowness is the cold first load (P2-06).

Also corrected during the pass, recorded for the next persona: the first `svg` in the page is a header icon, so the map walk anchors on `[data-power-map-box]`; the community card ships collapsed and "Meet me" lives inside; the modules badge reads "On in this village"; a soft-404 page's "Go Home" is a button, invisible to an anchors-only dead-end count.
