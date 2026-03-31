# Quest Organization Plan
**For review with Rye before implementation**

This document maps all current quests and proposes how to organize them across seasons and sections on the Quests page.

---

## Current State

The Quests page (`/quest`) currently has:
- Quest 0 (Fire): special intro card
- A seasonal carousel showing 3 Rites of Passage quests per season
- An extended seasonal feed (18+ quests from `seasonalQuestsData.ts`)
- An Epic Quests section (placeholder, 10 quests defined but not displayed)
- Welcome Aboard quests live in profile, not on the main Quests page

**The problem:** Each season only shows 3 Rites of Passage quests. The extended seasonal quests exist in a separate section below and aren't integrated. Epic and Welcome Aboard quests are either hidden or siloed.

---

## Full Quest Inventory (52 total)

### Section 1: Introduction Arc (always shown first, not seasonal)

| Quest | Title | Reward |
|-------|-------|--------|
| Quest 0 | Fire: Transforming the Stories That No Longer Serve Us | 111 $ReGen + 1 RGVoice |

---

### Section 2: Rites of Passage (14 quests across 4 seasons + Anytime)

These are the core initiatory arc, numbered 1-13 plus Food Foresting.

**Spring**
| Quest | Title | Reward |
|-------|-------|--------|
| Quest 1 | Potion Brewing: Diversifying Our Inner Soils | 111 $ReGen |
| Quest 2 | Saving Seeds: Sovereignty & Co-Evolution | 111 $ReGen |
| Quest 3 | Healing Wholes: Food Abundance | 144 $ReGen |

**Summer**
| Quest | Title | Reward |
|-------|-------|--------|
| Quest 4 | Dreaming Spaces of Love: Family Homesteads | 111 $ReGen |
| Quest 5 | Rites of Love: We are the Land | 99 $ReGen |
| Quest 6 | Healing Circles: Community Gathering | 144 $ReGen |

**Fall**
| Quest | Title | Reward |
|-------|-------|--------|
| Quest 7 | Wild Foraging: Deep Nourishment | 111 $ReGen |
| Quest 8 | Medicine Journey: Inner Exploration | 222 $ReGen |
| Quest 9 | Tree Talk: Forest Communication | 99 $ReGen |

**Winter**
| Quest | Title | Reward |
|-------|-------|--------|
| Quest 10 | Communication Patterns: How We Relate | 177 $ReGen |
| Quest 11 | Coordination Patterns: How We Organize | 177 $ReGen |
| Quest 12 | Breathplay & Future Dreaming: Visioning Together | 111 $ReGen |

**Anytime (Routine, Repeatable)**
| Quest | Title | Reward |
|-------|-------|--------|
| Quest 13 | Fasting: Regenerative Ikigai | 77 $ReGen |
| Quest 14 | Love to Heal Your Body | 111 $ReGen + 1 RGVoice |
| -- | Food Foresting: Being Human Again | 111 $ReGen |

---

### Section 3: Seasonal Practices (18 quests from `seasonalQuestsData.ts`)

