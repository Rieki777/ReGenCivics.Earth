# Lane L8, persona 3: the founder administering the village on a phone

Round-4 closing QA pass, report only. Written 2026-08-21.

- **Live build at run start:** 2026-07-28-wave1-335058f. **Live at report time:** 2026-07-28-wave1-ace9d9d (another lane deployed while this pass ran; every measurement in this report is against 335058f).
- **Local build under test:** worktree wt-r4-qa3 detached at 335058f, pnpm build, dist/index.js stamped 2026-07-28-wave1-335058f (verified fresh, no stale-teardown dist), served by node dist/index.js against scratch schema village_qa on 127.0.0.1. All 85 migrations applied clean.
- **Writes:** every write happened on the local build. Live received GET/render only (two pages, signed out). The scratch schema was dropped and the server stopped when the pass ended.
- **Engine:** Playwright WebKit 1.62.1, iPhone 14 shape, DPR 3, touch, iOS UA. Viewports mobile first: 390x844, 390x664, 375x812, 360x800; Chromium 1280x800 second. Loads used domcontentloaded plus a ~3.5s settle (networkidle never fires on this app); scroll-behavior forced to auto; every numeric band finite-gated so NaN counts as NOT MEASURABLE, never as a pass.
- **Journey walked (a founder week, all local):** bootstrap claim link, set password, the admin gate, the filtered admin nav at 390px, the module library end to end (browse, detail, example-content offer, Turn on, fill something real, the Go-live card, lifecycle badges), calendar admin (create a gathering with capacity, dish and ride slots, approve a member public-layer request, subscribe an external iCal feed, the weekly-brief card with day picker and preview), the power map setup walk, a vision draft with objectives through to the conditions-met prompt and the apply link, resources (turn on with examples, declare a real rule, watch examples retire, the map lens, Request approval through to the forum decision thread), the introductions demand signal, and minting then revoking an agent token in the profile panel.

---

## Ranked improvement list

No fixes here, only directions. Each entry names the file the coordinator should route to.

### HIGH

**P3-F1 (navigation) **

- Where: /map/circles at 390x844, 390x664, 375x812, 360x800
- Screenshot: shots/29-power-no-walk-button.png (phone), shots/07-j3-walk-button.png (desktop, where it exists)
- Element: VillageMap > aside.hidden.md:block > VillageSummary > button[data-power-walk-launch]
- Repro: Sign in as founder on a phone, open /map/circles, look for any way to start the setup walk. The launch button renders only inside the desktop-only aside.
- Persona line: The walk that seats my village exists, and my phone is the one place I cannot start it.
- Direction: The walk launch needs a home in the phone layout; the walk dialog itself is already a phone card stack. Route to client/src/pages/VillageMap.tsx.

**P3-F2 (routing) **

- Where: /map/circles (Vision) -> /admin at 390x844
- Screenshot: shots/31-vision-met-prompt.png, shots/32-vision-apply-landing.png
- Element: VisionPanel > div[data-power-vision-met] > a[href=/admin] 'Open the draft's publish button'
- Repro: Draft a structure with declared objectives all done, open the map's Vision layer, tap 'Open the draft's publish button' in the conditions-met prompt. It lands on /admin default tab (Form Submissions); no admin tab lists org drafts or shows a publish button.
- Persona line: The map told me my vision was ready and sent me to a door with nothing behind it.
- Direction: The link promises a surface the admin panel does not have. Route to client/src/components/power/VisionLayer.tsx and the coordinator's org-drafts surface decision.

**P3-F3 (overlapping-controls) **

- Where: /admin?tab=events-admin at 390x844 (+21px), 390x664 (+21px), 375x812 (+36px), 360x800 (+51px)
- Screenshot: shots/matrix--admin-tab-events-admin-390x844.png, shots/22-approve-card.png
- Element: EventsAdminPanel gathering row > div.flex.items-center.gap-1.5.shrink-0.flex-wrap (right edge 411px) > button 'Delete'
- Repro: Save one gathering, view the calendar admin tab at any phone width. The whole page scrolls sideways; the row's action strip (Answers Slots Edit Cancel Delete) sets a 411px floor.
- Persona line: Every phone I tried had the calendar page sliding sideways under my thumb.
- Direction: The action strip's shrink-0 defeats its own flex-wrap. Route to client/src/components/EventsAdminPanel.tsx.

### MED

**P3-F4 (design) **

