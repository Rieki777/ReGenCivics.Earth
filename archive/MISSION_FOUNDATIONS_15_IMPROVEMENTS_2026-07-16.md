# 15 Improvements for the World's Best Regenerative Civilization Game

Date: 2026-07-16
Status: Research + proposal. Companion to `AGENTIC_FOUNDATIONS_RESEARCH_2026-07-16.md` (round 1: context-hub, codream, agent foundations). This round asks a bigger question: what makes our ecosystem the best possible game for co-creating a growing diversity of regenerative civilizations, where players run epic fun quests today AND do the practical coordination that builds regenerative villages, towns, and cities?

Research inputs this round: 2026 live-ops and retention practice, self-determination theory in gameful design, Ingress/ARG coordination lessons, LLM game-master research (including the GDC 2026 finding that 52% of game professionals now view generative AI negatively, up from 30%, driven by quality concerns), BioFi Pathfinders + Regen Coordination Gitcoin rounds (quadratic funding for bioregions, AI ImpactQF), UN-Habitat's Block by Block participatory Minecraft planning, digital twins in urban planning, GEN / Regenerative Communities Alliance.

Organizing principle: three arcs. The Epic Game Today (1 to 5), Practical Coordination for Real Building (6 to 11), The Intelligence Layer (12 to 15). Each improvement names its repo anchor and a first step.

## Decision log (Rye, 2026-07-16)

**APPROVED, build now**: 1, 2, 3, 7, 10, 11, 12, 13, 14, 15. Build prompt: `CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md`.

Rye's amendments folded into the build prompt:

- **1 becomes Multiplayer Mode.** Lead with the multiplayer framing across the game. Launch with 5 multiplayer quests and a signup form (bioregion + chosen quest); when enough players in a bioregion sign up for the same quest, they are formed into a crew, added to a crew chat, emailed, and connected to start the quest together.
- **2 builds on the main ReGen Civics map**, never the ReGen Ship treasure map. The ship map's stack (Leaflet + PMTiles) is the reference implementation; the layer ships on the Civics-wide map surface.
- **10 goes ecosystem-wide.** Every application form in the system (individual forms through project applications) gains optional needs/offers fields feeding the same board, with background matching and automatic introduction emails when a need matches an offer.
- **14 splits by economy.** The verification ladder governs the internal economy (private token credits). Issuance of real public tokens is verified by humans through Hypha voting, which is exactly what Hypha governance is for. The ADR records this split.
- **15 is confirmed as the direction of the Custom Games master plan**: the civilization pattern integrates throughout the ecosystem, and every approved improvement becomes a blueprint module.

**ON HOLD, revisit 2027-01-16** (reminder scheduled): 4 (recommender), 5 (Quest Forge), 6 (QF rounds), 8 (design quests), 9 (digital twins). Re-run the research on these five when they come back up.

---

## Arc I — The Epic Game Today

### 1. Crew quests: design for relatedness, the deepest retention mechanic that exists

The strongest finding across the retention literature is old and keeps being reconfirmed: long-term retention rests on autonomy, competence, and relatedness, and relatedness is the one badges can't fake. Ingress's most committed players stayed for a decade because coordinating a city-scale operation required real communication infrastructure and real trust between people. The coordination WAS the game.

Most of our quests today are completable solo. Introduce a quest class that structurally requires 3 to 7 players to coordinate (a crew) to complete: a river cleanup that needs hands, a seed-swap that needs growers and drivers, an incubator site visit that needs a documenter, an interviewer, and a mapper. The crew infrastructure partly exists (`shipCrewList` job, ship keeper/fleet applications).

- **Why it serves the mission**: practicing small-group coordination on fun quests is literally rehearsing the skill that builds villages. The game trains the capacity the mission needs.
- **Anchor**: quest tables, `regen-quest-builder` skill, ship crew infrastructure.
- **First step**: add a `crew_size` field and a claim/assemble flow to one existing quest as a pilot. Update `regen-quest-builder` with an SDT rubric: every quest scored for autonomy, competence, relatedness before shipping.

### 2. A living world-state: make collective progress visible on the map

Great games show you the world changing because of what players did. We already have the rarest asset here: a real map (Leaflet + self-hosted PMTiles, ADR-32/34/36) with provenance tiers (ADR-35) and the Signal (ADR-28, aggregate-only sensing). Wire them together: completed quests, active crews, incubator projects, and season milestones render as living layers. Territory "lights up" as regeneration happens. A player opens the map and sees the civilization growing.

