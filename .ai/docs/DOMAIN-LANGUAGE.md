# DOMAIN LANGUAGE

Canonical names + one-line definitions for every load-bearing term in ReGen Civics. Reach for this when a term feels ambiguous OR when you're about to redefine something inline.

Last reviewed: 2026-09-28 (ReGen Civics Labs named as the company; 2026-09-27: the Fund became the cooperative in design, funding engine terms added).

---

## The two anchors

**Cooperative** (the ReGen Network Cooperative; formerly "the Fund"). In design: a member-owned purchasing cooperative in which land projects and people buy and steward land together, governed one member, one vote, anchored in the Dominant Game through one of its oldest legal tools. Not a legal entity; accepts no money. Every public sentence about it comes from `COOP` in `shared/fund.ts` (ADR-62). Rye's phrase: "a cooperative regenerative society". Audience: land projects, people who want to use and steward shared land, allies, and funders who support land projects directly. Until 2026-09-27 this anchor was "the ReGen Civics Fund", a venture-style fund; that name, and every return, yield, IRR, carry, distribution, listing or accredited-investor term that came with it, is retired from public copy (gate G5).

**Game** (capital G). The Infinite Game / new Games / Regenerative Renaissance Game. Quests, seasons, citizenship, contribution scores. Anchored in the new Games (movement, bioregional, regenerative). The Game's tokens are RGVoice (governance) and $ReGen (economic). Audience: players, land projects, alliance partners.

**Bridge** / **The Two Games**. The conceptual + literal connection between the two. ReGen Civics holds both ends of the bridge. Players can participate in the Game without touching the cooperative and vice versa. See `CONTEXT_THE_TWO_GAMES.md`.

---

## Entities (added 2026-09-28)

**ReGen Civics Labs**. The company: a Delaware C-corporation (filing in progress; Delaware requires a designator, so the filing name is ReGen Civics Labs, Inc.) that builds the tools real estate and land projects use to coordinate, and runs ReGen Civics. It is the applicant in the venture lane (accelerators, investors, SBIR) and the first user of the funding engine. Use "ReGen Civics Labs" for the company and "ReGen Civics" for the platform, game and movement. The Cooperative is a separate entity in design; the company never describes it as part of a raise.

---

## The four tokens

### Governance tokens (votes)

**RGVoice**. Game-side governance token. Used to vote on quests, decisions, season programming, anything inside the Game. Contract on Base: `0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707`. Earned by playing.

**RCVoice**. Governance token from the earlier fund design. The cooperative is designed to vote one member, one vote, and how RCVoice relates to that is under review with counsel (`COOP.coopTokens.rcvoice`). Contract not yet deployed. Never describe it as LP-style or investor governance.

### Economic tokens (value)

**$ReGen**. Game-side economic token. Tracks contributions to the Game / movement. Earned via gratitude received, harvest events, quest completion, SEEDS claim conversions. Contract on Base: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`.

**$RCivics**. Economic token from the earlier fund design. A live ERC-20 with a public claim bridge, so it must not be tied to cooperative capital or votes (legal research, 2026-09-27); its role, if any, in the cooperative is under review with counsel (`COOP.coopTokens.rcivics`). Public copy never gives it value, a price, a market or a claim on anything. Contract on Base: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`.

### What the four split means

A player's TOTAL position in any token is `private + public`. Private is on the ReGen Civics ledger (server, MySQL, debit-able). Public is on Base chain (claimed via Hypha bridge, one-way, server cannot debit). Game logic reads total. Server writes only private. Spend checks use private. See `STEERING.md` Section 5 for the full rule set.

### Common confusions to avoid

- $ReGen is NOT RGVoice. Gratitude credits go to **$ReGen** (the economic token), not to RGVoice (the governance/votes token). This was a real bug fix on 2026-04 (`fix(gratitude): credit $ReGen private (not RGVoice) on received gratitude`, commit `8d3ffce`).
- $RCivics is NOT RCVoice.
- "ReGen tokens" without context is ambiguous: always specify $ReGen, RGVoice, $RCivics, or RCVoice.

---

## Citizenship tiers (4-tier system)

From `docs/planning/CITIZENSHIP_TIERS_SPEC.md`.

**Visitor**. Anyone visiting the site without an account. Read-only access to public content.

**Friend**. Signed in. Can post forum content, complete quests, send/receive gratitude.

**Citizen**. Has met the contribution threshold. Can vote in governance, submit proposals.

**Steward**. Recognized, sustained contributor. Tier-3 access: storyteller flow, season facilitation, mentor pairing.

(Treat tier names as load-bearing nouns in user-facing copy. "Become a Citizen" not "join the citizens".)

---

## Seasons + roles