- Where: /admin?tab=intents-admin (go-live card) at 390x844
- Screenshot: shots/14-intents-golive-bounded.png, shots/15-intents-live-members.png
- Element: GoLiveCard > button 'Members only' (enabled) while requires=[messaging] caps maxLifecycle at preview
- Repro: Turn on Introductions while Messages sits in preview. The go-live card greys only Everyone; tapping Members only gets a server refusal: '"Introductions" can only go as wide as what it depends on. Messages (now preview) must reach members first.'
- Persona line: The card offered me a button the village was always going to refuse.
- Direction: The card already holds maxLifecycle and bounds Everyone with it; Members needs the same bounding. Route to client/src/components/modules/GoLiveCard.tsx.

**P3-F5 (design) **

- Where: /admin?tab=events-admin at all
- Screenshot: shots/21-slots-added.png (form said 18:00, row says 4:00 PM)
- Element: EventsAdminPanel > input#ev-startsAt[type=datetime-local]
- Repro: On a device whose clock is not village time (this run: UTC-4), type 18:00 into Starts and save. The row renders 4:00 PM village time. The panel header says 'Times are village time, America/Costa Rica.'
- Persona line: I typed six in the evening, the calendar heard four, and the page had promised me village time.
- Direction: The input takes device-local while the copy promises village time; a founder administering while travelling schedules everything shifted. Route to client/src/components/EventsAdminPanel.tsx.

**P3-F6 (copy) **

- Where: /map/circles (Resources lens) at 390x844
- Screenshot: shots/03-j3-request-filled.png
- Element: ResourcesPanel > section[aria-label='Request approval'] > 'Opening a decision requires the co-creator stage or a role that grants it.'
- Repro: As the founder, hold a seat under a consent rule while the forum is in preview. The request section shows the stage sentence. Take the forum to members and canRequest flips true with nothing else changed.
- Persona line: I run this village and wrote the rule, and the map told me I lacked the stage to ask, when the real gate was the forum still being in preview.
- Direction: canRequest conflates proposal.open with forum lifecycle; one message covers two causes and names the wrong one for admins. Route to server/index.ts (canRequest) and client/src/components/power/ResourcesPanel.tsx.

**P3-F7 (navigation) **

- Where: /admin?tab=* (any deep link) at 390x844
- Screenshot: shots/20-ERROR-calendar-create-gathering.png, shots/15-tools-admin.png
- Element: AdminNav open state restored from localStorage admin.navOpen=1 > floating drawer + backdrop over the panel
- Repro: Open the drawer on a phone, leave the page without choosing an item, later arrive at any /admin?tab= link. The drawer and backdrop cover the panel; every control beneath resolves but takes no tap until the drawer is dismissed.
- Persona line: Every admin link I followed opened under the menu I had left open an hour before.
- Direction: A floating phone drawer that restores itself open swallows deep links; the docked desktop rail is the only layout that benefits from the memory. Route to client/src/pages/Admin.tsx (AdminNav navOpen init).

**P3-F8 (navigation) **

- Where: /admin (collapsed rail) at 390x844
- Screenshot: shots/32-vision-apply-landing.png (full strip), shots/40-intents-admin.png
- Element: AdminNav collapsed > ~35 icon-only buttons; Sparkles x3, two user glyphs x5, Calendar x3, Circle x3, Coins x3, Activity x3, FileText x2, Inbox x2
- Repro: Collapse the rail on a phone and try to find Calendar among three identical calendar glyphs. The hold-to-see-name tooltip teaches one icon at a time.
- Persona line: Three dozen icons, and three of them are the same calendar.
- Direction: Icon-only recognition cannot carry 35 items with duplicate glyphs; the labeled drawer one tap away is what saves it today. Route to client/src/pages/Admin.tsx (navGroups icon choices).

**P3-F9 (copy) **

- Where: /admin?tab=resources-admin at 390x844
- Screenshot: shots/35-resources-admin-top.png, shots/37-resources-rule-declared.png
- Element: ResourcesAdminPanel > example rows titled 'ex-circle-land', 'ex-seat-land-steward' with Edit/Remove and no example chip
- Repro: Turn on How Resources Flow with examples. The seeded rules read as real declared rows whose subject is an internal slug; only the ex- prefix hints they are placeholders. (They do retire correctly on the first real declaration.)
- Persona line: The first rules I saw were named like database rows, and nothing said they were examples.
- Direction: Other example surfaces wear an example chip and human names; these rows show slugs because their circles resolve to nothing. Route to client/src/components/power/ResourcesAdminPanel.tsx.

