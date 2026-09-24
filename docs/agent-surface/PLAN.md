# Agent surface: the plan

2026-09-24. This supersedes the phase table in the ReGen Civics Muse Connector
Spec (Sept 19) wherever the two differ.

The spec was written without access to either codebase and said so. Phases -2
and -1 measured what is actually there. This is the plan rewritten against
those findings, so what follows is a plan rather than a spec with five rounds
of corrections layered on it.

Evidence behind every claim here:
`docs/agent-baseline/FINDINGS-2026-09-23.md` and
`docs/agent-surface/WIRING-REPORT-2026-09-23.md`.

---

## What the reports changed

| The spec assumed | What is true | Effect on the plan |
|---|---|---|
| The agent-legible site layer is new work (phase 4) | `llms.txt`, `llms-full.txt`, `robots.txt` naming 25 AI crawlers, `sitemap.xml`, `feed.xml` and a working no-cloaking prose injector all exist. 46% of routes are still blank | Phase 4 shrinks to an extension, and moves **ahead of** the service |
| The MCP service is new (phase 5) | Village OS already runs `/api/agent/v1` with OpenAPI, a skills catalogue, scoped tokens and two-call confirm writes | The ReGen Civics service copies a working pattern instead of inventing one |
| Villages publish to a new outbox, into a new index | Village OS federates today: `0031_network.sql`, publish and subscribe, with `shared_items.type` as its documented extension point | One new `type` plus a sweep client, not a protocol |
| Village-to-index auth is an open choice of three | `0057` pins each peer's ed25519 key, published inside the document it signs | Nothing to build |
| Ten explainers to write | Six exist in `shared/learn/`, and five spec topics are rewrites of text already in `llms.txt` | Phase 0 is four or five articles |
| Eleven new tables | Four survive, plus `agentCalls` | Most of the model is an extension |
| Entry paths live in Village OS | 15 land projects, at most 3 run a fork | `projectPaths` lives in ReGen Civics, and phase 1 stops waiting on phase 2 |
| The connector is the distribution bet | ReGen Civics is named in 0 of 16 model answers and 0 of 4 ChatGPT answers, and no answer in 36 carried a date | The site work pays off with or without a directory ever listing us |

---

## The plan

Phases renumbered. The spec's numbers are noted so the two can be matched up.

### P0. Make the blank routes readable (was phase 4)

**First, because it is the only item that pays off whether or not the connector
ever ships.** Muse, Spark and Instinct browse before they call anything, and
today 94 of 206 public urls return an empty shell.

1. **`/schedule` before anything else.** Zero of 36 measured answers carried a
   date, and a dated session is the highest-converting object a tool can
   return. This one route is the largest single gap in the run.
2. Extend `server/_core/crawler-content.ts` over the rest of the blank list,
   in this order: `/`, `/crowd-pooling`, `/economy`, `/season2`,
   `/game-mechanics`, `/regen-games`, `/map`, `/compare-projects`, `/connect`.
3. Add `/.well-known/mcp`, `/agents.md`, `/openapi.json`.
4. `Event` JSON-LD on `/schedule`, `Place` and `Organization` on project pages.

**Done when:** a JS-disabled fetch of every route in the list returns prose, and
a re-run of `scripts/agent-baseline/run.mjs` shows the blank count materially
below 94.

### P1. The explainers (was phase 0)

Four or five new articles in `shared/learn/`, in the existing format, plus
rewrites of the five topics already covered in `llms.txt`.

Genuinely new: `two-tier-carry`, `veterans`, `work-trade`,
`from-despair-to-action`, `how-a-village-meets-needs`.

Two things the control changed about the copy:

- **The B funnel query is read as agritourism.** ChatGPT answered "I own 40
  acres and want to bring people onto it" with land-use permitting consultants
  and civil engineers. Our copy has to distinguish itself from event permitting
  or it will never be selected for that query.
- **The A funnel has a strong incumbent.** ChatGPT named six real Oregon
  projects with entry terms, hours and duration. Anything we publish is
  measured against that.

**Done when:** each topic has a canonical url, `llms-full.txt` is generated
from the same rows, and there is no second copy anywhere.

### P2. `projectPaths` and the declared entry path (was part of phase 2)

The one real gap in either codebase. Four rows per project keyed to
`organisations.orgId`: path, gate type, capacity, what is asked, plus `source`.