- **Why**: this converts abstract mission language into a visceral game feeling ("we are building something and I can see it"), and it doubles as the coordination substrate for Arc II.
- **Anchor**: ship map stack, `game_variables`, the Signal.
- **First step**: one new map layer, "quests completed this season," sourced from existing quest completion data. Ship it, watch engagement, then add layers.

### 3. Seasonal live-ops with community rituals, on a 6-to-9 week spine

2026 live-ops practice converged on a content cadence of 6 to 9 weeks with a "central activity spine" plus small recurring rituals (daily and weekly touchpoints that combine light progression with emotion). We run seasons already (`seasons/`, `regen-seasonal-roles` skill, `SEASONS_HISTORY.md`), which puts us ahead of most community projects. What's missing is the ritual layer inside a season and a templatized system so each season doesn't require bespoke build effort.

Design the season template: opening ceremony (livestream, already have Riverside pipeline), weekly rhythm (a "campfire" forum thread, a featured quest, a crew spotlight), mid-season event tied to a real ecological calendar moment (solstice, first rains, harvest), closing harvest ceremony where the season's map layer is consecrated. Earth's own calendar is our event calendar, which no commercial live-ops team can copy.

- **Anchor**: `seasons/`, `regen-seasonal-roles`, events tables, digest jobs.
- **First step**: write `SEASON_TEMPLATE.md` from the last two seasons' records, with the ritual spine included, so season N+1 is assembled instead of invented.

### 4. Next-quest guidance: a deterministic recommender before any AI

The 2026 live-ops trend is dynamic per-player pacing replacing static cohorts. Our version starts deterministic (STEERING §11): a "what should I do next?" surface driven by rules over data we already hold: player's completed quests, declared skills/tags, bioregion, current season, open crew slots nearby. Only when the rules can't rank do we ask the LLM to break the tie. This is also the answer chip inside the video tutor ("What should I do next?" from the Codream UX maps straight onto this endpoint).

- **Why**: new players churn when the next step is unclear; stewards burn out writing personal guidance. This is the single highest-value personalization we can ship, and it needs no new data collection.
- **Anchor**: player_profiles, quest tables, `forumAffinityJob` (affinity signals already computed), guide-companion endpoint.
- **First step**: a `getNextQuests` tRPC procedure, pure rules, surfaced on the player dashboard.

### 5. Quest Forge: AI-drafted, human-ratified quest generation

LLM quest generation is real in 2026 (context-aware quests responding to world state, player history, and local conditions), and player sentiment against raw AI content is also real (the GDC 52% number). The synthesis: AI drafts, humans ratify, players never see unratified content. We already invented the exact governance shape for this: the Evolution Engine's raise → ratify → execute pipeline with payload validation at both ends.

Quest Forge: a steward (or eventually the Signal) notices a condition ("the Cascadia crew list has 12 idle members," "first frost in 3 weeks"), the Forge drafts 3 quest candidates grounded in the season, bioregion, and quest-design rubric (improvement 1), and a human quest-keeper edits and ratifies. Every draft carries its generation context for audit. Rejected drafts with reasons feed the Forge's memory files (round 1, §4).

