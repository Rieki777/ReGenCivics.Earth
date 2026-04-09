# Bionomics Page Spec

**Status:** Draft v1, ready for review
**Route:** `/bionomics` (with `/economy` and `/local-food-economy` redirecting in)
**Pairs with:** `/tokenomics`
**Replaces:** `client/src/pages/Economy.tsx` and `client/src/pages/LocalFoodEconomy.tsx`
**Created:** 2026-04-06

---

## Purpose

Bionomics is the living-economy companion to Tokenomics. Tokenomics covers the Fund and $RCivics (how capital flows from the dominant economic system into regenerative work). Bionomics covers the Game and $ReGen (how living value circulates through bioregions, food systems, land, and culture). Together they form a bridge: capital walks across one side, life grows on the other.

This page is the front door for anyone who wants to understand how the Game, the Fund, and the bioregional infrastructure ReGen Civics has been building since 2017 fit together as a single regenerative architecture.

## Voice and form

Organic, earthy, grounded. Short sentences. Sensory verbs (grow, root, circulate, compost, weave). Rye's voice. Zero em-dashes. No contrast framing. No AI-isms. Heavy use of collapsible sections so the page breathes and lets readers descend at their own pace.

---

## Page structure

The page mirrors Tokenomics in scaffold (hero, definition, narrative arc, deep dives, FAQ, CTA) and diverges in tone and content. Every major area below is a collapsible accordion section. Subsections inside each major area are also collapsible where noted.

```
1. Hero
2. The Definition (etymology breakdown)
3. The Bridge (Tokenomics + Bionomics yin/yang)
4. Since 2017 (timeline)
5. The Index Fund for the Regenerative Renaissance
6. Bioregional Financing Facilities (BioFi integration)
7. The 4 Returns Framework
8. The 12 BFF Attributes (honest checklist)
9. The 4 BFF Types mapped to ReGen Civics
10. The Three Legs of Bioregional Regeneration
11. Local Food Economies (former LocalFoodEconomy page, folded in)
12. The Innovative Mechanisms (brief, link to Tools page)
13. Right Relationship with Other Bioregions
14. Biocultural Regeneration
15. Regenerators
16. The Closing (ebook quote + four CTAs)
```

---

## Section 1. Hero

**Background:** The "Bridging Worlds" image (phoenix bridge, dying grey city on the left, regenerative green world on the right). Full-bleed, with a soft vignette so text reads cleanly.

**Headline:**
> Bionomics

**Subhead:**
> The living-economy side of ReGen Civics. The Game, $ReGen, and the bioregional infrastructure we've been growing since 2017.

**Caption under the image (small, italic):**
> Tokenomics is the bridge. Bionomics is the world we're walking into.

**Hero CTA row:** Two pill buttons.
- "See Tokenomics" → `/tokenomics` (with the small yin/yang glyph)
- "Play the Game" → `/game`

---

## Section 2. The Definition

Mirrors the Tokenomics opener structurally. Three short stacked paragraphs, each one a piece of the word, then a fourth that ties them together. No collapsible here. This is the doorway.

> **Bio.** Life. The pulse of cells, soil, mycelium, bird, river, person. The first economy was always the one life was already running.
>
> **Bio also means bioregion.** The scale at which living systems actually organize themselves. A watershed. A foodshed. A continent's nervous system of mountains and migration paths. The scale our work coordinates at.
>
> **Nomics.** The patterns and principles by which a household manages itself. From *oikonomia*, the original word for economy.
>
> **Bionomics, then, is the study of how life organizes its own economy at the scale of a bioregion.** It is the work of remembering that we are part of an economy that has been running for billions of years, and learning to play inside it instead of around it.

---

## Section 3. The Bridge (Tokenomics + Bionomics)

A side-by-side panel near the top. Yin/yang glyph in the center. Each side is a glass panel.

