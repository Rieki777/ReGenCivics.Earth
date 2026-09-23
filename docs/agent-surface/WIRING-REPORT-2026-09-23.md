# Wiring report: the agent surface against the real code

Phase -1 of the agent-surface build slice. 2026-09-23.

The spec (ReGen Civics Muse Connector Spec, Sept 19, 54 pages) is a target
design written without access to either codebase. Its own instruction is that
every table name, field name and tool call in it is provisional until this
report lands. This is that report: every concept in it mapped to a real table,
service or module, or justified as new, with the data model and tool contracts
rewritten using names that exist.

Read with `docs/agent-baseline/FINDINGS-2026-09-23.md`, the phase -2 control.

Standing rule applied throughout: extend before you create.

---

## Headline

**The spec asks for six things that already exist, and the two it treats as
open questions are already answered in code.**

1. **Village OS already has an agent surface.** `/api/agent/v1` in
   `game-amora/server/index.ts:7055-7308` serves OpenAPI at
   `/api/agent/v1/openapi.json`, a skills catalogue at `/api/agent/v1/skills`
   with `SKILL.md` per skill, scoped `vat_` bearer tokens, a read layer that
   mirrors existing web routes through the same gates, and a two-call
   confirm protocol for writes. The spec's phase 5 describes building this.

2. **Village OS already federates.** Migration `0031_network.sql` is a
   publish-and-subscribe frame with an explicit extension point: "a village
   PUBLISHES items to the network, peers SUBSCRIBE and cache. Federation, not
   a hub... Adding a new collaboration type later is a new `type` value and a
   renderer, not a new protocol." The spec proposes an outbox and a hub index
   as new work.

3. **The auth question between village and index is solved.** `0057` pins each
   peer's ed25519 public key, published inside the document that key signs,
   verified against the pinned value on every sweep, trust-on-first-use for
   unpinned peers. The spec lists three options (per-village credential,
   signed payloads, mutual TLS) and asks the recon to choose. The answer is
   the fourth: reuse what runs.

4. **The one content corpus exists.** `shared/learnContent.ts` plus
   `shared/learn/*.ts` already feeds the React page, the crawler HTML and the
   JSON-LD from one copy, with the shape rules the spec wants. A new
   `agentExplainers` table would be the second store the spec's own
   non-negotiables forbid.

5. **Most of the seeker-side data model exists.** `organisations`,
   `projectJoinRequests`, `projectNeeds`, `playerOffers`,
   `needsOffersMatches`, `events` and `playerProfiles` carry
   `agentProjects`, `request_participation`, `match_skills_to_projects` and
   `get_upcoming_sessions` between them.

6. **The site layer has a prior plan that is half executed.**
   `LLM_DISCOVERABILITY_PLAN.md` (2026-07-15) is a researched, audited version
   of the spec's citation strategy and phase 4, with five layers and a gap
   list. Its finding 1 is the same one the phase -2 crawl measured two months
   later: the SPA body is invisible to non-executing agents. Still 46%.

**What is genuinely new is smaller than the spec priced it, and it is the part
nobody enjoys**: the projection between the two systems, the freshness model,
and the attribution join. The spec says this itself in its own red team, and
the code agrees.

---

## 1. The two systems, and which side each thing belongs on

The spec talks about "both codebases" without saying what each one is. They are
not two halves of one product.

| | `game-amora` | `regen-civics` |
|---|---|---|
| What it is | Village OS. A white-label village-coordination platform. **Villages fork the repo**; Amora is the first tenant (`game-amora/CLAUDE.md`) | The network: the fund, the incubator, the movement site, regencivics.earth |
| Database | One MySQL **per village fork** | One MySQL on Railway, 251 tables |
| API style | Express, one large `server/index.ts`, REST | tRPC (76 routers) over Express, plus 28 REST endpoints |
| Migrations | 110 hand-written SQL, applied **at boot, fail-loud** | `scripts/run-migration.ts`, tracked in `_migrations_applied` |
| Already agent-facing | `/api/agent/v1`, `/.well-known/village.json`, `/api/public/org.json`, `/api/network/published`, Markdown mirrors | `llms.txt`, `llms-full.txt`, `crawler-content.ts`, JSON-LD, sitemap, feed |

So "each village runs its own database" is literally true, because each village
runs its own fork of the whole application. That is the fact the whole
integration shape follows from, and it is stronger than the spec assumed.

