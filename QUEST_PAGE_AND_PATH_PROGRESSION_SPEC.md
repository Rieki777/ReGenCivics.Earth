# Quest Page + Path Progression Spec

Version 1.0. Drafted 2026-04-26. Standing spec.

This document supersedes the tier-progression sections of `CITIZENSHIP_TIERS_SPEC.md` and the unlock-chain sections of `QUEST_PROGRESSION_SPEC.md` for everything new. Old specs remain as historical reference; new work follows this doc.

---

## 1. What this spec is for

Three things shipped together change how a player moves through ReGen Civics:

1. The four paths (Investor, Land Project, Alliance Partner, ReGen Player) become real progression tracks, not just marketing labels on the homepage. Players can pursue more than one in parallel. Each path has its own milestones and its own RGVoice bonus.
2. Citizenship tier (Explorer, Co-Creator, Steward, Sage) is earned per-path for the first three rungs and contribution-percentile for Sage. The first two rungs are gated by concrete path milestones, not by abstract scores.
3. The /quest page is rebuilt around this. The Profile Quests tab becomes the action hub: it surfaces the exact next button for each unfinished task and a single Hypha-claim button when a tier is earned.

The success measure is qualitative: a new player lands on /quest, picks a path inside ten seconds, sees what the next action is, and feels like they're stepping onto a path that respects their time. A returning Steward sees their progress on three paths in one view and knows what to do next on each.

---

## 2. Path model

Four paths. Each is a distinct journey with its own milestones. A player can walk multiple paths simultaneously. Most players will walk two: ReGen Player plus one of the other three.

| Path | Field value | Who walks it | Visual element |
|---|---|---|---|
| ReGen Player | `player` | Anyone joining the Game (default for most signups) | Fire portal |
| Investor | `investor` | People deploying capital into the Fund | Water portal |
| Land Project | `land_project` | Land stewards applying to the incubator | Earth portal |
| Alliance Partner | `ally` | Organizations joining the alliance | Air portal |

The `playerProfiles.path` enum already exists in the schema, but it's a single value. We extend to support multiple active paths per player. See section 6 for schema changes.

A path is "started" when the player declares it (homepage card click captures it, Profile lets them add more). A path is "earned" at the Co-Creator level when the path-specific milestone fires plus the path-specific Co-Creator criteria are met (see section 3).

---

## 3. Tier criteria per path

Citizenship tier has two ladders running in parallel: the per-path ladder (Explorer to Steward) and the cross-path ladder (Sage). A player's overall tier is the highest tier they've reached on any path, with Sage available only after at least one Steward title.

### 3.1 Explorer

Explorer is the entry tier. Granted automatically the moment the player creates an account. No criteria. Free transactions, gratitude budget (starter), forum access.

### 3.2 Co-Creator (per path)

Earned the first time a player meets the Co-Creator criteria on any path. Subsequent paths that hit Co-Creator confirm the title and pay the RGVoice bonus, but the title itself is only first-earned once.

| Path | Co-Creator criteria | RGVoice bonus on first earn (per path) |
|---|---|---|
| ReGen Player | Complete all 14 Rites of Passage quests (Quests 0–13: Fire through Fasting) | 77 |
| Investor | Sign the LOI | 77 |
| Land Project | Submission approved for the incubator program | 77 |
| Alliance Partner | Submit a tool that more than 11 people use, OR join the alliance via approved proposal | 77 |

The 77 RGVoice is paid once per path, not once per player. A player who walks ReGen Player and Investor and Land Project earns 3 x 77 = 231 RGVoice in lifetime tier bonuses at the Co-Creator rung. The title "Co-Creator" is unlocked at the first earn and persists.

### 3.3 Steward (per path)

Earned the first time a player meets the Steward criteria on any path. Same compound earning model as Co-Creator.

| Path | Steward criteria | RGVoice bonus on first earn (per path) |
|---|---|---|
| ReGen Player | Completed 33 quests AND voted on 144 proposals | 144 |
| Investor | Sent investment AND participated in a Fund vote | 144 |
| Land Project | Completed a season of the Game Co-Creation Journey AND successfully launched a Game for their community | 144 |
| Alliance Partner | Conducted a resource swap AND a token swap with ReGen Civics | 144 |

### 3.4 Sage (cross-path)

The only contribution-percentile tier in the new model. Available to any player who has reached Steward on at least one path.

