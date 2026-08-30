---
name: regen-investor-deck
description: >
  Build or update a ReGen Civics investor-facing pitch deck (.pptx). Wraps
  the pptx skill with ReGen voice, Fund vs. Game framing, slide architecture,
  and the canonical investor narrative. Pulls from current state: fund
  metrics, season progress, on-chain numbers, land project pipeline. Triggers
  on: "investor deck", "pitch deck", "pptx for investors", "update the deck",
  "fund deck", "LP deck", "pitch presentation", "investor presentation",
  "slide deck for fund", "deck for the raise", or any request to build,
  update, or convert content into an investor presentation.
---

# ReGen Civics Investor Deck

## What this skill does

Produce or update an investor-grade .pptx deck that holds together when
Rye walks into a room with capital allocators, family offices, regen-curious
LPs, or grant officers. The deck has to be legible to traditional finance
without losing the soul of the project.

Always invoke the `pptx` skill before starting; this skill builds on top
of it for the slide construction and asset wiring. Never use python-pptx
directly without reading `~/.claude/skills/pptx/SKILL.md` first.

## The canonical 14-slide deck

This is the default architecture. Cut slides for shorter formats; rarely
add slides without strong reason.

| #  | Slide                         | Single goal                                                 |
| -- | ----------------------------- | ----------------------------------------------------------- |
| 1  | Cover                         | Brand presence, name, tagline, one image                   |
| 2  | The opening                   | One specific, current observation that sets the table       |
| 3  | The problem we're addressing  | Why land regeneration is undercapitalized                   |
| 4  | The two-game frame            | Fund (Dominant Game) + Game (new Games), why both           |
| 5  | What ReGen Civics is          | Plain-language summary with the four-token visual           |
| 6  | The fund                      | Structure, thesis, returns model                            |
| 7  | The game                      | Quests, seasons, citizenship tiers, why this onboards capital |
| 8  | The bridge                    | Hypha, Base chain, on-chain governance, ledger              |
| 9  | Traction                      | Real numbers: projects, players, $ committed, season 1 outcomes |
| 10 | The pipeline                  | Land projects in flight + the incubator cohort              |
| 11 | Team                          | Rye, contributors, advisors, key collaborations            |
| 12 | The ask                       | What you want from this LP, at what minimum, by when        |
| 13 | Use of funds                  | Where capital goes, what % to land vs. operations vs. fund  |
| 14 | Close + contact               | One sentence, calendar link, email                          |

For a 10-slide variant, fold:
- 4 + 5 → "What it is"
- 6 + 7 + 8 → "How it works"
- 12 + 13 → "The ask + use of funds"

For a 5-slide "elevator deck," keep: cover, what it is, traction,
the ask, contact.

## Voice rules for investor decks

These ride on top of the project Writing Rules. Investor-deck specific:

- **Numbers do most of the work.** Investors trust quantification. Where
  we have it, lead with it. Where we don't, say "directional, not
  audited."
- **Don't defend the regen frame.** Skeptical investors are reading;
  pretending they aren't is a tell. Better: "Here's our thesis on why
  bioregional capital flows generate competitive returns."
- **Honesty about stage.** Pre-revenue. Fund 1. First seasons. Real
  numbers but small numbers. Frame it as "early access" not "we're
  huge."
- **Two-token vs four-token.** Investors get the four-token model;
  don't dumb it down. Use a clear diagram. Allocate one slide.
- **No "regenerative renaissance" buzzword stack on slide 2.** Earn it
  by slide 5 or 6. Investors who don't speak movement-language will
  bounce off a buzzword wall.
- **Em-dashes banned. Project rule.**

## Slide-by-slide guidance

### Slide 1: Cover

- Logo (top-left or centered)
- Title: "ReGen Civics" + subtitle "[Fund / Pitch Name], [Date]"
  (use commas not em-dashes)
- One photo: real land, real people. Not stock. Not abstract.
- One line that names the date and the audience (e.g.
  "April 2026, prepared for [Investor Name]")

### Slide 2: The opening

Pick one current, specific observation:

- "$X billion flowed into climate tech VC last year. Less than X% reached
  bioregional land stewards."
- "[Specific land project] needed $X to plant [X acres]. They didn't have
  it. Multiply that across 100 land projects per region, multiply that
  across 1,000 bioregions, and you have the gap we're closing."
- "Most regenerative agriculture pilots have run for 5 to 7 years. The
  ones with bioregional governance and equity-style funding have a 3x
  survival rate. We're scaling that pattern."

If we don't have a specific number, name a specific named project as the
anchor instead of a generic "landscapes need capital" line.

### Slide 3: The problem

Three bullets max. Each one specific:

1. Land projects undercapitalized at the bioregional layer
2. Existing capital doesn't speak the same language as land stewards
3. The on-ramp from "interested in regen" to "actually invested" is
   broken; nobody plays the game long enough to write the check

This slide is for investors, not for movement insiders. Use their
language: "undercapitalized," "under-served market," "investment
intermediary."

### Slide 4: The two-game frame

This is the slide that makes or loses skeptical investors.

Visual: two overlapping circles or two anchors with a bridge between
them, labeled:

- **Left:** "The Dominant Game (Fund)". RCVoice, $RCivics, VC structure,
  legible to capital.
- **Right:** "The new Games (Movement)". RGVoice, $ReGen, quests,
  bioregional governance.

Caption: "We chose to build both, not because we love venture capital,
but because legibility is the bridge. Two anchors hold up one bridge."

Use the language from `CONTEXT_THE_TWO_GAMES.md` verbatim where it
fits. That file is the truth source.

### Slide 5: What ReGen Civics is

Plain language. One paragraph. One diagram showing the four tokens and
their relationships. Reference `client/src/components/TokenBox.tsx` for
the visual style we use on the site, replicate it on the slide.