**Left (Tokenomics):**
- The Fund
- $RCivics
- Capital from the current economic systems
- Investment, fundraising, financial returns
- How money moves into regenerative work
- → "See Tokenomics"

**Right (Bionomics):**
- The Game
- $ReGen
- Life flowing through bioregions
- Gratitude, food, land, culture
- How value circulates inside the regenerative renaissance
- → "Play the Game"

**Caption underneath:**
> Two sides of one bridge. The Fund draws capital out of the current games. The Game grows the new economy that capital is flowing toward. They need each other.

This block also includes the small line: "We don't call the dominant economy 'broken' or 'old.' It is still vital to many people. It is the system most of us are crossing from. Bionomics is what we are crossing toward."

---

## Section 4. Since 2017 (collapsible timeline)

**Section header:** "Since 2017"
**Short intro line:** "A meandering river of seasons, lessons, and seeds planted."

**Visual:** A horizontal scroll on desktop, vertical on mobile, with a thin curving root or river line connecting nodes. Each node is a year. Each node is collapsible: tap or click to expand a paragraph beneath it.

### Nodes

**2017. The seed question.**
> If Bitcoin can spend billions a year on energy to back its currency, what if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? This is the question that started everything. The original p2p economy diagram lives here as an inline figure.

**2018 to 2020. SEEDS era.**
> Helping design and launch SEEDS, the first serious attempt at a regenerative currency with citizenship, harvest cycles, and a constitution. We learned what worked and what wanted to grow differently.

**2021 to 2022. Tools and infrastructure.**
> Building the early versions of the Game's core tools. Hypha DAO tooling, the first experiments with forum, quests, incubator scaffolding, and the first land project conversations.

**2022. The first incubator season.**
> Land projects, mentors, and the first version of the seasonal rhythm. ReGen Civics is formed.

**2022 to 2025. The long winter.**
> Rest, recuperation, consideration, research, and listening. Composting what came before so something truer could grow next.

**2025. The Fund takes shape.**
> $RCivics and $ReGen dynamics. The Game and Bionomics. Tier system, gratitude protocol, Game Mechanics, and the foundations of what you see on the site, designed and ready to build.

**Early 2026. Building starts.**
> We rapidly develop and deploy the Bioregional Games, Land-Based Games, and the ReGen Civics home site. The first land project pilots adopt and adapt the Game structure.

**Fall 2026. Season 2.**
> Thirteen land projects go through the open-source process of co-creating their Games. The season ends with the first Crowdpooling Season, where projects pool various forms of capital to evolve their work.

**Looking ahead.**
> A network of land-based and bioregional Games, each sovereign, all connected, all playing toward the Regenerative Renaissance.

**Implementation note:** Use a `<TimelineRiver>` component. SVG path for the river line, nodes positioned along it, each node's expand state stored in local React state. On mobile, collapse to a vertical accordion list with the same content.

---

## Section 5. The Index Fund for the Regenerative Renaissance

This is the framing block for what the Fund (Tokenomics side) is actually doing, told from the Bionomics side.

**Header:** "The Index Fund for the Regenerative Renaissance"

**Body:**
> We are investing in local food, regenerative land, community, and the organizations that hold them. It is a full-suite investment into the regenerative renaissance and the cultures growing inside it.
>
> Most funds pick a single thesis and ride it. We are doing something different. We are funding the whole portfolio of practices and infrastructures that a regenerative civilization needs to take root. Land projects. Food producers. Tools. Governance experiments. Bioregional organizing. Stories. Each one is a position in the index. Together they are the Regenerative Renaissance.
>
> Think of it as the index fund for everything that is becoming.

**Small CTA:** "See how the Fund works on Tokenomics →"

---

## Section 6. Bioregional Financing Facilities

Collapsible major section with collapsible subsections inside.

