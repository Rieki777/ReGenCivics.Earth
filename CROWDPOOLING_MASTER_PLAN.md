# Crowdpooling Master Plan: The World-Class Upgrade

**Date:** 2026-07-16 (decisions resolved 2026-07-17)
**Status:** APPROVED. All Part 9 decisions resolved by Rye on 2026-07-17; see the decision log in Part 9. Implementation spec: `CROWDPOOLING_PLATFORM_SPEC.md`. Plain-language model: `CROWDPOOLING_OVERVIEW.md`.
**Scope:** Foundational improvements to the Crowdpooling platform across product, UX, UI, data model, game integration, and partner strategy.
**Research base:** Full codebase audit + deep research on crowdfunding conversion science, Ma Earth, GoSteward, timebanks, mutual aid platforms, tool libraries, volunteer coordination, in-kind registries, and every known "crowdfunding for stuff/time" precedent. Sources in the appendix.

---

## Part 1: Diagnosis. What exists today

There are two parallel, loosely connected systems in the codebase, both branded "Crowd Pooling":

**System A, the Campaign engine (real, DB-backed):** `campaigns` / `campaign_items` / `campaign_contributions` / `campaign_images` / `campaign_analytics` tables. Routes `/campaign/:id`, `/create-campaign`, `/campaign/:id/manage`, `/campaign/:id/analytics`. A working 6-step creation wizard, a contribution modal covering 5 types (land, equipment, role, resource, financial), owner review flow, milestones, analytics. This is a real crowdfunding engine.

**System B, the showcase (mostly demo):** `/crowd-pooling-projects` gallery runs on a hardcoded `sampleProjects` array (CrowdPoolingProjects.tsx:42-295) with a shipped banner saying "All example data." Contributions route off-platform to an external Hypha DAO link. The `/crowd-pooling` calculator Tool is entirely client-side (localStorage + jsPDF export). The `crowdPoolingProposals.submit` endpoint exists server-side and no UI calls it.

The two systems share copy and links, never data. `/campaigns` client-redirects to the demo gallery (App.tsx:335), which means **the real campaign engine has no discovery surface at all**.

### The specific rough edges

| # | Problem | Evidence |
|---|---------|----------|
| 1 | Real campaigns are unreachable except by direct link | App.tsx:335 redirect; gallery ignores `campaigns` table |
| 2 | `contributorsCount` hardcoded to 0 | server/routes/campaigns.ts:60 `// TODO: Implement contributors tracking` |
| 3 | Gallery avatars and names are fake | `AVATAR_INITIALS = ["RY","JD",...]`, CrowdPoolingProjects.tsx:306-313 |
| 4 | GetNotifiedForm toasts success, captures nothing | CrowdPoolingProjects.tsx:1075 |
| 5 | Contribution status emails disabled | campaigns.ts:333-342 |
| 6 | No per-project share links (share sheet hardcodes the gallery URL) | CrowdPoolingProjects.tsx:569 |
| 7 | `currentAmount` / `contributorCount` on projects are manually set ints, no aggregation | schema.ts:759 |
| 8 | Contributing earns the player nothing: no score event, no tokens, no profile record | REGEN_GAMES_SPEC_V1.md defines `crowdpool_contribution = 20` pts and a `crowdpool` referenceType; no callsite records either |
| 9 | Hypha bridge intent `crowdpool-to-contribution` exists (intents.ts:46-50) and the UI bypasses it with raw `window.open(daoLink)` | CrowdPoolingProjects.tsx |
| 10 | Two disconnected "contribution" concepts: `campaign_contributions` (pledges) and `player_contributions` (self-reported capital log) | schema.ts:1148 vs 959 |
| 11 | Three divergent visual languages: dark-forest glassmorphism gallery, older white-card campaign detail, warm-light Tool | See Part 5 |
| 12 | "List Project" CTA is disabled; no updates feed; no gratitude loop; no activity feed | CrowdPoolingProjects.tsx:1328 |