**The ReGen Civics Year**. One turn of the wheel of four seasons (ADR-57, ADR-58, canonical in `shared/regenYear.ts`), named for what they are for: the **Design Season** (the incubator; tools, systems, governance; land projects design their games), the **Resource Season** (crowdpooling, funders, onboarding roles), the **Build Season** (on the land: gardens, buildings, festivals), and the **Rest Season** (harvest gatherings, rest, healing, village life). They loosely follow winter, spring, summer, and fall; lead with the season names in copy and use winter/spring/summer/fall as the pattern and imagery. The Game's seasons follow the work, so they run one season ahead of the northern calendar: Design opens at the September equinox, Resource at the December solstice, Build at the March equinox, Rest at the June solstice. Timelines are loose in this first full turn; say so wherever dates appear. Never call the incubator "Spring"; it is the Design Season.

**Recap and passoff**. The gathering at every solstice and equinox where the season we're leaving recaps what it grew and passes off to the next season's organizers.

**Handoff Festival**. The September equinox recap and passoff, the biggest of the four: the outgoing cohort celebrates its harvest and hands the wheel to the new cohort on Selection Day.

**Season Organizer**. One organizing role per season, Band 7, confirmed 2026-09-24 (`seasons/season-2-the-first-turn.md`): **The Lantern-Keeper** (Design Season Organizer), **The Rainmaker** (Resource), **The Barn-Raiser** (Build), **The Hearth-Keeper** (Rest). Each receives the wheel at the turn that opens their season and passes it on at the next. The Lantern-Keeper also facilitates the 13 weekly incubator sessions (Rye, 2026-09-24). The **Season Facilitator** (The Gardener) holds the whole wheel across all four seasons: every recap and passoff, a check-in with each organizer, and the season record. **On the site these five always show "(Facilitator)" beside the character name**, as in "The Lantern-Keeper (Facilitator)" (Rye, 2026-09-24; `characterLabel` in `shared/regenYear.ts`).

**Shared and local seasons**. Design and Resource are mostly online, so the whole network does them together on one clock (shared). Build and Rest happen on the land, so each project times them to its own climate (local): southern land builds roughly September to March, land near the equator builds in its dry season and rests through the heaviest rains. `REGEN_SEASONS[k].scope` in `shared/regenYear.ts`.

**Your land ring**. The thin outer ring on the /seasons wheel showing the visitor's land's own seasons for Northern, Southern or Near-the-equator land (`REGEN_LANDS`). Guessed from the browser time zone, never from IP; the visitor can switch it.

**Community crowdpooling round**. The crowdpooling round in the Resource Season that any land project can join once it's ready, alongside the Season's graduating cohort, with room for far more than the 13 cohort projects (Rye, 2026-09-24). Projects get ready by following the Design Season live on the SEEDS livestream (`/schedule#follow-along`). Copy lives in `shared/applicationWindow.ts` (`CROWDPOOL_ROUND_LINE`, `FOLLOW_ALONG_LINE`), shown while `intakeStatus().followAlong` is true: applications held, and the Design or Resource Season running. While a Season takes **rolling applications** (ADR-67), the way in is an application: see **Season acceptance**.

**Rolling applications** and **Season acceptance** (ADR-67). From October 1 to December 21, 2026, when its crowdpooling round opens, Season 2 takes applications again on a rolling basis, reviewed as they come in and stamped Season 2 (`SEASON_2_ROLLING` in `shared/incubatorSeason.ts`; `intakeStatus().rolling`). Being accepted means the project meets the minimum criteria to take part in crowdpooling. From there it's up to each village and project to follow along, join the sessions, watch any it missed, and do the parts its project needs to join the crowdpooling round (the readiness list at `/crowd-pooling#ready`). Copy: `ACCEPTANCE_LINE`. Rye, 2026-10-01.

**Ready to crowdpool**. The eight things a land project shows before its campaign is approved for the crowdpooling round, the same for the cohort and for community projects (Rye, 2026-09-24): a legal structure; secure access to the land; a way to send and receive value (what contributors get); a clear game for everyone; the game's governance; the game's economy and financial plan; care and conflict; a campaign ready to run. Each is checked as in place and clear, never scored. Canonical in `shared/crowdpoolReadiness.ts`; shown at `/crowd-pooling#ready`, beside "Send for review" on a project page, and in the campaign review dialog. A steward's ticks are stored on the campaign and shown in the review dialog; a reader's own ticks elsewhere stay in their browser.

**Intake window**. When land project applications are reviewed: the Rest Season, from the June solstice to about September 10, for the Season that opens at the next September equinox. Outside it, applications are held quietly and applicants get no email until the window opens. Rolls over each year by itself (`shared/applicationWindow.ts`, `INTAKE_WINDOW`, with an `override`). A Season already running can also take **rolling applications** until its crowdpooling round opens (Season 2, October 1 to December 21, 2026).

**Season** (numbered: "Season 2"). A cohort's year. Each numbered Season starts in winter with a new cohort of land projects and follows it once around the wheel. Season 1 was the first incubator (2022: 43 applications, 16 presented, 13 selected) plus the long build that followed, through the September 2026 equinox; its contributor roles are recorded as "The First Build" in `SEASONS_HISTORY.md`. Season 2 opened at the September 2026 equinox (Selection Day 2026-09-26); its first round of applications closed September 11, and from October 1 to December 21, 2026 it takes applications again on a rolling basis (`shared/applicationWindow.ts`, ADR-67). "Design Season", "Resource Season" and the rest name one quarter of the year.

