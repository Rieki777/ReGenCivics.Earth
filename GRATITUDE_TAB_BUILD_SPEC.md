# Gratitude Tab + Proportional Economy — Build Spec

Written 2026-07-03. Implementation spec for the profile Gratitude tab and the backend evolution that makes the gratitude economy work end to end.

This spec **implements and extends** `GRATITUDE_SYSTEM_SPEC.md` (the canonical mechanic, 2026-04-03). Where this doc and that one differ, the mechanic in `GRATITUDE_SYSTEM_SPEC.md` wins; this doc fills in data model, procedures, UI wiring, jobs, and the migration path off the current half-built state.

Decisions locked with Rye (2026-07-03):
1. **Full spec vision** — history, totals, power meter, progress ring, moon phase, streak, proportional budget. Not a lean slice.
2. **Build the proportional model for real** — evolve the backend so the whole economy works, not a flat-5 placeholder.
3. **Public messages, private totals** — other people can read the kind messages on your profile; your counts and earned-$ReGen stay private to you.
4. **No reciprocity mechanics** (added mid-build) — see §12.5.

> **As-shipped note (2026-07-03, ADR-30):** phases 1–4 plus the write-path cutover and batch job shipped in commits `d4751d2` + merge `679dab0`. One deviation from §7 below: notifications go through the forum-notify spine (`server/lib/forum-notify.ts:handleGratitudeSent` → the unified `notifications` table, ADR-24) rather than a `user_notifications.link` column — main had landed that spine mid-build, and it already carries dedupe, email prefs, and the bell UI. The deep link still lands on `/profile?tab=gratitude&highlight=<id>` exactly as specced. Migration shipped as `0163_gratitude_cycles.sql`; the ADR is **ADR-30** (main had claimed 24–29). Remaining phases: celebratory moments, share cards, Game Mechanics exposure, bounty-flow fold-in, send-modal presets.

---

## 1. Goal

Clicking the "sent you gratitude" notification lands on `/profile?tab=gratitude`, scrolled to and highlighting that acknowledgment. The tab is a two-way hub: browse everything you've received (with messages, senders, source context), see your totals (people, times, $ReGen earned, streak), send new gratitude without leaving, and watch the current cycle's power meter and moon phase.

Under it, the gratitude economy runs on one model: per-cycle tier budgets, proportional splitting across unique recipients, end-of-cycle $ReGen distribution from a pool, claim on Hypha at threshold.

---

## 2. Reconcile the three existing models

Today three data paths disagree. Target: **one acknowledgment model**, three tables collapse to a clear set.

| Existing | What it does now | Fate |
|---|---|---|
| `gratitude_log` (0092): sender, recipient, message, sourceType, sourceId | Forum/profile sends. `gratitude.send` credits recipient a flat **5 $ReGen** immediately. | **Becomes the acknowledgment record.** Add `cycleId` + `weight`. Stop crediting tokens at send time. |
| `gratitude_transactions` + `gratitude_budgets` (0096): seasonId, amount 1–5 | Bounty gratitude via `game.sendGratitude`. | **Deprecate the amount + season budget.** Bounty sends fold into acknowledgments (still tagged with the bounty as source). Season budgets replaced by cycle budgets. |
| `GRATITUDE_SYSTEM_SPEC.md` model | Lunar cycle, tier budget, proportional split, pool distribution. | **This is the target.** Build it. |

Key change: **$ReGen is no longer credited when you send gratitude.** It is credited to *recipients* at end of cycle by the distribution job, proportional to weighted gratitude received. Sending is a free acknowledgment; the value flows to the acknowledged.

---

## 3. Lunar cycle primitive

Everything hangs off "which cycle are we in." Add a `gratitude_cycles` table so cycles are addressable, auditable, and each has a distribution snapshot.

```sql
CREATE TABLE gratitude_cycles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  cycleNumber   INT NOT NULL,              -- monotonic, 1,2,3...
  startsAt      TIMESTAMP NOT NULL,        -- new moon
  endsAt        TIMESTAMP NOT NULL,        -- next new moon
  poolPerCycle  INT NOT NULL,              -- snapshot of gratitude.regen_distribution.pool_per_cycle
  status        VARCHAR(16) NOT NULL DEFAULT 'open',  -- open | distributing | closed
  distributedAt TIMESTAMP NULL,
  totalWeight   INT NULL,                  -- sum of all weight received, set at close
  UNIQUE KEY uniq_cycle (cycleNumber),
  INDEX idx_cycle_status (status)
);
```