**The one-line diagnosis:** the polished page is a demo, the real engine is invisible, and neither one feeds the game. The highest-leverage move is unifying them into one real, DB-backed, game-integrated campaign model with a single card system and a genuine non-financial needs registry.

---

## Part 2: Research foundation. What the evidence says

Condensed findings that drive every decision below. Full citations in the appendix.

### Conversion science (transfers directly to non-financial pooling)

- **Goal gradient:** contribution likelihood roughly doubles when a progress meter passes two-thirds. At ~85% full, conversions double vs no meter. The motivator is "I pushed it over the line." Implication: surface whichever need is closest to complete. "2 of 3 carpenters found" out-converts an abstract money bar.
- **First 48 hours:** campaigns hitting 20-30% of goal in 48 hours enter a compounding visibility loop. Seed every pool before it goes public.
- **All-or-nothing framing doubles success rates** (34% vs 17% fully funded). "This build happens only if all 5 roles fill" imports that commitment signal to non-cash asks.
- **The U-curve and bystander effect:** pledges spike in week one and the final week and sag in the middle, because visible support licenses inaction until a deadline reintroduces urgency. Plan mid-campaign events (stretch needs, work-party reveals) structurally, not as an afterthought.
- **Small-ask legitimization:** "even one hour helps" raises participation without shrinking average commitment.
- **Named contributors give more.** Non-anonymous giving produces larger gifts; showing others' contributions raises giving ~17%; "just contributed" activity lifts conversion ~3.5%.
- **Updates are the retention engine:** campaigns posting updates are 40% more likely to receive contributions; over half of GoFundMe donations come from repeat donors.
- **Share receipts:** GoFundMe shows each person the ~$13 their share generated via unique share links. Ours becomes "your share brought in 6 volunteer hours."
- **Impact equivalence copy** ("$25 = a week of meals") lifted donations up to 258% in A/B tests. Ours: "4 hours = one raised bed built."

### The non-financial pooling graveyard (what to avoid)

- **Timebanks die of thin markets, ask-shame, and broker burnout.** Only ~21% of US community currency systems survived; activity always rested on a tiny stable core. A campaign page pre-aggregates demand around one project with concrete needs, which solves the thin-market problem. Keep pledges one-directional (toward a need), never exchange, which also sidesteps valuation fights and IRS barter questions.
- **Requests without capacity, deadline, or status quietly die** (Hylo's requests are posts with chat under them; they stall). Every need must be a slot with a count and a state.
- **P2P matching of low-value stuff is dead** (SnapGoods, NeighborGoods, Share Some Sugar all folded): transaction cost exceeds item value. Pooled custody with one steward and one handoff point works (myTurn, Lend Engine, Library of Things).
- **Flake rates run 40-60% for free commitments.** Mitigations with evidence: explicit accept (Planning Center), public named slots (~47% stickier), multi-touch reminders (1 week / 1 day / 2 hours), cancel-as-transfer with auto-backfilled waitlists (Golden), time-boxed pickup windows (Olio).
- **10-30% of claimed pledges are never fulfilled.** Claims must expire and auto-release with reminders. Never rely on manually flipped state (every manual registry rots).
- **Leaderboards backfire.** A 16-week longitudinal study found badges + leaderboards lowered intrinsic motivation and outcomes via forced social comparison. Peer-awarded recognition (Wikipedia barnstars: +60% productivity), rhythm-without-rank heatmaps, and trust levels that unlock capability (Discourse) all work. Paying or ranking visible altruism demonstrably backfires.
- **The gratitude artifact is the single highest-leverage retention mechanism** in the evidence (~30-38% repeat-giving lift): DonorsChoose requires impact photos and thank-you letters; Buy Nothing made gratitude posts a norm. Make "thanked" a pipeline stage, not a nicety.
- **Every dedicated platform in this space that died (ioby, Barnraiser, WeFarm) died of business-model starvation, not user rejection.** ioby is the closest precedent to us: volunteer pledge counts next to dollar thermometers, high-touch coaching, 3,800 projects, $21M raised, closed 2024 because nobody funded platform operations. We already have the fund + game as our model. Good.
- **Goteo (alive, 70% success rate vs ~40% industry norm)** lists non-monetary "collaborations" as first-class page elements next to money. Its caveat: money stays the default action unless non-cash asks get equally prominent UI and human coaching.

### The 8 (our 9) Forms of Capital, operationalized

Even the framework's authors concede multi-capital accounting is too abstract to ledger per-person (Soloviev's retrospective; Landua narrowed Regen Network to living capital only). The working pattern practitioners use: **quantify the measurable forms (material, living, financial, hours), narrate the nurture capitals (social, cultural, spiritual) through story capture.** Our codebase already has 9 capitals including health (`shared/capitals.ts:7-19`, migration 0126). Design needs around the quantifiable ones; capture the rest as stories and gratitude, never as scores.