These are distributed across seasons following the Rites of Passage so as a user scrolls horizontally they see the rites of passage first in the season, then the additional quests below using the same format as quests 1-3 do (copying the card structure and repeating it's form)

**Spring**
| ID | Title | Reward |
|----|-------|--------|
| healing-five-bodies | Healing the Five Bodies | 144 $ReGen |
| study-natural-hygiene | Study Natural Hygiene | 111 $ReGen |
| regen-financial-systems | ReGen Financial Systems | 333 $ReGen |

Note: `community-currency` (Launch a Community Currency) has been moved to Epic Quests where it belongs.

**Summer**
| ID | Title | Reward |
|----|-------|--------|
| friendship-free-animal | Friendship with a Free Animal | 111 $ReGen |
| honey-moon | Your Honey Moon | 144 $ReGen |
| singing-food-forest | Singing to Your Food Forest | 77 $ReGen |
| animal-spirit-totems | Animal Spirit Totems and Bioregional Clan | 111 $ReGen |

**Fall**
| ID | Title | Reward |
|----|-------|--------|
| future-casting | Future Casting: Collective Time Travel | 77 $ReGen |
| eating-sunlight | Eating Sunlight: Plant to Mouth for One Month | 99 $ReGen |
| becoming-trauma-informed | Becoming Trauma Informed | 111 $ReGen |

**Winter**
| ID | Title | Reward |
|----|-------|--------|
| write-childrens-book | Write a Children's Book | 177 $ReGen |
| make-a-song | Make a Song for the ReGeneration | 111 $ReGen |
| recreate-personal-cycles | Recreate Your Personal Cycles | 111 $ReGen |

**Anytime**
| ID | Title | Reward |
|----|-------|--------|
| decrease-expenses | Decrease Expenses, Increase Joy | 77 $ReGen |
| hermetic-seal | Hermetic Seal: Transmuting Sexual Energy | 144 $ReGen |
| start-friend-pool | Start a Friend Pool | 111 $ReGen |
| present-parenting | Present Parenting: The First Three Years | 444 $ReGen |
| fifth-agreement | The Fifth Agreement | 99 $ReGen |
| ringing-cedars | The Ringing Cedars (per book / full series) | 33-333 $ReGen |

---

### Section 4: Epic Quests (10 quests, currently placeholder)

Community-scale transformation projects. Unlocked after completing ALL 12 Rites of Passage (quests 1-12). Currently show "Coming Soon."

**Easy Tier (444 $ReGen each)**
- Block Food Forest
- Networked Community Garden
- Bioregional Currency Launch
- Launch a Community Currency (moved from Seasonal Practices)

**Hard Tier (777 $ReGen each)**
- Cornfield to Cloud Forest
- Pasture to Paradise
- HOA to Village
- Retreat Center
- Golf Course Transformation
- Apartment Building Community

**Expert Tier**
- Startup Town (1,444 $ReGen)

---

### Section 5: Welcome Aboard Quests (10 quests, in profile with link from quests page)

Onboarding quests for new players. 33 $ReGen + 0.1 RGVoice each. Full series: 330 $ReGen + 1 RGVoice.

These stay in the player profile. The Quests page will include a small link/banner pointing new players to their profile to find the Welcome Aboard series.

1. Share Your Experience and Give Constructive Feedback
2. Write Your Regenerative Origin Story
3. Do a Regenerative Act
4. Connect with Your Bioregion
5. Make Friends and Support
6. Pledge Your Gift
7. Explore Our Foundations
8. Refer an Organisation Project (+2,222 $ReGen bonus if they join)
9. Refer a Land Project (+2,222 $ReGen bonus if they join)
10. Dream Up a Regenerative Quest (+1,111 $ReGen if implemented)

---

## Page Structure: Option A (Unified Seasonal View)

Merge Rites of Passage and Seasonal Practices into one section per season. Each season tab shows all quests for that season, with Rites first then extended practices.

```
[Quest 0: Fire, always at top]

[Season Tabs: Spring | Summer | Fall | Winter | Anytime]

  Spring tab shows:
  - Quest 1: Potion Brewing         (Rite of Passage)
  - Quest 2: Saving Seeds           (Rite of Passage)
  - Quest 3: Healing Wholes         (Rite of Passage)
  - Healing the Five Bodies         (Seasonal Practice)
  - Study Natural Hygiene           (Seasonal Practice)
  - ReGen Financial Systems         (Seasonal Practice)

[Epic Quests section, gated until enough Rites are completed]

[Small banner: "New here? Find your Welcome Aboard quests in your profile."]
```

This removes the confusing two-section split (carousel + separate feed). Each season feels full and rich, 6-7 quests instead of 3. Rites always come first within a tab. The Anytime tab becomes the permanent home for repeatable and non-seasonal quests.

---

## Duplicate IDs to Clean Up

| Keep | Remove | Notes |
|------|--------|-------|
| `honey-moon` | `your-honey-moon` | Same quest, deduplicate |
| `decrease-expenses` | `decrease-expenses-increase-joy` | Same quest, deduplicate |
| `fifth-agreement` | `the-fifth-agreement` | Same quest, deduplicate |
| `make-a-song` | `make-song-regeneration` | Same quest, deduplicate |

Update any forum thread references to use the canonical IDs above.

---

## Implementation Steps

1. `[CODE]` Merge `questData.ts` seasonal assignments into one unified array with a `type: 'rite' | 'practice'` field
2. `[CODE]` Remove `community-currency` from `seasonalQuestsData.ts` Spring section (it's an Epic Quest)
3. `[CODE]` Deduplicate quest IDs: keep the shorter/cleaner versions, update forum thread references
4. `[CODE]` Rewrite `QuestCarousel` to show all quests for the active season (rites first, then practices)
5. `[CODE]` Remove the separate `SeasonalQuestFeed` section (now merged into the carousel)
6. `[CODE]` Activate Epic Quests section: remove "Coming Soon" gate, wire up quest cards, add rites completion gate
7. `[CODE]` Add small "Welcome Aboard" link/banner to the quest page pointing to player profile
8. `[HUMAN]` Review the merged view and confirm ordering feels right before shipping

**Estimated effort:** 1 session (mostly data reorganization + component updates, no DB changes needed)

---

*Last updated: March 2026*