---

## 2. The network index: the question the spec said would come back

The spec's recon table lists four decisions and asks for a recommendation.
All four have an answer in code today.

| Spec's question | Spec's options | Answer from the code |
|---|---|---|
| How villages reach the index | Direct write, outbox plus webhook, or index polls a per-village endpoint | **Index polls, and the endpoint already exists.** `/api/network/published` is the publish frame; `shared_items.type` is its documented extension point. Add a `village_listing` type rather than a second protocol |
| Where the index lives | Own Railway database, or a schema in the existing one | **Tables in the existing ReGen Civics database.** The index has to join to `organisations`, `projectNeeds`, `events` and `playerProfiles` on every tool call. A separate database turns every one of those joins into a network hop for no isolation gain, since both are already Railway MySQL |
| Auth between village and index | Per-village credential, signed payloads, or mutual TLS | **None of the three. Reuse ed25519 pinning.** The index becomes a peer: reads `/.well-known/village.json`, pins `publicKeyBase64url`, verifies every later fetch against the pinned key. No credential to issue, rotate or leak, and an impostor cannot produce a signature |
| Tenancy in the index | Single table keyed by villageId, or schema per village | **Single table keyed by `instance_id`.** That identifier already exists, is already verified on every sync, and is already what flags a village whose identity changed under a known URL |

### What this changes about the build

The spec's phase 1 is "network index plus the projection: villages publish
consented fields to the shared index". Against the real code that becomes:

- **In Village OS**: one new `shared_items.type`, a server-side allowlist entry,
  and a builder that assembles the listing from tables that already hold the
  data. The consent posture is already the right one and is documented in
  `0031`: publishing is an explicit per-item act by an admin or steward, and
  nothing person-shaped is published without that person's own opt-in.
- **In ReGen Civics**: a peer client that walks a list of village base urls,
  verifies signatures, and upserts. This is the genuinely new code, and it is
  one job plus two tables.

The spec's "outbox holds exactly what was consented, so the projection cannot
leak by accident" is satisfied by `shared_items` being a separate table that
only holds published rows, which is what it already is.

### One thing the code does better than the spec

The spec's per-field visibility is a new mechanism. Village OS already has a
visibility vocabulary in use: `member_intents.tier` is
`public | members | incognito | private`, and module lifecycle
(`off | preview | members | public`) already gates what leaves the instance,
with a documented incident behind the `members` floor. Reuse that vocabulary
rather than inventing a parallel one.

---

## 3. Concept map

Every concept in the spec, and the real thing that carries it.

### Tools

| Spec tool | Carried by | Verdict |
|---|---|---|
| `find_land_projects` | `organisations` (id, orgId, name, url, description, status, regenerativeScore, regenerativeTier, forumPostId) + the new listing projection | **Extend.** `organisations` is the land project. It lacks region, entry terms, capacity and paths; those come from the village projection, not from new columns on `organisations` |
| `match_skills_to_projects` | `projectNeeds`, `playerOffers`, `needsOffersMatches`, matched by `server/jobs/needsOffersMatcher.ts` | **Extend.** Tags, `bioregionId` and `timeWindow` are already the matching keys. `bioregions` and `userBioregions` are the region vocabulary the spec asks for as `agentSkills` |
| `find_ways_to_contribute` | `questCompletions`, `quests` via `server/routes/game.ts`, `bounties`, forum | **Extend** |
| `get_upcoming_sessions` | `events` (type, startTime, endTime, timezone, status, season, episodeNumber, maxAttendees) | **Exists, use as is.** Open Access Sessions and Season Two episodes are already one table with a `season` and `episodeNumber`. Filter `startTime > now()` |
| `assess_project_readiness` | New logic over the four Game signals below | **New logic, no new store** |
| `list_a_land_project` | `orgClaims`, `applications`, `customGameApplications` | **Extend** |
| `explore_investment_thesis` | `letterOfIntent`, `fundingPipeline`, `/opportunity` (already FULL to agents) | **Exists.** Informational only, per the spec |
| `find_institutional_path` | `investorInquiries`, `generalInquiries` | **Extend** |
| `get_ecosystem_overview` | `shared/learnContent.ts` | **Extend the corpus** |
| `get_explainer` | `shared/learn/*.ts`, six articles today | **Extend the corpus, not a new table.** See section 5 |
| `request_participation` | `projectJoinRequests` (submitterName, submitterEmail, submitterMessage, targetType, targetId, targetName, stewardUserId, status, connectInquiryId) | **Extend.** This is the write tool, and it already exists as a table and a flow |