Start with `source: declared` for the 12 projects with no fork, entered through
the existing claim flow. This ships the B and A funnels for the whole registry
without a single village adopting anything.

**Done when:** `find_land_projects` can return a gate type and entry terms for
every active organisation, and the two-tier label is on every record.

### P3. The read tools, REST first (was phase 5)

Ten read tools as plain REST beside the tRPC handler, following
`server/routes/embed.ts`. `publicProcedure` carries CSRF protection, so an MCP
client cannot call tRPC; the tools wrap the same underlying functions.

Every tool `readOnlyHint: true`, `openWorldHint: false`, titled and annotated.
No precise location in any input schema. Attribution ships with the tools: every
url carries a signed ref token, never added later.

Copy the two patterns Village OS already proved: a thin mirror over an existing
route through the same gates, and echo-plus-confirm before any write.

**Done when:** MCP Inspector runs all ten, no internal ids appear in any
payload, and every url resolves back to its call.

### P4. MCP wrapper and the hosts (was phases 5 and 8)

Same pure functions behind `POST /mcp` streamable HTTP. Then publish the url:
Claude custom connector, Gemini Spark Connected Apps, Grok. All three are free,
same-day, and need no review.

**Blocked on:** a Google account able to add a custom app (personal US, 18+,
English, Keep Activity on). Logged-out Gemini never answers, so this is the
account the baseline could not use either.

### P5. The network index and the village projection (was phase 1)

A `village_listing` type in `shared_items`, its builder, and a sweep client in
ReGen Civics that verifies each village's signature against its pinned ed25519
key and upserts into `villageListings`. `projectPaths` rows for those villages
flip to `source: village_os` and start refreshing themselves.

**Done when:** two villages publish into one index and both read back correctly,
nothing outside the consented set ever appears, a village taken offline degrades
to a freshness label rather than an error, and opt-out removes the projection.

### P6. `request_participation` (was phase 6)

The only write tool. Extends `projectJoinRequests`, which already carries
`stewardUserId`, `targetType` and `targetId`. Delivery branches on
`projectPaths.source`: into the village's own Game for `village_os`, to the
steward for `declared`.

### P7 onward

Unchanged from the spec: verification pages, journeys, the two state-triggered
emails, submission packets, the tuning console, the learning loop and the three
checkpoints. The kill criteria stand as written.

---

## Order, and why

P0 and P1 first because they are the two that stand entirely on their own. If
the agent thesis is wrong, a readable site and a written explainer corpus were
worth doing anyway, and the reports show both are closer to done than the spec
thought.

P2 before P5 because 12 of 15 projects have no fork. Waiting for the projection
means waiting for villages to adopt Village OS, which is a roadmap we do not
control and which the Sept 26 cohort date was the only lever on.

P3 before P4 because the REST layer and the MCP layer share one set of pure
functions, and the REST one is testable without a host.

---

## Non-negotiables, unchanged

Carried from the spec's handoff prompt. Every one survived the recon.

- Every url a tool returns carries a signed ref token resolving to its call.
  Ships with the tools, never later.
- One content corpus. Explainer bodies in `shared/learn/`, tool descriptions in
  `agentToolDefs`. Two kinds of text, never two copies of one.
- Verification is evidence, not attestation: the four Game signals computed
  from real state. Stale records degrade to a labelled freshness state and
  never vanish.
- Two tiers, always in the payload: game-verified and known.
- Only consented fields cross into the index, enforced at the publish surface.
- Every read tool `readOnlyHint: true`, `openWorldHint: false`, titled and
  annotated. `request_participation` is the only write.
- No precise location in any input schema. No inference or storage of emotional
  state.
- No urgency or scarcity language anywhere.
- `explore_investment_thesis` is informational and routes to `/opportunity`. It
  never quotes terms, minimums or returns. Village-level investing routes to
  that village's own process and presents no terms.

---

## Open dependencies

| What | Who | Blocks |
|---|---|---|
| A Google account able to add a custom app | Not Claude Code | P4's Gemini half, and the two skipped control questions |
| Securities counsel on `/opportunity` and 506(b) vs 506(c) | Rye | Nothing before P7. `explore_investment_thesis` ships informational |
| Who staffs the one-week response commitment | Rye | P6 going live |
| `/plan-ceo-review` as a real command | Claude Code | Nothing. Agreed to write it |
