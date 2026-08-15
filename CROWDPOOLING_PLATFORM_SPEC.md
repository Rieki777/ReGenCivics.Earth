# Crowdpooling Platform Spec (Complete)

**Date:** 2026-07-17
**Status:** READY TO BUILD. Rye's six decisions from CROWDPOOLING_MASTER_PLAN.md Part 9 are locked and baked in below.
**Companion docs:** `CROWDPOOLING_MASTER_PLAN.md` (research + rationale), `CROWDPOOLING_OVERVIEW.md` (plain-language model for campaign runners).
**Build order:** Phases 1-3 ship now. Phases 4-6 follow.

## Locked decisions

| # | Decision | Consequence in this spec |
|---|---|---|
| 1 | **No platform token credits for crowdpool contributions.** Contributors pool resources; Hypha issues project tokens. | Zero calls to `creditPrivateTokens` anywhere in crowdpooling. Recognition = score events + gratitude + Living Tree. Project tokens flow through the `crowdpool-to-contribution` bridge intent to the project's DHO. |
| 2 | Partners named and linked publicly. Rye handles outreach. | Financial Partners block ships with Ma Earth + GoSteward names, links, logos pending Rye's conversations. |
| 3 | Demo data stays, clearly labeled. First real season late 2026 / early 2027. | Sample projects convert to seeded DB campaigns with a `isDemo` flag and visible "Example" treatment. Season banner stays until launch. |
| 4 | Claims that don't land aren't paid. Time and resources count only on delivery. | Everything of value fires on `fulfilled`, never on `accepted`: score events, player_contributions, Hypha formalization, capital stack numbers. Progress bars show **delivered (solid) + accepted pledges (ghost overlay)**. |
| 5 | Anonymous claiming stays open. | `submitContribution` stays `publicProcedure`. Claim-your-contribution path on signup links past pledges by email. |
| 6 | Phases 1-3 land now. | Phase 1-3 sections below are written as executable work orders. |
| 7 | **Crypto is trackable money on-platform.** National currency routes to partners. | `financial` contributions become crypto pledges (wallet-based, tracked like any other pledge, delivered on receipt). Fiat asks render only as partner links (Ma Earth donations, GoSteward loans). The ContributionModal's paymentMethod drops cash/wire/check; crypto stays. |
| 8 | **All 9 capitals covered, with social/health/cultural/spiritual held as roles.** | A shared taxonomy module becomes the single language: every need, every calculator category, every role template carries a `capitalType`. Role templates expand across all 9 capitals (community organizer, conflict evolutionary, dance coordinator, yoga instructor, massage therapist, community fitness, guide, ceremony holder, and so on). |
| 9 | **The campaign engine, the Crowd Pooling Tool, and the Contribution Calculator speak one language.** | New `shared/crowdpoolingTaxonomy.ts` exports the canonical categories (each mapped to a capital + need kind) and 9-capital role templates. CrowdPoolingTool's 9 flat categories, CalculatorWeightsSheet's 8-capital weights, the wizard's templates, and ContributionModal all import from it. The Calculator gains the 9th capital (health). |

### Addendum: the shared taxonomy (decision 8 + 9)

`shared/crowdpoolingTaxonomy.ts` is the single source of truth:

- `NEED_KINDS`: `item`, `role`, `shift`, `loan`, `knowledge`, `crypto`, `financial_link`.
- `CONTRIBUTION_CATEGORIES`: every category a contributor can bring, each with `key`, `label`, `capital` (from `CAPITAL_TYPES` in shared/capitals.ts), default `kind`, and examples. The Tool's old flat categories (land, money, vehicles, farming, tools, building, technology, housing) remap onto these with capitals attached.
- `ROLE_TEMPLATES_BY_CAPITAL`: named roles per capital that a community needs held. Social: Community Organizer, Conflict Evolutionary, Welcome Steward, Events Weaver. Cultural: Dance Coordinator, Storyteller, Ceremony Arts, Traditions Keeper. Spiritual: Guide, Ceremony Holder, Meditation Leader. Health: Yoga Instructor, Massage Therapist, Community Fitness Leader, Herbalist. Intellectual: Permaculture Designer, Governance Advisor, Educator. Experiential: Workshop Facilitator, Apprenticeship Mentor, Build Lead. Living: Land Steward, Nursery Manager, Seed Keeper. Material: Carpenter, Builder, Mechanic. Financial: Fundraising Steward, Bookkeeper, Capital Stack Coordinator.
- Crypto: `financial` needs carry `acceptedTokens`/wallet context and render an on-platform pledge flow; fiat renders as `financial_link` partner CTAs only.

