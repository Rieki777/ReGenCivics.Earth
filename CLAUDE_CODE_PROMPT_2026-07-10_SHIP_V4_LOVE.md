# CLAUDE CODE PROMPT: ReGen Ship v4, The Love Weave (2026-07-10)

**Status:** Ready to build. Weaves the honeymoon/love concept through the site and publishes the voyage-type structure.
**Supersedes:** guest capacity in `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md` (was 1 to 4; now **4 max, or 5 when at least 3 are children**).
**Article draft (written, awaiting Rye's review):** `blog-drafts/more-than-one-honeymoon.md`

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V4_LOVE.md at the repo root and execute it: the /ship/honeymoon page, the love band and Choose Your Voyage section on /ship, the capacity rule change, copy touchpoints, and staging the article draft into the blog system unpublished. Then ship gate, commit, push to main, verify Railway deploy SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

## Decisions locked (Rye, 2026-07-10)

| Decision | Choice |
|---|---|
| Honey origin story | Told as legend ("the old story goes"), never asserted as history |
| Placement | Full weave: dedicated `/ship/honeymoon` page + blog article + love band on `/ship` |
| Audiences | "Choose your voyage": Love Voyage featured first, Crew Voyage (friends), Family Voyage (kids). Love is the heart; all equally served |
| Capacity | **4 guests max; 5 allowed when at least 3 are children.** Driving passengers limited to belted seats (state in policies) |

---

## 1. `/ship/honeymoon` page (the permission slip)

Structure, drawing copy from the article draft (keep the two in the same voice; the page is the invitation, the article is the story):

1. **Hero:** "You're allowed to have more than one honeymoon." Sub: a permission slip to create a space of love between you and your Beloved. Married long, newly in love, or somewhere in the long middle
2. **The legend band:** the honey-for-a-moon story, legend-framed, with the health thread: a moon of honey was a moon of medicine, preparing for the next season of life
3. **A honeymoon that heals more than the two of you:** the week described (concierge treasure map, springs, planting together, serving land projects, the healing hole homecoming) and the core claim: healing together heals the relationship; couples in struggle who want to deepen are explicitly welcomed ("not a last resort; a place to fall back in")
4. **The health promise:** everything aboard optimized for health (link the perks section on /ship)
5. **The church heart:** the ship is a program of the Church of the Regenerative Earth, which exists to regenerate the Earth and spread love-based civilization; a vessel that grows love while healing land sits at the heart of the ministry
6. **CTA:** book your honeymoon (to /ship/book) + read the story (to the article once published) + the quest (sail free)
7. Use `ship-art-perfect-day.png` (v3 images) or the campfire-dusk photo until art lands

## 2. `/ship` love band + Choose Your Voyage

- **Love band** high on the page: one strong paragraph of the permission slip with the honeymoon page CTA
- **Choose Your Voyage** section (three cards, Love first):
  - **The Love Voyage:** you and your Beloved, a week of healing and falling deeper in love. Links /ship/honeymoon
  - **The Crew Voyage:** four friends, springs and summits and shared meals
  - **The Family Voyage:** parents in the love nest, kids in the second bedroom; the treasure chest was made for small hands planting seeds
- Each card states who it fits and links to /ship/book with a voyageType preselect

## 3. Capacity rule (everywhere)

- Booking form: guests 1 to 4; allow 5 only when the form's new adults/children split shows at least 3 children. Zod-enforce server-side (`adults + children <= 4 || (adults <= 2 && children >= 3 && adults + children <= 5)`)
- Add `adults` and `children` columns to `ship_bookings` (migrate existing `guests` data to adults)
- Update all copy that says "1 to 4" or "two couples": the honest line is "designed for a couple, comfortable for four, five when three are kids"
- Policies table addition: driving passengers limited to belted seating positions; extra crew may meet the ship at camp
- Note in the guest guide: more crew means more frequent dump and water refills; the ship can do this nearly anywhere

## 4. Copy touchpoints (small, everywhere)

- `/ship` announcement: add one love sentence to the hero block ("She was built for a couple falling deeper in love")
- Manifest email 0 (Welcome Aboard): one line inviting couples to read the honeymoon article
- Concierge intake: journey-type question gains "a love voyage / honeymoon" option that tilts the itinerary toward intimacy (hot springs, quiet boondocks, sunset summits) and gentler pacing
- Quest page and fleet page: untouched except nav links to the new page
- Nav: /ship/honeymoon linked from the ship section menu

## 5. The article

- `blog-drafts/more-than-one-honeymoon.md` is written. Stage it into the blog system **unpublished** (follow existing blog conventions) and leave publishing to Rye after review
- On publish, link it from /ship/honeymoon and the love band

## 6. Execution order

1. Migration: adults/children columns
2. Booking form + server validation + copy sweep for capacity
3. `/ship/honeymoon` page + nav
4. `/ship` love band + Choose Your Voyage cards + voyageType preselect
5. Concierge journey-type addition
6. Blog staging (unpublished)
7. Tests: capacity validation edge cases (4 adults ok, 5 adults rejected, 2+3 ok, 3+2 rejected), voyageType flow
8. Ship gate, commit, push, verify Railway SUCCESS, SHIPPED_LOG.md, Handoff Breakdown

## Handoff Breakdown: Who Does What

### YOU (Rye)

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Review and publish the article (`blog-drafts/more-than-one-honeymoon.md`) | Your voice, your call | blog admin |
| 2 | Confirm the honeymoon page hero image choice once v3 art is generated | Aesthetic call | reply in chat |

### CLAUDE CODE

Everything in Sections 1 through 6, autonomously, through a green deploy.

### WAITING ON YOU

- Nothing blocks the build. The article publishes when you say so.