**Section header:** "Bioregional Financing Facilities"
**Intro paragraph (always visible):**
> Bionomics builds on the Bioregional Financing Facilities (BFF) framework developed by the BioFi Project, Dark Matter Labs, and the Buckminster Fuller Institute. We have a lot of love for this work. ReGen Civics is one expression of where it can go when you weave it together with what we learned in the SEEDS era and braid it into a Game that bioregions and land projects can actually play.
>
> A BFF is a financial body designed to take capital from the current economic systems and grow regenerative bioregional economies in its place. It is a semi-permeable membrane between two worlds. We are building tools, infrastructure, and a Game to help bioregions create their own.

**Subsection 6a. What is a BFF? (collapsible)**
> Short definition. The BioFi ebook describes BFFs as place-based, patient, participatory, and 4 Returns oriented bodies that move capital from extractive systems into regenerative ones. We treat BFFs as one of the three legs (alongside an Organizing Team and a Bioregional Hub) that any bioregion needs in order to regenerate at scale.

**Subsection 6b. Where ReGen Civics fits (collapsible)**
> We are a global network that supports bioregions in tooling, infrastructure, and Game design. Every tool we build is free and open source. Bioregions are welcome to copy, fork, remix, and run them. We are not trying to own the bioregional economy. We are trying to help it grow everywhere it wants to.

**Subsection 6c. Read the source (collapsible)**
> Link out to the BioFi ebook, Dark Matter Labs, Buckminster Fuller Institute, and a short reading list of related work.

---

## Section 7. The 4 Returns Framework

Collapsible major section. Inside, a 2x2 grid where each cell is one Return type.

**Header:** "The 4 Returns Framework"
**Intro:**
> The BioFi framework organizes regenerative success around four kinds of return: Inspiration, Ecological, Social, and Economic-Financial. Bionomics is built around all four. Here is what each one looks like inside the Game.

### The grid

**Inspiration Return.**
> Stories, art, quests, and the felt sense that something better is real and within reach. The Game's quest system, the Living Tree on every player profile, and the seasonal harvest rituals are all designed to generate this return.

**Ecological Return.**
> Soil rebuilt, water restored, biodiversity returning, carbon drawn down. Tracked through land project reports, bioregional health indicators, and the regenerative metrics each project commits to in its Game.

**Social Return.**
> Trust, belonging, repaired relationships, new councils, healthier communities. Tracked through gratitude flows, forum reputation, the trust graph, and the seasonal council structure.

**Economic-Financial Return.**
> Patient capital that earns honest returns inside a regenerative thesis. Held inside the Index Fund for the Regenerative Renaissance and circulated through $RCivics and $ReGen.

Each cell ends with one short link: "See how →" pointing to the relevant page (Game Mechanics, Land, Crowdpool, Tokenomics).

---

## Section 8. The 12 BFF Attributes (honest checklist)

Collapsible major section. Inside, a vertical checklist. Each item has a status badge: **Building**, **Experimenting**, or **Reaching**. Each item is its own collapsible row that expands to a one-paragraph explanation.

**Section intro:**
> The BioFi ebook lists 12 attributes that a Bioregional Financing Facility should embody. Here is where we honestly stand on each one. Some we are building today. Some we are experimenting with. Some we see clearly and have not started yet. We will update this checklist openly as the Game evolves.

### The 12

