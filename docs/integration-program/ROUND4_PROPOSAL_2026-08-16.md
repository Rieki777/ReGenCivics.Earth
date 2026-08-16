# Round 4 proposal: Amora: library flow, power and flow map, capitals overlay, agent lessons, village calendar

Coordinator working paper, 2026-08-16. Status: **PROPOSED, nothing dispatched.** Rye's five asks
arrived by Telegram (06:36, 06:40, 06:42, 15:58, 16:01 the day before). This paper improves each ask
against what the code actually does today, then lists the questions only Rye can answer, each with a
default so nothing blocks. Rulings go in the ledger §8 as R27+ in his words.

Every code claim below was measured by two read-only scouts at game-amora `origin/main` = `135db66`
(live `/health` build `2026-07-28-wave1-135db66`, probed 12:13Z). Refs are `file:line` at that SHA.

---

## §0 State and one hazard

- game-amora `origin/main` = `135db66`, live matches. Hub `origin/main` = `cbec306`, live. Nothing from
  rounds 1–3 is in flight.
- **Concurrent session, active now.** Seven worktrees were cut at `25f08eb` between 07:51 and 08:08
  today, all dirty, none pushed: `wt-doors` (26 files), `wt-housing` (13, incl. `drizzle/0077_housing_availability.sql`
  and React/server edits), `wt-map-inspector` (11), `wt-map-org` (3), `wt-map-overlays` (3),
  `wt-map-geometry` (2), `wt-maia` (0). Their patch headers quote Rye's own numbered rulings ("RYE, R6",
  "R4") on the grounds map's org lens (halos only at circle homes, satellite role circles, open/partial/full
  seat states) and the overlays band (H8). They edit `docs/prototypes/grounds-v0.html`, and **that file is
  the live `/map`**: `LivingMap.tsx` is a shell that iframes `/grounds/index.html`, which `server/index.ts:18524`
  serves straight from `docs/prototypes/grounds-v0.html`.
- Consequence: anything in asks 2 and 3 that draws on the grounds map lands in a file another session owns
  this week. This proposal splits every map ask into a **data + admin + React side** (disjoint, mine to
  dispatch) and a **grounds-side patch** (a brief handed to that session, or queued until it lands). See §6.
- Migration numbers: game-amora main ends at `0082`; `0077` is a gap on main and `wt-housing` is filling it;
  `0080` is reserved (Saberra). Any lane here allocates from `0083+` after the four-way scan.

---

## §1 Ask 1: the module library flow