| Tier | Criterion | One-time bonus |
|---|---|---|
| Sage | Contribution score in the top 80th percentile across all active players, sustained for one full season | 233 RGVoice |

Sage carries the deepest governance weight. The criterion intentionally requires sustained contribution, not a momentary spike, so the percentile is computed as a rolling-season average rather than instantaneous rank.

### 3.5 Why this model

The old model gated Co-Creator and Steward on contribution percentile and gratitude received. That model rewarded the noisiest contributors and quietly discouraged people whose contributions were structural (capital, land, alliance). The new model says: each path has a real-world threshold that proves the player is doing the thing the path exists for. An investor proves their path by actually investing. A land project proves theirs by getting accepted and shipping a season. A player proves theirs by walking the 14 Rites and voting on the proposals that shape the game.

Sage stays percentile-based because sage is about depth across the whole game, not depth within a single track.

---

## 4. Quest universe and unlock model

Three concentric rings of quests.

### 4.1 Ring 1: Welcome Aboard (10 quests)

The first thing a new player sees. All 10 unlocked from account creation. Each quest pays a small RGVoice + $ReGen reward. Completing all 10 unlocks the First Claim experience and qualifies them for the Welcome Aboard signal in their profile. This already exists; spec lives in `ReGenCivics_WelcomeAboard_Brief.md`.

### 4.2 Ring 2: Rites of Passage (13 quests)

The 13 main quests defined in `QUEST_PROGRESSION_SPEC.md`. All 13 unlocked from the moment the player declares the ReGen Player path. The seasonal-cascade unlock chain in the old spec is removed. A player can do the 13 in any order they choose. Completing all 13 grants the ReGen Player Co-Creator milestone (and pays 77 RGVoice).

The reason for unlocking all 13 from the start: the old cascade meant a player who joined in winter and completed a winter rite had to wait until spring to unlock spring rites. That paced the game at the speed of the seasons, which is poetic but makes the game feel inert in the early days. We unlock all 13 so a motivated new player can move through the Rites at their own pace, and the season ring (section 9.4) shows them which seasonal layer they're in for cosmetic and contribution-tracking purposes.

### 4.3 Ring 3: Open Universe (progressive reveal)

After a player completes Ring 2 (all 14 Rites), the Open Universe unlocks. This is the long-tail quest pool. It contains:

- Epic Quests (large multi-month commitments)
- Seasonal Practices (recurring rhythm quests)
- Path-specific deepening quests (e.g., Investor path includes "Co-host a Fund AMA", Land Project path includes "Bring a Steward into your community")
- Community-proposed quests that survive curation

The Open Universe uses the **two-at-a-time progressive reveal**:

- The moment Ring 2 is complete, two random quests from the Open Universe pool unlock for the player.
- Completing one of those two unlocks two more random quests.
- The cycle continues until all available Open Universe quests are unlocked.
- "Random" is seeded per-player so each player's reveal order is unique.
- Curated bias: the random pool is weighted by path. A player on the Investor path is more likely to see Investor-deepening quests in their reveals, but cross-path quests appear too.

The seasonal aspect from the original sketch ("only unlock 2 quests in each season") becomes a refresh rule: if a player has 2 quests unlocked and doesn't complete either by season's end, those two roll over to the next season unchanged. There is no penalty for slow play. Pace is the player's choice.

The reason for progressive reveal: showing 80+ unlocked Open Universe quests at once is paralyzing and dilutes the meaning of any single one. Two at a time creates clarity. Each pair feels like an invitation. The reveal is a small ceremony.

---

## 5. Token bonus + Hypha claim flow

This is the moment the player sees the system rewarding them. Designed so the reward feels earned, not extracted.

### 5.1 The flow

1. Player completes the final criterion for a tier on a path. Server detects the milestone (see section 7).
2. Server credits the bonus RGVoice (77 or 144 or 233) to the player's private ledger via `creditPrivateTokens({ source: 'tier_bonus_co_creator', sourceRef: 'investor_path' })` or similar.
3. Profile Quests tab refreshes. The path's progress block collapses from "tasks remaining" view to a single button: **Claim 77 RGVoice on Hypha**.
4. Player clicks. The Hypha Bridge module (see CLAUDE.md section "Hypha Bridge") packages a redeem-tokens proposal pre-filled with the amount (77 or 144 or 233 RGVoice) and the player's identity context.
5. Player completes the proposal on Hypha. Alchemy webhook fires. Webhook receiver writes the redemption to the ledger, marks the bonus as claimed.
6. Profile path block updates to show "Co-Creator on the Investor path" with the date and a small Hypha link to the on-chain proof. The button is gone.