1. **Place-based and bioregionally rooted.** *Reaching.* Our global Game is the trellis. bioregion.regencivics.earth will host place-based Games starting with the first pilot bioregions later this year.
2. **Long-term and patient.** *Building.* The Fund is structured for multi-season cycles, not quarterly returns. Land projects we incubate are evaluated on five to twenty year horizons.
3. **Participatory governance.** *Building.* All participants get a voice. Voices are tiered and weighted based on contribution, trust, and citizenship tier so that influence reflects engagement and care, not capital alone.
4. **Holistic and 4 Returns oriented.** *Building.* Inspiration, ecological, social, and economic-financial returns are tracked through quests, harvests, and the Living Tree visualization on every player profile.
5. **Catalytic and connective.** *Building.* The Game's whole job is to connect regenerators to capital, attention, and each other. The forum, incubator, and gratitude system are all connective tissue.
6. **Blended capital structures.** *Experimenting.* The Fund mixes philanthropic, investment, and community capital. $RCivics and $ReGen are two complementary capital flows.
7. **Innovative financial instruments.** *Experimenting.* Gratitude tokens as eco-credits, seasonal harvests as a form of retroactive public goods funding, contribution-weighted voting, future obligation clearing pilots, and Crowdpooling as a direct-governance financial primitive. The Game gives communities the tools to experiment with their own financial and economic systems instead of waiting for someone else's.
8. **Right relationship with regenerators.** *Building.* Land projects are co-designers, not grantees. The Incubator is a circle, not a funnel.
9. **Transparent and accountable.** *Building.* The Game Mechanics page, public Game Variables, and open seasonal scorecards make every important number visible.
10. **Networked with other BFFs.** *Reaching.* We are open to connect further with bioregions that are actively organizing. All our tools are open source so any BFF or bioregional team can fork and adapt them.
11. **Capacity-building beyond capital.** *Building.* Quests, the Game itself, the role system, and the seasonal rhythm all build capacity in players, projects, and bioregions.
12. **Regenerative by design.** *Building.* The whole architecture composts at the end of each full seasonal cycle and regrows. Winter season is explicitly meant for regenerating and redesigning all our systems for a new spring. Each full cycle of seasons we renew and regenerate the Game itself.

**Implementation note:** Each row is a `<details>` element styled as a glass panel, with the status badge color-coded (Building = green, Experimenting = amber, Reaching = soft blue).

---

## Section 9. The 4 BFF Types mapped to ReGen Civics

Collapsible major section. Inside, a 2x2 grid where each quadrant is one BFF type.

**Section intro:**
> The BioFi ebook describes four BFF types: Bioregional Trust, Bioregional Venture Studio, Bioregional Investment Company, and Bioregional Bank. Each has its own way of raising and allocating capital. ReGen Civics gestures toward all four. Here is where each one shows up in our work.

### The grid

**Bioregional Trust.**
> Stewardship. Holding land, culture, and commons across generations. ReGen Civics expression: the Land Project incubator, the steward citizenship tier, the long-horizon governance councils, and the relationships we hold with the projects in our portfolio.

**Bioregional Venture Studio.**
> Designing and launching new regenerative ventures inside a bioregion. ReGen Civics expression: the quest system as a way to incubate new ideas, the Crowdpool as the financing primitive for venture launches, and the Game roles that produce the people who can run them.

**Bioregional Investment Company.**
> Patient, blended capital deployed into a portfolio of regenerative initiatives. ReGen Civics expression: the Fund itself, the Index Fund for the Regenerative Renaissance framing, $RCivics, and the investor cultivation work on the Tokenomics side of the bridge.

**Bioregional Bank.**
> Day-to-day circulation of value inside a bioregion. ReGen Civics expression: $ReGen, the gratitude protocol, the food economy circulation through LocalScale, and the eventual bioregional vouchers and obligation clearing experiments.

Each quadrant is collapsible to expand into a longer paragraph and a link to where the user can see that work in motion.

---

## Section 10. The Three Legs of Bioregional Regeneration

Collapsible major section. A simple triangle figure at the top with three labels: Organizing Team, Bioregional Hub, BFF.

**Section intro:**
> The BioFi framework names three legs that any bioregion needs to regenerate at scale: an Organizing Team, a Bioregional Hub, and a Bioregional Financing Facility. ReGen Civics builds tools for all three.

### The three (each collapsible)

**Organizing Team.**
> The humans holding the work. We support them through the Game role system, sociocratic governance templates, seasonal councils, and the seasonal rhythm of harvest and composting.