**Role** / **Stewardship Role**. One of the 13 named roles per season (The Gardener, The Weaver, The Guide, The Tender, The Architect, The Keeper, etc). Each role has a season facilitator, character art (card + scene format), Seed/Harvest metrics, and compensation band. See `seasons/season-1-the-first-build.md` and the `regen-seasonal-roles` + `regen-character-art` skills.

**Seed metric** vs **Harvest metric**. Seed = what's planted at season start. Harvest = what's measured at season festival. Each role has both.

**Season Festival**. The closing ceremony at the end of each season. Includes a scorecard reflecting what each role grew + harvested.

---

## Quests + game mechanics

**Quest**. A self-contained activity with a card, modal, optional PDF guide, optional forum seed post, and reward (typically $ReGen). See `docs/planning/QUEST_PROGRESSION_SPEC.md` and the `regen-quest-builder` skill.

**Welcome Aboard Quest**. The first-week onboarding sequence for new players. See `docs/planning/ReGenCivics_WelcomeAboard_Brief.md`.

**Rite of Passage**. A quest that unlocks new tier privileges or a citizenship advancement.

**Living Tree**. The visual representation of a player's nine forms of capital (intellectual, social, material, financial, living, cultural, spiritual, experiential, health). See `docs/planning/LIVING_TREE_VISUALIZATION_SPEC.md`.

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

**Health capital**. The ninth form, and the one that is ours. It covers a person's physical
and emotional vitality and the work that builds it in others: movement, rest, bodywork,
nutrition, recovery, care. Forms 1 through 8 are Ethan Roland and Gregory Landua's
*8 Forms of Capital* (2011, expanded in *Regenerative Enterprise*, 2013), used unchanged and
credited. We added the ninth because the original eight have no place for it: Living means
ecosystems, Social means relationships, Experiential means accumulated skill, Spiritual means
meaning. None of them hold a bodyworker, a movement teacher, an herbalist, or a cook.

**The ninth form is Health, never Influence.** Between 2026-07-03 and 2026-08-01, `llms.txt`,
`llms-full.txt`, and the `/bionomics` + `/glossary` crawler content all listed the ninth as
"Influence Capital", which appears nowhere in the code. The canonical list has always been
`shared/capitals.ts` (`CAPITAL_TYPES`), which the calculator, the crowdpooling taxonomy, the
Living Tree, and quest-to-capital mapping all import. The drifted copy was the machine-readable
surface we publish specifically for LLMs, so the one file written for answer engines named a
form of capital that does not exist in the product. Fixed 2026-08-01, and the reasoning now has a
public page at `/learn/nine-forms-of-capital` so the model is citable rather than only asserted.
Source of truth for any future edit: `shared/capitals.ts`.

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

**Letter layout**. Code chrome around a markdown email: `plain`, `announcement` (forest header, logo, standalone links as buttons, quotes as callouts), or `one_pager` (same as announcement, sized for a PDF page). Markdown stays the source. The writing partner may name a layout. It never emits HTML or PDF. Saved composer letters live on `emailTemplates` with `bodyFormat=markdown`, separate from EmailSettings HTML overrides.

---

## People + audiences

**Rye** (Rieki Cordon, rieki@pm.me). Project lead. Solo carrying the stack. Holds the vision. Voice = project voice.

**ReGen Guide**. The AI companion bot. System user with `openId='regen-guide-system'` and `handle='regen-guide'`. Posts forum replies via `postGuideReply()` in `server/lib/regenGuide.ts`. Renders with an AI badge. Same voice rules as Rye (no em-dashes, no AI tells).

**Player**. Someone playing the Game. Default audience for forum, quests, gratitude flow.

**Land project**. A regenerative land-based initiative applying to the incubator. Has bioregion, season cohort, capital ask, application history.

**Alliance Partner**. An organization that supports land projects with services, tools, knowledge or relationships. (The earlier fund design paid alliance partners in $RCivics for equity; that is held pending counsel, ADR-62.)

**Funder**. A foundation, grant program, lender or person who supports land projects or ReGen Civics. Public copy about the cooperative never says "investor" or "LP" (gate G5). Venture investment in ReGen Civics, Inc., the operating company, is a separate lane handled in the private funding plan, and never touches the cooperative.

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

**Coordination engine.** Shorthand for the whole pipeline: YouTube RSS poll, ingest + transcribe, two LLM passes (synthesize + extract-tasks), admin gate, route to holder or Opportunity board, claim / submit / consent, `creditPrivateTokens(..., "call_task_bounty", callTaskId)`. Spec: `docs/planning/MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`. Video pipeline stages: `CLAUDE_CODE_PROMPT_2026-06-23_RIVERSIDE_YOUTUBE_PIPELINE.md`.

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