### 5.2 Why the single-button collapse matters

A new Co-Creator who's just earned 77 RGVoice doesn't want a wall of text or a multi-step flow. They want one button. The collapse from many task buttons to one claim button is the moment the player feels the system honoring them. Get that moment right and the rest of the page can be calm.

### 5.3 What to auto-populate

When the player clicks Claim, the Hypha Bridge constructs a redeem-tokens intent with:

- `amount`: 77 or 144 or 233 (literal, not user-editable)
- `recipient`: player's connected wallet address
- `tokenAddress`: RGVoice contract on Base (`RGVOICE_TOKEN_CONTRACT` env var)
- `title`: "Co-Creator tier bonus on the [Path] path" or "Steward tier bonus on the [Path] path"
- `description`: One-paragraph explanation of what they earned and why
- `bridgeKey`: signed short-lived token tying this to the ledger row so we can reconcile when Hypha fires the on-chain webhook back

The amount is non-editable on the Hypha form. We don't want a player to fat-finger 7700 instead of 77.

### 5.4 Multi-tier earned at once

If a player happens to satisfy both the Co-Creator and Steward criteria on the same path in the same week, two separate claim buttons surface, in order. They claim Co-Creator first, then Steward. We never bundle multiple tier bonuses into one claim. Each tier deserves its own moment.

---

## 6. Data model changes

Drizzle schema updates. All additive. Migration goes in `drizzle/0140_path_progression.sql` (or next available number).

### 6.1 New table: `player_paths`

```sql
CREATE TABLE player_paths (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL REFERENCES users(id),
  path ENUM('investor', 'land_project', 'ally', 'player') NOT NULL,
  declared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  co_creator_earned_at TIMESTAMP NULL,
  steward_earned_at TIMESTAMP NULL,
  co_creator_bonus_claimed_at TIMESTAMP NULL,
  steward_bonus_claimed_at TIMESTAMP NULL,
  UNIQUE KEY unique_user_path (user_id, path)
);
```

Each (user, path) pair gets a row. The `*_earned_at` columns are set by the tier-grant detector. The `*_bonus_claimed_at` columns are set by the Hypha redemption webhook after on-chain confirmation.

### 6.2 Deprecate `player_profiles.path`

The single `path` enum on `player_profiles` becomes redundant. Keep it for backward compatibility but stop writing to it. Read from `player_paths` instead. Mark deprecated in schema comments. Drop in a future migration once no callers reference it.

### 6.3 Add tier-trigger event log

Useful for debugging tier grants and for the Profile timeline.

```sql
CREATE TABLE tier_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL REFERENCES users(id),
  event_type ENUM('co_creator_earned', 'steward_earned', 'sage_earned', 'bonus_claimed') NOT NULL,
  path ENUM('investor', 'land_project', 'ally', 'player') NULL,
  amount_credited INT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSON NULL
);
```

Sage events have null path. Bonus claim events reference the original earned event via `details.original_event_id`.

### 6.4 Quest data: add `path` and `pool` fields

`questData.ts` entries get two new fields:

```ts
type QuestPool = 'welcome_aboard' | 'rite_of_passage' | 'open_universe';

type QuestPath = 'investor' | 'land_project' | 'ally' | 'player' | 'shared';

interface QuestEntry {
  // ... existing fields
  pool: QuestPool;
  path: QuestPath; // 'shared' for quests that count for any path
  pathBias?: number; // 1.0 default, used to weight the random reveal
}
```

The 14 Rites get `pool: 'rite_of_passage'`, `path: 'player'`. The 10 Welcome Aboard quests get `pool: 'welcome_aboard'`, `path: 'shared'`. Open Universe quests are tagged when they're authored.

### 6.5 RGVoice ledger source tags

New `source` strings used by `creditPrivateTokens`:

- `tier_bonus_co_creator`
- `tier_bonus_steward`
- `tier_bonus_sage`

Each carries `sourceRef` set to the `player_paths.id` (for Co-Creator and Steward) or `tier_events.id` (for Sage). Reconciliation queries can join cleanly.

---

## 7. Tier-grant detection logic

Where the system decides "this player just earned Co-Creator on the Investor path."

### 7.1 Detection lives server-side