**Bioregional Hub.**
> The place (digital and physical) where the bioregion gathers. We support hubs through the forum, the quest system, the incubator scaffolding, and the open-source ReGen Civics codebase that any hub can fork and run as its own home.

**Bioregional Financing Facility.**
> The body that moves capital. We support BFFs through the Fund, $RCivics, $ReGen, the Crowdpool primitive, the Tokenomics page, and the connective tissue that links bioregional BFFs into a global movement.

---

## Section 11. Local Food Economies

Collapsible major section. This is where the entire former `LocalFoodEconomy.tsx` content lives. It is the most concrete bioregional economy anyone can touch, so it gets pride of place inside Bionomics.

**Header:** "Local Food Economies"
**Intro (always visible):**
> Our entire journey started with food. In 2017 the question was simple. If Bitcoin could spend billions a year on energy to back its currency, what if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? Bionomics is what grew from that question.

**Inline figure:** The original p2p economy diagram, captioned: "The 2017 sketch. Local food systems as the energy backing a regenerative currency."

### Subsections (each collapsible)

**11a. Why food first.**
> Food is the layer of the economy everyone touches every day. It is also the layer where regenerative work has the most direct impact on land, water, soil, and community. Start here and the rest follows.

**11b. LocalScale, our key partner.**
> LocalScale is the platform we work with most closely on the food economy. Together we are building the application flow for food producers, the routing of $ReGen through producer rewards, and the bioregional vouchers experiment. (Pull existing LocalFoodEconomy copy here, lightly edited for the new tone.)

**11c. For food producers.**
> One paragraph plus a CTA: "Apply to join the food producer network →" linking to the producer onboarding flow.

**11d. For eaters and households.**
> One paragraph plus a CTA: "Find regenerative food in your bioregion →" linking to the discovery view.

**11e. The food backed currency idea.**
> A paragraph that returns to the 2017 question and shows where it lives now in the Game. Link to Game Mechanics for the full numbers.

**11f. Bioregional vouchers and food economy primitives.**
> A short paragraph about the experiments planned: bioservices banks, vouchers, advance market commitments for regenerative produce. Link to the Tools page.

---

## Section 12. The Innovative Mechanisms

Collapsible major section, intentionally short.

**Header:** "The Innovative Mechanisms"

**Body:**
> The BioFi ebook gathers a long list of innovative mechanisms that bioregional economies are experimenting with. Eco-credits, quadratic and conviction voting, retroactive public goods funding, obligation clearing, bioregional vouchers, advance market commitments, profit pooling, and more.
>
> We are not trying to list them all here. We are trying to make them buildable. ReGen Civics is the open-source foundation that bioregions, land projects, and their communities can use to experiment with their own. Crowdpooling is the first one we are shipping as a first-class primitive. Many more will follow.

**CTA:**
> "See the Tools we are building →" linking to the Tools page.

---

## Section 13. Right Relationship with Other Bioregions

Collapsible major section. Short.

**Body:**
> The BioFi ebook is firm about this: BFFs should not compete with each other. They should build right relationship with their neighbors. We feel the same way.
>
> ReGen Civics is a global network that supports bioregions with tooling, infrastructure, and Game design. We are not trying to be anyone's BFF. We are trying to help every bioregion grow its own. We are open to connect with bioregions that are actively organizing. If that is you, the door is open.

**CTA:** "Connect with us →" linking to a contact form or the appropriate forum thread.

---

## Section 14. Biocultural Regeneration

Collapsible major section. Short.

**Body:**
> Healing land and healing culture are inseparable. The BioFi ebook calls this biocultural regeneration. We call it the whole point.
>
> The Game's design holds this everywhere. Quests heal players. Players heal communities. Communities heal land. Land heals players back. The loop only works when all four are in motion at once. Bionomics is what happens when an economy is built around that loop instead of around extraction.

---

## Section 15. Regenerators

Collapsible major section. Short.