- **Anchor**: `regen-quest-builder` skill (becomes the Forge's grounding doc), Evolution Engine ratification pattern, `invokeLLM` gateway.
- **First step**: prompt-only pilot inside a Claude session using the skill, producing draft quests for the current season; measure how many a human keeper accepts before building any UI.

---

## Arc II — Practical Coordination for Real Building

### 6. Bioregional quadratic funding rounds

The BioFi Pathfinders rounds proved the mechanism at our exact scale: GG22 raised $8,813 from 1,096 contributions, matched with $55,000, and onboarded 14 bioregional teams to on-chain participatory budgeting. Regen Coordination's GG23 round distributed $96,000 across 50 regenerative projects using AI-augmented impact evaluation (AI ImpactQF). This is the fundraising primitive that matches our values: many small contributions, community-weighted, matched by the Fund.

Two paths, run in order: (a) join an existing round (apply to the next Regen Coordination / BioFi round as a project AND propose ReGen Civics as a round operator for our incubator cohort), then (b) run our own micro-QF inside the game: season's end, players allocate a matching pool across land projects using their voice tokens, quadratic weighting. The campaigns table family plus the token model already hold most of the pieces.

- **Why**: priority 2 is fundraising. QF turns fundraising into gameplay, and it makes small supporters matter, which is the movement's actual base.
- **Anchor**: `campaigns` + `campaignContributions`, token model (STEERING §5), Hypha Bridge for any on-chain leg.
- **First step**: contact Regen Coordination / BioFi about the next round (outreach task, fits the round-1 outreach agent pipeline). In parallel, an ADR sketch for in-game QF allocation.

### 7. A common impact standard for land projects

AI ImpactQF worked because projects reported against the Common Impact Data Standard, making them legible to both funders and AI evaluation. Our incubator applications capture rich but unstructured narratives. Define the ReGen impact schema (hectares under regeneration, water, soil, food output, people housed/fed/trained, governance maturity), aligned with the Common Impact Data Standard where it fits, and make it a living part of every project's profile rather than a grant-time chore.

- **Why**: this is the connective tissue between the game and the capital. Verified impact data feeds the map (2), QF rounds (6), investor materials, and eventually token issuance (14).
- **Anchor**: `applications`, incubator review flow (`regen-incubator-review` skill), drizzle schema.
- **First step**: one migration adding a structured `impact_data` JSON column with a zod schema in `shared/`, plus backfill of the current cohort by hand (small N).

### 8. Participatory village design quests, the Block by Block pattern

UN-Habitat + Mojang's Block by Block program has run participatory Minecraft design workshops in 30+ countries: community members, including kids, elders, women, and refugees, co-design real public spaces in-game, and the designs then inform real construction. This is the strongest proven bridge between "fun game today" and "real town tomorrow," and it is exactly our mission sentence made operational.

Our version: a "Design Quest" class where an incubator land project poses a real spatial question ("where should the common house, gardens, and water catchment go on these 12 acres?") and players co-design in a shared 3D or map canvas. Options by ascending cost: annotated map layers on our existing PMTiles/Leaflet stack (cheapest, ship first), a hosted Minecraft server per design quest (proven, cheap, huge fun), or a lightweight web 3D canvas later. Winning designs go to the land project's stewards for ratification and become part of its digital twin (9).

- **Why**: villages, towns, cities. This is the improvement that most directly practices building them.
- **Anchor**: ship map stack, quest system, incubator projects.
- **First step**: pilot one design quest with one willing incubator project using map annotation layers; if energy is high, stand up a Minecraft server for the second round.

### 9. A digital twin page for every land project

Urban planning's digital-twin practice (Zurich-style: 3D models, networks, simulations) scaled down to a land project: one living page per project with its map layer (boundaries, zones, water, plantings), its impact data (7), its active quests and crews, its needs and offers (10), and its design history (8). The project page becomes the coordination surface where game and construction meet: a steward updates the twin, the twin spawns quests, quest completions update the twin.

- **Anchor**: incubator applications, map stack, quest system. This is mostly composition of things that exist.
- **First step**: a `/project/:slug` page rendering map layer + impact data + linked quests for the pilot project from (8).

### 10. Needs and offers: a matching marketplace with an agent matchmaker

Every land project has needs (a welder for two days, 40 fruit trees, a grant writer); every player has offers (skills, tools, time, materials). Today this matching happens by luck in forum threads. Build the board: structured needs/offers with tags, bioregion, and time windows. Matching runs deterministic-first (tag + geography + availability rules); an LLM matchmaker only writes the warm introduction once a rule-level match exists, and a human accepts before any contact happens (same approval-gate posture as the round-1 outreach agent).

- **Why**: this is the practical coordination engine. Mutual aid at network scale is what makes the alliance real between funding rounds.
- **Anchor**: `contactTags`/`contactNotes`, forum, notification system, crew lists.
- **First step**: two tables (`project_needs`, `player_offers`) + a plain board page, no AI. Watch what people post; add the matchmaker when volume justifies it.

### 11. The federation layer: make ReGen legible to the wider movement

GEN's Regenerative Communities Alliance describes itself as a participatory commons synergizing across networks; Regenerate Cascadia, OpenCivics, BioFi, and the Ethereum localism cluster are all actively bridging. We should be the easiest node in that mesh to connect to. Three concrete surfaces: (a) publish our chub-style registry (round 1, §1.2) publicly so partner orgs' agents can fetch our canonical docs; (b) publish alliance data (project directory with impact schema, quest formats, season calendar) at stable machine-readable endpoints alongside `llms.txt`; (c) treat partner handoffs the way we treat Hypha: a Federation Bridge module with typed intents, never hand-rolled links.

- **Why**: "a growing diversity of regenerative civilizations" cannot be one platform. It's a protocol posture: our game should be forkable, joinable, and citable by sibling networks.
- **Anchor**: Hypha Bridge pattern (`server/lib/hypha-bridge/`), `llms.txt`, `.ai/docs` registry work from round 1.
- **First step**: publish the project directory JSON endpoint + extend `llms.txt`; draft the Federation Bridge ADR.

---

## Arc III — The Intelligence Layer

### 12. Elders as quest-givers, inside hard rails

The LLM game-master research is converging on what makes AI NPCs feel alive: memory of the relationship, awareness of world state, and dialogue coupled to scene and character. We already carry two in-world elders (Anastasia, Yeshua; ADR-21/22) with retrieval over canon and deterministic-first forum presence. The upgrade: elders can OFFER ratified quests (from the Quest Forge pool, improvement 5) in character, chosen by the same rules engine as improvement 4. The elder never generates a quest live; she selects from the human-ratified pool and speaks the invitation in her voice.

One addition given who Anastasia represents: the project instructions name Anastasia as one of our indigenous elders whose world we value deeply. Her AI persona's canon, tone, and the kinds of quests she offers should be reviewed and blessed by her, on a cadence she sets, with her holding veto at any time. That governance line belongs in the elder registry itself, not in a side conversation.

- **Anchor**: `elders.ts`, `elder-forum.ts`, `elder-retrieval.ts`, elder safety module, Quest Forge (5), recommender (4).
- **First step**: add `offeredQuests` capability to the elder registry, wired to the ratified pool, behind a feature flag; bring the design to Anastasia before enabling.

### 13. Consent-based player memory: the game remembers your journey

Round 1 proposed memory files for agent surfaces. This improvement is the player-facing version, and the research says it's the retention lever for AI companions: platforms that remember campaign history and character development deliver the personalized experiences players return for. A companion who remembers that you planted the cherry trees at the spring quest, and asks how they're doing in autumn, creates relatedness with the game itself.

Design constraints are the feature: opt-in per player, plain files/rows the player can read in full, export, and delete (the model already exists in our claim-bridge UX of making system state visible); nothing sensitive stored (health, conflict, finances stay out by schema, mirroring our AI-automation PII risk line); memory loaded read-only into companion context and framed as untrusted prior notes.

- **Anchor**: companion/guide infrastructure, `player_profiles`, round-1 memory conventions (§4).
- **First step**: `player_companion_memory` table + a "what the Guide remembers about you" settings page, shipped BEFORE any memory is written. Transparency surface first, memory second.

### 14. Proof of regeneration: verified real-world outcomes feed the game economy

The game's integrity rests on one link: tokens and glory flow from things that actually happened on real land. We already hold the pieces: verified provenance tiers on the ship map (ADR-35), source-tagged token ledger (STEERING §5), quest completion sources. Formalize the verification ladder: self-report → peer confirmation (a crewmate attests) → steward verification → evidence-backed (geotagged photo, before/after, harvest weight). Each rung earns more, and only upper rungs feed impact data (7), QF weight (6), and the public map (2). Verification itself becomes a quest type (auditing a crewmate's cleanup is a quest), which is how Ingress made verification fun instead of bureaucratic.

