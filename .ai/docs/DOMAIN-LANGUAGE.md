# DOMAIN LANGUAGE

Canonical names + one-line definitions for every load-bearing term in ReGen Civics. Reach for this when a term feels ambiguous OR when you're about to redefine something inline.

Last reviewed: 2026-04-25.

---

## The two anchors

**Fund** (capital F). The ReGen Civics Fund. Venture-capital-style legal structure, anchored in the Dominant Game (legible to capital allocators, accredited investors, LPs). The Fund's tokens are RCVoice (governance) and $RCivics (economic). Audience: investors, family offices, capital allocators.

**Game** (capital G). The Infinite Game / new Games / Regenerative Renaissance Game. Quests, seasons, citizenship, contribution scores. Anchored in the new Games (movement, bioregional, regenerative). The Game's tokens are RGVoice (governance) and $ReGen (economic). Audience: players, land projects, alliance partners.

**Bridge** / **The Two Games**. The conceptual + literal connection between the two. ReGen Civics holds both ends of the bridge. Players can participate in the Game without touching the Fund and vice versa. See `CONTEXT_THE_TWO_GAMES.md`.

---

## The four tokens

### Governance tokens (votes)

**RGVoice**. Game-side governance token. Used to vote on quests, decisions, season programming, anything inside the Game. Contract on Base: `0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707`. Earned by playing.

**RCVoice**. Fund-side governance token. Used to vote on Fund decisions (LP-style governance). Contract not yet deployed.

### Economic tokens (value)

**$ReGen**. Game-side economic token. Tracks contributions to the Game / movement. Earned via gratitude received, harvest events, quest completion, SEEDS claim conversions. Contract on Base: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`.

**$RCivics**. Fund-side economic token. Tracks contributions to the Fund / Alliance. Used by Alliance Partners exchanging equity, services, technology for Fund participation. Contract on Base: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`.

### What the four split means

A player's TOTAL position in any token is `private + public`. Private is on the ReGen Civics ledger (server, MySQL, debit-able). Public is on Base chain (claimed via Hypha bridge, one-way, server cannot debit). Game logic reads total. Server writes only private. Spend checks use private. See `STEERING.md` Section 5 for the full rule set.

### Common confusions to avoid

- $ReGen is NOT RGVoice. Gratitude credits go to **$ReGen** (the economic token), not to RGVoice (the governance/votes token). This was a real bug fix on 2026-04 (`fix(gratitude): credit $ReGen private (not RGVoice) on received gratitude`, commit `8d3ffce`).
- $RCivics is NOT RCVoice.
- "ReGen tokens" without context is ambiguous: always specify $ReGen, RGVoice, $RCivics, or RCVoice.

---

## Citizenship tiers (4-tier system)

From `CITIZENSHIP_TIERS_SPEC.md`.

**Visitor**. Anyone visiting the site without an account. Read-only access to public content.

**Friend**. Signed in. Can post forum content, complete quests, send/receive gratitude.

**Citizen**. Has met the contribution threshold. Can vote in governance, submit proposals.

**Steward**. Recognized, sustained contributor. Tier-3 access: storyteller flow, season facilitation, mentor pairing.

(Treat tier names as load-bearing nouns in user-facing copy. "Become a Citizen" not "join the citizens".)

---

## Seasons + roles

**Season**. A 6-month cohort container. Aligned with equinoxes/solstices. Season 1 was "The First Build" (2025 spring → fall). Season 2 begins March Equinox 2026. See `SEASONS_HISTORY.md`.

**Role** / **Stewardship Role**. One of the 13 named roles per season (The Gardener, The Weaver, The Guide, The Tender, The Architect, The Keeper, etc). Each role has a season facilitator, character art (card + scene format), Seed/Harvest metrics, and compensation band. See `seasons/season-1-the-first-build.md` and the `regen-seasonal-roles` + `regen-character-art` skills.

**Seed metric** vs **Harvest metric**. Seed = what's planted at season start. Harvest = what's measured at season festival. Each role has both.

**Season Festival**. The closing ceremony at the end of each season. Includes a scorecard reflecting what each role grew + harvested.

---

## Quests + game mechanics

**Quest**. A self-contained activity with a card, modal, optional PDF guide, optional forum seed post, and reward (typically $ReGen). See `QUEST_PROGRESSION_SPEC.md` and the `regen-quest-builder` skill.