### Data model

| Spec table | Real carrier | Verdict |
|---|---|---|
| `agentProjects` | `organisations` + `villageListings` (new projection) | **Split.** Do not duplicate `organisations` |
| `agentSkills` | `bioregions`, `forumPostTags`, `projectNeeds.tags` | **Extend.** A controlled vocabulary is still needed; it is a lookup, not a new domain |
| `agentProjectSkills` | `projectNeeds` rows | **Drop.** `projectNeeds` already joins a project to a needed skill with a status and a time window |
| `agentSessions` | `events` | **Drop. Use `events`** |
| `agentExplainers` | `shared/learnContent.ts` | **Drop as a table.** See section 5 for the tension this creates |
| `agentLeads` | `projectJoinRequests` + `investorInquiries` + `generalInquiries` | **Extend.** Three inboxes exist; a fourth would be the dead end the spec warns about |
| `agentStewardChecks` | `batchJobRuns` + the projection's own `lastSyncedAt` | **Mostly drop.** Freshness is computed from village activity, so the audit trail is the sync log |
| `agentToolDefs` | `siteSettings`, `adminAutomations` | **New, but small.** `siteSettings` is the precedent for deploy-free config |
| `agentCalls` | `analyticsEvents` | **Extend or new.** See open question 3 |
| `agentAttribution` | `referrals`, `shareEvents` | **Extend.** `referrals` carries `referralCode`, `source`, `context`, `landingUrl` and three conversion timestamps (`signedUpAt`, `firstQuestAt`, `firstContributionAt`), which is the rung ladder already modelled. It keys on a referring user, so agent calls need their own issuer |
| `agentOutcomes` | `analyticsEvents`, `tierEvents`, `questCompletions` | **Extend** |
| `agentRankingWeights` | `siteSettings` | **Extend** |
| `agentQueryGaps` | New | **New** |

### The four Game signals

The spec says these must be "computable from Village OS state, not a
self-assessment". All four are, from tables that exist:

| Signal | Computed from | Notes |
|---|---|---|
| Roles defined and filled, at least one beyond the founder | `roles` + `role_holders` (role_id, user_id, granted_by, granted_at); also `org_roles` + `org_role_assignments` | Two role systems exist. Which one is authoritative is **open question 1** |
| A decision recorded in the last 12 months | `ballots` (subject_type, subject_ref, open_key, circle_id, title, doc_markdown, method) + `ballot_votes`, from `0089_governance_engine.sql` | A real governance engine, not a flag |
| Contribution legible, activity in the last 90 days | `quest_claims` (status reaches `consented`) and `gratitude_log` | Two independent signals of the same thing |
| Entry path published | No single carrier today | **The one real gap. Open question 2** |

### Everything else

| Spec concept | Real carrier |
|---|---|
| Signed ref token on every returned url | `referrals` (regen-civics); `signDocument` + ed25519 (Village OS) |
| Scheduled checkpoint jobs at 90/180/270 days | `server/jobs/*` plus Railway cron hitting `POST /api/cron/*` with a Bearer token. 21 job modules exist |
| Telegram brain bot | `brainTelegramUpdates`, `server/lib/brain-items.ts`, `server/routes/adminAutomations.ts` |
| Outbound email | Resend, `server/lib/*-email.ts`, `emailLogs`, `scheduledEmails` |
| `/admin-create` tuning console | `client/src/pages/AdminCreate.tsx` |
| Hypha listing decision | `server/lib/hypha-bridge/`, `hyphaBridge.ts` router; in Village OS `hypha_outcomes`, `hypha_village_reads`, `hypha_token_bindings` |
| Player profile portable across villages | `playerProfiles` (regen-civics) is already the person-level record, with `bioregionId` and `locationPrecision` |
| "No precise location" | `playerProfiles.locationPrecision` already exists as a mechanism |
| Agent-legible site | `server/_core/crawler-content.ts`, `llms.txt`, `llms-full.txt`, JSON-LD, sitemap, feed |
| Two-call confirm before a consequential write | `/api/agent/v1/events/:id/rsvp` echo plus confirmToken, ten minutes, echo hash |