Consumers: CreateCampaign wizard sections and templates, ContributionModal, CrowdPoolingTool, CalculatorWeightsSheet (gains health as the 9th capital), campaign needs registry, and the fulfilled → `player_contributions.capitalType` write.

---

## Part A: The model in one page

**Campaign** = a land project's public ask, built from its incubator application (`campaigns.applicationId`). One page, one steward, one deadline, status lifecycle `draft → pending_review → active → funded → completed` (`cancelled`/`rejected` exits).

**Need** = one slot on the campaign. Kind: `item` (materials, plants, lumber), `role` (ongoing position), `shift` (dated work-party slot), `loan` (tool/vehicle custody window), `knowledge` (session), `financial_link` (rendered as partner CTA, never collected by us). Every need has quantity wanted / claimed / delivered, a capital type (the 9-capital enum), and optionally a deadline.

**Claim** = a named commitment against a need. Lifecycle:

```
pending ──steward accepts──> accepted ──delivery confirmed──> fulfilled ──steward thanks──> thanked
   │                            │
   └─ rejected / withdrawn      └─ expired (claim window passes, quantity released, waitlist backfills)
```

- **accepted** reserves quantity and shows as ghost progress. Nothing is "counted" yet.
- **fulfilled** is the payoff moment: solid progress, score event, Living Tree credit, eligibility for Hypha project-token formalization, gratitude.
- **thanked** closes the loop: steward attaches an impact note/photo, contributor gets it.

**Pool Ledger** = the public activity feed of every accepted and fulfilled contribution, named by default.

**Money** never touches us. Ma Earth (gifts + quadratic matching) and GoSteward (loans) are linked partners; their numbers hydrate read-only.

**Game hooks** (all recognition, no platform tokens):
- Score: `recordScoreEvent(userId, "crowdpool_contribution", "scoring.weights.crowdpool_contribution", "crowdpool", contributionId)` on **fulfilled**. The `crowdpool` referenceType already exists in the `contribution_score_events` enum (drizzle/0096_game_system.sql:53). Seed the weight row (spec value 20, REGEN_GAMES_SPEC_V1.md:112).
- Living Tree: on **fulfilled**, auto-create a `verified` row in `player_contributions` with the need's `capitalType`. `players.capitalScores` already aggregates that table into the tree (server/routes/players.ts:929-944).
- Gratitude: add `"contribution"` to the gratitude router's `sourceType` enum so anyone can send gratitude on a fulfilled contribution. Distribution stays cycle-close, untouched.
- Tier: `applications.fundedCampaignCount` + `projectStatus` enum (`established` exists at schema.ts:141) update when a campaign reaches `funded`.
- Hypha: on **fulfilled**, steward or contributor can formalize via `bridgeToHypha("crowdpool-to-contribution", ...)` (intent exists, server/lib/hypha-bridge/intents.ts:46-50, currently unwired). The project's DHO issues project tokens there. Store `hyphaBridgeKey` on the contribution row.

---

## Part B: Data model changes

Hand-written migrations via `npx tsx scripts/run-migration.ts`. Never drizzle-kit generate. Update `drizzle/schema.ts` types alongside.

### Migration A: needs upgrade (`campaign_items`)