**P3-F10 (design) **

- Where: /map/circles at 390x844 (12 taps under 44px, 21 text nodes under 14px)
- Screenshot: shots/matrix--map-circles-390x844.png
- Element: Lens chips: Now 48x24, Vision 57x24, How we decide 116x26, Resources 85x26; labels 12px
- Repro: Open the power map on a phone. The page's primary mode controls are 24 to 26px tall with 12px labels.
- Persona line: The most important switches on the map are the smallest things on the screen.
- Direction: The chip row is the page's steering wheel and sits under half the minimum target size. Route to client/src/pages/VillageMap.tsx chip classes.

### LOW

**P3-F11 (polish) **

- Where: /admin?tab=events-admin (external calendars) at 390x844
- Screenshot: shots/06-j3-ical-working.png
- Element: External calendar row: '<host> (ends .ics)'
- Repro: Attach any .ics feed. The stored identity shows the host plus the last four characters of the URL, which are '.ics' for every feed.
- Persona line: Both my feeds would end in the same four letters.
- Direction: Last-four of the path carries no signal for .ics URLs; last-four before the extension would. Route to the calendar subscription storage (server) display fields.

**P3-F12 (design) **

- Where: /admin (all tabs) at 390x844
- Screenshot: shots/matrix--admin-tab-resources-admin-390x844.png
- Element: Admin header > button 'Sign Out' 87x20; rail expander 55x40; resources Edit 25x16, Remove 51x16
- Repro: Measure the admin header controls at any phone width.
- Persona line: Signing out takes aim.
- Direction: Header and row controls sit under 44px. Route to client/src/pages/Admin.tsx header and ResourcesAdminPanel rows.

**P3-F13 (design) **

- Where: /admin?tab=resources-admin, /modules/tools at 390x844
- Screenshot: shots/matrix--admin-tab-resources-admin-390x844.png
- Element: Teal links rgb(21,127,125) on light gray: 'Edit' 4.3:1, 'Module Library' back link 4.3:1 (4.5 needed)
- Repro: Contrast-measure the teal link text on the light panel background.
- Persona line: The teal is lovely and a shade too light.
- Direction: The brand teal misses AA by 0.2 on these grays. Route to the token that colors link text on muted backgrounds.

**P3-F14 (design) **

- Where: /modules, /map/circles at 390x844, 375x812, 360x800
- Screenshot: shots/matrix--modules-390x844.png
- Element: R26 class: /modules 'Call Automation' card (top 742, bar 779); /map/circles 'Education Council (forming)' row (top 768, bar 779)
- Repro: First paint on a phone: the element's top edge shows above the fixed tab bar while its centre sits under the bar and takes no tap.
- Persona line: The card peeked out from under the bar and would not take my tap.
- Direction: Two R26 first-kind instances at first paint. Route to the coordinator's MobileTabBar overlap accounting.

**P3-F15 (polish) **

- Where: /set-password -> /admin at 390x844
- Screenshot: shots/02-set-password-done.png
- Element: PageLoading spinner (route Suspense fallback), wordless, full screen
- Repro: Set the founder password from the claim link. The next seconds are a bare spinner on gray before the admin appears.
- Persona line: My first act as founder was watching an unlabeled circle spin.
- Direction: The first-run moment deserves a word. Route to client/src/App.tsx PageLoading or the SetPassword redirect.

**P3-F16 (design) **

- Where: /admin?tab=tools-admin at 390x844
- Screenshot: shots/09-tools-golive-card.png
- Element: AdminGoLive 20s readiness poll
- Repro: Add the first real tool. The 'Go live?' card appears up to 20 seconds later (measured 15s) with no hint it is coming.
- Persona line: I finished the setup and the next step arrived while I was reading something else.
- Direction: The save that flips readiness could tell the card directly instead of waiting for the poll. Route to client/src/components/modules/GoLiveCard.tsx.

**P3-F17 (copy) **

- Where: POST /api/admin/bootstrap at n/a
- Screenshot: n/a (API response)
- Element: bootstrap handler emailed=true while sendResendEmail skips silently without a key
- Repro: Bootstrap a deployment with no resend_api_key. The response says emailed:true; no email exists. The claimUrl in the response is what saves the operator.
- Persona line: The machine said it sent me an email that never existed.
- Direction: The skip inside sendResendEmail is invisible to callers; emailed should mean sent. Route to server/index.ts (sendResendEmail contract and bootstrap handler).