**Body:**
> The BioFi framework centers regenerators. People, projects, and practices that heal place. Bionomics is built to resource them, connect them, and amplify them.
>
> Inside ReGen Civics, regenerators show up as land projects in the incubator, food producers on LocalScale, players doing quests in their own backyards, role-holders running the Game, and bioregional teams forking our tools and adapting them. If you are healing place, you are a regenerator. The Game is for you.

**CTA row:** four small pill links.
- "I have land" → Land
- "I grow food" → LocalFoodEconomy redirect to /bionomics#11
- "I want to play" → Game
- "I want to invest" → Tokenomics

---

## Section 16. The Closing

A quiet, simple closing block. No collapsible.

**Quote (lightly paraphrased to stay under 15 words from the source, attributed):**
> The BioFi Project's 2024 ebook concludes with a clear charge: financial architecture must serve regeneration. Bionomics is one answer.

**Closing paragraph in Rye's voice:**
> This page will keep growing. The Game is just getting started. If any of this resonates, find a quest, talk to a land project, or just sit with the bridge image for a minute. The world on the other side is real. We are walking toward it together.

**Final CTA row (four buttons, one for each audience):**
- **For land projects.** "Apply to the incubator →"
- **For food producers.** "Join LocalScale →"
- **For players.** "Start your first quest →"
- **For investors.** "See the Fund on Tokenomics →"

---

## Section ordering rationale (quick notes)

The arc moves from definition (what does the word mean) → bridge (how does this relate to Tokenomics) → lineage (where did we come from) → vision (the Index Fund framing) → framework (BFF, 4 Returns, 12 Attributes, 4 Types, 3 Legs) → most concrete expression (food) → tools framing → relationships → philosophy → close. A reader who only reads the first three sections gets the core. A reader who goes all the way down gets the full architecture.

---

## Visual and component spec

**Background:** Use the existing `PageBackground` system with a new "bionomics" overlay variant: warmer, earthier, with a soft green/amber gradient and a faint root-pattern SVG layered behind glass panels. The hero uses the Bridging Worlds image at full bleed.

**Bridge imagery throughout the site:** Add the Bridging Worlds image as a recurring motif. Use a small bridge glyph in the nav next to the Tokenomics/Bionomics pair. Use a faded version of the bridge in the footer between the Fund and Game sections. Use the phoenix as a small flourish at the top of seasonal/transition moments throughout the site.

**Yin/yang glyph:** A custom small SVG. Half is filled with a coin/circuit motif (Tokenomics), half with a leaf/root motif (Bionomics). Used wherever the two pages are paired.

**Collapsible sections:** Use a `<BionomicsAccordion>` wrapper component. Each major section is collapsed by default except sections 1, 2, and 3 (which are always visible). Reader sets their own depth.

**Components to build (new):**
- `<BionomicsAccordion>` (wraps `<details>` with the glass panel styling)
- `<TimelineRiver>` (the meandering Since 2017 timeline)
- `<BFFAttributeRow>` (status badge + collapsible row)
- `<BFFTypeQuadrant>` (one cell of the 2x2 BFF type grid)
- `<ThreeLegsTriangle>` (the SVG triangle for Section 10)
- `<BridgeYinYang>` (the small paired glyph)
- `<RegeneratorAudienceCTAs>` (the four pill links)

**Components to reuse:**
- `PageBackground`
- Existing glass panel CSS
- `GameHookBanner` with new `bionomics` variant
- Existing form and button primitives

---

## Routing and navigation

**New route:** `/bionomics` → `client/src/pages/Bionomics.tsx`

**Redirects:**
- `/economy` → `/bionomics`
- `/local-food-economy` → `/bionomics#local-food-economies`

**Navigation changes (`Navigation.tsx`):**
Pair Tokenomics and Bionomics next to each other in the dropdown, separated by the small yin/yang glyph. Group label: "The Two Sides of the Bridge" (or simply put them adjacent without a heading if that feels too much).