Cycle boundaries come from the real lunar calendar (new moon to new moon, ~29.5 days). Compute with a lunar-phase helper (deterministic astronomical formula, no external call — see `regen-deterministic-first`). `cycle_duration_days = 29.5` in game variables is the fallback/simulation value; the real job anchors to actual new-moon timestamps so the moon-phase icon on the profile is honest.

"Current cycle" = the row where `now BETWEEN startsAt AND endsAt AND status='open'`. A startup/cron guard opens the next cycle if none is open.

---

## 4. Data model changes

### 4.1 `gratitude_log` (extend, don't replace)

```sql
ALTER TABLE gratitude_log ADD COLUMN cycleId INT NULL AFTER sourceId;
ALTER TABLE gratitude_log ADD COLUMN weight  INT NULL AFTER cycleId;   -- sender's per-person share at cycle close
ALTER TABLE gratitude_log ADD INDEX idx_grat_cycle_recipient (cycleId, recipientId);
ALTER TABLE gratitude_log ADD INDEX idx_grat_cycle_sender (cycleId, senderId);
-- one acknowledgment per (sender, recipient, cycle):
ALTER TABLE gratitude_log ADD UNIQUE KEY uniq_ack (senderId, recipientId, cycleId);
```

`weight` is null until the cycle closes, then set to `senderEffectiveBudget / max(uniqueRecipientsThisCycle, 1)`. Recipients' earned share is proportional to the sum of `weight` across acknowledgments they received.

### 4.2 `gratitude_budgets` (repurpose to cycles)

Replace `seasonId` semantics with `cycleId`. Track computed effective budget + streak so the profile reads are cheap.

```sql
CREATE TABLE gratitude_cycle_budgets (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  userId           INT NOT NULL,
  cycleId          INT NOT NULL,
  tier             VARCHAR(16) NOT NULL,   -- explorer|co_creator|steward|sage snapshot
  baseBudget       INT NOT NULL,           -- 100
  multiplier       DECIMAL(4,2) NOT NULL,  -- 1.0 / 2.0 / 3.0 / 5.0
  streakCycles     INT NOT NULL DEFAULT 0,
  streakBonus      DECIMAL(4,3) NOT NULL DEFAULT 0,  -- 0..0.30
  effectiveBudget  INT NOT NULL,           -- round(base * multiplier * (1 + streakBonus))
  uniqueRecipients INT NOT NULL DEFAULT 0, -- running count this cycle
  UNIQUE KEY uniq_user_cycle (userId, cycleId),
  INDEX idx_budget_cycle (cycleId)
);
```

### 4.3 Distribution ledger

The end-of-cycle credit is auditable and idempotent.

```sql
CREATE TABLE gratitude_distributions (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cycleId          INT NOT NULL,
  userId           INT NOT NULL,           -- recipient earning $ReGen
  weightReceived   INT NOT NULL,
  poolShare        DECIMAL(18,6) NOT NULL, -- $ReGen credited this cycle
  createdAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dist (cycleId, userId),
  INDEX idx_dist_user (userId)
);
```

Credits flow through `db.creditPrivateTokens(userId, 'regen', poolShare, { source: 'gratitude_received', sourceRef: 'cycle:{cycleId}' })` — the only legitimate private write (per `STEERING.md` section 5). The `uniq_dist` key makes re-running the job a no-op.

`gratitude_transactions` (0096) is left in place read-only for history; new writes stop. A follow-up migration can backfill its rows into `gratitude_log` as acknowledgments if we want the bounty history in the journal.

---

## 5. tRPC procedures

All under `server/routes/gratitude.ts` unless noted. Auth required; a user only reads their own totals.

### 5.1 Reads (new)