**P3-F18 (navigation) **

- Where: /profile at 390x844
- Screenshot: shots/43-agent-token-minted.png
- Element: Profile page ~8,700 CSS px tall; YourAgentPanel about six screens deep; no in-page anchors beyond #wallet
- Repro: Open your own profile on a phone and find the agent panel.
- Persona line: I knew the agent key lived in my profile and still scrolled past six other things to reach it.
- Direction: The page has grown past what one scroll can index. Route to client/src/pages/Profile.tsx.

**P3-F19 (routing) **

- Where: /map/circles at 390x844
- Screenshot: n/a (URL probe)
- Element: CircleAccordion onSelect never calls focusTo; ?focus= is written only by the SVG map (min-width 480px)
- Repro: Tap circles in the phone accordion and watch the URL never change; a focused view cannot be linked or shared from a phone.
- Persona line: I could not send anyone a link to the circle we were talking about.
- Direction: Spec 1 says a view is a link; the phone path never writes the focus. Route to client/src/pages/VillageMap.tsx.

**P3-F20 (overlapping-controls) **

- Where: /map/circles at 390x844
- Screenshot: shots/31-vision-met-prompt.png (FAB over the General Coordinating Circle row)
- Element: Compass FAB floating above MobileTabBar overlaps accordion row chevrons at some scroll offsets
- Repro: Scroll the accordion until a row's chevron sits under the compass button.
- Persona line: The compass parked on top of the arrow I wanted.
- Direction: The FAB needs a reserved lane or scroll-aware offset. Route to client/src/pages/VillageMap.tsx FAB placement.

### Environment note

**P3-F21** Observed four consecutive hangs in one WebKit session (journey run 1, shots 08 to 12); not reproducible in three fresh sessions (renders in ~2s). React.lazy has no retry, so one stalled chunk strands the route on a wordless spinner until reload. Persona line: The library page spun forever until I force reloaded, and the next day it was fine. Recorded as an unreproduced environment flake, kept out of the harm counts; the no-retry lazy import is the structural note. Route to client/src/App.tsx lazyPage.

Ranked totals: **HIGH 3 / MED 7 / LOW 10** (plus one environment NOTE).

---

## Harm-metric verdict table

Primary viewport 390x844, WebKit iPhone 14 DPR3, signed in as the founder, across the nine founder routes (/admin?tab=modules, /admin?tab=events-admin, /admin?tab=intents-admin, /admin?tab=resources-admin, /admin?tab=org-chart, /modules, /modules/tools, /map/circles, /profile). Full per-route and per-viewport data: matrix.json.

| Metric | Verdict | Count | Worst example | NOT MEASURABLE |
|---|---|---|---|---|
| R26 partially visible and dead at first paint | FAIL | 2 | /modules 'Call Automation' card, top edge above the tab bar at 742px, centre dead under the bar at 779px (also at 375x812 and 360x800); /map/circles 'Education Council (forming)' row at 390x844 | 4 (the four desktop rows: the bar detector keys on fixed bottom elements and desktop has none, so its desktop hits are the skip-link artifact, discarded) |
| tap targets under 44px (strict elementFromPoint ownership) | FAIL | 41 | /map/circles lens chips: 'Now' 48x24, 'Vision' 57x24, 'How we decide' 116x26, 'Resources' 85x26; /admin 'Sign Out' 87x20; resources 'Edit' 25x16 | 0 |
| horizontal overflow (scrollWidth > clientWidth, containment-aware) | FAIL | 1 | /admin?tab=events-admin at every phone width: +21px at 390, +36 at 375, +51 at 360; culprit div.flex.shrink-0.flex-wrap 'AnswersSlotsEditCancelDelete' with right edge 411px | 0 |
| text under 14px (visible text nodes) | FAIL | 85 | /map/circles: 21 nodes, the 12px lens chip labels; admin form labels at 12px; 'Always on' badge at 10px on /modules | 0 |
| contrast (computed colors; AA 4.5 body / 3.0 large) | FAIL | 2 | teal rgb(21,127,125) link text on light gray at 4.3:1 where 4.5 is owed: resources 'Edit' rows, /modules/tools 'Module Library' back link | 131 (backgrounds behind gradients, images, or unflattened alpha, plus the icon-help toast whose dark background the walker could not resolve (its 1.12:1 reading is a probe artifact, the rendered toast is high-contrast)) |
| dead ends (no route onward except browser back) | PASS | 0 | none: module-off tabs name the remedy ('Turn it on in the Module Library'), every journey surface had an onward route | 0 |
| broken back (?tab= and ?focus= included) | PASS | 0 | ?tab= back walk correct at all five profiles (events-admin -> modules -> back lands on events-admin) | 1 (?focus= could not be exercised: the phone accordion never writes it (finding P3-F19) and a synthetic desktop SVG click did not reach the focus handler) |
| 404s (network and soft) | PASS | 0 | none across 45 route-viewport cells; the module-off API 404s during setup are the existence-hiding gate answering as designed, not navigation dead links | 0 |
| console errors | PASS | 0 | none across 45 route-viewport cells | 0 |
| form fields that lose input | PASS | 0 | none observed: the gathering form clears only after a confirmed save; the admin gate keeps the email after a failed password | 0 |
| saves without feedback | PASS | 0 | every observed save answered: toasts ('Slot added', 'Weekly brief settings saved', module-on), inline confirmations ('The rule is written.', 'The decision is open. Read the proposal'), refusal toasts with reasons. Note: the rule confirmation renders at the top of the panel, far from the button that earned it | 0 |

