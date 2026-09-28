# Context: The Two Games, Cooperative and Game

*A reference note for the ReGen Civics team and for Claude when working on any content, copy, or code related to this project. Rewritten 2026-09-27: the old-Game anchor is now a member-owned cooperative in design (ADR-62). Every public sentence about it comes from `COOP` in `shared/fund.ts`.*

---

## The Core Frame

ReGen Civics operates on both sides of a chasm.

On one side: **the Dominant Game**, the existing economic, political, and social systems built around extraction, growth at all costs, and centralized power. Most institutions, legal structures, and financial instruments live here.

On the other side: **a growing diversity of new Games**, regenerative economic systems, decentralized governance, community-owned land, and ways of organizing human life that are oriented toward healing.

ReGen Civics anchors into both, and builds the bridge between them.

---

## The Two Distinct Spaces

### 1. The Cooperative (Old Game Side)

The **ReGen Network Cooperative** is anchored in the Dominant Game by design, and it is in design today.

It uses one of the oldest coordination structures the old Game has produced: **a member-owned cooperative**. Law, lenders and neighbors understand a cooperative, and it puts ownership with the people who use it. Land projects and people join to buy and steward land together, for use, and they govern it one member, one vote. Rye calls it "a cooperative regenerative society".

What is true today:
- It is not a legal entity, and it accepts no money. Nothing on the site is an offer of anything.
- Its legal form, bylaws and terms are being designed with land projects, future members and counsel.
- Its design principles: owned by its members; every form of capital counts (nine forms); a membership can't be sold or traded; no managing partners; land held for the long term (the community land trust pattern is the leading design); built for use.

**Tokens from the earlier fund design:** RCVoice and $RCivics. Their role, if any, in the cooperative is under review with counsel. The cooperative votes one member, one vote, and $RCivics is a live token with a public claim bridge, so neither is tied to cooperative capital or votes. See `COOP.coopTokens`.

### 2. The Game (New Games Side)

The **ReGen Civics Game** is anchored in the new Games: plural, diverse, emergent, and co-created.

The Game is free of the old Game's economic logic. It is where we experiment, play, and build the systems that don't exist yet. It's rooted in community participation, regenerative values, and the belief that the people closest to the land and the work should hold real governance power.

**Governance:** RGVoice tokens
**Economic token:** $ReGen
**Purpose:** Governs how the Game evolves and co-creates the utility of $ReGen

RGVoice is earned through participation: completing quests, contributing to the community, engaging with the ecosystem. It gives weight to those who show up. $ReGen records contributions to the Game, and its utility is something we are co-creating together.

**Current ideas for $ReGen utility** (open to community input):
- In-game currency for day-to-day interactions within the ecosystem
- A record of how contributions flow into the Game
- Rights and powers in the Game that grow with participation
- Future governance mechanisms we haven't designed yet

Tokens in ReGen Civics record contributions and carry governance weight in the Game. They make no claim about financial value.

---

## How They Work Together

Think of it as two anchors on either side of a chasm.

The cooperative is planted in the old Game: it uses a legal form the mainstream understands, and it gives land projects and people a shared way to hold land for the long term. The Game is planted in the emerging new Games: it can experiment freely, reward contribution, and co-create systems that don't have to make sense to Wall Street.

Together they form a bridge.

The bridge is what ReGen Civics is building. Part of the Game's purpose is to make that bridge bigger, stronger, and easier to cross, so that the growing number of people ready for these new realities can walk across safely, joyfully, and with a bit of awe and wonder.

---

## Key Distinctions at a Glance

| | **The Cooperative** | **The Game** |
|---|---|---|
| Anchored in | Old Game (Dominant Game) | New Games (emergent) |
| Structure | Member-owned cooperative (in design) | Community game + DAO |
| Governance | One member, one vote | RGVoice |
| Economic token | Under review with counsel | $ReGen |
| Legal structure | Being designed with counsel; not an entity yet | Hypha DAO on-chain |
| Who takes part | Land projects and people who use shared land | Community participants |

---

## Writing and Communication Notes

When writing about **the cooperative**:
- Use `COOP` in `shared/fund.ts` verbatim for status, definition and design principles.
- Emphasize: member ownership, one member one vote, nine forms of capital, land held for use and long-term stewardship, and that it is in design and accepts no money.
<!-- fund-claims-allow: this line names the banned terms so writers know what to avoid -->
- Never write about financial upside of any kind (gate G5): no returns, yield, IRR, appreciation, distributions, listings, secondary markets, "index fund", "portfolio", "invest in land projects through us", accredited investors, or fund terms. `scripts/check-fund-claims.mjs` fails CI on them.
- Never call it "the Fund".
- Tone: rigorous, trustworthy, grounded.

When writing about **the Game**:
- Emphasize: community, participation, quests, co-creation, seasonal rhythms, emergence, the infinite game
- RGVoice = governance over how the Game evolves
- $ReGen = records contributions to the Game; utility to be co-created, never a price or a value claim
- Tone: warm, playful, inviting, generative

When writing about **both together**:
- The bridge metaphor is powerful and true; use it
- "Two sides of a chasm" conveys the intentionality
- "Mastering both Games simultaneously" captures the ambition
- The goal: people can walk across the bridge safely, joyfully, with awe and wonder

---

*Last updated: 2026-09-27*