**Welcome Aboard Quest**. The first-week onboarding sequence for new players. See `ReGenCivics_WelcomeAboard_Brief.md`.

**Rite of Passage**. A quest that unlocks new tier privileges or a citizenship advancement.

**Living Tree**. The visual representation of a player's nine forms of capital (intellectual, social, material, financial, living, cultural, spiritual, experiential, health). See `LIVING_TREE_VISUALIZATION_SPEC.md`.

**The 9 Roots of Capital** (a.k.a. Gratitude Variables). The nine dimensions on which contribution is recognized. From `GameMechanics.tsx`:
1. Intellectual (knowledge, research, learning)
2. Social (networks, relationships, trust)
3. Material (tools, infrastructure, hardware)
4. Financial (money, investments, grants)
5. Living (land, ecosystems, biodiversity)
6. Cultural (art, stories, rituals, values)
7. Spiritual (vision, meaning, purpose)
8. Experiential (lived experience, craft hours)
9. Health (body vitality, wellness, rest)

**Contribution Score**. A player's accumulated standing. Computed from the 9 roots + recency. Reads use TOTAL tokens (private + public).

**Voice weight**. How much a vote counts. Computed from RGVoice (Game) or RCVoice (Fund).

**HEIST framework**. The impact measurement frame. Health, Equity, Impact, Sovereignty, Trust. Used in fundraising copy and impact reporting.

---

## Forum

**Post**. The OP of a thread. Has title + content + tags + chainId + bioregionId + linkPreviews JSON.

**Reply**. A comment on a post. Has content + parentReplyId (for nested replies).

**Chain**. A multi-post sequence that threads together (e.g., "Spring 2026 reflections chain"). Each post in a chain shares `chainId`.

**Bioregion**. A geographic + ecological region (e.g., "Pacific Northwest Cascadia", "Sonoran Desert"). Forum posts can be tagged with `bioregionId`. Land projects are anchored to bioregions.

**Seed post**. A starter post curated by the team. `forumPosts.isSeed = 1`. Used in regen-quest-builder and seasonal launches.

**Decision** / **Decision thread**. A forum post that's been promoted to a Hypha governance proposal. See `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`.

---

## Hypha bridge

**Hypha**. The DAO governance + on-chain coordination platform we're building on. See `https://app.hypha.earth`. ReGen Civics has 2 DHOs there: `regen-games` and `regen-civics`.

**DHO** (Distributed Holographic Organization). Hypha's term for a governance space. Roughly: a sub-DAO with members + roles + voice + treasury.

**Bridge**. The Hypha bridge module at `apps/web/src/lib/hypha-bridge/`. Owns every handoff from ReGen Civics → Hypha. Pre-fills proposal context, signs short-lived tokens, watches Base for chain events. See STEERING.md Section 6.

**Intent**. A bridge action type. The 11 known intents map to the 11 Hypha creation routes: activate-spaces, buy-hypha-tokens, change-entry-method, change-voting-method, deploy-funds, membership-exit, pay-for-expenses, propose-contribution, redeem-tokens, space-settings-transparency, space-to-space-membership.

**Claim** / **Claim bridge**. The act of moving private $ReGen / RGVoice / $RCivics / RCVoice to Base via Hypha redeem-tokens proposal. One-way (private → public). Tracks state in `playerProfiles.claimPending*` columns. Auto-debits private at request, auto-confirms on chain via Alchemy webhook, refunds on cancel/fail.

---

## Operational + infra

**Cowork** / **Cowork mode**. The Anthropic desktop app feature that powers Claude on Rye's machine. Runs Claude Code + Claude Agent SDK. Has FUSE filesystem quirks (see STEERING Section 7). Distinct from Claude Code (the CLI tool).

**The VM**. The Cowork sandbox where this agent runs. Linux Ubuntu 22, has bash + Python + Node, mounts the user's repo via FUSE. Cannot push to GitHub.

**Railway**. The hosting platform. ReGen Civics runs as two services: ReGenCivics.Earth (main) and zealous-enchantment (gov.regencivics.earth Next.js app under `apps/gov`).

**Loomio**. Removed (2026-07). Was evaluated as a pre-Hypha deliberation tool but never brought live (the API key stayed a placeholder). gov.regencivics.earth runs the custom **ReGen Gov** Next.js app (`apps/gov`), not Loomio. See ADR-23. Formal on-chain decisions still go through the Hypha bridge.