Detector validation: **13/13 (known-bad fixture flagged and negative control clean per detector; NaN fails the finite gate loudly)**.

Back through tabs: correct at all five profiles. Live comparison: no drift: identical metrics local vs live (overflow 0/0, taps<44 0/0, text<14 10/10 on /modules, contrast 0/0), same build 2026-07-28-wave1-335058f both ends.


---

## What already feels world-class

- **The honest admin nav.** Tabs exist only while their modules are on; off-tabs reached by URL say "Turn it on in the Module Library" instead of erroring; lifecycle badges (PREVIEW, members) ride the drawer rows. The 36 platform items are all labeled and reachable in the drawer at 390px.
- **The Go-live card's judgment.** Preselected audience follows the data class, standing examples are named before they can leak ("Examples are showing here. Replace or remove them before going live, or they go live too."), and the dependency bound renders in plain words: "Everyone is out of reach for now: How Power Is Held opens narrower than that. Widen it first."
- **The example-content lifecycle.** Resources seeded four worked rules, sources, and a budget; the moment the first real rule landed, every example retired itself. Nothing to clean up, nothing to forget.
- **Refusal copy that teaches.** "Introductions can only go as wide as what it depends on. Messages (now preview) must reach members first." A refusal that hands you the next step.
- **The public-calendar approval queue.** "Members asked for these on the public calendar. Publishing puts them in front of visitors and search engines; they stay drafts until you say yes."
- **The external-calendar trust posture.** "The address is kept in the secrets store and shown to nobody, this page included: only its host and last four characters appear here." A password-type input, honest failure states ("Last fetch failed: upstream answered 404"), and a working feed importing 7 items on attach.
- **The weekly brief.** One card, a day and hour in village time, and "Preview for me" renders the real digest inline (calendar, sky and season, open seats, new quests) while promising it "sends nothing."
- **The setup walk itself** (on desktop, where it can be reached): "1 of 37", every open seat in order with three honest moves, a member tray with faces, ten decides-by chips each with a one-line gloss ("A decision passes when nobody has a reasoned objection."), and the step count recomputing as declarations land.
- **The vision layer's restraint.** Objectives tick with "a human ticks this", progress reads "2 of 2", and the met prompt asks rather than acts. Nothing applies itself.
- **The resources reading.** "You can spend up to CRC 200.00 from the Land & Water budget without asking, as the Land & Water circle." Declarations in sentences, and the request path ends in a real forum decision thread: "The decision is open. Read the proposal."
- **Back works.** The ?tab= history walks correctly at all five viewports.
- **Empty states with a point of view.** "Nothing open. A quiet queue is the good outcome."

---

## Flow breaks

Each journey step where a founder would be stuck, confused, or reaching for documentation.

