# Citizenship Tiers Spec: Explorer, Co-Creator, Steward, Sage

Written 2026-04-01. Standalone reference for the ReGen Civics four-tier citizenship system. Extracted from SEEDS_VISION_IMPLEMENTATION_SPEC.md for easy reference during builds and content creation.

---

## Overview

Every player in ReGen Civics holds one of four citizenship tiers. Tiers reflect depth of contribution and community trust. They gate access to specific powers, determine gratitude strength, and set Harvest share multipliers.

All tier requirements, powers, and multipliers are stored as Game Variables (editable in admin, visible on the Game Mechanics page).

Governance voting happens through Hypha. Vote weight = RGVoice held. Tiers do not affect governance vote weight.

---

## Contribution Score Tiers (separate from Citizenship Tiers)

Contribution scores use a percentile-based system with their own tier names. These measure how much you contribute relative to everyone else. They are one input into citizenship tier requirements, but they are a different system.

| Percentile | Contribution Tier |
|------------|-------------------|
| 0-14       | Seedling          |
| 15-29      | Sprout            |
| 30-49      | Sapling           |
| 50-69      | Grower            |
| 70-84      | Cultivator        |
| 85-94      | Elder             |
| 95-99      | Guardian          |

Note: The 70th percentile tier was renamed from "Steward" to **"Cultivator"** to avoid collision with the citizenship tier "Steward."

---

## The Four Citizenship Tiers

### Explorer (entry level)

**How you become one:** Create an account and complete your profile. Everyone starts here.

**Requirements:**
- Account created
- Profile completed (display name, bio, avatar)

**Powers:**
- Access and complete quests
- Send gratitude (1x multiplier, base power)
- Participate in the forum (read, post, reply in general categories)
- View the Game Mechanics page (read-only, all variables visible)
- Endorse other players and projects
- Governance on Hypha (app.hypha.earth)
- Access to marketplace on LocalScale.org

**Cannot do:**
- Rate food producers for regenerative certification
- Nominate anyone to a higher tier
- Arbitrate disputes
- Sponsor new players

**Gratitude budget:** 3 per season
**Gratitude multiplier:** 1.0x (base)
**Harvest multiplier:** 1.0x (base rate)

**Game Variables:**
```
citizenship.explorer.can_submit_proposals = true
citizenship.explorer.can_signal_vote = true
citizenship.explorer.can_rate_producers = false
citizenship.explorer.can_nominate_tiers = false
citizenship.explorer.can_arbitrate = false
citizenship.explorer.can_sponsor = false
citizenship.explorer.gratitude_budget = 3
citizenship.explorer.gratitude_multiplier = 1.0
citizenship.explorer.harvest_multiplier = 1.0
```

---

### Co-Creator (earned through participation)

**How you become one:** Show up consistently, complete quests, earn community trust.

**Requirements:**
- Complete the Fire quest + 1 seasonal rite
- Reach Sprout contribution score (15th percentile)
- Receive 5+ gratitude tokens
- Be active for 2+ seasons

**New powers (beyond Explorer):**
- Access contribution-gated quests
- Create forum threads in governance categories
- Appear in Member Directory as "Co-Creator"
- Gratitude sends at 1.5x multiplier (50% stronger)

**Gratitude budget:** 5 per season
**Gratitude multiplier:** 1.5x
**Harvest multiplier:** 1.5x base rate

**Game Variables:**
```
citizenship.co_creator.can_submit_proposals = true
citizenship.co_creator.can_signal_vote = true
citizenship.co_creator.can_rate_producers = false
citizenship.co_creator.can_nominate_tiers = false
citizenship.co_creator.can_arbitrate = false
citizenship.co_creator.can_sponsor = false
citizenship.co_creator.gratitude_budget = 5
citizenship.co_creator.gratitude_multiplier = 1.5
citizenship.co_creator.harvest_multiplier = 1.5
```

**Requirement Game Variables:**
```
citizenship.co_creator.req.fire_quest_complete = true
citizenship.co_creator.req.seasonal_rites_count = 1
citizenship.co_creator.req.contribution_percentile = 15
citizenship.co_creator.req.gratitude_received = 5
citizenship.co_creator.req.seasons_active = 2
```

---

### Steward (earned through sustained contribution)

**How you become one:** Contribute across multiple seasons, earn deeper community trust, get endorsed by someone who's already there.