- "Ecosystem" by itself is too vague. Say "the ReGen Civics network" or "this alliance" or "the cooperative and the Game".
- "Stakeholder" rarely. Most of the time you mean players, land projects, investors, or partners. Be specific.
- "Solution" rarely. Most of the time you mean a quest, a cooperative, a tool, or a practice. Be specific.
- "Community" is fine but generic. Reach for "players", "alliance", "season cohort", "bioregional network" when the audience is more specific.
- "Web3" is reserved for a very narrow context. We're "blockchain-anchored" or "on-chain-coordinated" most of the time.

---

## Things we DO say (canonical phrases worth keeping)

- "The Regenerative Renaissance" (always capitalized as a proper noun, the movement we participate in).
- "The Infinite Game" (capital G, the game-design lineage).
- "Two anchors holding up one bridge" (the metaphor that explains the cooperative and the Game).
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
- **Flagkeeper**: the fleet's qualification companion on /ship/fleet (added 2026-07-16). She sews the flag of every ship that joins and hears the story behind it first: why the owner cares about regeneration, their vision for traveling with the fleet, what they'd give, and what they hope to receive. A `FormCompanion` persona (`flagkeeper` in `shared/companions.ts`, form `fleet-application`); her answers and full conversation land on `ship_fleet_applications` (`whyRegeneration`, `fleetVision`, `offersText`, `needsText`, `companionTranscript`) so the crew can qualify fleet leads from the story. She never scores or judges; she gathers, the crew reads.
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
- **The Mycelium**: the memory-and-worldview layer of the second brain: ontology (`08 Concepts`, `09 Positions` in the vault), the Worldview Pack, local retrieval, and the memory hygiene contract. Name is Rye's to confirm.
- **The Harvest** (creation studio): Rye's private feed at `/admin-create`, also the Create tab of the second-brain command center (`?v=2`). Captured ideas ripen and become drafts. Distinct from the seasonal **Harvest metric** and from token Harvest distribution. Owner-gated. The in-repo second-brain surfaces Harvest already uses, and that Outbound Social (legacy Broadcast) drafting must reuse, are: the Worldview Pack (`server/lib/worldview.ts`), learned `voice_rules`, and the curated `harvest_ideas` + `source_index` mirror. The local vault path is not in this git tree (CI tripwire). Voice rules live at `/admin/voice-rules`, linked from The Harvest header.
- **Outbound scheduled letter**: a `newsletter_issues` row with status `scheduled` and a `scheduled_for` time in America/Los_Angeles. The owner queues it from Outbound Write after preview. The due worker (`/api/cron/outbound-issues` and the in-process minute sweep) sends it on the same hardened path as send-now. Distinct from **Events auto-reminders** (OA/S2 call reminders on the Events tab). Never call a newsletter letter an event reminder.
- **Worldview Pack**: the versioned, curated, redaction-gated bundle of Rye's voice, concepts, positions, and style rules, built from the vault and loaded by agent surfaces via `server/lib/worldview.ts` (ADR-38). Never contains raw sources.
- **Agent contract**: `second-brain/contract.json` plus its AGENT GUIDE section: the machine-readable rules for how any agent reads and writes vault memory (ADR-40).
- **Supersession**: marking an idea or position replaced (`superseded_by`) while retaining it as history. Agents never delete worldview content.

### Governance fork relay (gm-marker)
The hub-side pipeline (ADR-46, matching amended by ADR-47) that carries on-chain vote outcomes to forks of the village platform. A **gm-marker** is `[gm:<id>]` — the fork-side mechanics proposal's identity. Real chain events carry only the numeric on-chain proposalId, so a **marker link** (`governanceForkMarkerLinks`, registered by the fork via `governance-fork-link` when its founder pastes the Hypha proposal URL back) is what lets the relay match production events; title markers still match test/manual events and BROADCAST, linked ids deliver targeted. Distinct from our own `[rc:<bridgeKey>]` bridge markers: `rc` means this repo's bridge rows, `gm` means a fork's game-mechanics proposal. Never mint either shape by hand outside the owning module.

### The $ReGen builders' pool (ADR-50, revised by ADR-51)
**Builders' pool**, whose setting is named **Custom Game Module Creators Pool**. The fixed amount of $ReGen ReGen Civics distributes each lunar cycle across the modules villages are actually running, in proportion to REACH. Set by the `pool.regen_per_cycle` game variable, whose `displayName` carries the founder's name for it. **A ReGen Civics setting and never a village one** (his ruling: the pool "should be governed on the ReGen Civics side and not the Game"). A village reports what its members opened and never what that is worth; `readVillageUsage` parses no pool, share or amount, so no number a village serves can reach the split. Distinct from `gratitude.pool_per_cycle`, which pays members for recognition received inside one village; the builders' pool pays module builders across the whole network, and what the platform's own modules earn goes back into `gratitude.pool_per_cycle` to be given out. Say "the builders' pool", never "the module fund" or "the developer pool".

**Reach**. THE WEIGHT, and the only one. For one village and one module in one lunar cycle: the members who opened it divided by the village's active members, capped at 1.0. Summed across villages by the hub. Saturating, so opening a module twice, writing in it, or having it switched on and never opening it all add nothing. Never a village count: "how many villages run it" was the old weight and it measured installation, which Module Library Contract clause 14 does not promise. Say "reach", never "usage score" or "adoption".

