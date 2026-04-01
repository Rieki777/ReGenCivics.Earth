# Living Tree Growth Visualization - Concept Spec

This document captures the approved direction for Player Experience Spec #3: the Living Growth Visualization on player profiles.

---

## The Concept

A living tree that grows on every player's profile. It starts as a seedling and evolves through distinct life stages as the player contributes across seasons. Every visual element maps directly to contribution data. Nothing is decorative.

---

## Life Stages

### Stage 1: Seedling (0-1 seasons completed)
A small sprout breaking through dark soil. Two or three tiny leaves. Below ground, a single pale taproot reaches down. The soil around it is bare but rich. This is everyone's starting point: you showed up, you planted yourself.

### Stage 2: Sapling (1-2 seasons)
The trunk thickens. A visible canopy of maybe 8-12 leaves begins forming. Underground, the root system splits into **9 major root arteries**, one for each form of capital (Intellectual, Social, Material, Financial, Living, Cultural, Spiritual, Experiential, Health/Vital). The roots that correspond to your actual contributions grow longer and branch further. A player who's heavy on Social and Cultural capital has two deep, branching roots and seven shorter ones. The imbalance is visible and that's the point: it shows your shape, your nature as a contributor.

### Stage 3: Young Tree (2-3 seasons)
Full canopy. The trunk shows subtle texture. Root system is now complex, with secondary branches off the main arteries. **Seasonal ring**: each completed season adds a visible ring to the trunk cross-section (visible on hover or in a detail view). The tree's overall size scales to total contribution score, but the *shape* of the canopy and roots reflects the distribution across the 9 forms.

### Stage 4: Flowering Tree (3-5 seasons)
After 3 completed seasons, **blossoms appear**. The number of flowers maps directly to contribution actions in the current season. Small clusters of flowers grow along the branches, and their color shifts with the seasons: spring cherry blossoms, summer wildflowers, autumn amber blooms, winter frost-flowers (subtle, crystalline). When a new season starts, last season's flowers fade and new buds form as you contribute. This creates a living pulse: the tree is never static.

### Stage 5: Fruiting Tree (6+ seasons)
After 6 seasons, **fruit begins to grow**. Fruit represents sustained, compounding impact. The size of individual fruits maps to the depth of specific contributions (a massive quest completion, a land project endorsement, a referral chain that brought in 5 active players). The *number* of fruits maps to total volume. Fruit types vary by your dominant capital: someone strong in Living Capital might grow figs, Financial Capital might grow golden apples, Cultural Capital might grow pomegranates. This is a legible visual language, not random decoration.

### Stage 6: Ancient Tree (10+ seasons)
The tree becomes a landmark. Moss on the trunk. Birds nesting. Smaller plants growing in its shade. At this point, you're part of the ecosystem's infrastructure. Other players' mycelium connections visibly attach to your root system. The tree becomes a *place* other trees grow near.

---

## Seasonal Mechanics

Each real-world season, the tree goes through a visual cycle. Spring: new leaves and buds. Summer: full canopy, flowers peak. Autumn: warm colors, fruit ripens, some leaves fall. Winter: bare branches reveal the trunk's structure and seasonal rings. But the tree never dies or resets. It's always growing. A player who's inactive for a season just has a quieter winter; the tree holds its size.

---

## The Root Detail View

Tapping on the root system opens a radial view showing the 9 arteries with labels and scores. Each root's length and branching density is a direct visual read of that capital type. This is where the Contribution Compass (#6) and the Living Tree overlap: the compass is the data view, the roots are the visual metaphor, and they reference the same numbers.

---

## Visual-to-Data Mapping

| Visual Element | Data Source |
|----------------|-------------|
| Trunk width | Total contribution score |
| Root shape (9 arteries) | Distribution across 9 forms of capital |
| Root depth per artery | Score in that specific capital type |
| Seasonal rings | Number of seasons completed |
| Number of flowers | Current season contribution actions |
| Flower color | Seasonal palette (shifts each season) |
| Fruit size | Depth of individual high-impact contributions |
| Fruit count | Total volume of sustained contributions |
| Fruit type | Dominant capital type |
| Canopy shape | Contribution balance (broad = balanced, tall = specialized) |
| Moss/birds/undergrowth | Longevity (10+ seasons) |
| Mycelium attachments | Other players connected via referral network |

---

## The 9 Root Arteries (Forms of Capital)

1. **Intellectual** - Guides written, proposals drafted, governance participation
2. **Social** - Forum activity, replies, community building
3. **Material** - Physical resources contributed, tools, infrastructure
4. **Financial** - Crowd-pooling contributions, fund investments
5. **Living** - Land-based contributions, ecological work
6. **Cultural** - Content created, stories shared, blog posts
7. **Spiritual** - [to be defined by community practice]
8. **Experiential** - Events attended, sessions hosted, mentoring
9. **Health/Vital** - Fitness coaching, diet guidance, wellness programs, healing practices

---

## Implementation Notes

- Build as a React component that takes the 9 category values + season count + total score
- SVG-based for crisp rendering at any size
- Animated: categories pulse gently when they've grown recently
- Appears on the player's public profile page (large version)
- Smaller version (icon-sized) appears next to the player's name in forum posts and community listings
- The root detail view connects directly to the Contribution Compass (#6 in Player Experience Spec)

---

## Status

**Approved by Rye.** Ready to be integrated into PLAYER_EXPERIENCE_SPEC.md once final review is complete.