**Requirements:**
- Complete 4 seasonal rites (one per season)
- Reach Sapling contribution score (30th percentile)
- Receive 20+ gratitude tokens
- Give 15+ gratitude tokens
- Be active for 2+ seasons
- Receive 1+ endorsement from a Steward or Sage

**New powers (beyond Co-Creator):**
- Rate food producers for regenerative certification
- Nominate new Stewards
- Access Steward-only forum category
- Eligible for Seasonal Council (top 7 contributors + core team + elected)
- Gratitude sends at 2x multiplier (double Explorer)

**Gratitude budget:** 8 per season
**Gratitude multiplier:** 2.0x
**Harvest multiplier:** 2.0x base rate

**Game Variables:**
```
citizenship.steward.can_submit_proposals = true
citizenship.steward.can_signal_vote = true
citizenship.steward.can_rate_producers = true
citizenship.steward.can_nominate_tiers = true
citizenship.steward.can_arbitrate = false
citizenship.steward.can_sponsor = false
citizenship.steward.gratitude_budget = 8
citizenship.steward.gratitude_multiplier = 2.0
citizenship.steward.harvest_multiplier = 2.0
```

**Requirement Game Variables:**
```
citizenship.steward.req.seasonal_rites_count = 4
citizenship.steward.req.contribution_percentile = 30
citizenship.steward.req.gratitude_received = 20
citizenship.steward.req.gratitude_given = 15
citizenship.steward.req.seasons_active = 2
citizenship.steward.req.endorsement_from_steward_or_sage = 1
```

---

### Sage (earned through deep, long-term contribution)

**How you become one:** Years of sustained, high-impact contribution. Recognized and vouched for by existing Sages. Served on a Seasonal Council.

**Requirements:**
- Complete all 13 rites
- Reach Grower contribution score (50th percentile)
- Receive 50+ gratitude tokens
- Serve on 1+ Seasonal Council
- Be active for 4+ seasons
- Receive 2+ endorsements from existing Sages
- Reputation (trust) score above 80th percentile

**New powers (beyond Steward):**
- Nominate other Sages
- Access Sage-only forum
- Arbitrate disputes
- Sponsor new Explorer accounts (vouching)
- Visible as mentor in community directory
- Gratitude sends at 3x multiplier (triple Explorer)
- Ability to apply for Admin status in the Game over the Forum and Site

**Gratitude budget:** 13 per season
**Gratitude multiplier:** 3.0x
**Harvest multiplier:** 3.0x base rate

**Game Variables:**
```
citizenship.sage.can_submit_proposals = true
citizenship.sage.can_signal_vote = true
citizenship.sage.can_rate_producers = true
citizenship.sage.can_nominate_tiers = true
citizenship.sage.can_arbitrate = true
citizenship.sage.can_sponsor = true
citizenship.sage.can_apply_admin = true
citizenship.sage.gratitude_budget = 13
citizenship.sage.gratitude_multiplier = 3.0
citizenship.sage.harvest_multiplier = 3.0
```

**Requirement Game Variables:**
```
citizenship.sage.req.rites_complete = 13
citizenship.sage.req.contribution_percentile = 50
citizenship.sage.req.gratitude_received = 50
citizenship.sage.req.seasonal_councils_served = 1
citizenship.sage.req.seasons_active = 4
citizenship.sage.req.endorsement_from_sage = 2
citizenship.sage.req.trust_score_percentile = 80
```

---

## Grace Period Demotion

If a player no longer meets the requirements for their tier, they don't drop immediately. A grace period gives them time to recover.

**Mechanic:**
1. Nightly job checks requirements. If not met, `graceStartedAt` is set on the player's profile.
2. Player receives a notification (if enabled): "Your [tier] status is at risk. You have [N] seasons to meet requirements again."
3. If requirements are still not met after the grace period, the player is demoted one level.
4. If the player meets requirements again before grace expires, the grace period is cleared. No demotion.
5. Admin can exempt specific players from demotion.

**Game Variables:**
```
citizenship.grace_period.seasons = 2
citizenship.demotion.enabled = true
citizenship.demotion.notify_player = true
citizenship.demotion.admin_exempt_enabled = true
```

---

## Gratitude Trust Graph (Multiplier Bonus)

On top of the base tier multiplier, gratitude power scales with how much gratitude you've received in previous seasons. This is a basic trust graph: the more the community trusts you (expressed through gratitude), the more powerful your gratitude becomes.