```sql
ALTER TABLE campaign_items
  ADD COLUMN kind ENUM('item','role','shift','loan','knowledge','financial_link') NOT NULL DEFAULT 'item',
  ADD COLUMN capitalType ENUM('intellectual','social','material','financial','living','cultural','spiritual','experiential','health') NULL,
  ADD COLUMN quantityWanted INT NOT NULL DEFAULT 1,
  ADD COLUMN quantityClaimed INT NOT NULL DEFAULT 0,
  ADD COLUMN quantityDelivered INT NOT NULL DEFAULT 0,
  ADD COLUMN needDeadline TIMESTAMP NULL,
  ADD COLUMN shiftStartsAt TIMESTAMP NULL,
  ADD COLUMN shiftEndsAt TIMESTAMP NULL,
  ADD COLUMN loanWindowStart TIMESTAMP NULL,
  ADD COLUMN loanWindowEnd TIMESTAMP NULL,
  ADD COLUMN groupClaimable TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN priorityPinned TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN imageUrl VARCHAR(512) NULL;
```

Backfill: existing `category` maps to `kind` (`land`→`item` capitalType `living`; `equipment`→`item`/`loan` capitalType `material`; `role`→`role` capitalType by role; `resource`→`item` capitalType `material`). Keep `category` for back-compat reads; new UI keys off `kind` + `capitalType`.

### Migration B: claims upgrade (`campaign_contributions`)

```sql
ALTER TABLE campaign_contributions
  MODIFY COLUMN status ENUM('pending','accepted','rejected','withdrawn','fulfilled','expired','thanked') NOT NULL DEFAULT 'pending';
ALTER TABLE campaign_contributions
  ADD COLUMN quantityPledged INT NOT NULL DEFAULT 1,
  ADD COLUMN claimExpiresAt TIMESTAMP NULL,
  ADD COLUMN acknowledgedAt TIMESTAMP NULL,
  ADD COLUMN acknowledgedNote TEXT NULL,
  ADD COLUMN acknowledgedImageUrl VARCHAR(512) NULL,
  ADD COLUMN referredBy VARCHAR(16) NULL,
  ADD COLUMN isAnonymous TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN hyphaBridgeKey VARCHAR(16) NULL,
  ADD COLUMN playerContributionId INT NULL;
```

`thanked` is a superset of fulfilled (delivery already confirmed). `expired` is terminal, set by the nightly sweep.

### Migration C: new tables

```sql
CREATE TABLE campaign_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaignId INT NOT NULL,
  authorId INT NOT NULL,
  updateNumber INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  imageUrls JSON NULL,
  publishedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX campaign_updates_campaign_idx (campaignId)
);

CREATE TABLE campaign_partner_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaignId INT NOT NULL,
  partner ENUM('maearth','gosteward','grant','other') NOT NULL,
  label VARCHAR(255) NULL,
  url VARCHAR(512) NOT NULL,
  cachedRaised INT NULL,
  cachedContributorCount INT NULL,
  cachedPercent INT NULL,
  lastFetchedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX campaign_partner_links_campaign_idx (campaignId)
);
```

### Migration D: flags, follows, gratitude, forum

```sql
ALTER TABLE campaigns
  ADD COLUMN isDemo TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN forumPostId INT NULL,
  ADD COLUMN seasonId INT NULL;
-- user_follows.targetType: extend enum with 'campaign'
ALTER TABLE user_follows
  MODIFY COLUMN targetType ENUM('user','category','bioregion','tag','campaign') NOT NULL;
-- notifications.type: extend enum with 'campaign_update'
```

Followers reuse the polymorphic `user_follows` table (schema.ts:2853). Email-only followers (no account, from GetNotified) get a minimal `campaign_followers` table: `id, campaignId, email, name, createdAt, unsubscribeToken`.

### Config seeds (`game_variables`, pattern: scripts/seed-bounty-config.ts)