**Pool-eligible**. Whether a listing may draw from the pool at all. Module Library Contract clause 14: a listing that declares `pricing` is out, because a paid module is already being paid by the villages running it and paying it again from a common pool would have every village funding a product only some of them use. **DERIVED by the village and published per module as `poolEligible`**; the hub cannot see a price and reads only that field. A priced listing leaves the DENOMINATOR and does not merely go unpaid, because leaving it in dilutes every free module. Silence is not ineligibility: a village that says nothing keeps its modules counted, since reading silence as "priced" would zero its builders.

**Attested (a builder)**. A builder named by a reviewed line in `shared/moduleBuilders.ts`. Only an attested builder is ever PAID. Every module a village reports EARNS, attested or not; an unattested share is held and the statement says why. The distinction exists because a village runs its own code and can print any handle it likes, so "this outside person built it, pay them" is a name and never a payment instruction. Say "attested", never "approved" or "whitelisted".

**Recycled (a pool share)**. What a module ReGen Civics built earned, going into the ReGen Civics gratitude pool to be given out rather than to any wallet (R64). Not a refusal and not a shortfall: it is the model working, and it is published on `/builders-pool` because being able to see it is the point. Distinct from **accrued**, which is owed to somebody and waiting.

**Cycle statement**. The one document a settled lunar cycle produces: the cycle number and its bounds, the pool, the roster and how each village answered, one line per module with its reach, members reached, share and settlement state, the balancing terms, and a snapshot hash that makes it reproducible. It is a STATEMENT and never a transaction: the hub writes it and a payable line becomes a Hypha Bridge handoff a human carries into the treasury's Hypha space. Nothing in this codebase signs anything. Say "cycle statement", never "payout run" or "distribution job" (the job is the thing that WRITES the statement).

**Accrued (a pool share)**. A share earned by a named builder with nowhere to send it, because the hub has not attested them, they hold no ReGen Civics account, or they have not linked a Base address. **It carries into the NEXT cycle's pool and is re-split by that cycle's reach.** It is not held for the builder who earned it, so a builder who links an account late does not receive what accrued in their name; `modulePool.myAccruals` shows them what did. There is no lapse timer and no escrow: `PROPOSED_ACCRUAL_CYCLES` is a proposal nothing reads. Distinct from a **remainder**, which is flooring dust belonging to nobody and is never minted at all. Remainders evaporate, accruals go back to the pool.

**Roster (of villages)**. For the pool, `shared/networkRegistry.ts` `NETWORK_GAMES` filtered to `listed: true` and `status: "live"`. The only villages whose usage reports ever count. Not a synonym for "the network": the network page lists building villages too, and those count zero.

### Community email topics (ADR-55)

**Email preference center**. The tokenized page at `/email-preferences` (alias `/preferences`) for the community / newsletter subscriber identity. No login. Investor and funder mail is a separate list (`investor_inquiries`) and is never a topic here. Transactional mail (application status, claims, magic links) is not on this page.

**Topic keys** (toggles, default ON for new subscribers): `seasonal` (newsletters, Harvest, weekly digest), `open_access` (Open Access invitations and reminders), `season2` (Season 2 session reminders; S2-approved people can mute these), `events` (other / custom event reminders on the community list), `recordings` (session recording summaries, stored as `notifyRecordings`). Existing `notifyRecordings` values are kept. Senders resolve recipients with `audienceForTopic(topic)` in `server/lib/emailPrefs.ts`.

**Manage email preferences**. The only footer CTA on community/marketing letters. It opens the signed prefs URL. Unsubscribe from all is a control on that page, not a second footer link. `/unsubscribe` remains the nuclear email-entry path.

### Interoperability Circle (ADR-56)

**Interoperability Circle** (short: **the Circle**). The weekly 90-minute working group for the people building the tools under the land projects. Page: `/interop-sessions`. Each week is an ordinary `events` row, `type: "special"`, `season: "Interop Circle"` (`INTEROP_CIRCLE_SEASON`). It is a separate track from Season Two; don't call it a Season Two session.

**Slot**. One of the candidate weekly times the group votes on (`tue`, `wed`, `thu` in `shared/interopCircle.ts`). A person raises a hand for every slot they can make.

**Leading slot** vs **scheduled slot**. The leading slot is whatever has the most hands right now. The scheduled slot is what the calendar, reminders and emails follow: the admin pin if set, otherwise the leading slot once it has held the lead for 24 hours. Sessions less than 72 hours out never move.

**Circle member**. Someone with an active `event_signups` row on the upcoming Circle weeks. Signing up is optional: anyone can attend from the calendar feed. Members get reminders, the recaps an admin sends with the Events tab follow-up tool, and an invitation to create a profile. Joining signs them up for every upcoming week and the sync carries them onto new weeks. Leaving from any Circle email leaves every future week.

### Season Schedule (ADR-64, ADR-65, ADR-66)