- **`gratitude.myOverview`** → the whole tab header in one call:
  ```ts
  {
    cycle: { number, endsAt, daysRemaining, moonPhase },   // moonPhase: 0..1 or named enum
    sends: { peopleThisCycle, effectiveBudget, fullPowerThreshold, fullPowerRemaining, perPersonShare },
    received: { peopleLastCycle, lifetimePeople, lifetimeTimes },
    streak: { cycles, bonusPct },
    regen: { earnedFromGratitude, claimThreshold, claimEligible, moreToClaim }
  }
  ```
  This is what `GratitudeSection.tsx` currently expects as props. `myOverview` computes them.

- **`gratitude.myJournal`** `{ direction: 'received'|'sent', cursor?, limit=20 }` → paginated entries `{ id, otherUser: {handle,name,displayName,avatarUrl}, message, sourceType, sourceId, createdAt, cycleNumber }`. Sorted most-recent-first.

- **`gratitude.publicJournal`** `{ handle, cursor?, limit=20 }` → **received messages only**, for viewing someone else's profile. Returns `{ sender:{handle,name,avatar}, message, createdAt }`. **No counts, no totals, no $ReGen** (visibility rule: public messages, private totals). Rate-limited, no cursor into private aggregates.

> **Removed 2026-07-03:** a `gratitude.partners` procedure (reciprocal-exchange counts) was cut. Rye's call: no reciprocity mechanics anywhere — gratitude flows forward, never as social debt. See §12.5.

### 5.2 Writes (change)

- **`gratitude.send`** (existing) — keep input `{ recipientHandle, message, sourceType?, sourceId? }`. Changes:
  - Resolve current `cycleId`.
  - Insert into `gratitude_log` with `cycleId`. On duplicate `uniq_ack`, return a friendly "You've already acknowledged this person this cycle" (still allow additional messages? No — one ack per person per cycle per spec; extra thanks can be a lightweight non-economic reaction later).
  - **Remove the flat 5 $ReGen credit.** No token write at send time.
  - Increment `gratitude_cycle_budgets.uniqueRecipients` for the sender (create the row lazily from tier if absent).
  - Keep spam guards (30/hr, 3/hr per recipient), keep system-account block.
  - Fire a `gratitude_received` notification to the recipient (see §7).

- **`game.sendGratitude`** (bounty) — drop the `amount` (1–5) input; route through the same acknowledgment path with `sourceType='bounty'`, `sourceId=bountyId`. Deprecate `gratitude_budgets` season writes.

### 5.3 Claim

Reuse the existing claim bridge. `earnedFromGratitude` is just the private `regen` accumulated via `source='gratitude_received'`. `playerProfiles.requestClaim({ tokens: 'regen' })` already debits private and starts the Hypha claim. The tab's "Claim on Hypha" button calls it when `claimEligible`.

---

## 6. Profile tab

### 6.1 Wire the tab

- `client/src/pages/PlayerProfile.tsx:2431` — add `"gratitude"` to `ProfileTab`, to `PROFILE_TABS` (`{ id:'gratitude', label:'Gratitude', icon: Heart }`), and to `_validTabs`.
- Add a `<GratitudeTab />` case in the active-tab switch. `GratitudeTab` loads `gratitude.myOverview` + `gratitude.myJournal` and renders the existing `GratitudeSection.tsx`, passing real data instead of the placeholder props.
- `GratitudeSection.tsx` already renders the three stat boxes, power meter, progress ring, moon phase, and journal. This is mostly a data-wiring job, not a new build.

### 6.2 Own-profile vs others

- **Own profile:** full section — totals, meters, streak, $ReGen, both journals, send hub.
- **Someone else's profile:** only the public received-messages journal (`gratitude.publicJournal`) plus a prominent **Send Gratitude** button. No counts, no $ReGen, no power meter.

### 6.3 Send hub

Embed `SendGratitudeModal` triggered from the tab ("Go express some gratitude"). This is the "easily send from there" ask. **Deliberately no "send back" affordance on received entries** — see §12.5. Sending from the tab always starts from a blank recipient search, so the impulse stays "who moved me?" rather than "who do I owe?"

### 6.4 Ideas folded into the full vision

- **Filter/segment bar:** Received / Sent · This cycle / Lifetime · text search over messages + names.
- **Received-over-time sparkline** (people received per cycle) above the journal.
- **Cycle urgency line:** "Cycle ends in N days · X full-power sends left" driven by `myOverview.cycle` + `sends`.
- **Empty states that teach:** no gratitude yet → "Gratitude you receive shows up here" + CTA to give some.
- **Preset phrases** in the send modal: Power to You, Thank you, You inspired me, Deep respect, plus free text.