- **Why**: without this, growth corrodes trust; with it, our token economy becomes the thing ReFi keeps promising: money legible against real regeneration.
- **Anchor**: `user_token_ledger` source tags, quest completion flow, map provenance tiers.
- **First step**: an ADR defining the four rungs and their token multipliers; implement rung 2 (peer attestation) first since it's pure social mechanics, no media infrastructure.

### 15. Civilization starter kits: the custom games product as mission engine

The mission says a growing DIVERSITY of regenerative civilizations. One platform, however good, is a monoculture. The Custom Games product (CUSTOM_GAMES_MASTER_PLAN v3: $20k fully-owned self-hosted builds, blueprint.json, one-session generation) is quietly the most mission-critical thing in the repo, because it's the reproduction mechanism: every bioregion, church, school, or village that wants its own game gets one, with its own tokens, elders, seasons, and quests, federated back through improvement 11.

Reframe it accordingly: the blueprint schema should encode the civilization pattern, i.e. the parts we believe every regenerative game needs (seasons, crew quests, verification ladder, elder governance, impact schema, QF allocation), each one configurable, so a fork inherits the wisdom while expressing its own culture. Improvements 1 through 14 all become blueprint modules. Selling a custom game becomes planting a civilization.

- **Anchor**: `CUSTOM_GAMES_MASTER_PLAN.md`, `customGameApplications`, blueprint.json design.
- **First step**: audit the current blueprint schema against the pattern list above; add the missing modules as optional blocks so the next custom game sale ships with them.