Never trust the client to declare a tier earned. The server has authoritative views of:

- LOI signatures (Investor Co-Creator trigger)
- Application status (Land Project Co-Creator trigger)
- Quest completions (ReGen Player Co-Creator trigger via 14 Rites count)
- Tool usage counts and alliance proposal outcomes (Alliance Co-Creator trigger)
- Investments sent and Fund votes participated in (Investor Steward)
- Season completion and Game launch records (Land Project Steward)
- Resource swap and token swap records (Alliance Steward)
- Quest completion count and proposal vote count (ReGen Player Steward)
- Contribution percentile (Sage)

### 7.2 The detector cron

A new cron job, `detect-tier-progression`, runs every 15 minutes. It scans player records in batches and checks each tier criterion against current data. When a criterion fires, the cron:

1. Inserts a `tier_events` row with `event_type` set to the appropriate value.
2. Updates `player_paths` to set `co_creator_earned_at` or `steward_earned_at`.
3. Calls `creditPrivateTokens` with the bonus amount and source tag.
4. Sends a notification to the player ("You've earned Co-Creator on the Investor path. Open your Profile to claim 77 RGVoice on Hypha.").

If the player's overall citizenship tier changes (i.e., this is the first Co-Creator earn ever), the detector also updates `player_profiles.citizenship_tier` to `co_creator` and writes the change to the existing audit log.

### 7.3 Why a cron and not a real-time hook

Because criteria like Sage's "sustained 80th percentile for one full season" are not real-time events. A 15-minute cron is fast enough that the player feels the system as responsive (they finish the LOI, walk away to make tea, come back to a notification waiting for them) and slow enough to amortize the percentile computation cleanly.

For tighter feedback on simple criteria (e.g., the moment a LOI is signed), the LOI submission handler can call the detector inline for that one player. Same for application approval and Fund vote.

### 7.4 Idempotency

The detector must be idempotent. Running it twice in a row on the same player must not double-credit RGVoice. Implementation: before crediting, check whether a `tier_events` row of the matching type already exists for this (user, path) combination. If so, skip.

---

## 8. Profile Quests tab redesign

The Profile already has a Quests tab with subsections for Completed, In Progress, Proposed, Welcome Aboard, and Completed Quests (see attached screenshot). We extend it with a new section: **Your Paths**.

### 8.1 Layout

The Quests tab gets reordered:

1. **Your Paths** (new, top of tab) . the actionable hub
2. **Welcome Aboard Quests** . existing 10-quest progress block
3. **Completed** . existing
4. **In Progress** . existing
5. **Proposed** . existing

### 8.2 The Your Paths section

For each path the player has declared, render a path block. A path block has three states.

**State A: Not yet earned Co-Creator.** Shows the Co-Creator criteria as an action checklist with concrete buttons.

```
┌─────────────────────────────────────────────────┐
│  💧 Investor path                                │
│  Working toward Co-Creator                       │
│                                                  │
│  ☐ Sign the LOI         [ Sign LOI → ]          │
│                                                  │
│  Earn 77 RGVoice when complete                   │
└─────────────────────────────────────────────────┘
```

For paths with multiple Co-Creator criteria (only Alliance Partner has an OR branch right now, but we design for extensibility), render each criterion as its own row with its own button. A criterion that's satisfied gets a checkmark and the button disappears.

The button label is the verb of the action, not the title of the quest. "Sign LOI" not "Investor Path Co-Creator Step 1." The label points to the action.

Buttons that link to existing internal flows:
- Investor Sign LOI: `/loi`
- Land Project Submit Application: `/apply`
- ReGen Player View Rites: `/quest?filter=rites_of_passage`
- Alliance Submit a Tool: `/tools/submit`
- Alliance Join the Alliance: `/governance/proposals/new?intent=ally_join`

**State B: All Co-Creator criteria met, bonus not yet claimed.** Single big button.

```
┌─────────────────────────────────────────────────┐
│  💧 Investor path                                │
│  ✦ Co-Creator earned                             │
│                                                  │
│  [   Claim 77 RGVoice on Hypha →   ]            │
│                                                  │
└─────────────────────────────────────────────────┘
```

**State C: Bonus claimed.** Working toward Steward.

```
┌─────────────────────────────────────────────────┐
│  💧 Investor path                                │
│  ✦ Co-Creator (claimed Apr 26, 2026)             │
│                                                  │
│  Working toward Steward                          │
│  ☐ Send an investment     [ View Fund → ]        │
│  ☐ Vote in a Fund decision                      │
│  Earn 144 RGVoice when complete                  │
└─────────────────────────────────────────────────┘
```