| # | Journey step | What happened | Screenshot |
|---|---|---|---|
| 1 | Power map: start the setup walk on the phone | Stuck. The launch button does not exist in the phone layout; the page offers the examples tour instead, which reads like it might be the setup. A founder without a laptop cannot seat their village. (P3-F1) | shots/29-power-no-walk-button.png |
| 2 | Vision: apply the met structure as a human | Stuck. The prompt's link lands on Form Submissions; no drafts panel, no publish button, no words about where to go. The founder needs documentation or curl from here. (P3-F2) | shots/32-vision-apply-landing.png |
| 3 | Calendar admin: work the panel after using the menu | Confused, then blocked. Arriving by deep link with the drawer remembered open, every tap under the backdrop dies silently; in this pass a whole create-gathering sequence was swallowed. Dismissing the drawer is the undocumented step. (P3-F7) | shots/20-ERROR-calendar-create-gathering.png |
| 4 | Introductions: choose who sees it | Confused. The card offers Members only, the server refuses it, and the founder learns the dependency order by being turned away. The refusal copy rescues it; the button should not have been offered. (P3-F4) | shots/15-intents-live-members.png |
| 5 | Resources: request approval as the founder | Confused. The gate blames a missing stage while the true blocker is the forum sitting in preview; nothing names the remedy. Solved here only by reading the server code. (P3-F6) | shots/03-j3-request-filled.png |
| 6 | Calendar admin: schedule at a promised village time | Confused, silently. The founder types 18:00 under a header promising village time and the potluck lands at 16:00. Nobody on site notices until guests arrive two hours late. (P3-F5) | shots/21-slots-added.png |
| 7 | Module library, run 1 only | Stuck for a session: /modules and every detail page sat on a wordless spinner; a reload was the undocumented remedy. Unreproduced afterwards; kept out of the counts. (P3-F21) | shots/08-modules-browse.png |

Steps that flowed clean end to end: claim link and set password (auto-signed-in), the admin gate, the drawer nav with labels, module browse and detail, Turn on with the example-content offer, filling a real tool, Members-only go-live, gathering create with capacity, dish and ride slots, the member request approval queue, iCal attach with honest failure and a working feed, the weekly brief picker and preview, rule declaration with example retirement, the lens reading, the request-to-forum decision thread (once forum served members), the demand signal's empty state, agent token mint and revoke, and back through tabs everywhere.

---

## Live comparison (GET/render only)

Two pages at 390x844 WebKit, signed out, live https://amora.regencivics.earth against the local 335058f build: the admin sign-in page and /modules anonymous. No drift: identical metrics both ends (overflow 0/0, taps under 44 0/0, text under 14: 10/10 on /modules, contrast fails 0/0), and the gate renders the same card both ends. Screenshots: shots/live-compare-live-admin.png, shots/live-compare-local-admin.png, shots/live-compare-live-modules.png, shots/live-compare-local-modules.png. Live moved from 335058f to ace9d9d late in the pass; the comparison pages were captured minutes before the move and match the 335058f local rendering exactly.

## Could not measure

Seven items, listed with reasons in unmeasured.json: contrast on 131 nodes (unflattenable backgrounds, includes the toast artifact), desktop R26 cells (the detector is mobile-specific), ?focus= back walking (unreachable on a phone by design gap P3-F19), iOS safe-area and URL bar and keyboard (environment), the run-1 spinner hang (unreproduced), the demand list with live intents (the test member is a guest; the stage gate held), and the ride-slot kind (probe error, no claim either way).

## Closing summary (brief format)

```
Lane L8 persona 3: the founder administering on a phone.
Live build start / end: 2026-07-28-wave1-335058f / 2026-07-28-wave1-ace9d9d (moved late in the pass; all findings measured on 335058f local + live-compare).
Tip SHA: 335058f. Engine: Playwright WebKit 1.62.1, iPhone 14 DPR3 touch.
Harm table: 11 rows, 5 FAIL (R26 2, taps<44 41, overflow 1 route, text<14 85, contrast 2) / 6 PASS, every row with a NOT MEASURABLE count.
Ranked list: HIGH 3 / MED 7 / LOW 10. Top three: setup walk unreachable on a phone (/map/circles, all mobile); vision apply link dead-ends (/map/circles -> /admin, 390x844); calendar admin horizontal overflow (+21 to +51px, every mobile width).
Detector validation: 13/13. Could NOT measure: 7, listed.
Writes to live: none. Local write pass: yes, scratch schema village_qa dropped, server stopped.
Paths: docs/integration-program/round4/qa/persona-3/ (REPORT.md, findings.json, verdicts.json, unmeasured.json, shots/).
Status: VERIFIED (report-only lane; no code shipped, so no CI gates apply; probe scripts live uncommitted in wt-r4-qa3/scripts/qa/persona-3/ for the coordinator).
```