**Formula:**
```
effectiveMultiplier = tierBaseMultiplier + min(trustGraphBonus, maxBonus)
trustGraphBonus = gratitudeReceivedPreviousSeason * receivedWeight
```

**Game Variables:**
```
gratitude.trust_graph.enabled = true
gratitude.trust_graph.received_weight = 0.1
gratitude.trust_graph.max_bonus = 2.0
```

**Example:** A Steward (2.0x base) who received 12 gratitude tokens last season gets: 2.0 + min(12 * 0.1, 2.0) = 2.0 + 1.2 = 3.2x effective multiplier.

---

## Trust Score (Reputation)

Trust score is a 0.0 to 2.0 float representing community trust. Starts at 1.0 (neutral). Used for Sage requirements (80th percentile threshold) and displayed on profiles.

**Inputs (7 factors, all weights as Game Variables):**
- Endorsements received (positive)
- Gratitude received (positive)
- Vouches received (positive)
- Forum engagement score (positive, 0-1 normalized with diminishing returns)
- Proposal follow-through ratio (positive, 0-1)
- Consecutive seasons active (positive)
- Flags received (negative)
- Seasons inactive (negative)

**Composting:** At each season boundary, 10% of positive trust signals decay. Trust must be actively maintained.

Full formula and all Game Variable keys are in SEEDS_VISION_IMPLEMENTATION_SPEC.md under "RESOLVED: Trust Score Formula."

---

## Database Changes

**New fields on playerProfiles:**
- `citizenshipTier` enum: 'explorer' | 'co_creator' | 'steward' | 'sage' (default: 'explorer')
- `citizenshipTierUpdatedAt` datetime
- `graceStartedAt` datetime (nullable)

**New tables:**
- `citizenshipTierHistory`: id, userId, fromTier, toTier, reason ('automatic' | 'admin_override' | 'nomination' | 'grace_period_expired'), promotedBy (nullable userId), createdAt

**Contribution score tier rename:**
- In `getTierFromPercentile()` in game.ts, rename the 70th percentile tier from "Steward" to "Cultivator"

---

## Admin Controls

**Admin page: "Citizenship Tiers"**
- Shows all 4 tiers side by side in a comparison grid
- Each tier displays: requirements (all editable), powers (toggle on/off), gratitude settings, harvest multiplier
- Individual power toggles per tier (e.g., temporarily disable proposal submission for Co-Creators)
- Manual promote/demote button per player (with required reason field, logged to history)
- Grace period dashboard: which players are currently in grace, when grace expires

**Nightly batch job visibility:**
- Dashboard widget: "Last tier check: [date/time], [status]. [N] promotions, [N] demotions, [N] errors."
- "Run Now" button for manual trigger
- Full job history log

---

## Seasonal Council

A Seasonal Council meets every season to discuss priorities, review proposals, and set direction.

**Composition:**
- Top 7 players by contribution score (automatic)
- ReGen Civics core team (admin-flagged)
- Elected candidates (community-nominated, formal election through Hypha if applicable)

**Tracking:** `seasonal_councils` and `seasonal_council_members` tables. Service = attended (marked by admin or self-reported). Attendance counts toward Sage requirement.

---

## Quick Reference: Power Comparison

| Power | Explorer | Co-Creator | Steward | Sage |
|-------|----------|------------|---------|------|
| Complete quests | Yes | Yes | Yes | Yes |
| Send gratitude | 1x | 1.5x | 2x | 3x |
| Gratitude budget/season | 3 | 5 | 8 | 13 |
| Forum (general) | Yes | Yes | Yes | Yes |
| Forum (governance) | No | Yes | Yes | Yes |
| Forum (steward-only) | No | No | Yes | Yes |
| Forum (sage-only) | No | No | No | Yes |
| Endorse players/projects | Yes | Yes | Yes | Yes |
| Submit proposals | Yes | Yes | Yes | Yes |
| Signal-vote on proposals | Yes | Yes | Yes | Yes |
| Rate food producers | No | No | Yes | Yes |
| Nominate Stewards | No | No | Yes | Yes |
| Nominate Sages | No | No | No | Yes |
| Seasonal Council eligible | No | No | Yes | Yes |
| Arbitrate disputes | No | No | No | Yes |
| Sponsor new players | No | No | No | Yes |
| Apply for Admin status | No | No | No | Yes |
| Harvest multiplier | 1.0x | 1.5x | 2.0x | 3.0x |