---

## Part 3: The North Star

A crowdpool campaign is a **barn raising with a public ledger**. One page where a land project lists everything it needs to come alive: money (routed to partners), hours, roles, tools, vehicles, materials, lumber, plants, knowledge, prayer and ceremony. Every need is a visible slot. Every contribution is a named, celebrated, story-generating act. The page is alive (activity feed, updates, momentum), honest (public pool ledger, real counts, no fake data), and it feeds the game (score, tokens, profile, Living Tree).

The differentiator nobody else has: **the full capital stack, visualized.** Crowdpooled labor/tools/materials (in-kind, valued) + Ma Earth donations and matching (gift) + GoSteward loan (debt) + grants, all on one project page. GoSteward names "capital stack architecture" as a service; we render it.

Positioning sentence for all copy: *ReGen Civics tracks the capital money can't buy. Our partners handle the money.*

---

## Part 4: The ten foundational moves

### F1. Unify the two systems into one campaign model

Kill the split. The `campaigns` engine becomes the only source of truth. The `/crowd-pooling-projects` gallery becomes the discovery surface for real `campaigns` rows (status `active`, `funded`, `completed`). Sample projects either convert to clearly labeled seeded demo campaigns in the DB or get removed once one real campaign exists. `ProjectComparison.tsx` reads from the DB. One shared `<CampaignCard>` component replaces the three divergent card implementations.

### F2. The Need primitive (one slot grammar for everything)

Evolve `campaign_items` into a universal **Need**: title, photo, capital type, quantity wanted, quantity claimed, quantity fulfilled, deadline, named claimants, and a kind:

- `item` (materials, lumber, plants: "40 cedar posts, 12 of 40 claimed")
- `role` (ongoing: "Tool librarian for August, 0 of 1 filled")
- `shift` (dated work-party slots: "Sat June 6, 9am-1pm, 8 of 12 spots")
- `loan` (tool/vehicle custody window: "Wood chipper, June 1-30, condition checklist at handoff and return")
- `knowledge` (sessions: "2-hour pond design consult")
- `financial` (rendered as a partner link, never collected by us; see F5)

Big needs are group-claimable (a 40-hour need fills with ten 4-hour pledges; Babylist pattern: lock at 100%). Spread tiers so every contributor finds an entry point: a third small, a third medium, a third large.

### F3. The claim state machine: open → claimed → fulfilled → thanked

Decrement quantity at claim. Close at cap (kills duplicates and the "second disaster" junk problem). Claims auto-expire after N days with reminders at 1 week / 1 day (and 2 hours for shifts). Cancel offers "release my slot" or "invite a replacement" so flaking transfers commitment instead of deleting it, with auto-backfill from a waitlist. **Thanked is a required stage:** the campaign steward closes each fulfilled need with an impact photo or note, and the contributor gets it. Extend the existing `campaign_contributions.status` enum (`pending`,`accepted`,`rejected`,`withdrawn`,`fulfilled`) with `thanked`, plus `claimExpiresAt` and `acknowledgedAt`.