---

## 7. Notification routing + deep link

- `client/src/components/NotificationBell.tsx:16` `getNotificationLink`: add
  `case 'gratitude_received': return metadata?.gratitudeId ? `/profile?tab=gratitude&highlight=${metadata.gratitudeId}` : '/profile?tab=gratitude';`
- Add a Heart/🙏 icon in `getNotificationIcon`.
- Notification is created in `gratitude.send` with `metadata:{ gratitudeId, senderHandle }` and body like "`{name}` sent you gratitude" + first line of the message ("Power to You").
- `GratitudeTab` reads `?highlight=`, scrolls the matching journal entry into view and pulses it (reuse an existing highlight pattern if one exists; else a 2s ring animation).

---

## 8. Batch jobs (`server/routes/batchJobs.ts` + a cron)

Follow `regen-railway-crons`. Two idempotent jobs:

1. **Cycle close + distribute** (runs at/after `endsAt` for an `open` cycle):
   - Set cycle `status='distributing'`.
   - For each sender with acknowledgments this cycle: `perPersonShare = effectiveBudget / uniqueRecipients`; write `weight` onto each of their `gratitude_log` rows.
   - Sum `weight` received per recipient → `weightReceived`. `totalWeight = Σ`.
   - For each recipient: `poolShare = (weightReceived / totalWeight) * poolPerCycle`; upsert `gratitude_distributions`; `creditPrivateTokens('regen', poolShare, source:'gratitude_received', sourceRef:'cycle:{id}')`.
   - Update streaks: sender hit ≥10 unique → `streakCycles+1` (cap bonus 30%); else reset to 0. Persist for next cycle's budget.
   - Set cycle `status='closed'`, `distributedAt`, `totalWeight`.
   - Idempotent via `uniq_dist` + `status` guard.

2. **Cycle open** (runs at new moon or lazily on first request): create the next `gratitude_cycles` row, snapshot `poolPerCycle` from game variables, seed `gratitude_cycle_budgets` lazily as players send.

Game variables (already named in the spec) live in `game_variables.governance` / a `gratitude` namespace and surface on the Game Mechanics page:
`gratitude.base_budget=100`, `cycle_duration_days=29.5`, `full_power_threshold=10`, `streak_bonus_per_cycle=0.03`, `streak_bonus_max=0.30`, multipliers per tier, `regen_distribution.pool_per_cycle=10000`, `claim_threshold=333`.

---

## 9. Build phases

Each phase ends green through the ship gate (`python3 scripts/audit-truncation.py`, per-className `rg`, `pnpm typecheck`) and applies its migration with `scripts/run-migration.ts`.

1. **DB foundation** — migrations for `gratitude_cycles`, `gratitude_log` alters, `gratitude_cycle_budgets`, `gratitude_distributions`. Lunar-phase helper + cycle open/current logic. Unit tests for cycle math + proportional split.
2. **Read procedures** — `myOverview`, `myJournal`, `publicJournal`, `partners`. Integration tests.
3. **Tab UI** — wire `GratitudeSection` to real data, add the tab, own-vs-other views, send hub, send-back, filters, sparkline, empty states.
4. **Notification routing + deep-link highlight.**
5. **Write path migration** — `gratitude.send` acknowledgment model (drop flat 5), `game.sendGratitude` amount removal, spam guards intact.
6. **Batch jobs** — close/distribute + open, streak updates, idempotency tests. Cron registration.
7. **Game Mechanics page** — expose the `gratitude.*` variables + update the simulator.

Phases 1–4 make the notification click useful and the tab live on real received data. 5–7 complete the economy. Ship in that order so value lands early even though the full vision is the target.

---

## 10. Open questions (non-blocking, sensible defaults chosen)

- **Backfill bounty history?** Default: leave `gratitude_transactions` read-only, no backfill into the journal for now. Revisit if the bounty gratitude should appear in the received feed.
- **Extra thanks after the one-per-cycle ack?** Default: blocked with a friendly message. A lightweight non-economic "❤️ reaction" could be added later without touching the economy.
- **Retro distribution for gratitude already sent under the flat-5 model?** Default: no clawback of already-credited flat-5 $ReGen; the new model starts at the next cycle boundary. Note this in `DECISIONS.md` as an ADR when we cut over.