---

## 4. Revised tool contracts

Rewritten so each one names a call that exists. The pattern follows the one
Village OS already uses at `/api/agent/v1`: **a thin mirror over an existing
route, through the same gates, never a reimplementation.**

One constraint the spec could not know: **`publicProcedure` in
`server/_core/trpc.ts:97` is `t.procedure.use(csrfProtection)`.** Every public
tRPC procedure carries CSRF protection, so an MCP server cannot call tRPC as a
client. The agent layer must be plain REST mounted beside the tRPC handler,
calling the same underlying functions. This is the same shape as
`server/routes/embed.ts`, which already serves server-rendered widgets with
live DB data to third parties.

| Tool | Reads | Mirror of |
|---|---|---|
| `find_land_projects` | `organisations` joined to `villageListings` | `organisations` list query in `server/routes/orgRatings.ts` / `community.ts` |
| `match_skills_to_projects` | `projectNeeds` filtered by tags, `bioregionId`, `timeWindow` | `server/routes/needsOffers.ts` + `server/jobs/needsOffersMatcher.ts` ranking |
| `find_ways_to_contribute` | `quests`, `bounties`, forum entry | `server/routes/game.ts`, `bounties.ts` |
| `get_upcoming_sessions` | `events` where `startTime > now()` and `status` live | `server/routes/events.ts` |
| `assess_project_readiness` | The four signals over `villageListings` | New pure function |
| `list_a_land_project` | Static plus `orgClaims` entry path | `server/routes/claims.ts` |
| `explore_investment_thesis` | `letterOfIntent` status, static thesis copy | `server/routes/investors.ts`, routes to `/opportunity` |
| `find_institutional_path` | Static plus contact routing | `server/routes/investors.ts` |
| `get_ecosystem_overview` | `shared/learnContent.ts` | `server/_core/crawler-content.ts` |
| `get_explainer` | `shared/learn/*.ts` by slug | `getLearnArticle(slug)` |
| `request_participation` | Writes `projectJoinRequests`, queues delivery to the village | `server/routes/community.ts` join-request flow |

`get_explainer`'s topic enum should be the real slugs, not the spec's invented
ones. Six exist today: `start-a-community-on-your-land`,
`intentional-community-structures`, `how-to-start-an-ecovillage`,
`community-governance-models`, `crowd-pooling`, `nine-forms-of-capital`.

Note how closely the existing six already match the spec's funnels. `crowd-pooling`
and `community-governance-models` are two of the spec's ten topics under
different names, and `start-a-community-on-your-land` is the B funnel's
explainer. Phase 0 is four or five new articles in an existing format, not ten
from nothing.

---

## 5. The one place the spec's non-negotiables conflict with each other

Two rules from the handoff prompt cannot both hold as written:

> One content corpus serves the explainers, llms-full.txt, the site and the
> social content system. Never a second store.

> A description changes and goes live without a deploy.

The corpus that exists (`shared/learn/*.ts`) is TypeScript compiled into the
bundle, so changing it needs a deploy. A database-backed corpus edits without a
deploy and becomes the second store the first rule forbids.

The resolution that keeps both rules, and the one this report recommends:
**split by what the text is.**

- **Explainer bodies stay in `shared/learn/`.** They are long-form, reviewed,
  cited content that should move through a deploy and a diff. They already feed
  three consumers from one copy.
- **Tool descriptions and response templates go in the database**
  (`agentToolDefs`). They are short ad copy, they are the thing the spec
  correctly says must be tunable without a deploy, and they are not content a
  human reads on the site.

These are different kinds of text with different review needs, and treating
them as one corpus is what creates the conflict. Flagged for Rye as
**open question 4**, because it is a direction choice rather than a fact.

---

## 6. What is genuinely new

Everything else is an extension. This is the whole new-build list.

| New thing | Where | Why nothing existing carries it |
|---|---|---|
| `village_listing` type in `shared_items` plus its builder | Village OS | The publish frame exists; this type does not |
| Entry paths with gate type and capacity per path | Village OS | No table carries "how a newcomer joins this village". The real gap |
| `villageListings` table (the index) | regen-civics | The projection has to land somewhere joinable |
| Peer sweep client: fetch, verify signature against pinned key, upsert | regen-civics | Village OS has the peer client; ReGen Civics does not |
| `agentToolDefs` with a live-version resolver | regen-civics | `siteSettings` is the precedent but not the shape |
| `agentQueryGaps` | regen-civics | Nothing clusters failed queries |
| The public REST agent layer plus MCP | regen-civics | CSRF blocks tRPC. `embed.ts` is the pattern |
| `/.well-known/mcp`, `/agents.md`, `/openapi.json` | regen-civics | Absent, confirmed by the phase -2 crawl |