### F4. The public pool ledger (Open Collective's trust engine)

Every accepted contribution, cash or not, lands in one append-only public activity feed on the campaign page: "Jae pledged 6 hours of trail work," "Maria's chipper arrived," "3 donors gave on Ma Earth." Named by default, anonymous as opt-out. Transparency is the answer to the sector's biggest trust failure (fee opacity, dead pages). This also gives us the "someone just contributed" momentum toasts that lift conversion.

### F5. Partner rails, never payment rails

We collect zero money. Each campaign gets a **Financial Partners block** (modeled on Ma Earth's "This project is part of Round 3, matching provided by..." logo block):

- **Ma Earth** for gift funding: donations + quadratic matching ($500k pool, ~10x average match, 25-45x for donor-breadth projects, $2k-15k per project per round, zero platform fee, twice-yearly rounds; Round 4 opens April 22, 2027). Encourage projects to open a Ma Earth page; our crowdpool roster is exactly the unique-donor breadth QF rewards. CTA to our contributors: "Back this project with $10 on Ma Earth and multiply it."
- **GoSteward** for debt: loan participations from $100, 48-72 month terms, eligibility = regenerative practices + registered business 3+ years + debt service capacity. Their private-raise phase needs anchor lenders from the borrower's own network before going public at 20-25% funded; our roster is that warm network. Copy caution: "apply for a loan with our partner Steward," never language implying we arrange financing (they are an NMLS-registered lender).
- A short **eligibility quiz** routes projects: gift-stage and community-breadth → Ma Earth; revenue-generating and $100k+ capital need → GoSteward; both fit → both.

Financial progress renders as a **read-only hydrated bar**: both partners serve raised amount, contributor count, and percent funded as server-rendered text at stable URLs (`maearth.com/{org}/{project}`, `gosteward.com/projects/{farm}/{campaign}`). A nightly fetch-and-cache job hydrates it. No API dependency, no payment rails, no duplication of anything they built.

### F6. The dual-metric thermometer and the capital stack view

The primary meter toggles between **value pooled** and **people pooling** (supporter count resonates with community-motivated audiences). Below it, per-capital mini-meters surface whichever need is closest to completion (goal gradient). At the top of the page, the **capital stack bar**: in-kind (us) + gift (Ma Earth) + debt (GoSteward) + grants, one horizontal stacked visualization of the whole project. This view exists nowhere else in the ecosystem.

### F7. Game integration: contributing finally earns something

Wire what the spec already defines and STEERING section 5 already constrains:

- On contribution **accepted**: `recordScoreEvent` with the spec'd `crowdpool` referenceType and `scoring.weights.crowdpool_contribution = 20` (REGEN_GAMES_SPEC_V1.md:112,344).
- On contribution **fulfilled**: `db.creditPrivateTokens(...)` with a new source tag `crowdpool_contribution`, following the existing source-tag pattern (`gratitude_received`, `quest_completion`, ...). Amounts are an open decision (Part 11). Writes touch PRIVATE only, per the four absolute rules.
- Auto-create a verified `player_contributions` row (capital-typed) when a logged-in contributor's pledge is fulfilled, ending the disconnect between the two contribution systems. Anonymous contributors get a claim-your-contribution path on signup.
- Use the existing `crowdpool-to-contribution` bridge intent (server/lib/hypha-bridge/intents.ts:46) programmatically for any on-chain formalization, replacing raw `window.open(daoLink)`.
- "Established" project tier unlocks from funded campaigns per spec line 172.

### F8. The steward is a first-class role with tools

Every durable system in the research runs on a named local coordinator; every failed one burned that person out. Each campaign shows a **steward card** (Ma Earth's pattern) and the steward gets: unfilled-need reports, quiet-pledger views, claim-expiry queue, and a **weekly auto-digest** to all followers of new and nearly-complete needs (hOurworld's digest is the best-documented engagement win found). Steward-support roles ("tool librarian for August") are themselves pledgeable Needs. A **Lead Steward block** (Wefunder's Lead Investor pattern) features the experienced person who committed first, with their reasoning.

### F9. Engagement loops that respect the psychology

- **Updates journal** on every campaign, written as story installments (the retention benchmark is Milkywire's weekly field video and GlobalGiving's quarterly reports). Update count is public; a zero looks dead.
- **Unique share links with receipts**: "your share brought in 6 volunteer hours and $85 on Ma Earth."
- **Peer gratitude, no leaderboards.** Barnstar-style peer appreciation on contributions, contribution heatmaps without rank, milestone celebrations for the pool ("all 5 roles filled!"). This also matches the existing gratitude economy in the game.
- **Mid-campaign events by design:** stretch needs ("if we fill 10 more shifts we add a second workshop day") scheduled into the campaign template to break the U-curve slump.
- **No dead pages:** a completed pool converts to an evergreen "join the next season" page with its gratitude wall and impact story (Kickstarter Late Pledges logic; Open Collective's "designed for ongoing collaboration").

### F10. One visual language: warm, alive, ours

Merge the three styles into one system, keeping the dark-forest identity and learning from Ma Earth's warmth:

- Keep: dark forest palette (`#0d2818`, `#1a472a`, accent `#7dd87d`), glassmorphism cards, `AnimatedProgressBar`, `MomentumBadge`, `DeadlineCountdown`, the YouTube facade.
- Adopt from Ma Earth: serif/sans editorial pairing for campaign stories (field-journal warmth), full-bleed photography doing the emotional work, the fixed story skeleton (**Mission / The Crisis / The Solution / The Goal / How We Regenerate / Tracking Impact / In Numbers**) so quality stays high without blandness, named-people cards everywhere (steward, host, contributors), category chips with live counts, and the interactive matching **simulator** pattern (ours: "pledge 4 hours, see what it unlocks").
- Adopt from GoSteward: the **spec block** (what / when / how much / what happens next) at the top of every campaign, status badges, downloadable diligence docs for serious contributors, persistent project pages separate from campaigns.
- Consolidate hex literals into design tokens while touching these files (the repo carries ~5,000 raw hex values; don't fix all, fix what we touch).
- Campaign detail (`CampaignDetail.tsx`) migrates to the dark-forest system so cards, gallery, and detail feel like one product.

---

## Part 5: Campaign page anatomy (the spec)

Top to bottom. Every element earns its place with evidence from Part 2.

1. **Hero:** video (1.5-4 min) or full-bleed photo. Title, location, category chips, status badge, season badge.
2. **Spec block** (GoSteward pattern): project, location, phase, timeline, steward, "what happens when the pool fills."
3. **Capital stack bar:** in-kind + gift + debt + grants, one stacked visualization with partner logos.
4. **Dual thermometer:** value pooled ⇄ people pooling toggle, count-up animation (`useCountUp` exists), momentum badge, deadline countdown.
5. **The Needs Registry** (the heart of the page): needs grouped by capital type, each rendered as a slot card with photo, "N of M" meter, named claimants (avatar stack, real this time), deadline, and one CTA: Claim. Sorted with nearest-to-complete first (goal gradient) and the steward's priority picks pinned.
6. **Financial Partners block:** Ma Earth card (round status, raised + match, "Give $10, multiply it") and GoSteward card (loan status, "Anchor their raise"), read-only hydrated numbers, clear "you'll complete this on our partner's site" copy.
7. **Lead Steward block:** who committed first and why.
8. **Story** (Ma Earth skeleton): Mission / Crisis / Solution / Goal / How We Regenerate / Tracking Impact / In Numbers. First person. Photos and GIFs demonstrating, half the first-draft words cut.
9. **Pool ledger / activity feed:** named contributions of every kind, "See all / See top," live.
10. **Updates journal:** numbered, public count, story-styled.
11. **Contributors wall:** people cards, peer-gratitude reactions, group-claim progress on big needs.
12. **Team + steward cards** with contact.
13. **Location map** with "show nearby projects" (lat/lng fields exist, currently stubbed at 0).
14. **FAQ + downloadable docs** for serious contributors.
15. **Sticky action rail** (mobile-first): Claim a need / Give via Ma Earth / Share (unique link). The contribute flow stays under 4 steps (cutting form fields from 11 to 4 raised conversions 120%).

**The claim flow (3 steps, no account required, account rewarded):** pick the need → commit (name, email, the need-specific detail, optional message to the project) → confirmation with calendar file for shifts, reminder schedule, and a soft "create your player profile so this counts toward your Living Tree." Explicit accept by the steward converts pledge to commitment (Planning Center pattern). Existing `ContributionModal.tsx` is the right skeleton; it gains claim-against-a-need semantics instead of freeform offers.

**"Offer something else":** freeform offers stay possible (Goteo keeps them first-class) but the registry is the default. Freeform offers route to the steward as proposals, exactly like today's `pending` flow.

---

## Part 6: Data model changes (concrete)

Follow the migration runner discipline (`npx tsx scripts/run-migration.ts`). New numbered migrations, no drizzle-kit generate.

| Change | Detail |
|---|---|
| `campaign_items` → richer Need | Add `kind` enum (`item`,`role`,`shift`,`loan`,`knowledge`,`financial_link`), `capitalType` (reuse the 9-capital enum from `player_contributions`), `quantityWanted`, `quantityClaimed`, `quantityFulfilled`, `deadline`, `shiftStartsAt`/`shiftEndsAt`, `loanWindowStart`/`loanWindowEnd`, `groupClaimable`, `priorityPinned` |
| `campaign_contributions` | Add `campaignItemId` claim semantics: `claimExpiresAt`, `acknowledgedAt`, `quantityPledged`; extend status enum with `thanked`; add `shareToken` attribution column (`referredBy`) |
| New `campaign_updates` | `campaignId`, `authorId`, `title`, `body`, `imageUrls` JSON, `publishedAt`, `updateNumber` |
| New `campaign_followers` | `campaignId`, `userId`/`email`, `source` (replaces the fake GetNotifiedForm; feeds the weekly digest) |
| New `campaign_partner_links` | `campaignId`, `partner` enum (`maearth`,`gosteward`,`grant`,`other`), `url`, `cachedRaised`, `cachedContributorCount`, `cachedPercent`, `lastFetchedAt` |
| New `contribution_gratitude` | `contributionId`, `fromUserId`, `emoji`/`note`, peer-awarded (barnstar pattern) |
| Aggregations | `contributorsCount` computed from accepted contributions (fixes campaigns.ts:60); gallery banner sums real data; deprecate manual `currentAmount`/`contributorCount` on `crowd_pooling_projects` |
| Deprecations | `crowd_pooling_projects` + `crowd_pooling_proposals` fold into `campaigns` (migrate any real rows, then retire); `saved_contributions` stays (the Tool remains as a planning aid that can now submit into a claim) |
| Ledger | Token credits flow through `user_token_ledger` with source `crowdpool_contribution`, append-only as always |

Cron jobs (extend the existing nightly pattern next to `cancelStaleClaimBridges`): claim-expiry sweep with reminder sends, partner-progress fetch-and-cache, weekly steward digest.

Email: re-enable contribution status emails via Resend (they're written and commented out at campaigns.ts:333-342). Reminders for shifts need the 1 week / 1 day / 2 hours cadence.

---

## Part 7: What we will NOT build

Anti-goals, each one a grave in the research graveyard:

1. **No payment processing.** Partners own money movement. We never touch a card number.
2. **No person-to-person exchange or timebank mechanics.** Pledges flow one direction, toward a project's needs. No hour-for-hour accounting between members, no barter valuation disputes, no IRS questions.
3. **No P2P tool matching.** Tool loans are pooled custody: project as custodian, one handoff in, one handoff back, condition checklist both ways.
4. **No leaderboards ranking people.** Pool-level milestones and peer gratitude only. Ranking visible altruism backfires.
5. **No per-person social/cultural/spiritual capital scores.** Quantify material, living, financial, hours. Narrate the rest. Even the framework's authors say multi-capital ledgers are too abstract.
6. **No duplicate of anything Hypha, Ma Earth, or GoSteward already runs.** On-chain formalization goes through the existing bridge intent. Donations go to Ma Earth. Loans go to GoSteward.
7. **No unlabeled fake data, ever again.** Real counts or no counts. A fake avatar stack is borrowed trust we haven't earned.

---

## Part 8: Phased roadmap

Each phase ships independently and passes the ship gate. Order chosen so trust-breaking problems die first.

**Phase 1: One honest system (foundation)**
Unify A + B: gallery lists real DB campaigns, shared `<CampaignCard>`, per-campaign routes + share links + crawler HTML, real `contributorsCount`, real GetNotified → `campaign_followers`, re-enable emails, enable "List Project" CTA → existing creation wizard, seeded demo campaigns clearly labeled or removed. Kill fixes #1-#7 from Part 1.

**Phase 2: The Needs Registry**
Need primitive migration, claim state machine with expiry + reminders + waitlist backfill, group claims, shift and loan kinds, the 3-step claim flow, registry section on campaign detail, steward review queue upgrade in `CampaignManage.tsx`.

**Phase 3: Alive and grateful (engagement)**
Pool ledger / activity feed, updates journal, gratitude stage + peer appreciation, unique share links with receipts, weekly digest, momentum toasts, mid-campaign stretch needs, evergreen completed-campaign pages.

**Phase 4: Partners and the capital stack**
`campaign_partner_links` + nightly hydration, Financial Partners block, capital stack bar, eligibility quiz routing projects to Ma Earth / GoSteward, partner-aware copy (round status for Ma Earth, "apply with our partner" framing for Steward), pledge simulator.

**Phase 5: The game connects**
Score events (`crowdpool`, 20 pts), token credits (`crowdpool_contribution` source, amounts per Part 11), auto-verified `player_contributions` on fulfillment, claim-your-contribution on signup, bridge intent replaces raw daoLink opens, "Established" tier unlock, Living Tree reflects pooled capital.

**Phase 6: Polish to world-class**
Design token consolidation on touched files, `CampaignDetail.tsx` visual migration, serif/sans editorial pass, map view with real lat/lng, `ProjectComparison.tsx` on DB data, downloadable diligence docs, accessibility pass (this audience includes people far outside tech).

---

## Part 9: Decisions (RESOLVED by Rye, 2026-07-17)

1. **Tokens: none.** No platform token credits for crowdpool contributions. Contributors are pooling their resources; Hypha issues project tokens to people through the project's DHO. Score events (20 pts) and gratitude remain as recognition, awarded on delivery.
2. **Partners: name and link them.** Rye contacts Ma Earth and GoSteward directly.
3. **Demo data: keep, labeled.** Sample projects become seeded demo campaigns with a clear Example label, plus visible copy that first real projects launch late 2026 / early 2027.
4. **Claim expiry: confirmed** (14 days items, 7 days shifts), with the principle made explicit: claims that don't land aren't paid. Time and resources count only on delivery, so every payoff (score, Living Tree, Hypha formalization, progress bars) fires on `fulfilled`, never on `accepted`.
5. **Anonymous claiming: stays open.**
6. **Timing: Phases 1-3 build immediately.**

Full implementation detail in `CROWDPOOLING_PLATFORM_SPEC.md`.

---

## Part 10: Handoff breakdown

| Work | Who | Notes |
|---|---|---|
| All schema migrations, routers, UI, cron jobs, tests | Claude Code | Standard deploy flow, ship gate, migration runner |
| Fix list #1-#7 (Phase 1) | Claude Code | No decisions needed, can start immediately |
| Token amounts + claim windows + demo data call | Rye | Part 9, items 1, 3, 4, 5 |
| Ma Earth + GoSteward partnership conversations | Rye | Part 9 item 2; intro emails can be drafted on request (regen-outreach-sequences) |
| Campaign photography / brand imagery for seeded campaigns | Rye | Or nano-banana generation as placeholder, labeled |
| Resend email templates approval | Rye | Copy drafted by Claude, voice check by Rye |
| Season timing decision | Rye | Part 9 item 6 |

---

## Appendix: Sources

**Conversion + crowdfunding science:** goal gradient (CMU Loewenstein, cmu.edu/dietrich/sds/docs/loewenstein/GoalGradBeh.pdf; Fundraise Up thermometer research), U-curve + bystander effect (Kuppuswamy & Bayus, ssrn.com/abstract=2234765), all-or-nothing vs keep-it-all (Cumming et al., Financial Management, doi 10.1111/fima.12262), matching funds (J-PAL; Science Advances 10.1126/sciadv.ade7987), anonymity + social proof (Nature Communications s41467-019-11852-z), small-ask legitimization (Cialdini & Schroeder 1976 + Sage meta-analysis 10.1177/0093650215602308), form friction (GoFundMe Pro; Feathr), share receipts (GoFundMe unique share links; Amplitude case study), updates +40% (Sci-Tech Today GoFundMe stats), page anatomy (BackerKit design guide; Kickstarter creator docs; Wefunder pitch guide; Fintech Labs UX checklist), late pledges (features.kickstarter.com/late-pledges), Open Collective ledger (opencollective.com/how-it-works), GlobalGiving vetting + reports, Milkywire weekly impacter updates, civic crowdfunding in-kind (SSIR on ioby; Spacehive wishlists; OECD working paper).

**Partners:** Ma Earth (maearth.com; help.maearth.com funding model, quadratic funding, platform fees, host partners; certified.app), GoSteward (gosteward.com/borrow; help.gosteward.com loan servicing; Green Acres Milling capital stack example).

**Non-financial pooling:** timebank survival rates (Collom, 10.1068/a37172), German timebank core-periphery study (Springer 978-3-030-71147-4_7), TimeRepublik/hOurworld/Simbi mechanics, Karrot activity slots (docs.karrot.world), Hylo request stalling (Terran Collective, Medium), Buy Nothing app collapse (Wired), mutual aid dispatcher burnout (Frontiers in Psychology; Beeck Center), Olio missed-collection escalation, myTurn/Lend Engine/Library of Things loan UX, P2P sharing graveyard (Fast Company "The sharing economy is dead"), SignUpGenius slot pattern, Golden swap-not-cancel, Meetup no-show experiments, Planning Center accept/decline, volunteer no-show research (VolunteerHub; commitment devices, learningloop.io), registry patterns (Zola group gifting; Babylist; DonorsChoose escrow + thank-you package; Stanford donor retention study, cs.stanford.edu/people/jure/pubs/donors-www15.pdf; Purposity; unfulfilled pledges, Bonterra; second disaster, Team Rubicon), gamification (Wikipedia barnstars, PLOS ONE 10.1371/journal.pone.0034358; Hanus & Fox leaderboard study; Discourse trust levels; blood donation incentives, CEPR), 8 Forms of Capital (Roland & Landua via resilience.org; Regenerative Enterprise ch. 2; Soloviev retrospective, Medium/terra-genesis), precedents (Goteo, en.goteo.org + patternsofcommoning.org; ioby closing letter, ioby.org/resources/closing; Barnraiser; Timeraiser; Crop Mob; WeFarm → Producers Direct; Spacehive).