---

## How the 15 interlock

The map (2) shows what the crews (1) did on quests the Forge drafted (5) and elders offered (12), recommended per player (4), inside a season's ritual spine (3). Verified outcomes (14) update project twins (9) and impact data (7), which weight the funding rounds (6) that finance the villages designed in participatory quests (8) and staffed through the needs board (10). The whole pattern federates outward (11) and reproduces through starter kits (15), while the game remembers each player's journey with their consent (13). Round 1's foundations (guardrails, evals, memory conventions, cost breaker) sit underneath all of it.

Added 2026-07-16: the Second Brain's memory layer (the Mycelium, per `HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md`) is the identity substrate for this whole map. The Worldview Pack gives the Quest Forge (5), the elders (12), the recommender's tone (4), and every companion one versioned source for Rye's concepts and voice; the agent contract and hygiene rules (supersession, contradiction surfacing) are the same conventions improvement 13 applies to player memory. One memory discipline, three scales: Rye's brain, the agents, the players.

Suggested first moves (smallest, highest signal): 4 (recommender), 2 (one map layer), 10 (plain needs board), 3 (season template doc), and the two outreach actions in 6 and 8's pilot conversation. All are shippable without new architecture.

---

## Sources

- [Gameful design and SDT-based retention](https://www.gamificationhub.org/how-does-gameful-design-take-into-account-individual-differences-and-player-preferences-in-its-design-approach/) · [gameful design case studies](https://www.gamificationhub.org/are-there-any-notable-case-studies-or-success-stories-of-gameful-design-being-used-to-drive-positive-behavioral-change/) · [Ingress coordination ecosystems](https://stepico.com/gaming/20-best-augmented-reality-games-for-android-ios-in-2026/)
- [2026 live-ops trends: templatization, personalization](https://www.pocketgamer.biz/2026-live-ops-trends-templatisation-personalisation-and-ai/) · [session loop and seasonal cadence](https://www.noobfeed.com/articles/session-loop-modern-live-service-gaming-in-2026) · [live-ops strategy](https://www.adjust.com/blog/what-is-live-ops/)
- [LLM quest generation](https://www.daydreamsoft.com/blog/ai-powered-procedural-quest-generation-transforming-narrative-depth-in-modern-games) · [RPG AI agents 2026 incl. GDC sentiment data](https://www.jenova.ai/en/resources/rpg-ai-agent) · [player-driven emergence in LLM narrative (arXiv)](https://arxiv.org/pdf/2404.17027)
- [BioFi Pathfinders Gitcoin round](https://emlyrogers.medium.com/biofi-pathfinders-gitcoin-round-bridging-bioregionalism-and-web3-to-build-regenerative-economies-098651520795) · [GG22 retrospective](https://gitcoin.co/case-studies/gg22-biofi-pathfinders-retrospective) · [GG23 AI ImpactQF retrospective](https://gitcoin.co/case-studies/gg23-ai-impactqf-regen-coordination-retrospective) · [Ethereum Localism x Regen Coordination](https://blog.refidao.com/ethereum-localism-x-regen-coordination/)
- [Block by Block (UN-Habitat + Mojang)](https://www.blockbyblock.org/) · [Block by Block Playbook](https://unhabitat.org/the-block-by-block-playbook-using-minecraft-as-a-participatory-design-tool-in-urban-design-and) · [Minecraft in urban development](https://unric.org/en/building-blocks-of-a-better-city-minecrafts-role-in-urban-development/) · [digital twins in planning](https://www.tomorrow.city/digital-twins-made-with-minecraft-and-open-street-map/)
- [Global Ecovillage Network](https://ecovillage.org/) · [GENNA Regenerative Communities Alliance](https://ecovillage.org/region/genna/)