The Steward criteria block follows the same pattern as Co-Creator. When all met, single Claim button. When claimed, the path block collapses to a calm tier-earned banner that lives on permanently, and the player's overall citizenship tier indicator updates.

### 8.3 Sage block

Sage is a single block at the top of the Your Paths section, only visible if the player has earned Steward on at least one path. Shows their current contribution percentile, a visual ring, and the message "Sage unlocks at 80th percentile sustained one full season." When earned, becomes a single Claim button for the 233 RGVoice Sage bonus.

### 8.4 Add a path

A small "+ Add a path" button at the bottom of the Your Paths section. Opens a modal with the four path cards. Choosing one creates a `player_paths` row with `declared_at` set.

---

## 9. Quest page redesign

The /quest page becomes the journey viewer. Profile is for action, Quest page is for orientation, exploration, and ceremony.

### 9.1 Hero (above the fold)

A solarpunk landscape hero with the player's character art (per their primary path) standing at the entrance to a forest path. Aurora overhead. Minimal copy: "Welcome back, [name]. The path is open." No CTA in the hero. The CTA is the page itself.

### 9.2 The Four Portals selector

Directly below the hero, four elemental portal icons sit in a row. Each glows with a subtle aurora border. Tap a portal to filter the quest list to that path. The portals never lock; all four are always visible. A small badge under each portal indicates which paths the player has declared (filled glyph) versus undeclared (outline glyph). Tapping an undeclared portal opens the same Add Path modal from section 8.4.

Borrowed from Hollow Knight's map fade-in animation: portals appear with a slow shimmer on first page load.

### 9.3 Citizenship tier sidebar

A vertical timeline on the left showing the four tier thresholds. The player's current position glows. Next threshold is faintly visible. Each threshold has a one-line label (e.g., "Co-Creator: walk a path") and a tap-target that scrolls the page to the relevant section.