**SHIPPED_LOG.md**. Rolling reference index of past sprints, fixes batches, and execution prompts. Each entry summarizes what shipped + points at the archived source doc.

**FIXES_TO_MAKE doc**. A handoff document with a specific structure (Handoff Breakdown table, status vocabulary). Created via the `regen-fixes-handoff` skill. See `~/.claude/skills/regen-fixes-handoff/SKILL.md`.

---

## People + audiences

**Rye** (Rieki Cordon, rieki@pm.me). Project lead. Solo carrying the stack. Holds the vision. Voice = project voice.

**ReGen Guide**. The AI companion bot. System user with `openId='regen-guide-system'` and `handle='regen-guide'`. Posts forum replies via `postGuideReply()` in `server/lib/regenGuide.ts`. Renders with an AI badge. Same voice rules as Rye (no em-dashes, no AI tells).

**Player**. Someone playing the Game. Default audience for forum, quests, gratitude flow.

**Land project**. A regenerative land-based initiative applying to the incubator. Has bioregion, season cohort, capital ask, application history.

**Alliance Partner**. An organization contributing equity, services, or technology in exchange for $RCivics.

**Investor** / **LP** (Limited Partner). Capital allocator participating in the Fund.

**Storyteller**. A community member who narrates the story of a decision after it ratifies. Pulled from the storyteller pool via the regen-guide flow.

---

## Skills + agents

**Skill**. A markdown file at `.claude/skills/<name>/SKILL.md` (project) or `~/.claude/skills/<name>/SKILL.md` (user) with YAML frontmatter (name, description with trigger phrases) plus body content. Loaded automatically by trigger phrase match.

**Subagent** / **Explore agent**. A child agent dispatched via the Agent tool. Used for parallel recon (audit, dead code hunt, security check). Returns a structured report. Pattern is canonical in `~/.claude/skills/dispatching-parallel-agents/SKILL.md`.

**MCP** (Model Context Protocol). Tool servers that extend Claude with external capabilities. Active MCPs: Claude in Chrome (browser automation), Visualize (HTML/SVG widgets), Cowork (artifacts, file present), scheduled-tasks, session_info, etc.

**Cowork artifact**. A persistent HTML page in the sidebar that calls user connectors for fresh data on each open. Created via `mcp__cowork__create_artifact`. See system prompt for guidelines.

---

## Movement Coordination Engine (Phase 1 onwards)

**Call task** (always two words, "call" as in "the recorded call", not "phone call"). A data-driven task that lives in the `callTasks` table, written into the system either by the LLM understanding pass on a recorded session or by a human in the admin form. Carries a sociocratic overview (purpose, steps, definition of done, consent circle), a $ReGen or $RCivics bounty, and an evidence quote + timestamp pointing back to the moment in the call that produced it. Lifecycle: proposed -> approved -> open -> claimed -> submitted -> completed (or declined / expired). Reward path always goes through `creditPrivateTokens` with source tag `call_task_bounty`.

**Role holder.** A row in `roleHolders` that ties one sociocratic role (from `client/src/data/gameRoles.ts`) to one `userId`. The "table for sending unique messages" Rye asked for. A filled holder means a call task targeting that role routes to that person's profile; an empty holder means the task surfaces on the Opportunity board for the circle to pick up. Aliases on the row let the LLM match transcript variants ("the Gardener", first name) back to the right role.

**Two human gates.** The Movement Coordination Engine has exactly two human checkpoints between a recorded call and a token payout. (1) Admin approval at `status: proposed` so an LLM misreading "Sam, can you look at the water rights" cannot silently mint tokens or spam a holder. (2) Circle steward consent at `status: submitted` so the definition of done is met before the bounty credits. Both are designed to be bulk and fast, not bureaucratic.

**Coordination engine.** Shorthand for the whole pipeline: YouTube RSS poll, ingest + transcribe, two LLM passes (synthesize + extract-tasks), admin gate, route to holder or Opportunity board, claim / submit / consent, `creditPrivateTokens(..., "call_task_bounty", callTaskId)`. Spec: `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`. Video pipeline stages: `CLAUDE_CODE_PROMPT_2026-06-23_RIVERSIDE_YOUTUBE_PIPELINE.md`.

---

## Church of the Regenerative Earth (CORE)