Eight items. The spec's data model proposed eleven new tables; three survive.

---

## 7. Open questions for Rye

Answers needed before phase 0. Nothing here can be settled from the code.

1. **Which role system is authoritative for the "roles filled" signal?** Village
   OS has both `roles` + `role_holders` (migration 0002) and `org_roles` +
   `org_role_assignments` (the Org Map). A project could pass the signal under
   one and fail under the other.

2. **Where do entry paths live, and who states them?** The four paths (core
   team, resident, business, investor) with a gate type each are the one part
   of the spec with no carrier in either codebase. Related: `housing_availability`
   and `accommodations` already model resident capacity, so the resident path
   may already be half answered while the other three are not.

3. **Should `agentCalls` extend `analyticsEvents` or stand alone?**
   `analyticsEvents` exists, and it already carries `ref` and `props`, so a ref token already flows through it. Against it: agent call
   logging wants per-call latency, result count and tool version, and mixing
   machine traffic into a table that feeds human analytics will distort
   whatever reads it today.

4. **The corpus split in section 5.** Explainers in the repo and tool copy in
   the database, or both in the database and accept that "one corpus" means one
   database table rather than one file tree.

5. **Three overlapping four-way vocabularies, one already public.** `llms.txt`
   publishes "Four Primary Participation Paths": Investor, Land Project,
   Alliance Partner, Player. The spec has funnels A/B/C/D (contributors, land
   projects, investors, players) and separately four paths into a village (core
   team, resident, business, investor). These need to be one vocabulary before
   anything writes them into a schema, and the published one has a claim to
   winning.

6. **`/plan-ceo-review` does not exist as a command.** `docs/GOLDEN_RULE.md`
   step 1 names it and nothing implements it, in either repo or in
   `~/.claude/`. The gate has been run by hand for this slice (section 9). Worth
   deciding whether to write the command or drop the reference.

---

## 8. Handoff table

### Rye

| # | Task | Why only Rye |
|---|---|---|
| 1 | Answer the six open questions above | Architecture and vocabulary calls on his own systems |
| 2 | Put `OPENROUTER_API_KEY` in the shell or the local `.env` | It is in Railway; the phase -2 LLM half is one command behind it |
| 3 | Run the four baseline questions in Muse, Gemini and ChatGPT, paste into `docs/agent-baseline/control-2026-09-23.md` | His own signed-in browser; no credential should reach a repo |
| 4 | Read this report and the baseline findings | The spec's own hard stop before phase 0 |

### Claude Code, once those land

| # | Task |
|---|---|
| 5 | Re-run `node scripts/agent-baseline/run.mjs` with the key, fold the LLM half and the control into the baseline |
| 6 | Phase 0: four or five new explainers in `shared/learn/`, reusing the existing format |
| 7 | Phase 4 ahead of phase 5, per the baseline recommendation: extend `crawler-content.ts` over the 94 blank routes, add the three missing well-known files |
| 8 | Phase 1: the `village_listing` type, the sweep client, `villageListings` |

---

## 9. Gate record

`/plan-ceo-review` (GOLDEN_RULE step 1) run by hand, since the command does not
exist. The test it names is "does this serve regenerative land coordination or
is it scope creep?"

**Verdict: passes, with the scope reduced by this report.** The load-bearing
output is a verified dataset of land projects with status, needs, entry terms
and a verification date, projected from the governance structures villages
already run. The Fund needs that for diligence, the incubator needs it for
cohort matching, and the site needs it to stop being vague. The connector is a
few hundred lines over the top. The spec's own steelman makes this argument and
the code supports it: the parts that serve coordination already exist and want
connecting, and the parts that were pure distribution bet are the two phases
already gated behind kill criteria.

Ship gate (STEERING section 3): `py scripts/audit-truncation.py` clean, 0
truncated, 0 suspicious. No TypeScript and no new classNames in this phase, so
gates 2 and 3 have nothing to check.