---

# Part II — Experience & Visual Design

The economy in Part I is the engine. Part II is why anyone opens the tab twice. Gratitude is emotional; the tab should feel warm, alive, and a little sacred — a living garden of the kind things people have said about you, not a stats dashboard. It should be something people screenshot and share because it makes them feel seen.

All values below are the app's real design language (verified in `client/src/index.css` and existing components), so this ships consistent with the rest of the product.

## 11. Design foundations (use these exact tokens)

**Palette** (`client/src/index.css:132-244`):
- Spring green `#7dd87d` (hover `#9de89d`, soft `#a8e6a8`) — growth, "sent," positive action.
- Forest `#1a472a` → deep `#0d2818` → `#0a1f14` — grounding, panel depth.
- Amber gold `#ffd700` / dim gold `#d4a017` / tan `#d4a574` — celebration, received, milestones, the sacred.
- Parchment `#f0ebe3` / warm `#f8f5f0` — the "note" surfaces where messages live.
- Sage `#4a7c59`, teal `#4a9f9f` (alliance), alert `#ef6f6c`.

**Type** (`client/src/index.css:1-92`):
- `--font-display` **Quicksand** — stat numbers, headings.
- `--font-body` **Nunito** — messages, narrative.
- `--font-accent` **Righteous** — the one emotional headline per screen (the gratitude "signature line," the celebration moments). Use sparingly so it stays special.

**Motion**: Framer Motion v12 is installed for orchestrated moments; the CSS keyframe library (`fadeInUp`, `scaleIn`, `glow`, `float`, `gold-shimmer`, `breathing-gradient`, `card-shine`, `quest-gold-pulse`) covers ambient polish. **Every motion respects `prefers-reduced-motion`** (`index.css:785`) — celebratory bursts degrade to a simple fade.

**Reusable premium patterns to lean on, not reinvent**:
- `.glass-panel` (`index.css:1250`) — `rgba(10,35,20,0.88)` + `blur(24px) saturate(1.2)` + spring-green hairline border. The base surface for stat cards over the hero art.
- `.quest-card-gold` / `quest-gold-pulse` — the gold shimmer for the milestone/claim state.
- `BadgeRingAvatar.tsx` — avatars with an achievement ring; use for senders in the wall.
- `TokenBox.tsx` — the premium parchment token display; match its treatment for the $ReGen figure.
- `TierBadge.tsx`, `LunarStreak.tsx`, `CampaignMilestones.tsx` (vertical timeline) — reuse directly.
- `PageBackground` theme `"garden"` (butterflies + pollen) at low opacity behind the tab for ambient life; `CoreImage` `thank-you-blossom` (16:9) as the hero.

## 12. The tab, top to bottom

### 12.1 Hero band — "You are appreciated"
A short `thank-you-blossom` band with a forest-to-transparent scrim for legibility. Over it, one **Righteous** signature line built from real data:

> **"47 thanks from 23 people."**  ·  small moon glyph · "New moon in 4 days"

The number counts up on mount (Framer Motion, ~800ms, skipped under reduced-motion). To the right, the **live moon phase** rendered from the real lunar calc (not the current fake cosine) and a cycle countdown that shifts from calm sage to warm amber as the new moon approaches — a gentle "the cycle is closing, send while it counts" pull. This band is also the share trigger (§14).

### 12.2 The Gratitude Wall (the heart of the tab)
The received feed is the hero, not a footnote. Each acknowledgment renders as a **parchment note** (`#f8f5f0`, soft shadow, 1–2° stagger rotation so it reads like pinned notes on a board), containing:
- Sender's `BadgeRingAvatar` + name (links to their profile).
- The message in Nunito, generous line-height, treated as a quote.
- A small source chip: "on your forum post," "on your profile," "on a bounty."
- Relative time. **No send-back button** (§12.5) — the note is a gift to sit with, not a prompt to repay.

Masonry/two-column on desktop, single column on mobile, `scroll-area` with lazy pagination. Filter/segment bar above: **Received · Sent** and **This cycle · Lifetime**, plus a text search across names and messages.