### Slide 6: The fund

- **Status first, before anything else on this slide.** The ReGen Civics
  Fund is in formation. It is not a legal entity. Target launch 2027. It is
  gathering non-binding Letters of Intent and accepts no capital. Read the
  exact wording from `shared/fund.ts` (`FUND.statement`) and use it verbatim.
- **Never name a securities exemption.** Not a rule, not a subsection, not
  "we intend to rely on" one. Counsel has not chosen one, so naming one is a
  claim nobody has made, and the softer phrasing is the same claim. Until
  2026-08-30 this line named a specific exemption and hedged it with
  "probably", which is how a guess reaches an allocator's inbox. The only
  permitted sentence about the offering is `FUND.offeringDisclaimer`.
- Structure: designed as a venture capital fund. The legal structure,
  jurisdiction, terms and governance are agreed together by the founding
  investors at the founding event.
- Investment thesis: "We capitalize land stewards in bioregions where
  governance, ecology, and economy can co-evolve."
- Hold period, exit model, return target: pull from `shared/fund.ts`, and
  label every one of them proposed or target. Never present a modelled target
  as a projection of results.
- Diversification: across bioregions, project stages, ecological practices

### Slide 7: The game

- Seasons (March-September default cadence)
- 13 stewardship roles (the season character art is real, show 4-6 of them)
- Quests + citizenship tiers
- Why this matters financially: "Players become contributors. Contributors
  become investors. Investors become participants. The game is the funnel."

This slide is the hardest to get right because investors hear "game"
and reach for the eject. Frame it as the customer-acquisition layer for
a fund, not a Steam game.

### Slide 8: The bridge

- Hypha DAO contracts on Base (chain ID 8453)
- Forum decisions become on-chain proposals
- Token contracts deployed (use the addresses from CLAUDE.md)
- Ledger: private + public, with claim flow

Diagram: ReGen Civics private ledger on the left, Hypha contracts on
Base on the right, an arrow between them labeled "Claim."

### Slide 9: Traction

- Number of land projects in pipeline / approved / funded
- Number of registered players, completed quests
- Token amounts circulating, claimed
- Seasons run / cohorts completed
- Email subscribers, forum members, Discord size

If a metric is small, frame it as growth ("from X to Y in Z months"),
not as absolute. If a metric isn't measured yet, say so on the slide
("To be measured in Season 2").

### Slide 10: The pipeline

Showcase 3-5 specific land projects with name, bioregion, ask size,
state. Use real photos.

Don't list 30 projects. Show the 5 most compelling and say "and X more
in flight."

### Slide 11: Team

- Rye (founder, lead): role + 2-3 lines + photo
- Key collaborators: 4-8, single line each
- Advisors: 3-5, single line each
- Notable partnerships: SEEDS, Hypha, Regen Network, etc.

Real people. Real photos. Real roles.

### Slide 12: The ask

Specific. Not "we're raising." Say:

- Stage: "In formation. Gathering non-binding Letters of Intent."
- Threshold: the founding-event threshold from `FUND.loiThreshold`
- Minimum: the proposed minimum, labelled proposed
- Timeline: target launch `FUND.launchTarget`. Not a close date; there is
  no close to date, because there is no entity to close into.
- What an LOI signer gets: `FUND.loiPromise`. Nothing beyond it.

Terms ARE still being shaped, by definition, until the founding event. Say
so plainly. Do not say "term sheet available under NDA": there is no term
sheet, and implying one exists is the same error one step removed.

### Slide 13: Use of funds

Pie chart or simple percentage breakdown:

- X% to land project investments
- X% to fund operations (legal, ops, governance)
- X% to game / community infrastructure
- X% to season programming + incubator

Match the breakdown to the fund's stated allocation. If those
percentages aren't published yet, ask Rye for them; don't invent them.

### Slide 14: Close + contact

- One sentence that lands. Pattern: "[Specific outcome we're working
  toward] will not happen by accident. It happens because [audience
  for this deck] decided to participate."
- Calendar link (use Rye's actual scheduling URL)
- Email: rieki@regencivics.earth (verify before locking)
- Social: forum, Twitter, LinkedIn

## Asset assembly checklist

Before producing the deck:

- [ ] Pull current numbers from the live site / ledger / DB. Use the
      `regen-database-sql` skill for the SQL queries to gather metrics
- [ ] Pull recent player photos from `client/public/images/quests/` and
      `client/public/images/roles/` if showing the game in action
- [ ] Pull land project photos from project pages
- [ ] Use the brand palette: forest greens (`#1A3A2E`, `#2D5A3F`,
      `#4A8362`), warm gold (`#D4A574`), parchment (`#F5E6D3`)
- [ ] Use real fonts: heading "Cinzel" or "Cormorant Garamond" if
      available, body "Inter" or system stack. Match the site.
- [ ] Image attribution: if using a partner photo, name the project /
      bioregion in the slide footer

## Versioning convention

- Save to `decks/INVESTOR_DECK_v[N]_YYYY-MM-DD.pptx`
- Bump major version (`v2`, `v3`) on structural changes; bump minor
  (`v2.1`, `v2.2`) on copy edits or number updates
- Always also save a "current" symlink: `decks/INVESTOR_DECK_LATEST.pptx`

## Cross-references

- `pptx` skill: read first, always, before generating
- `regen-fundraising-copy` for the narrative voice in each slide
- `CONTEXT_THE_TWO_GAMES.md` for slide 4 framing
- `CITIZENSHIP_TIERS_SPEC.md` for slide 7 game mechanics
- `SEASONS_HISTORY.md` for traction numbers
- `nano-banana-pro` for any custom imagery if photos aren't available