**CORE** (all caps). The Church of the Regenerative Earth, a 508(c)(1)(a) faith ministry, EIN 42-3198293, founded 2026, constitutional home the SEEDS Constitution. Lives at `core.regencivics.earth` (a subdomain inside this monorepo, ADR-18). CORE is the spiritual "why"; ReGen Civics is the "how". Public copy carries no founder names, no SSN, no home address; the church's home is the whole Earth, not any particular place.

**Steward.** A member who tends the church and may be granted the right to accept and/or make payments on its behalf. Formerly split into priest/priestess (renamed to this single, gender-neutral title, ADR-20). This is the (single-value) `role` enum in the `church_role_holders` table (`role` enum `steward`). Payment rights (`canAcceptPayments`, `canMakePayments`) are DATA-DRIVEN per holder, never hardcoded names or user IDs, so governance can grant and revoke through the community tools without a code change. A holder is active while `revokedAt IS NULL`. Server gate: `assertCanAcceptPayments` / `assertCanMakePayments` in `server/lib/church-permissions.ts`. The two initial holders are seeded by Rye after deploy, not in source.

**Elder chat / Ask Anastasia.** The retrieval-grounded chatbot on the Elders page. Answers only from the retrieved canon (`anastasia_canon.md`, chunked into `elder_corpus_chunks`), cites book and section, credits Vladimir Megre and The Ringing Cedars of Russia, and steps out of persona for a crisis fallback. Elder-agnostic by design: a second elder is another `elder` value plus its own corpus, no new plumbing. Transcript logged to `elder_chat_messages` for moderation, rate limiting, and tuning.

**Elders / AI Elder.** The church's spiritual elders are AI presences, each named "AI Elder <Name>" (that name is the standing AI disclosure). One registry (`server/lib/elders.ts`) defines every elder: id, display name, handle, bot openId, domain, persona voice, forum-enabled, avatar, and a Transparency-only source note. Adding an elder is a registry entry plus a canon file built with `scripts/build-elder-corpus.ts --elder=<id> --file=<id>_canon.md`. Current elders: **AI Elder Anastasia** (feminine wisdom of the living Earth; canon: The Ringing Cedars of Russia) and **AI Elder Yeshua** (masculine wisdom of peace and the law of love; canon: the Essene Gospel of Peace). Elders speak in their own voice and never name their sources; a single acknowledgment of both sources lives on Transparency (ADR-22, option B). Shared voice/writing rules: `ELDER_WRITING_RULES` in `elders.ts`.

**Elders' community presence.** The elders' autonomous forum behavior (ADR-21, generalized by ADR-22): a new post is routed by one cheap LLM call to the single best-fit elder (or none), and only that elder comments; an `@handle` mention in a post or reply brings the named elder in regardless; a direct reply to an elder's comment gets one reply from that elder. Deterministic-first: a 6-hour DB poll (`server/jobs/elderForumJob.ts`) finds the work at zero token cost; the only model calls are the router and the comment texts. Each elder posts as its `bot:<id>` user, whose `createdAt` is that elder's no-backfill cutoff. Skips administrative categories (edit-in-place slug list), crisis posts, and posts the model judges do not call for an elder's voice (PASS gate). No per-comment disclosure (the "AI Elder" name is the disclosure). Silenced for all elders with `ELDER_FORUM_ENABLED=false`.

**Zeffy.** The preferred CORE donation processor (ADR-19): zero platform fees for nonprofits, unlike Stripe's standard cut. Integration is a dashboard-built, embedded form (`ZEFFY_EMBED_URL`), not an API-created checkout session; reconciled into `church_donations` (`provider = 'zeffy'`) via `server/webhooks/zeffy.ts`. Stripe remains the secondary fallback path on the Donate page, shown behind a "prefer to give by card directly?" disclosure.

---

## Things we don't say

- "Ecosystem" by itself is too vague. Say "the ReGen Civics network" or "this alliance" or "the Fund + Game system".
- "Stakeholder" rarely. Most of the time you mean players, land projects, investors, or partners. Be specific.
- "Solution" rarely. Most of the time you mean a quest, a fund, a tool, or a practice. Be specific.
- "Community" is fine but generic. Reach for "players", "alliance", "season cohort", "bioregional network" when the audience is more specific.
- "Web3" is reserved for a very narrow context. We're "blockchain-anchored" or "on-chain-coordinated" most of the time.

---

## Things we DO say (canonical phrases worth keeping)