**Deep-link bloom**: arriving from the notification (`?highlight=<id>`), the target note scales in, pulses a gold ring (`quest-gold-pulse`, ~2s), drifts a few petals, then settles. The exact moment the notification promised, delivered.

### 12.3 The stat trio (restyled, `.glass-panel` over the hero)
Replaces the flat `white/10` cards in today's `GratitudeSection.tsx`.

1. **Power this cycle** — the power meter, restyled: spring-green fill with a soft glow, a **golden notch at 10** that lights and pips when you hit full power. Live line: "**7 people · 43 $ReGen each · 3 full-power sends left.**" The per-person number re-animates each time you send. Green → amber → faded zones keep the spec's dilution teaching.
2. **Received** — big Quicksand number (people last cycle), lifetime sublabel, and a **received-per-cycle sparkline** (recharts, already available) so you see your gratitude trend, not just a total.
3. **$ReGen earned** — the progress ring toward 333. Below threshold: spring-green arc, "146 more to claim." At threshold: arc turns gold, `quest-gold-pulse` breathing glow, and a **`.btn-game` gold "Claim on Hypha"** button appears. This is a milestone, so it should feel like one.

### 12.4 ~~Your gratitude partners~~ (removed)
Cut 2026-07-03. Exchange counts ("you ⇄ Nadim · 6 exchanges") celebrate tit-for-tat, which is exactly the dynamic to avoid. See §12.5.

### 12.5 Anti-reciprocity principle (hard design rule)
Gratitude is a forward-flowing signal, not a social ledger. Rye's call, 2026-07-03. Concretely:
- **No "send back" buttons** anywhere — not on wall notes, not in notifications, not in toasts.
- **No exchange counts or pair framing** ("you ⇄ X") in any UI.
- The send flow never pre-fills a recipient from a received entry. Pre-fill is only allowed from *outward* contexts (a forum post you admired, a bounty, a profile you visited).
- Post-send encouragement chains **forward** ("Thank someone else?"), never backward.
- Copy never implies obligation: no "return the favor," no unread-gratitude guilt badges.
Receiving from someone you already acknowledged is fine when it happens organically; the system just never engineers it.

### 12.6 Mobile-first layout (most players are on phones)
The tab must be designed at 375px first, desktop as the enhancement:
- **Single column throughout.** Wall notes stack (no masonry); stat trio stacks vertically or renders as a horizontal snap-scroll strip (`scroll-snap-type: x mandatory`) with the power card first.
- **Hero compresses** to ~140px: signature line drops to ~28px, blossom art scales down and shifts behind a stronger scrim, moon + countdown stay visible (they drive the ritual).
- **Filter bar is sticky** below the profile tab bar (`position: sticky; top: <tabbar-height>`), horizontally scrollable if segments overflow. Search collapses to an icon that expands.
- **Send flow uses the existing `drawer` (bottom sheet)**, not a centered dialog — thumb-reachable, keyboard-safe (`viewport-fit`, `env(safe-area-inset-bottom)` padding).
- **Tap targets ≥ 44px**; note links and chips get generous hit areas.
- **Deep-link highlight scrolls with `scroll-margin-top`** accounting for the sticky bars so the bloomed note isn't hidden under chrome.
- Hero + share imagery served through `/api/img` with width params (`?w=768` on mobile) so phones never download desktop art.
- Count-up, petals, and bloom stay light: CSS/rAF only, no layout thrash; petals capped (~8 on mobile), all gated by `prefers-reduced-motion`.

## 13. Celebratory moments (the reasons to come back)

Gratitude milestones should feel consistent with how the app already celebrates quests and tiers. Each is a short Framer Motion sequence, reduced-motion safe, paired with a `sonner` toast.

- **On send** — a petal/heart bloom from the button + toast "Gratitude sent to Nadim 🙏." The send modal flips to a "sent" state showing the message as a mini parchment note with "Thank someone else?" to encourage chaining.
- **Full power reached (10th unique send)** — the power orb blooms gold, a brief petal burst, Righteous line "**Full power. Every send this cycle carries maximum weight.**" Offer to share (§14).
- **Cycle-close reveal** — the first open after a cycle distributes: a gentle unveil, "**Last cycle, 12 people's gratitude earned you +18 $ReGen.**" This is the payoff loop that makes the lunar rhythm worth returning for. Pulls from `gratitude_distributions`.
- **Claim unlocked (333)** — gold ring, breathing glow, and a clear path to Hypha.
- **Streak up** — `LunarStreak` flame grows a notch with a soft glow; "3 cycles of full-power gratitude."