### Rye's ask (verbatim, bracketed)
["the flow should be that they go in for the library and every module should also have an image in the
library to make the library very beautiful and add all of our modules that we currently have sitting in
the admin section lets move them to the library and then when a founder clicks on the module in the
library they can explore its benefits and what it does and then click a button to 'turn on' that module -
that's when it then shows up in their admin section and then when they're in their admin section and they
actually fill out and save their module that's when it shows up in their menu for public to be able to
see and access any questions or improvements to this plan"]

### As built (measured)
- The registry is a compile-time array of **18 modules**, all `tier: "included"`, in `shared/modules.ts:334`;
  4 core (quests, gratitude, progression, profiles) and 14 optional. Per-village state is one row in
  `module_settings` with **one enum**: `lifecycle ∈ off | preview | members | public`
  (`drizzle/0015_module_framework.sql:12`, rank at `shared/modules.ts:16`). There is no separate
  "enabled" flag and no separate "published" flag; `members` and `public` are the publish axis, `preview`
  is admin-only and answers a byte-identical 404 to `off` so outsiders cannot learn what a village is
  trying (`server/lib/modules.ts:298-303`).
- **The catalog today is the Admin tab "Modules On/Off"** (`Admin.tsx:278`, `ModulesTab` at `:3304`) with
  four lifecycle buttons per module (`:3796-3819`) and an inline "Details" toggle (`:3767`, body `:3832-3921`)
  showing tier, data class, pool status, price, vendor, support, liveness, recommends, capabilities.
  **No member-facing catalog exists**; `/api/modules` already ships `tier`, `dataClass`, `provides`,
  `support`, `pool` to members and nothing in `client/` renders them.
- **No image field of any kind** in `ModuleDef` (searched image/icon/cover/thumbnail/artwork/photo). One
  `description` string per module; no benefits copy. Nine of eighteen modules have a design doc under
  `docs/modules/`.
- **Admin nav ignores module state.** `navGroups()` at `Admin.tsx:235-322` is a literal list; the only
  condition is `setupComplete`. Every Game tab renders and each tab apologises inside itself when its
  module is off (`:4861`, `:6384`). The public nav does the opposite and does it right: `Layout.tsx:46-47`
  hides a link unless the module is on for the viewer, using the `/api/modules` manifest
  (`server/index.ts:5725-5732`: core always; public → everyone; members → signed in; preview → admin).
- **The word "Library" is taken.** `/library`, `Library.tsx`, `server/lib/library.ts`, `/api/library` are the
  **Material Library** (physical tools on library credits). The name collision is total.
- Images upload to local disk (`DATA_DIR/uploads`, served at `/api/uploads/:file`); there is no R2/S3 in
  this repo. Static images under `client/public` are gated by CI: WebP/AVIF only, 400 KB per file, and a
  **ratchet whose total may only fall** (`scripts/image-budget-baseline.json` = 1,813,710 bytes / 38 files;
  `--update-baseline` refuses to raise). Adding eighteen catalog images is a deliberate baseline raise in
  one commit, or the images live off-bundle.
- Adoption is measured nowhere: no usage table, no telemetry; the $ReGen pool's "most used" counts on the
  hub roster × each village's published module ids (R20), and that is fine for v1.

### What I would improve

1. **Map the flow onto the lifecycle enum instead of adding flags.** Rye's four moments already exist as
   states: Library "Turn on" = `off → preview` (visible to admins only, invisible to everyone else by
   construction); "fill out and save" then "go live" = `preview → members` or `→ public`. Nothing new in
   the state machine, no migration for state, and every gate, 404 and orphan check keeps working.
2. **Make the Admin nav honest.** Show a module's admin tab only when its lifecycle is not `off`; core and
   platform tabs (Players, Season, Ledger, Tokens, Game Mechanics, Settings, Forms…) always. This is the
   "move them to the library" ask made concrete: a fresh village's Admin shows the platform tabs plus one
   entry, "Module Library", and grows a tab per module the founder turns on. It also fixes the current
   twenty-tab wall. Each Game tab maps to a module id (Gatherings→events, Tools→tools, Stays &
   Payments→stays+commerce, Exchange→exchange, Badges→badges, Library→library, Village Health→health,
   Circles & Map / Org Chart / Season Shapes→map, Calls→automation, Quests→quests(core), Departures→core).
   Two tabs today are not modules at all (Training Modules is course content; Investor Vault is documents)
   and stay as they are.
3. **"Fill out and save" becomes an explicit "Go live" moment, not a silent flip.** Auto-publishing on the
   first save is wrong for `member-pii` and funds-bearing modules (stays, exchange, commerce carry legal
   cards; messaging exposes people). Proposal: the first successful save inside a module's admin tab
   opens a small "Go live?" card with two buttons, **Members only** and **Everyone**, plus **Not yet**. The
   preselected default follows the module's `dataClass`: `member-pii` → Members, `village-content` →
   Everyone. Modules that have nothing to fill (messaging, forum with default categories, feed, network)
   show the same card on the library detail page right after "Turn on", so a founder is never stuck in
   preview wondering why nothing shows. Modules with a legal card keep it exactly where it is (at
   enable), unchanged.
4. **Readiness, declared per module.** Each `ModuleDef` gains `setup: "none" | "optional" | "required"` and
   the server exposes a `ready` boolean per module in `/api/admin/modules` (e.g. events: none; stays:
   required = at least one room and a price; tools: optional). The Go-live card reads it: "Turn on 1 room
   first" beats a menu link to an empty page. This is small, deterministic, and it is what makes "when they
   actually fill out and save" true rather than hoped.
5. **A real Module Library page, member-visible, at `/modules`.** Cards: image, name, one-line promise,
   tier pill (included is silent, as today), pool badge, "on in this village" state. Click → a detail page:
   hero image, "what it does" (3–5 bullets), "who it is for", "what you will set up" (from `setup` +
   `vendor.setupSteps`), "what data it holds" (dataClass in plain words), "works well with" (recommends),
   support route, price if any, and the one button: **Turn on** (admins) / **Ask your founders** (members;
   posts a suggestion into the existing submissions inbox, no new moderation surface). Founders and admins
   see it in Admin as the "Module Library" entry replacing "Modules On/Off"; the same page. Members browse
   read-only, which is also how a fork learns what the platform can be.
6. **Copy lives beside the registry, in `shared/`.** A `shared/moduleCatalog.ts` keyed by module id with
   `promise`, `benefits[]`, `forWhom`, `setupSummary`. It sits in `shared/` on purpose: `check-voice` parses
   `shared/` string literals, so catalog copy is held to the house voice by the gate, and the brand ratchet
   sees it. Eighteen entries; nine can be lifted from `docs/modules/*.md`, nine written fresh.
7. **Images: one illustrated set, a designed fallback, and a village override.** `client/public/images/modules/<id>.webp`,
   target ≤ 40 KB each at 640×400 (18 × 40 KB ≈ 720 KB), baseline raised once in the same commit with the
   reason in the commit body. Every card also has a designed fallback (module hue gradient + emblem) so a
   fork with no image, or a village that deleted one, still looks finished. Village override: `imageUrl` in
   `module_settings.config`, uploaded through the existing client-side WebP path (R19 N6). No new storage.
8. **Do not rename the Material Library.** Route the module catalog at `/modules` labelled "Module Library";
   nav copy for the physical one can become "Tool Library" later if it confuses. Cheaper than moving an
   API prefix and a module id.
9. **Out of scope, noted:** the mobile bottom bar is a static five-slot list with no module gate
   (`client/src/config/mobileNav.ts:49-55`); a separate small fix. Adoption telemetry for the pool stays
   as ruled (roster × published ids).

### Questions for Rye (defaults in brackets)
- Q1 Route and name for the catalog: `/modules`, "Module Library" [default: yes; Material Library keeps `/library`].
- Q2 The Go-live default per module: Members for `member-pii`, Everyone for `village-content`, always shown as
  a card, never silent [default: yes].
- Q3 Who browses the library: admins turn on; members browse read-only with "Ask your founders"; the public
  sees nothing at `/modules` in v1 [default: yes; a public marketing catalog can live on the hub later].
- Q4 Images: a lane generates all eighteen in one consistent illustrated style (the quest-poster style
  already on live is the obvious match) with `nano-banana-pro`, WebP ≤ 40 KB, plus the fallback and the
  village override [default: yes]. If you would rather art-direct or paint them yourself, say so and the
  lane ships the fallback first.
- Q5 The three funds-bearing modules keep their legal caution card at Turn on, unchanged [default: yes].

---

## §2 Ask 2: "How power is held" and "How resources flow"

### Rye's ask (verbatim, bracketed)
["1. How power is held — what governance structure (from pyramid to circle and everything in between) and
decisions are made (from role based powers to consensus to consent to feudalism and everything else) but
having this module be an interactive map that founders can go through and place the different members and
their characters across the map to show the organization chart. 2. How resources flow — This one is just as
complimentary to the power as it's how money, resources and more are governed. This one is baked into the
how power is held but is a secondary lens on the image to tell the story very simply on how money and
resources are governed and move through a project (helping members answer these questions: who needs to give
permission for spending, who's paying, what can I spend with permission and without, where does all the
money come from etc). Let's talk this module idea out. Is it two modules or 1 and how can we create this into
a beautiful interactive map?"]

### As built (measured)
- **The org chart exists and is a module already.** Module id `map`, catalog name "Village Map",
  description "The living org chart: circles, the roles that orbit them, who holds each seat, which seats
  are open calls, plus a concierge" (`shared/modules.ts:399`). It renders at `/map/circles`
  (`VillageMap.tsx`, 888 lines): nested circles in the sociocracy style, seats on each circle's inner ring,
  layout a pure deterministic function (`shared/mapLayout.ts:44`), below 768 px an accordion with the same
  data. The nav labels it "Circles & Seats".
- Data model is deep and sociocratic: `org_roles` (aim, domain, accountabilities, seats, criticality,
  recruiting, archetypes, icon, colour, order, recruitment pack), `org_role_assignments` (dated holders,
  terms, `holderKind member|documented`, focus, season) (`0049_org_roles.sql`, `server/lib/orgChart.ts:36-98`);
  seat state is **derived** (open | filled | partial | forming | expired). `org_relations` link seats and
  circles with village-named relation types (label, inverse, symmetric, cover) and **never people**
  (`orgRelations.ts:9-16`), so the public export cannot leak. `org_drafts` lets a reorganisation be read
  before it is true and reverted from a snapshot taken at apply (`orgDrafts.ts:1-35`). Members can be
  seated today (`POST /api/org/seatings/:id/claim`, `SeatClaimCard.tsx`); placement is a row, not a drag.
- **Characters exist with art**: five archetypes (building, researching, facilitating, catalyzing,
  storytelling), 30 fixed avatars = 5 × presentation × tone at `/images/avatars/*.webp`
  (`characters.ts:31-70`). Roles carry `archetypes` tags; a class never touches a permission
  (`0069_characters.sql:60-66`).
- **Governance vocabulary present**: sociocracy, consent over consensus, circles not hierarchy, aim /
  domain / accountabilities, cover/deputy, leader/delegate/facilitator (`docs/PEERDOM_LESSONS.md`).
  **"pyramid" absent.** `Governance.tsx` is static prose with hardcoded principles and no data.
- **Money side, what exists**: one double-entry ledger with `sys:treasury`, `sys:mint`, `sys:gratitude-pool`,
  `sys:cycle-pool` (`ledger.ts:62-67`); mint rules (trigger → token → amount → ceiling → recipient) whose
  every change waits for the next lunar cycle (`0075_mint_rule_pending.sql`); spending permission is
  **capability keys, not budgets** (`exchange.buy`, `stay.member_rate`, …); caps per cycle and fiat ceilings
  per order / 30 d / 365 d; dual sign-off in the library above a threshold. **Absent:** per-circle budgets,
  spending authority chains, who-approves-what, any treasury outflow, multisig. "Money flows in only" is
  enforced by absence. The "power map" is designed, not built (`docs/COORDINATION_SUBSTRATE.md:207-221`:
  `/api/authority/who-decides` does not exist).
- **On the grounds map** the concurrent session is building the org lens on the land: halos at the ten
  curated circle homes, satellite role circles, open/partial/full states, reading `CIRCLE_HOMES` and the
  same org data.

### One module or two? Two cards, one substrate.
Rye's own sentence says it: resources are "baked into" power and are "a secondary lens on the image".
Same nodes (circles, seats, people), same canvas, second lens. So it is **one substrate** (the existing
`map` module's org graph plus one new table) and **two library cards**, because a card is a thing a founder
turns on and reads benefits for, and the flow lens carries its own setup (declaring spending rules) that
many villages will not do on day one:

- Card A **"How Power Is Held"** = the existing `map` module, renamed in the catalog and given the shape
  and decision-method vocabulary below. Turning it on is what turns on `/map/circles` today.
- Card B **"How Resources Flow"** = new module id `flows`, `requires: ["map"]` (exactly how `feed` requires
  `forum`), `dataClass: village-content` (rules, never balances of named people). Off by default.

Splitting also lets A ship first and B ship when its data model is agreed.

### Card A: How Power Is Held: the design
1. **Shape and method are data, per circle, with a village default.** Two new columns on `circles`:
   `shape` (how authority is arranged) and `decides_by` (how a decision is made), plus the same pair as
   village-level defaults in the map module's config. Vocabulary v1, all plain words, each with a
   one-line gloss the map shows in its legend:
   - shape: `circle` (peers, a lead who facilitates), `pyramid` (a head, layers report up), `council`
     (elders/stewards hold it together), `flat` (no head, everyone), `steward` (one person holds it as a
     trust: land-holder, founder), `network` (autonomous nodes, agreements between them).
   - decides by: `consent` (no reasoned objection), `consensus` (everyone agrees), `majority` (vote),
     `lead decides` (role-based authority), `elders decide`, `founder decides`, `do-ocracy` (whoever does
     the work decides), `delegated` (you hand your voice to someone).
   Rye's "feudalism" is `steward` shape + `founder decides` / `lead decides`, and saying it that way keeps
   the legend kind. Every circle can differ (the kitchen may run do-ocracy under a consent council); the
   village default fills blanks.
2. **The picture morphs with the shape.** `layoutNestedMap` is a pure function of the data, so a second
   pure layout per shape is honest engineering: `circle` = nested rings (today), `pyramid` = a top-down
   tree with the head seat on top, `council` = an inner ring of the council seats with the rest around,
   `flat` = one ring of equals, `steward` = the steward at the centre with the trust drawn as a single
   enclosing line, `network` = separate nodes with relation lines. Framer-motion (already in the repo)
   animates seats between layouts, which is the "beautiful interactive" moment: a founder drags the shape
   slider from pyramid to circle and watches the same people re-arrange. Mobile stays the accordion, with
   the shape and method shown as two chips per circle.
3. **Members and their characters on the map.** Every filled seat shows the holder's primary character
   avatar (the 30 that exist) instead of an initial; a member with no character shows the archetype
   emblem of the seat. Founders seat people by **dragging a member from a tray onto a seat** on desktop
   and by a picker on mobile; both call the existing seating endpoints, so it stays a dated row with a
   term. Open seats stay the greyed open call they are today. Nothing new touches the capability plane.
4. **Authority lines are the existing `org_relations`,** shown when the shape asks for them (pyramid:
   "reports to"; network: "agrees with"; council: "advises"). The relation types are already
   village-named. No people-to-people edges, ever.
5. **Legend as a spectrum**, not a table: a small strip from "one holds it" to "all hold it" with the
   village's circles placed on it. That is the pyramid-to-circle line drawn once for the whole village.
6. **Publish surface**: shape and method go into `/org/circles/:id.md` and `org.json` (already signed,
   already nameless). A village telling the network how it decides is village-content and safe.

### Card B: How Resources Flow: the design (a map of rules, not a wallet)
Say it plainly in the module copy: **v1 describes how money and resources are governed; it moves nothing.**
The platform has no outflow rail, and building one is a different, legal-review-shaped project.
1. **Four questions, four data shapes.**
   - *Who must give permission to spend?* → `spending_rules` rows: `{scope: circle|role, scopeId, upTo:
     amount, currency|token, approval: none|circle-consent|lead|founders|treasury, note}`. Two rows per
     scope answer both "what can I spend without asking" (approval none, up to X) and "with permission"
     (up to Y, by whom).
   - *Who is paying?* → the same rows carry `paidFrom: treasury|circle-budget|member|grant|sponsor`.
   - *Where does the money come from?* → `funding_sources`: `{name, kind: donations|memberships|stays|
     grants|sales|land|other, share%|amount/yr, note}`, founder-declared, and beside it the **measured**
     inflows the ledger and Stripe already know (product sales, stays, exchange) so the picture is not
     only a story.
   - *How does it move through the project?* → an optional `circle_budgets` row per circle per season
     (amount, token/currency), and the ledger's real system-account flows (gratitude pool → members,
     treasury → mint) drawn as they occur.
2. **The picture is the same map with a second lens toggle.** Sources sit on an outer ring; arrows into
   the treasury; arcs from the treasury to circles sized by budget; each seat shows a small "can spend
   up to X alone" tag; approval chains draw as short arrows from a seat to its approver. Tap a seat as a
   member and the panel answers the four questions for *you*: "You can spend up to $50 from the Kitchen
   budget without asking; up to $500 with Kitchen consent; the Kitchen is paid from stays and memberships."
3. **Reads the ledger, never writes it.** Where a token flow already exists (gratitude cycles, mint
   rules) it is drawn from data; where it does not, the founder's declared rule is drawn with a dotted
   line and the word "declared". Honest by construction.
4. **This is the same story ask 3 tells on the land.** The grounds map's flows overlay is "how resources
   move" drawn on buildings. §3 proposes one shared vocabulary so a founder declares a flow once.

### Questions for Rye (defaults in brackets)
- Q6 Two cards, one substrate: rename `map` to "How Power Is Held" in the catalog, add `flows` requiring
  it [default: yes].
- Q7 Where it lives: the org map's home stays `/map/circles` (renamed in nav to "How Power Is Held"), and
  the grounds map's org lens (your other session) reads the same data as "where they sit on the land".
  One editor, two views [default: yes]. If you would rather the *grounds* map be the editor where founders
  drag people onto buildings, say so; that changes who owns the work (see §6).
- Q8 The shape and decides-by vocabularies above, per circle with a village default [default: accept the
  lists; add or strike words in your reply].
- Q9 Resource flow v1 is declared rules + measured inflows, no money moves [default: yes].
- Q10 Character avatars on seats and drag-to-seat on desktop / picker on mobile [default: yes].

---

## §3 Ask 3: the eight forms of capital on the flows overlay

### Rye's ask (verbatim, bracketed)
["The 8 forms of capital added to the flows overlay on the /map page. In addition to the current icons, we
have that flow between sprites when we click the flows overlay. We want to show the eight forms of capital
plus the one additional one of health and health would be like a gym or fitness place or sauna would be
health and if a flow doesn't flow from one project to another then it just radiates out so health isn't
giving like health necessarily from one Sprite to another, but it's providing that to the community so just
create a radiation around that building with that icon and if it has more than health, then it's radiating
out all the different icons that it's providing that village and then they just absorb into the landscape
just shortly after they radiate from the building so not to overload the map any ideas or way to improve
this concept before going forward with it"]

### As built (measured)
- The `/map` overlays band is four buttons, `Now | Vision | Org | Flows` (`grounds-v0.html:814`,
  handlers `:3478-3486`). Now/Vision are modes; Org and Flows are lenses.
- **Flows today**: canvas 2D, a founder-declared static list `SCENE.flows` (25 edges seeded in the
  artifact, `:1198-1222`, or a published scene's `map_flows` block). Each edge is a quadratic bezier (or a
  polyline `via` a drawn feature) with **three travelling glyph marks** per flow, phase-offset, alpha
  pulsing (`:1970-2003`). Glyphs are 12×12 px vector paths per **medium** (`GLYPH_PATH`, `:1454-1466`).
  The medium vocabulary is **nine kinds**: water, energy, money, materials-raw, materials-finished,
  food-raw, food-prepared, compost, care (`MEDIA_SEED`, `:1415-1425`), editable per village. Imports from
  outside draw as a dashed fall-in. **No live data feeds it**: not the ledger, gratitude, exchange or
  events; `map_flows` has no table (`scripts/import-map-scene.ts:104`).
- **The eight forms of capital exist only in an unbuilt spec** (`docs/modules/crowdpool-dashboard.md:47`:
  `financial, material, living, intellectual, experiential, social, cultural, spiritual`). Nothing in code.
- Performance: one rAF loop, dt clamped, **no particle caps** (smoke and sparkles spawn per frame and die
  by lifetime), DPR capped at 2, **the canvas never checks `prefers-reduced-motion`** (the one media
  query at `:652` stills CSS only), **no pause on tab hide**. Structures carry `circle` but no owner
  project. Artifact ratchet: raw ≤ 7,000,000 / wire ≤ 5,000,000 bytes (now 5.21 MiB / 3.74 MiB gz).
- Icons: inline SVG paths cost no image budget; anything under `client/public` is WebP-only, ratcheted.

### What I would improve
1. **Name the near-collision and resolve it: media are the physical flows, capitals are the value lens.**
   The map already has nine *media* glyphs (water, food, compost…). Adding nine *capital* icons as a
   second unrelated legend would give one overlay two vocabularies. Proposal: **Flows keeps its media
   edges; each flow and each structure additionally declares capitals**, and the overlay gets a two-way
   switch inside it: **Materials** (today's glyphs) | **Capitals** (the nine). In Capitals view the same
   edges carry capital icons instead of medium glyphs, and structures radiate what they give the whole
   village. Every medium has a default capital so old scenes need no edit (water/energy/food/compost/
   materials → material or living, money → financial, care → social) and a founder overrides per flow.
2. **The ninth is "Health & Wellbeing".** Roland's eight already have `living` for ecological health, so
   the added one is human vitality: sauna, gym, clinic, bathhouse. Naming it that way stops it colliding
   with the Village Health module (which is metrics) in the same nav.
3. **Radiation, designed so it cannot overload.** Per structure: a `gives: [capital…]` list. In Capitals
   view a building emits one icon at a time, cycling through its list every ~2.2 s (so a four-capital
   building shows one rising icon, then the next; never four at once); the icon rises ~28 px, drifts,
   shrinks and fades into the ground over ~1.6 s ("absorbs into the landscape"). Edge flows keep the
   three-mark rhythm. Global caps: at most 24 live radiation icons on desktop, 10 on phones, and the
   emitter picks the buildings nearest the camera first. Tap the legend to filter to one capital, which is
   the strongest anti-overload lever and also how a visitor asks "who gives spiritual capital here?"
4. **Fix the two motion harms while in the file.** The canvas loop reads `prefers-reduced-motion` and,
   when set, draws static icons (one per capital, no rise, no travelling marks) and a legend; and the loop
   pauses on `document.hidden`. Both are cheap and both are today's defects.
5. **Icons as inline SVG symbols in the artifact** (zero image budget, sharp at every DPR), one hue per
   capital from the existing theme tokens, a 12–14 px glyph plus a 20 px legend version. Draw them once
   in the artifact's `ICONS` style so they match the emblems.
6. **One vocabulary across asks 2 and 3.** `shared/capitals.ts` (nine ids, labels, glosses, hues) is
   read by the flows module (§2 card B), the grounds overlay, and later the crowdpool spec. A founder
   declares "the kitchen gives material and social; the sauna gives health" once, in one place (the map
   inspector the other session is building is the natural editor), and both canvases draw it.
7. **v2, not now: derived pulses.** Events already carry `structure_keys`, library loans, stays and
   gratitude are all attributable to buildings later, so a real gathering can pulse experiential + social
   from its building for the hour it runs. Declare first, derive later.

### Questions for Rye (defaults in brackets)
- Q11 Two views inside Flows, Materials | Capitals, with defaults from medium → capital [default: yes].
- Q12 The ninth is named "Health & Wellbeing" [default: yes].
- Q13 Radiation as one-icon-at-a-time cycling with global caps and legend filtering [default: yes].
- Q14 Which session owns `grounds-v0.html` this week: your map-prototype session, or a lane from here once
  it lands [default: I write the brief and the shared vocabulary; the grounds patch is handed to your
  other session as its next numbered patch, so two sessions never edit the artifact at once].

---

## §4 Ask 4: what to take from the Edge City Agent Village

### Rye's ask (verbatim, bracketed)
["What can we learn from this and integrate into our Custom Game? For example around this stack of tools
and how we can better serve residents, members, and visitors of our village. Make sure to follow and
digest all the links in the article to get a full view"]

### What they built and what happened (digest: `round4/AGENT_VILLAGE_DIGEST_2026-08-16.md`, 40 sources, every link followed)
- 239 hosted personal agents (Hermes on Railway, one per multi-day resident, reached through Telegram)
  over four weeks at Edge Esmeralda 2026, ~150 people on site at a time out of 850. Three village skills
  on each agent: **Index Network** (intent-driven discovery: residents state what they seek or offer in
  plain language, with privacy tiers public / network-only / incognito / private; two agents negotiate
  bilaterally, a mutual match becomes an "opportunity" shown to both people with reasoning; **both humans
  accept separately**; the agent can never accept for you), **EdgeOS** (identity, tickets, housing,
  events, RSVPs, venues, attendee directory; the agent must show the exact URL and body and get a yes
  before any write; directory fields returned as `*` are hidden and the agent must say so, never infer),
  **Geo** (a governed knowledge graph holding notes, talks, concepts, and time-windowed village chat
  history: summarise, never dump). Skills follow the agentskills.io standard (a folder with `SKILL.md`),
  and the whole bundle is MIT on GitHub, so technical residents pointed their own Claude Code or OpenClaw
  at the same skills.
- Numbers (Index's own posts, which differ from the article in places): 240 residents, 541 intents,
  9,688 opportunities detected, 572 surfaced (6%), 147 accepted (about 1 in 4); agent-side negotiation
  took 4.9 s, human yes-to-yes a median 20 h. 67% of sought connections crossed clusters; 75% were
  seeking and 3% explicitly offering, so agents inferred supply. Their conclusion: "discovery is no
  longer the bottleneck; valuation is."
- What broke: hallucinated personal summaries ("It hallucinated an interesting summary about me"),
  invented ideas attributed to principals, provisioning collapsed live at the first workshop, and a
  30-minute LLM heartbeat cron drained per-tenant budgets (~57k input tokens per tick, mostly MCP tool
  schemas; ~2.4M tokens a day per agent; retired mid-run). Telegram was the wrong surface: opportunities
  "scrolled out of view"; residents asked for a persistent inbox. After one talk four or five people
  wanted to meet the same person and "arranging the meetings became its own burden". Pre-registration
  sought $60–90K of compute for one month. Delegated voting (Simocracy) allocated $10K by simulated
  principals who never ratified the result.

### As built here, so the lessons land somewhere real
- One assistant engine, seven modes with hard-coded budgets, deterministic keyword router first, eight
  zero-token readers/templates (roles, vacant seats, circles, members summary, quests, badges, decisions,
  concierge gaps), BM25 over `docs/knowledge/**` and `docs/modules/**`, drafts-only write path (role,
  circle). **No events reader, no RSVP action, no per-member agent, no member-to-member matching** beyond
  the map concierge (deterministic scorer over circles/roles/quests, model only for ambiguity), **no
  member intentions/offers/needs** (network need/offer is village-level). Public knowledge surface exists
  and is signed and nameless (`/.well-known/village.json`, `/org/**.md`).

### What I would take, in order of leverage per token
1. **Be the village's API; do not host the agents.** The durable part of Edge's stack was three plain
   APIs and a folder of markdown skills; the agents were thin, swappable clients, and hosting them cost
   the most and broke the most. Amora already has the APIs. Proposal: **"Bring your own agent"**: a
   member mints a personal access token in their profile, scoped to what they may already see (calendar,
   the directory tier their capabilities allow, their own RSVPs), with exactly two writes (RSVP going /
   maybe / declined with the existing idempotency key, and post an intent) and no others; and the repo
   ships `docs/skills/village-calendar/SKILL.md`, `village-directory/SKILL.md`, `village-intents/SKILL.md`
   in the agentskills.io shape, each stating Edge's two red lines verbatim in our voice: show the exact
   write and get a yes; a hidden field is hidden, never inferred. Zero tokens on our side, works with
   Claude Code, Hermes, OpenClaw and whatever comes next, and every fork gets it. Hosting a resident's
   agent, if ever, is a Managed-tier listing with a vendor and a price, never a platform cost.
2. **Intents, at member level, with privacy tiers.** The map concierge already logs "I want to help with
   X" and the network module carries village-level need/offer. Add `member_intents`: plain-language
   seek/offer, tier public / members / incognito (matched, never shown) / private (notes to self),
   lifecycle active / paused / fulfilled / expired, and a "why" line. Match **deterministically first**
   (the concierge scorer plus BM25 over intents, seats, quests, events), model only for ambiguity, as
   today; a match becomes an **opportunity in a persistent inbox** (Messages already exists) with the
   reasoning attached; **both people accept separately** through the existing contact relay; nothing is
   accepted for anyone. At 30–300 people, agent-to-agent negotiation is not needed; a human yes both
   sides is the quality gate Edge measured as the bottleneck anyway.
3. **One rationed brief.** Edge's best-liked artefact was the 08:00 brief; its worst was the heartbeat.
   A weekly (or per-lunar-week) village digest, **rendered from a template with zero tokens** (arrivals
   and departures, meals and gatherings, moon and season marks, open seats, new quests, your
   opportunities), in-app and by email, timed and never charging the interactive budget (R25 posture).
   This is the calendar's item 10 done once, in the assistant's template style.
4. **Give the assistant a calendar it can read and one write it can draft.** An `events` reader and
   template ("what is on this week", zero tokens), and an `event_rsvp` draft kind that the member confirms
   in the UI, the same shape as the role and circle drafts. Add Edge's rule to the system framing: names,
   events and labels about a person come verbatim from a tool result or memory, or the answer is "I
   don't see that anywhere". Hallucinated self-summaries were the sharpest harm they reported.
5. **Show what the assistant believes and how to correct it.** Anywhere the assistant summarises a
   member (concierge routing, intent matching) the member can see the sentence, its source, and a
   correct/withdraw control. Ratification before representation is the lesson of Simocracy too, and it
   is already our house rule (nothing applies itself).
6. **Skip, and say why**: hosted per-resident agents (cost, provisioning fragility, 2.4M tokens a day);
   agent-to-agent negotiation (not needed at village scale); delegated voting sims (thins the formative
   act; our rule is humans ratify); Telegram as the notification surface (lossy; we have an inbox);
   any MCP server with a large tool list (schema bloat inflates every turn; if we publish MCP later, keep
   it to a handful of tools and measure input tokens per call first).

### Questions for Rye (defaults in brackets)
- Q21 "Bring your own agent" (member tokens + shipped SKILL.md files) over hosted agents [default: yes].
- Q22 Member intents with tiers, deterministic matching, opportunities inbox, both accept [default: yes,
  as a card in the library, "Intents & Introductions", requires `messaging`].
- Q23 The weekly zero-token brief, in-app and email [default: yes; lunar-week cadence off by default].
- Q24 Assistant events reader + confirmed RSVP draft [default: yes].

---

## §5 Ask 5: the shared village calendar, 12 months and 13 moons with equal weight

### Rye's ask (verbatim, bracketed)
["We need an epic shared village calendar- let's research some of the best calendar designs for local
communities and what would make this shared calendar special- also we want our calendar to be unique in
that it will show the typical 12 months a year, but also show the 13 lunar months a year with equal
importance and weight as our system revolves around lunar months and equinoxes and solstices"]

### What the research found (memo: `scratchpad/calendar-research/CALENDAR_RESEARCH.md`, 46 sources)
- Twelve community calendars read (Burning Man Playa Events, Social Layer at Edge Esmeralda/Lanna, Gather
  and Mosaic for cohousing, a monastery calendar, Hebcal, Luma, Partiful, Meetup, LibCal, CSA pickup
  tables, the personal-calendar apps). What makes a 30–300 person calendar get used: **one source of
  truth with `.ics` feeds out** (every failure was a second copy: Edge's agenda drifting from Social
  Layer, the frozen printed guide, Luma's unmanageable foreign events); **adding is one screen** with short
  titles; **RSVP that answers the kitchen's question** (going/maybe/no, headcount, waitlist when capped,
  structured "bring"/role slots for dish, ride, childcare); **recurring rhythms as first-class objects**
  with per-instance overrides; **"who's on site this week"** (nobody does it; Mosaic's guest-room calendar
  is the nearest); **layers with visibility per layer** (village, team, household, private, public);
  **moderation by role, no priority for payment** (Meetup's paid-waitlist priority is the anti-pattern);
  **the village's timezone for every viewer, printed by name**; **print and a weekly digest**.
- The astronomy, measured with `astronomy-engine` for 2025–2028: a solar year holds 12.37 lunations, so
  a year has **12 or 13 new moons** (12, 12, 13, 12) and the count differs for full moons in the same
  year (12, 13, 12, 13). Solstice-to-solstice: 13, 12, 12, 13. "13 moons a year" is true roughly every
  2.7 years, seven times in nineteen. In 2026, ten of twelve new moons fall on different calendar dates in
  Los Angeles and Auckland, so **the day depends on the village zone**.
- Established systems: Dreamspell/13-Moon (esoteric, 13 fixed 28-day months + a Day Out of Time, ignores
  the real Moon), the International Fixed Calendar (same shape, Kodak 1928–1989), the "Celtic tree
  calendar" (Graves' invention, no basis), Hebrew and Chinese lunisolar (a leap month seven times in
  nineteen years; the Chinese rule "the first month without a major solar term is the leap month" is the
  best-documented way to name the 13th), Islamic pure lunar (drifts through the seasons), Anishinaabe
  moons named for the land with a 13th that "falls into different months each year", the Old Farmer's
  Almanac names, the Wheel of the Year (four quarter days + four cross-quarters, hemisphere-shifted).
- UI precedents: Hebcal's dual-date grid, Chinese two-calendar apps printing the lunar day under each
  cell, permaculture year wheels with concentric rings, spiral moon posters. Four layouts were compared;
  the memo's pick is **a two-ring year wheel** (outer ring twelve months, inner ring the true lunations
  as arcs of real length, solstice/equinox spokes cutting both) as the calendar's identity, year page
  and print poster, **plus stacked equal-height headers on the week view** ("August 2026" over
  "Ricing Moon, day 12 of 30", phase glyph in every cell) where the daily RSVP work happens; twin month
  grids behind a remembered switch as the month tab.

### As built (measured)
- Events module (`events`, tables `events` + `event_rsvps`, code `gatherings.ts`): schema.org-shaped,
  `starts_at`/`ends_at` datetime, `structure_keys` (multi-building), capacity (0 is a real answer),
  status draft/scheduled/cancelled/postponed, attendance mode, RSVP going/maybe/declined with idempotency,
  check-in. `/events` is a **flat list** with Today/Tomorrow/in-N-days labels; **no month grid, no
  recurrence, no .ics, no timezone**: every query windows in UTC and the browser locale renders, while the
  village timezone (`SeasonConfig.timezone`, Amora `America/Costa_Rica`) drives seasons only. Create needs
  admin or `event.manage`; members RSVP.
- Lunar time exists: `shared/lunar.ts` (mean synodic month, reference new moon 2000-01-06, ±14 h,
  `cycleBoundsFor`), gratitude cycles named `lunar-000328`, cycle close is a **human act by written
  invariant** (`scheduler.ts:18-22`), season roll compute-on-read. Solar: `shared/wheel.ts` quarter marks
  fixed at Mar 20 / Jun 21 / Sep 22 / Dec 21, hemisphere-aware, drawn by `CycleClock.tsx`.
- **Defect found:** `CycleClock.tsx:36-39` passes a 0–1 phase where `wheelState` expects days, so the
  lunation arc is always ≤ 3% and the moon ring never visibly fills. `daysLeft` beside it is right.

### What I would improve
1. **Extend `events`, do not add a module.** The calendar is the events module's face; the library card
   becomes "Village Calendar" and the page grows from a list into the dual view. RSVP, capacity, map
   lighting, check-in all carry over.
2. **Time is village time.** Store as today (UTC), but window "today / this week / this moon" and render
   in `SeasonConfig.timezone` for every viewer, zone printed by name; the viewer's local time as a second
   line only when it differs. Lunar month boundaries fall on the day they fall in village time.
3. **One lunar clock, and a true one.** `shared/lunar.ts` is a mean-synodic approximation (±14 h), and
   the gratitude cycle, the pool, and now the calendar all read it. Two clocks that disagree by a day a
   few times a year is the settlement bug the hub already queued for deletion (§10 item 17). Proposal:
   replace the mean formula with a **precomputed table of true new-moon and solstice/equinox instants for
   2020–2050** (a few KB in `shared/`, generated once by `astronomy-engine` in a script that is checked in,
   never at runtime, so no bundle cost), keeping the same lunation numbering so every existing cycle id
   (`lunar-000328`) and every `effective_from_cycle` stays what it is; a test proves the index of every
   past cycle is unchanged and the boundary of any cycle moves by less than 15 h. The hub takes the same
   table in its item-17 PR so both repos agree to the minute.
4. **The year wheel is the calendar's identity.** Two rings of equal weight: the outer ring the twelve
   Gregorian months, the inner ring the year's true lunations as arcs of real length with a new-moon tick
   at each boundary; four solstice/equinox spokes cut both rings; the current day is a hand; the four
   cross-quarters are optional small marks. It grows out of `CycleClock.tsx`, which already draws the
   solar wheel and the moon ring, so it starts from a component the village knows. Tap an arc to open
   that month in either system. It is also the print poster.
5. **Two equal headers on the day-to-day view.** Week and month views carry two stacked header rows of the
   same height ("August 2026" over "Moon 8, Ricing Moon, day 12 of 30"), a phase glyph in every cell, and
   the lunar day printed under the Gregorian one. A remembered "Months | Moons" switch flips which grid
   is drawn (a lunar month lays out new moon → full → new). No buried settings.
6. **Lunar months are astronomical, anchored to a solstice, and honest about 12-moon years.** Month 1 =
   the first new moon after the December solstice; 12 or 13 moons per solar year as the sky gives them;
   when a year holds 13, the intercalary moon is named by the Chinese rule (the first moon with no
   solar-term event) or, simpler for a village, "the 13th, Blue Moon", and the wheel shows 12 arcs in the
   other years with the count said out loud. Month names: number plus a village-chosen name (Admin edits;
   ship with hemisphere-aware almanac names flagged `is_example`, since Anishinaabe and Farmer's Almanac
   names describe someone else's land).
7. **Recurring rhythms as first-class objects.** `recurrence` on an event: none | weekly (by weekday) |
   monthly (Gregorian day) | **lunar** (every new moon / full moon / cycle close / a lunar day) |
   **solar** (each solstice / equinox / cross-quarter). Occurrences are materialised on read for the next
   N, never as rows, with per-instance overrides (cancel one, move one).
8. **RSVP that answers the kitchen's question.** Keep going/maybe/declined; add a capped waitlist that
   promotes as spots open, and structured **slots** an event can declare (dish, ride, childcare, setup
   crew) with sign-ups shown to those going. No priority for anyone.
9. **Layers.** `layer` on an event: village | circle | household | private, with visibility per layer on
   top of the existing status and members/public gating; a small crew (`event.manage`) approves the
   public layer, anyone posts to their own.
10. **Subscribe, print, digest.** `/api/events/calendar.ics` per village (public events; a signed-in
    token feed adds members' events), each VEVENT naming the lunar month; the wheel and the month grid
    print; a weekly digest email with arrivals, meals and moon events comes after.
11. **Who is here this week.** Stays already know arrivals and departures; a band on the week view with
    counts for visitors and names for members under the existing privacy tiers.
12. **The gratitude cycle close and the season roll show on the calendar as marks and never fire from
    it** (written invariant kept).
13. **Fix the CycleClock moon ring** in the same lane.

### Questions for Rye (defaults in brackets)
- Q15 Month 1 = first new moon after the December solstice; months start at new moon; the day starts at
  midnight village time [default: yes; say if you want the March equinox or a full-moon start].
- Q16 12- and 13-moon years both shown honestly; the 13th named "Blue Moon" [default: yes].
- Q17 Month names: number + village-chosen name, almanac names as examples [default: yes].
- Q18 One true lunar clock (the precomputed table) replaces the mean formula in Amora now, hub follows in
  item 17 [default: yes; if no, the calendar reads the mean clock and says "±14 h"].
- Q19 Calendar renders in village time with local time as a second line; public `.ics` feed for public
  events [default: yes].
- Q20 Layers (village/circle/household/private) and slots (dish/ride/childcare) in v1, or v2 [default: v1
  for layers and slots, waitlist v1; digest email v2].

---

## §6 Draft lane plan (nothing dispatched)

| Lane | Objective | Zone (disjoint) | Gate/harm metric |
|---|---|---|---|
| L1 Library flow | §1 items 1–8: `/modules` page + detail, Admin nav filter, Go-live card, `setup`/`ready`, `moduleCatalog.ts`, fallback art, image budget raise, village override | `client/src/pages/Modules*.tsx`, `Admin.tsx` nav + ModulesTab, `shared/moduleCatalog.ts`, `shared/modules.ts` (fields only), `server/index.ts` `/api/modules` block, `client/public/images/modules/` | a fresh village's Admin shows only platform tabs + Library; turning on shows the tab; first save shows Go-live; outsiders' 404 for preview unchanged (test); check-voice green on catalog copy; image budget baseline raised once |
| L1a Catalog art | eighteen WebP illustrations, one style | `client/public/images/modules/` only | each ≤ 40 KB, all render, fallback verified |
| L2 Power | §2 card A: circle shape + decides-by columns + config, layouts per shape, avatars on seats, drag/pick seating, spectrum legend, publish surface | `shared/mapLayout.ts`, `VillageMap.tsx`, `server/lib/orgChart.ts`, `orgRelations.ts`, one migration, `villageExport.ts` (two fields) | layouts pure and snapshot-tested; seating still a dated row; export still nameless (existing test) |
| L3 Flow | §2 card B + `shared/capitals.ts`: `flows` module, spending rules, funding sources, budgets, lens on `/map/circles`, member panel | new `server/lib/flows.ts`, new page section, one migration, `shared/modules.ts` entry | reads ledger, writes nothing to it; declared vs measured drawn differently |
| L4 Capitals overlay | §3: Materials|Capitals switch, radiation, caps, reduced motion, tab pause, SVG icons | `docs/prototypes/grounds-v0.html` (**owned by the other session; brief handed over, or queued**) + `shared/capitals.ts` (from L3) | frame time on a phone; artifact ratchet; reduced motion honoured |
| L5 Calendar | §5: year wheel + stacked headers, village time, one true lunar clock (table), lunar/solar recurrence, waitlist + slots + layers, `.ics`, who-is-here, CycleClock fix | `Events.tsx` → calendar components, `server/lib/gatherings.ts`, `shared/lunar.ts` (+ generated table + generator script), `shared/wheel.ts`, `CycleClock.tsx`, one migration | every past cycle index unchanged and no boundary moves > 15 h (test); new-moon dates 2026–2028 match `round4/moons-2025-2028.mjs` output in village TZ; `.ics` validates; RSVP path unchanged (existing tests) |
| L6 Bring your own agent | §4 items 1, 4, 5: member tokens (scoped, two writes), `docs/skills/*/SKILL.md`, events reader + template, `event_rsvp` draft kind, "never invent" framing, believe/correct control | `server/lib/assistant*.ts`, `villageReaders.ts`, `assistantTemplates.ts`, `shared/draftKinds.ts`, profile token UI, `docs/skills/` | a reader answers with zero tokens (usage rows prove it); a token cannot read above its holder's tier (test); every write path needs the confirm step (test) |
| L7 Intents & brief | §4 items 2, 3: `member_intents` + tiers + lifecycle, deterministic matches, opportunities inbox, both-accept relay; weekly template digest | new `server/lib/intents.ts`, one migration, Messages inbox surface, `notify.ts` digest, `shared/modules.ts` entry | incognito never renders (test); nobody is accepted for (test); the digest job never touches the interactive budget (existing K2 test pattern) |

Order: L1 and L1a first (everything else becomes a card in it), L2 and L5 in parallel (disjoint), L3 after
L2's columns exist, L6 after L5's reader shape settles, L7 after L6, L4 when the artifact is free.
Migrations from `0083`, one lane at a time through the four-way scan.

---

## §7 The whole question list, sorted by what blocks most

1. Q14 (who owns `grounds-v0.html` this week) blocks L4 and shapes L2's canvas.
2. Q6/Q7 (two cards, one substrate; org map's home) block L2 and L3.
3. Q1/Q2/Q3 (route, go-live default, audience) block L1.
4. Q4 (images: generate in the quest-poster style) blocks L1a only.
5. Q15–Q18 block L5's month logic, not its scaffolding; Q19/Q20 shape its scope.
6. Q21–Q24 decide whether L6 and L7 exist this round.
7. Q8–Q13 are vocabulary and taste; defaults are safe.

Every default above is what I dispatch with if you reply "defaults" and nothing else. Anything you strike
or add goes into the ledger as R27+ in your words before a brief is written.

---

## §8 Second pass (Rye: "go through one more time and give any upgrades or fixes ... reconsider your suggestions")

Read adversarially against the code facts and against his words. Numbered so a ruling can point at one.
Where a recommendation changed, the old one is named.

### Cross-cutting fixes
1. **The concurrent-session conflict is wider than §0 said.** `wt-housing` edits `client/src/pages/Admin.tsx`,
   `client/src/App.tsx` and `server/index.ts`, the same three files L1 must touch. Fix: L1's Admin change
   is written as one small filter function over `navGroups()` (minimal line overlap), L1 rebases onto main
   the moment housing lands, and I ask the other session for its landing order before cutting L1. If
   housing is days away, L1 still goes first and takes the rebase.
2. **Test mutex.** Seven concurrent worktrees plus three of ours will make `.test-lock` pathological again.
   Every brief carries the standing clearance verbatim (skip local when held AND CI green on the tip;
   release only locks you acquired).
3. **Migrations pre-allocated at dispatch** after the four-way scan: L2 `0083`, L3 `0084`, L5 `0085`,
   L7 `0086`; `0077` belongs to housing; `0080` Saberra. Never renumber.
4. **Brand ratchet is 63/63 with zero headroom** and `check-voice` parses `shared/`. Catalog copy for
   eighteen modules is platform language, never the village's brand, and no dashes, or the lane will
   spend its afternoon on the gate instead of the work. Said in the brief up front.
5. **Bring-your-own-agent tokens are a new credential type** (scoped read + two writes) and go through
   `/security-review` before merge, with rate limits, revocation, and audit rows on every write. Not
   optional.

### Ask 1 upgrades
6. **Public read-only catalog (changes Q3).** I had "no public catalog in v1". Reversed: `/modules` is
   public and read-only, showing platform copy only; a village's on/off state renders only for signed-in
   members (already public via the nav and `village.json` at members+), and preview never renders to
   anyone but admins. Cost is nothing (the `/api/modules` projection already exists), it is the
   platform's own "what a village can be" page, and it is where a builder sees the shelf the $ReGen pool
   pays into. Default flips to public.
7. **Core modules get cards too**, marked "Always on" with their benefits, so a founder reads the whole
   game in one place instead of four missing cards.
8. **Group the shelf**: a `group` per module (Coordinate / Recognise / Host and earn / Know and decide /
   Connect), five headed rows instead of one wall of eighteen. Small field, big difference to
   "beautiful".
9. **The last card is "Build one, get paid in $ReGen"**: links `docs/modules/BUILDING_A_MODULE.md` and
   the hub's builders' pool page. That is R20's incentive made visible at the exact moment a founder
   wishes a module existed.
10. **Turn on with example content.** The platform already has standing examples (`is_example` rows,
    `server/lib/examples.ts`, six tables carry the flag). Where a module supports it, the Turn-on step
    offers "start with example content" so a freshly turned-on module is never an empty page, and the
    Go-live card can say "3 examples showing; replace or remove them before going live". Existing
    machinery, no new concept.
11. **The Go-live card only offers tiers a module's dependencies allow.** `feed` requires `forum`; feed at
    public with forum at members is a wall of broken links. The card greys "Everyone" and says why. The
    dependency rank check exists on the enable path; this reuses it on the publish path.
12. **Lifecycle badge on the Admin tab itself** (preview / members / everyone), so a founder always sees
    where a module stands without opening the library.
13. **Images: two decisions, both reconsidered.** (a) *Style*: I said quest-poster. Better: the module
    images are **places in the village painted in the grounds map's own style** (Events = the commons at
    dusk with lanterns; Material Library = the tool shed; Stays = the guest cabin; How Power Is Held = the
    council fire). It ties the library to the map the village already knows, and it is one style, not
    two. Recommend painted-world; poster is the fallback if you prefer. (b) *Where they live*: bundle
    (raise the image ratchet once, deliberately, in the same commit, at ~25 KB x 18 = ~450 KB) or hub CDN
    (`assets.regencivics.earth/modules/<id>.webp`, no ratchet cost, forks show the fallback offline). The
    uploads volume is out: the fourteen quest posters had to be hand-copied to Railway because the seed
    never repeats (ledger item 11). Recommend bundle: forks stay self-contained and R19's WebP standard
    holds; the ratchet raise is a ruling, not a habit.

### Ask 2 upgrades
14. **Do not split module ids this round (fixes a hidden cost in Q6).** The `map` module gates the land
    map AND the org chart AND the concierge under one `/api/map` prefix, interleaved. Carving a `land`
    module out is a contract-visible id change (village.json publishes ids; the pool counts them) inside
    the concurrent session's `server/index.ts` zone. So card A "How Power Is Held" **is** the `map`
    module, its card copy says "includes the Living Map of the land", and the clean `land` / `power`
    split is queued as a follow-up ADR for after the grounds program lands. Honest and cheap now; right
    later.
15. **Shape is village-level; decides-by is per circle (simplifies §2 card A item 1).** A per-circle
    shape inside a nested-circle layout is geometrically awkward (a pyramid inside a ring) and doubles
    the layout matrix. The pyramid-to-circle question is about the whole organisation; the *how we
    decide* question is genuinely per circle. Per-circle shape moves to v2.
16. **A guided "setup walk", which is what "founders can go through and place" literally says.** On the
    org map: a Walk button steps through every open or partial seat in order, highlights it, offers the
    member tray (avatars), assign / skip / "open call", with a progress bar; on mobile the same walk as
    a card stack. Ends with the shape and decides-by chips for any circle still blank. It is the
    onboarding for the module and the reason a founder finishes it.
17. **Card B gets one action: "Request approval".** A member who reads "up to $500 with Kitchen consent"
    taps Request, and the platform opens a **forum proposal** (the decision primitive already exists,
    `proposal.open`) in the circle's category, pre-filled with the amount, the rule and the payer. The
    map of rules becomes a working thing with zero new decision machinery, and outcomes are recorded
    where decisions already are.
18. **Module id `resources`, not `flows`**, so it never collides with the land map's `map_flows` scene
    block or the "Flows" overlay button in conversation.
19. **The Capitals view on the land belongs to `map`** (declared per structure in the scene), independent
    of whether `resources` is on. `resources` draws the rules on the org map. Both read
    `shared/capitals.ts`.

### Ask 3 upgrades
20. **Plain labels first, jargon second.** Legend reads Money, Materials, Living things, Knowledge,
    Experience, Relationships, Culture, Spirit, Health; the tooltip carries the formal name (financial,
    material, living, intellectual, experiential, social, cultural, spiritual, health and wellbeing).
    Visitors are the audience of the map.
21. **Viewport cull and zoom LOD beat a global cap alone.** Only buildings in view emit; zoomed out past
    a threshold, radiation collapses to a static row of small capital badges under each building; zoomed
    in, the rising icons. The global caps (24 / 10) stay as the safety net.
22. **The editor is the map inspector** the other session is building (per-structure fields), which is
    another reason Q14's default (they take the grounds patch) is right; our lane ships the vocabulary,
    the defaults, and the org-map side.

### Ask 4 upgrades
23. **Reorder: intents and the brief (L7) before bring-your-own-agent (L6).** At Amora's scale most
    residents will never run an agent; everyone reads a brief and everyone benefits from a good
    introduction. L6 stays in the round, second, behind its security review. **Visitors** are served by
    the calendar's public layer, the `.ics` feed and What's On on the visit page; nothing further.

### Ask 5 upgrades
24. **Freeze the past when the true clock lands (tightens Q18).** Gratitude rows already carry
    `cycle_id` stamped at write (`0001_init.sql:87`, `0010` adds the numeric twin), so history would not
    reassign; the table still applies only from the deployment lunation forward and reproduces the mean
    formula's boundaries for every earlier cycle, so "no past boundary moves" is true by construction,
    not by test alone. Both repos take the same table.
25. **The year anchor is a game variable** (`calendar.year_anchor`: December solstice | March equinox |
    June solstice | September equinox), hemisphere-aware default (December for the north, June for the
    south). Amora's default: December solstice. A white-label platform cannot hard-code the north.
26. **Split L5 in two.** L5a core: dual view, village time, true clock, recurrence, `.ics`, CycleClock
    fix. L5b community: waitlist, slots, layers, who's here, the weekly brief. L5a is already a full
    lane; L5b follows it in the same round. Q20's default becomes "L5a then L5b".
27. **Recurring events need an occurrence identity for RSVPs** (`event_rsvps` keyed by event + occurrence
    date + user). Named here so the migration is designed once.

### Amended lane order
L1 (+ L1a art) → L2 and L5a in parallel → L3 (`resources`) and L5b → L7 (intents + brief) → L6 (BYO
agent, security-reviewed) → L4 (grounds patch, other session or after it lands). Follow-up queued: the
`land` / `power` module split (ADR).

---

## §9 Rulings received (R27, R28) and the open conversation

Rye 2026-08-16: ["We'll wait for the other coordinator session to finish before starting this one"] (R27);
["Final list to rule on - yes if not mentioned"] with three amendments (R28): item 8 gains an **Other**
section; item 13's radiation becomes **every producing sprite always has a ring: one icon of each capital
at once when it gives several, several of the one icon when it gives one**; ask 5 must **aggregate every
dated thing** (events, date-specific quests, "and more") and Admin gains an **Events section that attaches
a Google Calendar (etc.)**. Asks 2 and 4 stay open for conversation. What follows is the deeper pass on
those three.

### 9.1 Ask 2, talked out: what the module must answer, and the questions only Rye can settle

The module is worth building only if a member, a visitor and a founder each get an answer they cannot get
today. Today they can read seats and holders at `/map/circles` and static prose at `/governance`. Nobody
can read *how a decision gets made here*, *who I go to*, or *what shape this village is*.

**Five answers the map gives, in one picture:**
1. **What shape is this village?** (village-level `shape`, R28 adds Other) drawn as the geometry itself:
   rings, tree, council ring, flat ring, steward centre, network. A spectrum legend from "one holds it" to
   "all hold it", with the village's marker on it and the shape's one-line gloss.
2. **How does each circle decide?** (per-circle `decides_by`, R28 adds Other) as a chip on the circle,
   with a plain gloss on tap ("Consent: a decision passes when nobody has a reasoned objection").
3. **Who holds what, and where am I?** seats with holders' character avatars, open seats as open calls,
   partial seats as "1 of 3", terms ending this season marked. Tap a person: profile, character, seats,
   term, contact relay (existing tiers: faces and names for members, structure only for the public).
4. **How does power move?** the existing relations (reports to / advises / covers / double-links) drawn
   when the shape asks for them, plus **term ends and the season roll** shown as time ("Kitchen lead:
   term ends at the equinox"), so the map is not a frozen chart.
5. **If I disagree, where do I go?** a per-circle **escalation** relation ("objections go to: Council")
   drawn as a thin arrow, so the objection path is visible rather than tribal knowledge.

**The setup walk** (R28 yes): steps every open or partial seat, then any circle without a decides-by, then
the village shape; assign / skip / open call; the member tray shows avatars; ends with "publish structure
to the network?" (already nameless by construction).

**Beauty:** the picture stays SVG (deterministic, snapshot-tested, mobile accordion) but takes the painted
world's palette: parchment field, the circle homes' colours from `CIRCLE_COL`, avatars in painted frames,
morph animation between shapes. The land map is where sprites live; the power map is where the structure
lives; both share colour and vocabulary.

**Questions for Rye (defaults in brackets):**
- P1 **Now and Vision.** The land map has Now | Vision. Should the power map too: the shape and holders
  we have now, and the shape we are growing toward ("steward now, circle by season 4"), drawn as a ghost?
  [default: yes, using `org_drafts` as the Vision layer, since a draft is already "a reorganisation you
  can read before it is true"].
- P2 **Decides-by per circle, or per circle × domain?** One method per circle is simple. Members' real
  question is often "who decides about *money* vs *people* vs *land* vs *rules*". [default: one method per
  circle in v1 plus optional overrides for exactly four domains: money, people, space and land, rules;
  the resources card reads the money one].
- P3 **Names to the public?** Today the public sees structure without faces or names; members see people.
  Keep that for the power map [default: yes; a village can widen it with the existing `map.public_structure`
  variable].
- P4 **Amora's own shape now**, so the lane seeds a real example instead of a blank: steward, council,
  circle, or a stated transition? [default: seed the vocabulary and leave Amora's answer to you in Admin;
  say the word and it ships pre-filled].
- P5 **Escalation as a first-class relation** ("objections go to") in v1 [default: yes; it is one relation
  type in the existing table].
- P6 **Terms and elections on the map** (term ends, next season roll, "who chooses the next holder":
  appointed by lead / elected by circle / rotates) [default: show term ends and roll in v1; "how chosen"
  as a per-role field in v1 since it is the heart of "how power is held"].
- P7 **Where Hypha appears**: a small "binding record: Hypha DHO" chip on circles whose decisions bind
  on-chain (mechanics ring 2), deep-linking via the tools module [default: yes, display only].
- P8 **Resources v1 units and cadence**: rules in USD and in village tokens; budgets per season or per
  lunar cycle? [default: both currencies allowed per rule; budgets per season, since dials already turn
  at cycle boundaries and a season is what a founder plans in].
- P9 **Funding-source kinds** to ship as the picker: donations, memberships, stays, grants, sales, land
  or lease, investors, other [default: that list; edit it].
- P10 **Who may declare** shape, methods, rules and sources: admins only, or admins plus a capability
  (`org.structure`) so a coordination circle can hold it? [default: admins plus one capability, matching
  how `health.record` was split from admin].

### 9.2 Ask 4, talked out: what was learned and how it benefits us

Lesson → evidence → what it means for a residential village → what we build.

1. **The durable part was the APIs and a folder of markdown skills; the hosted agents were the cost and
   the breakage.** 239 agents, 17.5B tokens, $60–90K sought for a month, provisioning collapsed at the
   first workshop, a heartbeat cron burned ~2.4M tokens a day per agent. → We are the API. Members' own
   agents (or none) read the calendar, the directory tier they may see, and their intents; we ship
   `SKILL.md` files. Zero tokens on our side; works for every fork; hosted agents only ever as a Managed
   listing with a vendor and a price.
2. **People seek, they do not offer.** 75% of intents were seeking, 3% explicitly offering; agents inferred
   supply. → Do not ask people to list what they offer; **infer offers** from what the village already
   knows (badges and skills, seats held, quests completed) and show "you could offer…" as a pre-filled
   suggestion the member confirms. That is the difference between an empty offers board and a live one.
3. **Bridging beat bonding.** 67% of sought connections crossed clusters. → Matching favours people
   outside your circle and your arrival cohort; the weekly brief carries one "someone you have not met"
   line; the concierge routes newcomers past the obvious.
4. **Discovery is easy; valuation is the bottleneck.** 9,688 detected → 572 surfaced (6%) → 147 accepted;
   negotiations shrank to 1.5 turns as agents learned taste. → **Few, good introductions.** The brief
   carries at most two or three; a village default policy ("two great introductions beat ten okay ones")
   and a per-member policy line ("no more than one a week", "only about food and land"). Deterministic
   scoring with a confidence floor; nothing under it is shown.
5. **Popular people got saturated.** After one talk four or five people messaged the same person; "arranging
   the meetings became its own burden". → Extend the existing per-recipient contact cap
   (`map.contact_recipient_daily_cap`) to introductions, and let a member publish **"meet me" windows**
   on the calendar (a slot type from ask 5): introductions land in a window instead of in an inbox pile.
6. **Consent is a recorded step, hidden stays hidden, every write is confirmed.** The onboarding ritual
   asked one verbatim consent question before touching profile data; `*` fields were never inferred; the
   agent showed the exact payload before any write. → Same three rules for our concierge, intents matching
   and any BYO-agent token: an opt-in sentence before profile data is used for matching, capability tiers
   respected by construction, RSVP and intent posts confirmed by the human. It is already our posture; now
   it is written into the briefs.
7. **Hallucinated self-summaries were the sharpest harm.** "It hallucinated an interesting summary about
   me." → Wherever the assistant says something *about a person* (routing, matching, the brief), the
   member can see the sentence, its source, and correct or withdraw it. Templates and citations first;
   "I don't see that anywhere" when the data is absent.
8. **Chat was the wrong surface for anything needing review.** Opportunities scrolled away in Telegram;
   residents asked for a persistent app. → Opportunities and the brief live in Messages/notifications with
   accept controls, and by email; never only in a chat stream.
9. **Individually helpful agents did not add up to collective good** (shared credits and shared attention
   drained; simulated voters allocated $10K without principals ratifying). → Humans ratify, always (our
   standing rule); the assistant may *draft* a member's position on a proposal from their stated values
   ("help me weigh this"), and the member posts it. Drafts-only, like roles and circles.
10. **The most interesting builds came from residents** who pointed their own tools at published skills.
    → Publish ours; the module library's last card and the $ReGen pool are the invitation.
11. **Time-to-yes was human time.** 4.9 s of agent negotiation, a median 20 h until both said yes. →
    Design for the slow yes: one reminder, no urgency, an expiry that returns the intent to the pool.

Who benefits, concretely: **residents** get introductions worth having and one brief a week;
**members** get an intents board where offering is inferred and matching respects their policy;
**visitors** get What's On, the public calendar feed and the map's Now mode; **founders** get a demand
signal (unmatched intents beside the concierge's unmatched queries: which role or module to create next).

**Questions for Rye (defaults in brackets):**
- A1 Intents and introductions as one library card, "Introductions", requiring `messaging` [yes].
- A2 Who may post intents: members, plus guests with an active stay [yes; visitors read only].
- A3 Infer offers from badges, seats and quests and suggest them for confirmation [yes].
- A4 The brief: weekly, sent in village time on an evening you pick, opt-out per member [yes; Sunday
  evening default; lunar-week cadence available, off].
- A5 "Meet me" windows on the calendar as an introduction landing place [yes, in L5b].
- A6 Per-member policy line for introductions (frequency, topics) [yes].
- A7 REST + `SKILL.md` now, MCP later only if measured small [yes].

### 9.3 Ask 5, amended: everything dated, and external calendars

**Everything dated, through providers.** Each module contributes a `calendarProvider(range, viewer)` that
projects its own rows into calendar items (kind, title, start, end, all-day, layer, link, colour), gated
by the module's lifecycle and the viewer's tier; the source of truth never moves. The assistant's events
reader reads the same feed, so "what is on this week" includes everything below. Providers, measured
against the schema:
- **Gatherings** (`events`, `event_rsvps`): as today, plus recurrence and layers.
- **Quests with a window**: quests carry no date today (`duration` is free text). Add optional
  `starts_at`, `ends_at`, `due_at` (nullable) so a planting day or a deadline is a calendar item; quests
  without dates stay off the calendar. Also **quest crews' meetups** if a crew sets one (0067).
- **Stays**: `arrive_on` / depart per stay → the "who is here" band (counts for visitors, names for
  members).
- **Gratitude cycles** (`gratitude_cycles.starts_at/ends_at`): cycle open, cycle close due (marks only;
  close remains a human act).
- **Seasons and the sky**: season starts and ends from `SeasonConfig.seasons`, solstices and equinoxes,
  cross-quarters optional, new and full moons, the year anchor.
- **Seasonal festivals** (`SeasonalFestivals` page reads `/api/season`): each festival with its date.
- **Seats**: `org_role_assignments.term_ends_at` → "term ends", and the season roll date.
- **Calls** (automation module): the weekly call as a recurring item where the village sets it.
- **Material Library**: loan due dates for the borrower (private layer).
- **Exits**: `notice_ends_at` for the member and admins (private).
- **Launch milestones** (JourneyToLaunch) and **health snapshots** per lunation, admin layer.
- **External calendars** (below).

**Admin → Events section: attach a Google Calendar (etc.).** v1 is **subscribe by iCal URL**: Google's
"secret address in iCal format" or a public calendar's `.ics`, Apple, Outlook, Luma, Meetup, any `.ics`.
A founder pastes the URL, names it, picks a layer and visibility and a colour; the scheduler polls it on
a window (every few hours; a timer, allowed: only cycle close and season roll are forbidden), imports
events by UID (dedupe, update, soft-remove when gone upstream), expands upstream RRULEs, marks them
`source: external` (read-only mirror; RSVP still works on our side because the kitchen still counts
heads). Several calendars per village. The URL is a credential when it carries a secret token: stored in
the village secrets store (source + last4, never returned), fetched server-side over https only with the
SSRF guard, and the feature goes through security review. Two-way (write back to Google) is v2 via OAuth;
one-way the other direction already exists the day our `.ics` feed ships (Google subscribes to us).

**Questions for Rye (defaults in brackets):**
- C1 Quests gain optional start/end/due dates and appear on the calendar when set [yes].
- C2 External calendars v1 = subscribe by iCal URL (Google secret address, Luma, Apple, Outlook, any
  `.ics`); Google OAuth two-way = v2 [yes].
- C3 Imported events keep RSVP on our side [yes].
- C4 Which private layers exist in v1: mine (loans, exits, my RSVPs), admin (milestones, snapshots),
  village, public [yes].