**Season Schedule**. The page (`/season-schedule`) and module (`shared/seasonSchedule.ts`) where a Season's land projects pick its weekly time, share a link to their project, and send notes to the organizers, and where people sign up for the season (its join section reads the intake from `shared/applicationWindow.ts`, ADR-67). Reusable for every Season: each Season is one entry in `SEASON_SCHEDULES`, and the page shows `ACTIVE_SEASON`. A separate vote from the Interoperability Circle's; don't mix the two.

**Season time** (the Season's slot). The weekday and Pacific hour a Season's weekly sessions follow. It starts as the **opening time** (Season 2: Saturdays at 11am Pacific). At **followsFrom** (Season 2: Thursday 2026-10-01, 5pm Pacific) comes the **decision**: the time leading then becomes the Season time at once and moves every session that has not started, the next one included, and the sessions' reminder audience gets the result by email even if nothing moved. After the decision the Season follows the vote like the Circle's: a time that takes the lead and holds it for 24 hours becomes the Season time, a tie that includes the current time keeps it, and an admin pin overrides. Voting never closes while the Season runs. After the decision, sessions less than 72 hours out never move; admin-edited sessions and past sessions never move at all. A session meets on the chosen weekday on or after its week's original date, except a day in the Season's `reschedule` list (Season 2: Thanksgiving and the day after, Christmas Eve and Christmas Day) gives way to its replacement day at the same time. Each move after the decision emails the sessions' reminder audience once.

**Hand**, **project** and **share** (in the Season tally). A hand is one voter's pick of a time. A project is a distinct project name, matched ignoring case and spacing, and it counts once per time however many of its people raise a hand; voting needs a project name. A time's share is the percentage of voting projects that picked it, so shares can add up to more than 100. Projects decide the time. The page shows only shares and which time is winning, and names the projects behind each time once `revealNamesAt` projects (seven) have voted; hand and project counts appear only in the admin panel.

**Season notes**. What a project wants to talk about next, and feedback on the facilitation, sent from `/season-schedule#notes`. Filed against the next session and anonymous unless signed. The writer chooses who sees it: only the organizers (the default, read in Admin, Events, Season Schedule panel) or the whole cohort, where it joins the **shared agenda** on the page. An admin can take a shared note down but never publish a private one.

### Session boards (ADR-68)

**Session board**. The live board for one weekly Season episode, at `/season2/week/:week` (weeks 2 to 13), linked under its week wherever the Season's schedule is listed. Shown on the facilitator's screen and open on everyone's own device at once. What lands on it stays as the week's record: the Season's memory. Defined in `shared/sessionBoard.ts`.

**Stage** (on a board). One screen the room moves through together, with planned minutes: welcome, drop in, the open season, Building in Village OS, project circle, harvest, seed the game, roundtables ahead, close. Week 2 has all nine; other weeks use a six-stage default until they get their own. Not a Season (Design, Resource, Build, Rest) and not a project phase.

**Project phase** (on a board). Where a project in the circle says it is: Seed, Root, Sprout, Grow or Fruit. Self-described in the room; not the application's `projectStatus`.

**Facilitator** (of a board). Whoever runs the room: a site admin, or an active holder of the Lantern-Keeper (`design-season-organizer`), Season Facilitator or Incubator Guide role. Moves the stage for everyone, runs the clocks, the breath and the share timer, curates notes, and closes the board.

**Room votes**. Votes for an opportunity called out in the call or the chat, counted on the board by the facilitator and added to the votes people cast on the board themselves (three each).

**Village OS**. The village coordination platform each project's Game runs on; Amora runs it at amora.regencivics.earth. Written "Village OS" in prose, `village-os` in code.

### Get your Village OS (ADR-69)

**Village OS offer**. The front door at `/village-os`: run Village OS yourself (free and open source), ask us to host it (free for accepted Season 2 projects), or a paid custom build. Words and rules live in `shared/villageOsOffer.ts`.

**Hosting request**. A signed-in founder's ask, at `/village-os/host`, for ReGen Civics to host their village. One per accepted Season 2 application (approved or active, season 2). Read by a person; statuses: requested, reviewing, drafting, live, declined, withdrawn. Hosting never depends on giving.

**First draft** (of a village). The starting set a person drafts for a hosted village from named application fields (`DRAFT_FIELDS`) and the request's own words, listing its gaps. Not a generated game; the founders choose what goes live.

**Founders circle**. A small weekly circle CORE holds for founders doing this work: spiritual and peer support. Members of CORE join it; becoming a member means setting up a recurring gift to CORE. Never shown on a session board, never followed by an ask. Not a cooperative membership and not a financial product.

### Project pages and campaign tools (ADR-60, ADR-61)

**Project page**. The public page for one land project at `/project/:key`. It shows the project's live campaign front and centre, its past campaigns, and, to project stewards only, the campaign tools. The key is `{applicationId}-{slug}` for a project with an application and `c{campaignId}-{slug}` for a campaign with none (demos, play-launched drafts). The slug is decoration. Code: `shared/projectKey.ts`.

**Project steward**. Anyone who holds a land project's tools: the campaign creator, the application's applicant, the application's `stewardUserId`, a holder of an approved `land_project` org claim on that application, and admins. Distinct from the Tier-3 citizenship **Steward** (Citizenship tiers above) and the church role. Admins get access but are never on notice lists. Code: `server/lib/project-steward.ts`, the single gate.

**Hours need**. A role need measured in hours a week (`kind = 'role'`, `capacityUnit = 'hours_per_week'`). Its `quantityWanted` is the hours a week the role needs, `quantityClaimed` the hours accepted, `quantityDelivered` the hours delivered. 40 hours a week is about one full-time person, so 120 is about three. Several people can share one role: a steward accepts each person at a number of hours, and the role reads **filled** when accepted hours reach the hours needed. A legacy role still marked `count` is not an hours need until migration 0251 converts it. Code: `shared/roleCapacity.ts` (`isHoursNeed`, `roleFillState`).

**Offer**. The plain-language word the UI uses for a contribution while it is pending ("offers waiting on you"). The data stays `campaign_contributions`. Say "contribution" for the thing itself, never "donation". It is also the verb on a thing need (see **Apply, Offer, Sign up**).

**Released**. An accepted place in a need that a steward freed up. The hours or slots go back to the need. Contribution status `released`, reachable only from `accepted`.

**Cancelled (contribution)**. A pending or accepted offer closed because its campaign was cancelled. Contribution status `cancelled`. Delivered and thanked contributions stay as they are.

**Two-line bar**. The progress reading on every campaign surface, in-kind first and money second, computed by `shared/campaignProgress.ts`. The in-kind line counts needs met and confirmed value against the in-kind ask. The money line counts money through verified routes against the money ask, with lent money marked. It replaced the single pooled percentage and the three totals that disagreed. The server returns it as `progress` on `campaigns.getById`, `campaigns.list` and `projects.getPublic`.

**Confirmed (value)**. The value of accepted, delivered and thanked contributions on a need, counted at the need's own value and never past it; a filled need counts in full. The in-kind half lands when confirmed value reaches the in-kind ask (ruling 2026-09-24). A need not yet filled counts at most its value times the share of it confirmed, so confirmed value reaches the ask only when every need with a value is filled. The code lands the half when every in-kind need is filled, which parts from the ruling only for a need listed at no value; while such a need is open the bar stops short of full (2026-09-25). Rye ruled on 2026-09-27 that no new need can be listed at 0 (see **Listed at 0 (need)**), so for every new need the two readings agree. A campaign that lists no in-kind needs has only its money half. Freeform offers (no need attached) show in the whole-ask sheet as other offers and do not count.

**Half landed**. One half of a campaign reached its ask: "Money half landed", "In-kind half landed". A campaign is called complete only when it closes with both.

**Give or lend**. The two ways to offer a thing. The need says which it accepts (`campaign_items.acceptsGift`, `acceptsLoan`). A loan carries an available-from date, an until date and one condition note, and stays at the lender's risk unless the two sides agree otherwise. "Share access" is not built. New needs never use kind `loan`: a lendable thing is kind `item` with `acceptsLoan` 1 (`modesFor` in `shared/crowdpoolNeedAction.ts`).

**Returned**. A steward's record that a lent thing went back to its owner (`campaign_contributions.returnedAt`). It changes no status and no counter.

**Money route**. A way to put money into one project that the project holds outside ReGen Civics: Ma Earth for gifts, Steward for loans (`campaign_partner_links`). It shows on the project page only once a ReGen Civics admin verifies it. Example campaigns carry `example` routes that never link out. Money through a route never passes through ReGen Civics. Distinct from the fund channel, which campaign pages do not describe.

**Verified (route)**. Checked by a ReGen Civics admin with `campaigns.reviewPartnerLink`. A project steward adds a route; only an admin verifies it.

**Apply, Offer, Sign up**. The verb on a need (`needVerb` in `shared/crowdpoolNeedAction.ts`): Apply for roles and knowledge sessions, Offer for things and land, Sign up for shifts. "Apply" on a need is distinct from applying to the incubator at `/apply`.

**Needs tab**. The list of every open need across live campaigns on `/campaigns?tab=needs`, least covered first.

**Readiness ticks**. A project steward's record, per campaign, of which Ready to crowdpool items the project meets (`campaign_readiness_ticks`, keyed by the permanent item keys). The review team sees them.

**Close date**. `startedAt` (or `publishedAt`) plus `durationDays`, at most 273 days after going live (the nine-month cap, ruling 2026-09-04; `MAX_WINDOW_DAYS`). From 2026-09-27 it is binding: at the close date the daily crowdpool job decides complete or didn't complete from the two-line bar's reading. A real live campaign whose two halves have both landed moves to `completed` on its own; any other becomes **closed**. Examples never close. Code: `shared/campaignClose.ts` (`isDueToClose`, `closeOutcome`), `server/lib/campaign-close.ts`.

**Closed (didn't complete)**. Campaign status `closed`: the close date passed and the two halves had not both landed. Offers still waiting close with thanks, accepted offers that had not started are released with a thank-you, lends already on site go home on their agreed date or sooner if the lender asks, and help already given stays recorded in the project's token. Only the close job sets it; no person can move a campaign into or out of it (`shared/campaignStatus.ts`). `campaigns.closedAt` and `closeOutcome` (`complete`, `did_not_complete`) record the close. The progress reading calls it `did_not_complete` and the tag reads "Didn't complete". Distinct from **cancelled** (a steward or admin stopped it). The fund channel's own missed-window rules are held pending counsel (v1.2, 2026-09-27) and are not part of this.

**Started (offer)**. An accepted offer counts as started at a close when it is a lend whose available-from date has passed (or has none), a shift whose start time has passed, or a role whose start date has passed (or has none). Everything else accepted counts as not started, and a close releases it (`closeReleasedAt` tells that release from a steward's). Delivered and thanked offers are started. The rule keeps a place when in doubt, since a release can't be undone. Code: `offerHasStarted` in `shared/campaignClose.ts`.

**Nudge**. A notice to a project's stewards when an offer has waited 2 days, and again at 7, then never again for that offer (notice type `offer_waiting`, stamps `nudge1At`, `nudge2At`). The contributor, when they have an account, hears once at 14 days (`offer_still_waiting`, stamp `waitNoteAt`); people without an account get no new send. Ruling 2026-09-27 ("to keep things active") replaced the plan's 7 days. The switch `crowdpool.nudges` pauses nudges without a deploy. Code: `nudgeStepDue`, `stillWaitingDue` in `shared/campaignClose.ts`.

**Status link**. A private link, `/offer#<token>`, for someone who offered without an account: one offer's steps, Withdraw while waiting, and a note to the stewards. The token rides in the URL fragment, is stored only as its SHA-256 (`contribution_status_tokens`) and expires after 180 days; each accepted or declined email carries a fresh one. Once the offer is linked to an account the link is read-only. Code: `server/lib/offer-status.ts`, `offerSteps` in `shared/offerStatus.ts`.

**Arrival note**. What someone needs once their offer is accepted: where to go, what to bring, who to ask for, meals, beds, parking or transit. Written once per campaign by a steward, with an optional note per need that fills in anything its fields leave blank from the campaign note (`campaign_arrival_notes`, `resolveArrivalNote` in `shared/offerStatus.ts`). Seen only by people whose offer stands (in Your contributions, on their status link, in the accepted email), never in a public read.

**Follow (a project)**. A follow on the project, not one campaign (`user_follows.targetType = 'project'`, `targetId` `a{applicationId}` or `c{campaignId}`, from `projectRefFor` in `shared/projectKey.ts`), so it carries from season to season. Email followers carry the same ref (`campaign_followers.projectRef`). Account-holder followers hear when a campaign opens at the project and two weeks before its close date; email-only followers hear through the **season digest**. Campaign follows (`targetType = 'campaign'`) still work and count toward the same followers.

**Needed to start**. A steward's private mark on a need the project cannot begin without (`campaign_need_markers`). Only the project's stewards see it. It changes nothing about completion, which stays at 100% of the in-kind ask (ruling 2026-09-27, question 11).

**Default opening day**. The day crowdpooling opens together for a season, from the Year wheel: the December solstice, when the Resource Season opens (21 December 2026 for Season 2). It is a default; each project may choose its own day (ruling 2026-09-24). Code: `defaultCrowdpoolOpening` in `shared/crowdpoolCalendar.ts`.

**Season digest**. An Outbound audience: everyone following a campaign by email plus that season's crowdpool waitlist, one letter per address, optionally leaving out anyone who already offered on a live campaign. Rye writes and sends it from admin Outbound; nothing goes automatically.

**Listed at 0 (need)**. Not allowed from 2026-09-27: an in-kind need is listed only with a value above 0 (`isListableValue` in `shared/needRules.ts`), so "confirmed value reaches 100% of the in-kind ask" and "every need filled" always agree. Needs already at 0 stay as they are and keep the in-kind half short of landing until they fill.

---

## Funding engine (added 2026-09-27)

**G5** (gate 5). The upside-language gate from the funding engine plan. Public copy never promises or prices upside: no returns, ROI, IRR, yield, appreciation, exchange listings, secondary markets, "index fund", "direct investment", "invest in land projects through us", accredited-investor gates, fund terms (carry, preferred return, management fee, LP, NAV, tender offers) or distributions to holders. Enforced on every public surface by `scripts/check-fund-claims.mjs` in CI; drafts that touch these topics route to Rye and are logged for counsel.

**Metrics** (canonical numbers). The `metrics` table: the one place every number ReGen Civics states about itself lives, with a definition, a source and an as-of date. Live counts recompute from the database (`server/funding/metrics.ts`); others are entered by hand. Nothing reaches a public page until Rye confirms it and marks it public. Never type a traction number into a page.

**Cooperative interest**. A "tell us you're interested" record (`coop_interest`) from the /loi form: who someone is, what forms of capital they might bring, and consent to be contacted. No amounts, no pledges. It is never a membership and never a contribution (two records, two acts).

**Positioning kernel**. The private grounding the application engine reads before a funder row. Lives only in the `funding_prompts` table (versioned, edited in /admin/funding), never in the repo.