Quests that require a specific tier (most don't, but some Open Universe quests will) get a small tier badge on the card.

### 9.4 Season ring

A small ring of four nodes at the top of the quest list (not the hero). Spring, Summer, Fall, Winter, each lit with the player's aurora color when they have at least one completed Rite from that season. Empty nodes stay dark. The ring is decorative for now; once we ship seasonal-only quests in Open Universe, the ring becomes a filter affordance.

Single label: "[N] of 4 seasons walked."

### 9.5 The quest list

Below the season ring, the quest list. Cards arranged by ring:

- **Welcome Aboard (10)** . collapsible, completed cards stay visible with checkmark. Once all 10 done, this section minimizes to a one-line confirmation.
- **Rites of Passage (14)**: grouped by season as collapsible arcs. All 14 unlocked from path declaration. Cards in each season show with its color accent.
- **Open Universe** . only renders if Ring 2 complete. Shows the 2 currently revealed quests. Below them, a placeholder card: "More quests reveal as you complete these. The forest is wide." Faint silhouettes of nearby locked quests sit in the background as moss-overgrown ruins, not greyed cards.

### 9.6 Quest card

Each card shows: icon, title, deliverable summary, reward chips, and a single action button ("Begin", "Continue", or "View"). Clicking opens the existing Quest modal.

Threshold quests (Fire, Food Foresting, the first revealed Epic Quest) get hero-card treatment: full-bleed background, slight aurora border, larger size. Routine cards use the standard size. The visual hierarchy points the eye to the meaningful starts without saying "start here."

### 9.7 The unlock animation

When a player completes a quest in the Open Universe, the next two reveals animate in once: silhouettes drift down from the top of the page (canopy fall) and dissolve into the locked-quest layout in their final positions. Single beat. Single sound (a soft chime, optional, off by default). No banner. No popup. The page settles. The player can scroll to find them.

### 9.8 Locked quests

In the Open Universe section, locked quests render as moss-overgrown stone ruins with a single faint glyph indicating their nature (fire / water / earth / air). Hovering shows a tooltip: "Reveals when you complete one of your current quests." Not a corporate lock icon. The aesthetic is "the path continues into the forest, you just haven't walked there yet."

### 9.9 Visual references to borrow from

- **Hollow Knight** map fade-in shimmer (portal entrance animation)
- **Slay the Spire** intent clarity (every locked card states what unlocks it)
- **Hades** Mirror tree (all nodes visible, locked ones stone-textured with labels)
- **Spiritfarer** quest-as-relationship feel (quests as invitations from people, not tasks from a system)
- **Stardew Valley** bulletin board calm (low-volume, never shouting)

### 9.10 Patterns to avoid

- Notification spam on quest reveal
- Daily-streak guilt loops (Duolingo-style "Don't lose your streak")
- League-table social comparison framing
- Greyed-out lock icons
- Reward popups that block the screen
- Multi-step claim flows that hide what's being claimed
- Cards that auto-rotate or auto-scroll the list

---

## 10. Phased implementation plan

Three phases. Each phase is shippable on its own.

### Phase 1: data + tier detection (1-2 weeks)

Goal: tier grants work end-to-end on the backend, including 77/144 bonus credits to private ledger. No UI changes.

- Migration `0140_path_progression.sql` for `player_paths` and `tier_events` tables.
- Migration `0141_quest_pool_path.sql` to add `pool` and `path` columns to a new `quest_metadata` table (we don't write to `questData.ts` from migrations; we keep the canonical list in code and the metadata table is for any per-player overrides).
- Update `questData.ts` entries with `pool` and `path` fields.
- Build the `detect-tier-progression` cron in `scripts/cron/detect-tier-progression.ts`.
- Wire inline detector calls into LOI submit, application approval, Fund vote, and quest completion handlers so common cases are real-time.
- Add `creditPrivateTokens` source tags `tier_bonus_co_creator`, `tier_bonus_steward`, `tier_bonus_sage`.
- Unit tests for detector idempotency and each path's criteria.
- Manual test: complete each criterion on staging, verify ledger credit + `tier_events` row.

Done when: a test player can complete an LOI on staging and see 77 RGVoice land in their private ledger within 15 minutes.

### Phase 2: Profile Quests tab (1 week)

Goal: the Profile becomes the actionable hub. Player can see their paths, the next action button per path, and the Hypha claim button when a tier is earned.

- Add the Your Paths section to the existing Quests tab, above Welcome Aboard.
- Implement States A, B, C from section 8.2.
- Wire each action button to its existing internal route.
- Build the Hypha claim flow: Profile button calls `playerProfiles.requestClaim` with the bonus amount and a new intent type `claim_tier_bonus`. The Hypha bridge handles the redirect.
- Add the Add Path modal.
- Sage block (read-only for now; Sage criterion isn't satisfied in this phase by anyone).

Done when: Rye on staging can sign an LOI, see 77 RGVoice in ledger, see the Claim button appear in Profile, click it, complete the Hypha redemption, and see the Profile update to show "Co-Creator (claimed [date])".

### Phase 3: Quest page redesign (2-3 weeks)

Goal: the /quest page reflects the new mental model. Beautiful, calm, oriented around paths and rings.

- Hero with character art per primary path.
- Four Portals selector with shimmer animation.
- Citizenship tier sidebar.
- Season ring (decorative).
- Quest list grouped by ring (Welcome Aboard, Rites, Open Universe).
- Hero-card treatment for threshold quests.
- Open Universe two-at-a-time reveal logic (client-side: derives from the player's `tier_events` and a deterministic random seed stored on the player).
- Moss-overgrown ruin silhouettes for locked quests.
- Unlock animation (canopy fall).

Done when: a new player with a fresh account can land on /quest, see four portals, declare ReGen Player, see all 14 Rites unlocked, complete one, and feel the page acknowledge the completion calmly.

### Phase 4 (deferred): Open Universe content

Authoring the long-tail Open Universe quest pool is a content project, not an engineering one. Spec the authoring template, get one quest in for each path, and let the pool grow from there.

---

## 11. ADR: superseding tier criteria

**Status**: proposed

**Context**: `CITIZENSHIP_TIERS_SPEC.md` (March 2026) defined Co-Creator, Steward, and Sage as gated by contribution percentile, gratitude received, and seasonal rite count. That model rewards highly-active forum/quest participants and structurally underweights people whose contribution is capital, land, or alliance scaffolding. It also fails to give Investors and Land Projects a clear "I belong here" moment early in their journey.

**Decision**: Tier criteria for Co-Creator and Steward are now per-path concrete milestones. Sage remains the cross-path contribution-percentile tier. The 77 / 144 / 233 RGVoice bonuses are paid on first earn per path (Co-Creator and Steward) and once for Sage.

**Why**: Each path now has a real-world threshold that proves the player did the thing the path exists for. An investor proves their path by investing. A land project by getting accepted and shipping a season. A player by walking the 14 Rites and voting in proposals. The model is legible to a new player on day one ("here's exactly what I need to do") and meaningful at scale ("Co-Creators are people who walked a path, not people who farmed forum posts").

**Trade-offs**: Old percentile-based tier grants are not migrated. Players who previously held Co-Creator or Steward under the old model keep their title; the system stops auto-granting under the old criteria the moment the new detector ships. The system never demotes a previously-granted tier.

**Code references**:
- New tables: `player_paths`, `tier_events`
- New cron: `scripts/cron/detect-tier-progression.ts`
- New ledger sources: `tier_bonus_co_creator`, `tier_bonus_steward`, `tier_bonus_sage`
- Superseded: `CITIZENSHIP_TIERS_SPEC.md` lines 35-169 (tier criteria) and the contribution-percentile gating logic. Document remains valid for: gratitude budgets, Harvest multipliers, governance weight per tier.

---

## 12. Open questions

These need a decision before Phase 1 ships. None block Phase 0 (writing this spec).

1. **Lifetime bonus cap.** A player could in theory walk all 4 paths and earn 4 x 77 + 4 x 144 + 233 = 1117 RGVoice in lifetime tier bonuses. Is that the intent, or should we cap somewhere? Recommendation: no cap. The bonuses scale with depth of engagement. Capping reads as punishing the players doing the most.

2. **Demotion or grace period under the new model.** The old spec had grace periods that demoted tiers if a player's contribution dropped below the threshold for a season. Per-path tiers don't behave the same way (you can't un-sign an LOI). Recommendation: no demotion. Tier earned is tier kept, except Sage which recomputes seasonally.

3. **Open Universe seeding.** Phase 3 ships the reveal mechanic but not the content. The first Open Universe quest pool needs at least 8-10 quests across the 4 paths to feel meaningful. Owner: content team. Spec to follow.

4. **Hypha claim race conditions.** What happens if the cron credits the bonus, the player clicks Claim, the Hypha bridge fires, but the on-chain transaction takes a long time? The existing claim system handles this with a pending state. Confirm Phase 2 reuses that pattern, doesn't reinvent.

5. **Sage percentile computation.** "Top 80th percentile sustained one full season" needs a concrete query. Is it daily-snapshot averaged, or end-of-season cutoff? Recommendation: daily snapshot, averaged across the season, requires daily score >= 80th percentile for at least 80% of the season's days. Aggressive but sustained-engagement. Alternative: simpler "average of daily ranks, must be in top 20% for the season" which is more forgiving. Pick before Phase 1 ships.

---

## 13. What we're not doing

To keep this spec contained, the following stay out of scope:

- Sub-paths within paths (e.g., distinct Investor sub-tracks for accredited vs. non-accredited)
- Path-switching flows (a player can declare more paths but not "drop" one; declared is forever)
- Quest authoring UI (we keep `questData.ts` as the canonical source)
- Cross-game progression bridges (RGVoice earned here doesn't auto-redeem to other DAOs)
- Mobile-specific quest layout (the redesign uses responsive Tailwind; mobile gets the same logic, smaller portals)

---

## 14. Cross-references

- `CONTEXT_THE_TWO_GAMES.md`: Fund vs. Game distinction. RGVoice belongs to the Game side. Tier bonuses paid in RGVoice reinforce that.
- `CITIZENSHIP_TIERS_SPEC.md`: still authoritative for gratitude budgets, Harvest multipliers, governance weight per tier.
- `QUEST_PROGRESSION_SPEC.md`: superseded for unlock-chain logic. Still authoritative for the 14 Rites' content and forum-post pattern.
- `PROGRESS_MAP_DESIGN.md`: complementary visualization. Not in scope for Phase 1-3 but the path definitions align.
- `ReGenCivics_WelcomeAboard_Brief.md`: Welcome Aboard quests stay as the first-ring entry experience.
- `CLAUDE.md` token model section: the four-token private-first-ledger model, including `creditPrivateTokens` as the only legitimate write to private balances.
- `apps/web/src/lib/hypha-bridge/`: the redeem-tokens intent the Claim button uses.

---

End of spec. Decisions marked "Recommendation" in section 12 stand unless overridden before Phase 1 ships.