| key | value | notes |
|---|---|---|
| `scoring.weights.crowdpool_contribution` | 20 | per REGEN_GAMES_SPEC_V1.md:112; fires on fulfilled |
| `crowdpool.claim_expiry_days_item` | 14 | decision #4 |
| `crowdpool.claim_expiry_days_shift` | 7 | |
| `crowdpool.claim_expiry_days_loan` | 14 | |
| `crowdpool.reminder_days_before_expiry` | 3 | |

Read via `getGameVariable("crowdpool.<key>")` (server/game/index.ts:13, 5-min cache). Admin edits flow through the existing `game.updateVariable` path.

---

## Part C: Server spec

All in `server/routes/campaigns.ts` unless noted. Existing procedures stay; changes and additions below.

### Changed procedures

**`campaigns.getById`**: return real `contributorsCount` (distinct accepted+fulfilled+thanked contributor emails), replacing the hardcoded 0 at line 60. Also return `updatesCount`, `followersCount`, `partnerLinks`, `needs` (items with new columns), and `pooledDelivered` / `pooledAccepted` splits.

**`campaigns.list`**: add `isDemo` to output; exclude demo campaigns from counts shown in the gallery impact strip; support `sort` param (`most-funded`, `ending-soon`, `newest`, `most-contributors`) server-side.