```
- Tokenomics
  ☯
- Bionomics
```

Mobile nav: list them adjacent in the same collapsible group.

**Footer changes (`SiteFooter.tsx`):**
- Game section gets "Bionomics" added as a top link alongside Game Mechanics.
- Fund section keeps Tokenomics.
- Add the faded bridge motif between the two sections visually.

---

## Cross-link plan

1. **Tokenomics.tsx** "A note on $ReGen" block (around line 914): replace with the new copy that links to Bionomics. Updated text:
   > **A note on $ReGen:** $ReGen is the token for the Game, and it lives in Bionomics. It's based in local food systems and bioregions, the living-economy side of ReGen Civics. See the full picture on the [Bionomics page](/bionomics).

2. **Land.tsx**: add a closing CTA "Read more on Bionomics →"

3. **Game.tsx (Play page)**: add a "What is the economy of the Game?" section with one paragraph and a "Read Bionomics →" link.

4. **GameMechanics.tsx**: add a small linked sidebar block: "These mechanics live inside Bionomics. Read the full vision →"

5. **Home page GameHookBanner**: add a `bionomics` variant. When a user is on `/bionomics`, the banner reads:
   - Hook: "The economy is alive. Play it into being."
   - Subtext: "Gratitude, land, food, and $ReGen. The living side of ReGen Civics."
   - CTA: "Play the Game →"

---

## Citizenship Tiers move

Citizenship Tiers do not belong on Bionomics. Move them to **GameMechanics.tsx**, where they fit naturally alongside the other Game variables. Update any inbound links from the codebase to point to `/game-mechanics#citizenship-tiers`.

---

## Voice checklist (apply to every line of copy)

- [ ] Zero em-dashes
- [ ] No contrast framing ("not X, but Y")
- [ ] No banned AI-isms (delve, foster, leverage, vibrant, crucial, unlock, seamless, robust, navigate as metaphor, etc.)
- [ ] No rhetorical question openers
- [ ] No "join us on this journey" filler
- [ ] Specific over abstract
- [ ] Rye's voice (direct, grounded, contractions fine, short sentences fine)

---

## Implementation tracks (post-spec-approval)

**Track A. Foundation.**
- Create `client/src/pages/Bionomics.tsx` from a copy of the Tokenomics scaffold
- Add `/bionomics` route to `App.tsx`
- Wire `/economy` and `/local-food-economy` redirects
- Build the seven new components listed above
- Add the bionomics PageBackground overlay
- Add the bridge motif and yin/yang glyph SVGs

**Track B. Content.**
- Write all section copy per this spec
- Build the timeline river with the user-supplied node text
- Build the 12 BFF attributes checklist with status badges
- Build the 4 BFF types quadrant grid
- Fold in LocalFoodEconomy content under section 11

**Track C. Cross-linking.**
- Update `Tokenomics.tsx` $ReGen note
- Add Bionomics to Navigation and SiteFooter
- Add the bionomics GameHookBanner variant
- Add closing CTAs on Land, Game, and GameMechanics pages
- Move Citizenship Tiers from any current location into GameMechanics

**Track D. Polish.**
- Apply the bridge imagery motif site-wide
- Verify mobile collapsible behavior
- Run the voice checklist on every line
- Verify all redirects work

---

## Open questions for Rye

1. Do you want Tokenomics and Bionomics in the same nav group with a heading like "The Two Sides of the Bridge," or just adjacent with no heading?
2. The Bridging Worlds image: do you have a high-resolution version we can use for the hero, or should we generate a refined version with nano-banana-pro?
3. The 2017 p2p economy diagram: do you have the original asset or should we redraw it cleanly for the page?
4. For the "Connect with us" CTA in Section 13, should it open the contact form, the forum, or a dedicated bioregional partnership thread?
5. Confirm: Citizenship Tiers move to GameMechanics page (not anywhere else)?

Once these are answered I can proceed straight to Track A and start building.