## 14. Shareability — the part people are proud to post

`satori` + `@resvg/resvg-js` + `react-share` are already installed, so this is a real, near-term feature, not a wish.

- **Gratitude card (the viral loop)** — turn a single kind message into a beautiful shareable image: the `thank-you-blossom` art, the message in Righteous, "— Nadim, in the ReGen Civics movement," and the recipient's handle. People love sharing genuine praise about themselves; each share is soft top-of-funnel for the movement. Generated server-side via `satori` → PNG, distributed with `react-share` to X / IG / LinkedIn. A "Share this" affordance sits on each received note and on the full-power / cycle-close moments.
- **Cycle-summary card** — "This lunar cycle, 12 people sent me gratitude." moon phase + numbers + brand mark. Shareable from the hero band.
- **Public profile OG image** — a `satori` OG route so sharing a profile link previews their gratitude glow (public messages / counts hidden per the visibility rule — the OG shows warmth, e.g. "appreciated by the community," not private totals).

**Visibility rule holds everywhere** (public messages, private totals): share cards a user generates *of their own* profile may include their numbers (it's their choice to post). Cards and OG images rendered for *other* viewers show messages and warmth only — never someone else's counts or $ReGen.

## 15. Someone else's profile — a warm front door

Viewing another player's Gratitude tab shows only **The Gratitude Wall** (the public kind messages about them) — lovely social proof — plus a prominent **"Send [name] gratitude"** `.btn-game`. No power meter, no counts, no $ReGen. This turns every profile visit into an invitation to appreciate someone, which feeds the whole economy.

## 16. Empty & first-run states (teach, don't shrug)

- **No gratitude received yet** — a small `CoreImage`, warm copy: "The fastest way to be appreciated is to appreciate. Go acknowledge someone whose work moved you," with a button into the community.
- **No sends this cycle** — the power meter at rest with "Your cycle budget is 300. Acknowledge up to 10 people at full power before the new moon."
- **Loading** — `skeleton` notes on the wall, not spinners, so the layout doesn't jump.

## 17. Accessibility & performance

- Contrast: message text is dark ink on parchment (`#f8f5f0`), not white-on-glass — verified readable. Chips and secondary text meet AA.
- All bloom/burst/countup motion gated behind `prefers-reduced-motion`; the tab is fully usable with motion off.
- Hero art and share images are lazy/served through `/api/img`; `satori` renders server-side so the client stays light.
- Keyboard: send-back, filters, and share are all focusable; the deep-link highlight also moves focus to the target note.

## 18. Revised build order (design woven in)

Supersedes the plain §9 ordering; same ship-gate discipline per phase.

1. **DB foundation** (§3–4) + lunar-phase helper (real moon, powers the hero glyph). Tests for cycle math + proportional split.
2. **Read procedures** (§5.1) — `myOverview`, `myJournal`, `publicJournal`.
3. **Tab shell + Gratitude Wall + hero** — real data into a restyled `GratitudeSection`; parchment notes, hero band with live moon, glass stat trio, filters, empty/skeleton states, mobile-first per §12.6. This is the "looks gorgeous on real data" milestone.
4. **Notification routing + deep-link bloom** (§7, §12.2).
5. **Write-path cutover** (§5.2) — acknowledgment model, send-modal restyle with preset phrases + live power feedback, forward-only chaining (§12.5). `/security-review` here (live token change).
6. **Celebratory moments** (§13) — send bloom, full-power, streak, claim-unlocked.
7. **Batch jobs** (§8) + **cycle-close reveal** (§13) — the return-loop payoff.
8. **Share cards + OG** (§14) — `satori` routes, `react-share` affordances.
9. **Game Mechanics page** — expose `gratitude.*` variables + simulator.

Phases 1–4 make the notification click land on a beautiful, real wall. 5–7 complete and celebrate the economy. 8 turns it into something people spread. 9 makes the rules transparent.