**`campaigns.submitContribution`** (stays `publicProcedure`, decision #5):
- Accepts `campaignItemId` as a claim against a specific need with `quantityPledged`.
- Guards: need not already at cap (`quantityClaimed + quantityPledged <= quantityWanted` unless `groupClaimable` handles partial), campaign `active`.
- Sets `claimExpiresAt` from the `crowdpool.claim_expiry_days_*` variable by need kind.
- Widen sanitization: run `sanitizeInput` on ALL free-text fields (today only title + description, a known gap).
- Records `referredBy` share token if present.
- Notifies owner (existing `notifyIfEnabled("campaignContributions")`).

**`campaigns.updateContributionStatus`**: statuses extend to `accepted | rejected | fulfilled | thanked`.
- On `accepted`: increment `quantityClaimed` on the need; ghost-pledge totals recompute; notification + email (re-enable the commented-out Resend sends at campaigns.ts:333-342; templates `contributionAccepted`/`contributionRejected`/`contributionFulfilled` already exist in server/_core/email.ts).
- On `fulfilled` (the payoff moment, decision #4):
  1. increment `quantityDelivered`, recompute delivered totals,
  2. `recordScoreEvent(contribUserId, "crowdpool_contribution", "scoring.weights.crowdpool_contribution", "crowdpool", contributionId)` when the contributor has an account,
  3. auto-create `player_contributions` row (`status: 'verified'`, capitalType from the need, estimatedValue from the contribution) and store `playerContributionId` back,
  4. `logActivityEvent` for the Pool Ledger,
  5. notification + `contributionFulfilled` email.
- On `thanked`: requires `acknowledgedNote` (photo optional), sets `acknowledgedAt`, notifies contributor.
- Never any `creditPrivateTokens` call (decision #1).

**`campaigns.updateStatus`**: when moving to `active`, set `startedAt` and `publishedAt` (currently never set, which breaks progress-tracker time math). When `funded`/`completed`: bump `applications.fundedCampaignCount`, run `projectStatus` promotion check.

### New procedures

| Procedure | Access | Purpose |
|---|---|---|
| `campaigns.createUpdate` / `listUpdates` | owner / public | Updates journal. `updateNumber` auto-increments per campaign. Publishing fans out `campaign_update` notifications to followers (account holders) and queues digest email (email-only followers). |
| `campaigns.follow` / `unfollow` | protected | Writes `user_follows` with `targetType: 'campaign'`. |
| `campaigns.subscribeByEmail` | public + rate-limited | Replaces the fake GetNotifiedForm. Writes `campaign_followers`. Double-opt-in not required for v1; unsubscribe token in every email. |
| `campaigns.claimMyContributions` | protected | Links past anonymous contributions to the new account by verified email (decision #5). |
| `campaigns.formalizeOnHypha` | protected (steward or contributor of a `fulfilled` contribution) | Calls `bridgeToHypha("crowdpool-to-contribution", payload)` with the project's DHO slug, stores `hyphaBridgeKey`. Hypha issues project tokens in the DHO flow (decision #1). Bridge status renders from `hyphaBridges.status`. |
| `campaigns.addPartnerLink` / `removePartnerLink` | owner/admin | Manage `campaign_partner_links`. |
| `campaigns.getShareLink` | protected | Returns per-user share URL `?ref=<hash>` reusing the existing `btoa(userId).slice(0,8)` scheme from `server/routes/sharing.ts`; share stats per campaign via existing `share_events` + `referrals`. |
| `gratitude.send` (existing router) | protected | Add `"contribution"` to the `sourceType` z.enum. Recipient stays the contributor's userId. No schema change (varchar column). |

### Cron jobs (extend nightly batch, server/routes/batchJobs.ts `runNightly` + `/api/cron/nightly-batch`)

1. **Claim expiry sweep**: contributions `accepted` past `claimExpiresAt` → `expired`, release `quantityClaimed`, notify contributor + steward, promote first waitlisted pledge if any. Reminder notification at `reminder_days_before_expiry`.
2. **Shift reminders**: 1 week / 1 day before `shiftStartsAt` to accepted claimants (email + in-app; the 2-hour touch waits for push maturity).
3. **Partner hydration**: fetch each `campaign_partner_links.url`, parse raised/contributors/percent from Ma Earth and GoSteward server-rendered pages, write cached values. Failures leave stale cache + `lastFetchedAt` untouched; UI shows "as of {date}".
4. **Weekly steward digest** (piggyback `runDigestJob` weekly slot): per active campaign, email steward unfilled needs, expiring claims, new followers, pending reviews.

### Emails

Re-enable the three existing templates. Add: `campaignUpdatePublished` (followers), `claimReminder`, `claimExpired`, `shiftReminder`, `stewardWeeklyDigest`. All through `sendEmail` (server/_core/email.ts) with its EMAIL_HOLD kill switch and rate limits; honor `player_profiles.emailDigestFrequency = 'never'`.

### Security

- Rate limits: reuse default sliding window for `campaign_contribution`; add `campaign_follow_email` action.
- Sanitize all free-text contribution fields (`sanitizeInput`).
- PII stripping in public reads stays exactly as is (getContributions strips email/phone/bio/notes).
- `isAnonymous` contributions render as "A contributor" in the Pool Ledger and contributor walls, PII still available to owner.
- Anti-abuse on `subscribeByEmail`: rate limit + no reflection of whether an email already exists.

---

## Part D: Client spec

### Routing changes (client/src/App.tsx)

| Route | Change |
|---|---|
| `/campaigns` | Becomes the real discovery page (kill the redirect at App.tsx:335). Renders the gallery listing DB campaigns. `/crowd-pooling-projects` 301s here (old links keep working). |
| `/campaign/:id` | Stays; upgraded per anatomy below. |
| `/crowd-pooling` | Stays as the planning Tool; gains "Submit as claim" when arriving with `?campaign=` param. |
| `/create-campaign` | Stays. |

### The gallery (`/campaigns`, evolves CrowdPoolingProjects.tsx)

- Lists real `campaigns` (status `active`, `funded`, `completed`) via `campaigns.list`. Demo campaigns render with a persistent "Example" badge (decision #3) and never count in the impact strip.
- Season banner stays: "Our first season of crowdpooling goes live late 2026 / early 2027" until Rye removes it.
- Keep the shipped visual system: dark forest, glassmorphism cards, `AnimatedProgressBar` (its ghost "proposed" overlay becomes the **accepted-pledge ghost layer**, solid = delivered, per decision #4), `MomentumBadge`, `DeadlineCountdown`, filters/sort/tabs.
- Real `AvatarStack` from actual contributor names (accepted+), initials only, `isAnonymous` respected. Delete `AVATAR_INITIALS` fake data.
- Card click navigates to `/campaign/:id` (real route, shareable). `ProjectDetailModal` retires.
- `GetNotifiedForm` wires to `campaigns.subscribeByEmail`.
- "List Project" CTA enables → `/create-campaign`.

### Campaign detail (`/campaign/:id`) anatomy

Master plan Part 5 is the layout contract. Deltas from current CampaignDetail.tsx:

1. Header + spec block (project, location, phase, steward, deadline, "what happens when the pool fills").
2. **Dual thermometer**: value toggle (pooled value ⇄ people), solid = delivered, ghost = accepted pledges.
3. **Capital stack bar** (Phase 4): in-kind delivered + Ma Earth cached + GoSteward cached + grants.
4. **Needs Registry** replaces the flat items tabs: needs grouped by capital type, each a slot card ("3 of 5 filled", claimant avatars, deadline, Claim CTA). Nearest-to-complete sorts first; `priorityPinned` overrides.
5. **Financial Partners block** (Phase 4): Ma Earth + GoSteward cards, cached numbers, "you'll complete this on our partner's site" copy.
6. **Pool Ledger**: activity feed from accepted/fulfilled events, named, "See all / See top".
7. **Updates journal**: numbered, public count.
8. Contributors wall with gratitude buttons (existing gratitude UI pattern, new `contribution` sourceType).
9. Story sections (existing Project Details fields reorganized into the Ma Earth skeleton: Mission / Crisis / Solution / Goal / How We Regenerate / Tracking Impact / In Numbers).
10. Follow button (account) + email subscribe (no account) + per-user share link.
11. Milestones stay inferred (CampaignMilestones.tsx) with new delivered-based math.

### Claim flow (evolves ContributionModal.tsx)

Three steps, under 4 form screens total:
1. **Pick a need** (or "offer something else" → freeform, today's flow).
2. **Commit**: name*, email*, quantity (if group-claimable), need-specific detail (condition for items, availability for shifts/roles), optional message, `isAnonymous` toggle. estimatedValue prefilled from the need, editable.
3. **Confirmation**: what happens next (steward review → delivery → celebration), calendar file (.ics) for shifts, reminder expectations, soft prompt "create your player profile so this feeds your Living Tree" (decision #5: never required).

### Steward dashboard (evolves CampaignManage.tsx)

Adds: needs editor (CRUD needs with kinds/quantities/deadlines), claim review queue with expiry countdowns, **Mark delivered** action (the fulfilled trigger), **Send thanks** action (note + photo, sets thanked), updates composer, followers count, partner links manager, share stats.

### The Tool (CrowdPoolingTool.tsx)

Stays the planning aid. One change: arriving via `?campaign=<id>` shows "Submit to campaign" which converts line items to claims against matching needs (or freeform contributions), calling `submitContribution` per item. `crowdPoolingProposalsRouter` and its orphan `submit` endpoint retire after this lands.

### Demo data (decision #3)

The 4 `sampleProjects` convert to seeded DB campaigns (`isDemo: 1`, script `scripts/seed-demo-campaigns.ts`) with their images and copy. Every demo surface shows the "Example" badge + the season line. `ProjectComparison.tsx` reads DB campaigns and inherits demo labeling. Delete the hardcoded arrays after seeding.

### SEO / sharing

- Per-campaign crawler HTML: extend `server/_core/crawler-content.ts` (`resolveCrawlerContent`) with a `/campaign/:id` resolver (forum-post pattern).
- OG images: `server/routes/og.ts` already has `campaignTemplate` + `case "campaign"`; point campaign pages' meta at it.
- Share sheet uses `campaigns.getShareLink` URLs; `share_events` records via existing `sharing.trackShare`.

---

## Part E: Build phases (1-3 now)

### Phase 1: One honest system

1. Migration D flags (`isDemo`, `seasonId`) + seed demo campaigns + delete hardcoded arrays (gallery + ProjectComparison).
2. Gallery reads real campaigns; `/campaigns` becomes the page; old route 301s; per-campaign share links via real routes.
3. Real `contributorsCount` (campaigns.ts:60), `startedAt`/`publishedAt` set on activation.
4. GetNotified → `campaign_followers` (+ migration), rate-limited.
5. Re-enable contribution emails.
6. Real AvatarStack; delete fakes.
7. "List Project" CTA enabled.
8. Crawler HTML + OG wiring for `/campaign/:id`.
9. Widen contribution sanitization.
10. Tests: extend server/contributions.test.ts patterns (createCaller + skipIfNoDb); fix the stale "111" password assertion in campaign.test.ts (server default is "222").

### Phase 2: The Needs Registry

1. Migrations A + B + config seeds.
2. Needs editor in steward dashboard; wizard step upgrades (each section emits needs with kind + capitalType + quantity).
3. Claim flow against needs; quantity guards; claim expiry stamping.
4. Nightly claim-expiry sweep + reminders + waitlist backfill.
5. Needs Registry section on campaign detail; delivered/ghost thermometer semantics everywhere (decision #4).
6. Mark delivered + fulfilled side effects (score event, player_contributions, activity event). Verify by test: fulfilled fires exactly once, expired claims release quantity.
7. Tool "Submit to campaign"; retire proposals router.

### Phase 3: Alive and grateful

1. Pool Ledger feed (reuse `activity_feed_events` via `logActivityEvent` with `targetType: 'campaign'`).
2. Updates journal (migration C table, composer, public feed, follower fan-out through `notifications` + digest job `DIGESTABLE_TYPES` + new type `campaign_update`).
3. Follow/unfollow (`user_follows` enum extension) + weekly steward digest.
4. Thanked stage (note + photo required) + gratitude on contributions (`sourceType` enum add).
5. Share receipts: per-user links, `myStats` per campaign ("your share brought N contributions").
6. Story skeleton reorganization of campaign detail; momentum toasts from ledger events.

### Phase 4: Partners and the capital stack (after Rye's outreach, decision #2)

Partner links table + hydration job + Financial Partners block + capital stack bar + eligibility quiz + pledge simulator.

### Phase 5: Hypha formalization

`formalizeOnHypha` procedure + steward/contributor UI on fulfilled contributions + bridge status display. Project tokens issued by the DHO (decision #1). Optional later: a `cascadeCrowdpoolPassed` in webhook-receiver.ts to stamp confirmation back onto the contribution.

### Phase 6: Polish

CampaignDetail visual migration to the dark-forest system, serif/sans editorial pass, design token consolidation on touched files, map view (real lat/lng), diligence docs, accessibility pass, remove dead code (client/src/components/campaign/CampaignStep1-5.tsx are imported nowhere).

Every phase: `pnpm gate` + tests + migrations via the runner + `/ship` before push, per the standard deploy flow.

---

## Part F: What stays out (unchanged from master plan Part 7)

No payment rails. No P2P exchange or timebank mechanics. No P2P tool matching (loans are pooled custody with the project as custodian). No leaderboards ranking people. No per-person social/cultural/spiritual scores (quantify material/living/financial/hours, narrate the rest). No duplication of Hypha, Ma Earth, or GoSteward functions. No unlabeled fake data. **And per decision #1: no platform token credits for crowdpooling, ever.** The `campaign_contributions` → `user_token_ledger` path does not exist and must not be added.

## Part G: Handoff

| Work | Who |
|---|---|
| Everything in Phases 1-3, tests, migrations, deploy loop | Claude Code, starting now |
| Ma Earth + GoSteward outreach, logo permission | Rye (decision #2); outreach drafts available on request |
| Copy voice check on new emails + partner block | Rye, async, non-blocking |
| Demo campaign imagery approval | Rye, async |
| Season launch date confirmation for banner removal | Rye, later |