- "The Regenerative Renaissance" (always capitalized as a proper noun, the movement we participate in).
- "The Infinite Game" (capital G, the game-design lineage).
- "Two anchors holding up one bridge" (the metaphor that explains Fund + Game).
- "Land-backed" (preferred over "asset-backed" when describing the Fund's investment thesis).
- "Bioregional" (region + ecological character; preferred over "regional" alone).
- "The Field Guide" (the canonical Game player's guide).
- "Welcome Aboard" (the onboarding moment; capitalized).

## ReGen Ship terms

- **ReGen Ship**: the regenerative pirate ship (a 2006 Fleetwood Revolution LE motorhome), a CORE program. Always capitalized.
- **ReGen Fleet**: the growing fleet of regenerative ships; a traveling festival moving from land project to land project. The ReGen Ship is its flagship.
- **Voyage**: one 7-night booking cycle aboard the ship (set by tank capacity).
- **Ship Keeper**: the paid role ($200 per turnover) that cleans, resets, and runs the two-hour crew orientation.
- **Treasure Map**: the interactive Leaflet map of Cascadia locations at /ship/map.
- **First Mate**: the ship's AI voyage-planning companion at /ship/concierge (route path unchanged; the persona was renamed from "the concierge" on 2026-07-10). She greets with "Ahoy. I'm your First Mate. Tell me who you are and I'll chart your voyage." and plots an itinerary drawn only from verified treasure-map places. She is grounded in the whole community-grown database, so new place categories join her knowledge as they land. On the map page she can chart a voyage that draws live on the map and shares the "My voyage" state. Technical identifiers (`ship.concierge` tRPC namespace, the `concierge` feature flag, `isConciergeConfigured`) keep the old name.
- **Dataset door**: the "Add your database to the map" flow (`ship_dataset_offers`) at the bottom of /ship/map. Partners and networks in the Regenerative Renaissance offer a dataset of places; accepted ones flow through the source-stamped importer and are credited on the pins.
- **Voyage Offering**: the suggested donation to CORE that accompanies a voyage. Legally voluntary, never required, never a rental charge.
- **Healing Hole**: the planting site at the anchorage where returning crews plant their saved seeds.
- **Anchorage**: the ship's home base, currently The Sanctuary / Tao Hermitage in Ashland, Oregon.
- **Ship's Bell**: the ship's referral program (referral codes, `ship_referral` credits, quest board points).
- **Ship's Manifest**: the six-email pre-voyage sequence (welcome through homecoming).
- **Water Doctrine**: the input-control practice aboard (only the ship's soaps and cleaners, no chemical body products, vegan-diet inputs) that lets black and gray water return be regenerative on consenting private land.
- **Winter Anchorage**: the off-season program where the ship becomes stationary sanctuary housing at a host land project.
- **Passport**: the digital land-project stamp book (one stamp per location), physical stamp book later.
- **The Regatta**: the annual fleet convergence festival at one land project, announced at fleet launch.
- **Voyage range / the board**: what the treasure map always renders: everything within a 3-day sail of the anchorage (`ANCHORAGE` × `ROAD_MILES_PER_DAY` in `shipMapConfig.ts`). Past the gold horizon lies fog; pins out there render dimmed and unclickable. The board follows the anchorage when she moves.
- **Commercial boondock**: the `commercial_boondock` location type: rest areas, Walmart and Home Depot lots, and other high-traffic paved sites for a quick legal night. Asphalt-gray ring, 🅿️ glyph, always imported unverified with a check-the-signs access note. Distinct from wild boondocks.
- **Chakra points**: the symbolic energy centers of the region on the treasure map, joined into one line of light. Root at Mount Shasta, Heart at Mount Ashland, Crown at Crater Lake; the other four await Rye's research (`CHAKRA_POINTS` in `shipMapConfig.ts`). Voyagers are invited to focus, release, clear, and heal each center's energy when they visit its land.
- **Inner Compass**: the intuition practice on the map page (2026-07-10). Players design a printable treasure map (their chosen tokens, day rings, chakra points), print it big at a print shop, and dowse it with a pendulum under the best-timeline intention; or they chart with the First Mate, or both. The poster is our own illustrated board (`shipInnerCompass.tsx`), never third-party imagery.
- **Best timeline**: the intention of the Inner Compass practice: the journey that brings the most growth and love. Rye's phrase; keep it verbatim in copy.
