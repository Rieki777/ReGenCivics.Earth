# Saberra × Amora-Game Integration Package

Prepared 2026-08-11 for Rieki (Amora-Game / ReGen Civics) by the Saberra team. Written from both live codebases: the Saberra repository and the public `Rieki777/Amora-Game` repository at that date, plus the live surfaces at `amora.regencivics.earth` and `amora-api.saberra.com`.

## Executive summary

Amora ended up with two systems that each believed they were the single source of truth. Having read both codebases, our conclusion is that they are not competitors. **Amora-Game is the action layer** (quests, progression, recognition economy, org chart, living map: where members act, present tense). **Saberra is the memory layer** (passive capture of meetings and email, extraction into structured institutional memory, and Sera, an assistant that answers from it: what actually happened, past tense). The genuine schema collisions are only five components: people, org chart (circles/roles), events, decisions, and gratitude. Every one of them resolves cleanly with a single-owner assignment and one-way mirroring.

Both platforms independently adopted the same constitutional rule: **AI proposes, humans consent** (your `assistant_drafts` queue and consent flows; our Draft/Candidate/Pending review queues). That shared rule is why this integration is unusually easy: everything that crosses the boundary crosses as a reviewable proposal into the receiving side's existing queue, never as silently written fact.

**Feasibility: 8/10** for the phased, API-boundary integration proposed here. The one missing primitive (Saberra has no outbound webhooks yet) is small, lands at an existing choke point in our pipeline, and is not needed for Phase 1. Full risk register and scoring in doc 06.

**Recommended first moves:** Maia (your assistant) gains Sera's memory via our live MCP server; your Riverside transcripts forward into our meeting ingest; we mirror your signed org-chart export into Notion. No UI changes, no schema changes, each piece independently removable.

## The documents

| Doc | Contents |
|---|---|
| [01-what-is-saberra.md](01-what-is-saberra.md) | Architecture: capture pipeline, worker/API/dashboard, Notion + Postgres split, multi-tenancy, Sera, privacy layers, honest gaps |
| [02-saberra-data-model.md](02-saberra-data-model.md) | The trust gradient, all 26 Notion databases with fields and upsert keys, extraction output types, Postgres tables, identity semantics |
| [03-saberra-api-reference.md](03-saberra-api-reference.md) | Every endpoint (ask, search, extract, ingest, report, backup, provision), auth, the MCP server and its five tools, rate limits |
| [04-integration-strategies.md](04-integration-strategies.md) | **The core doc.** Component-by-component source-of-truth matrix with rationale, available mechanisms, the short build list, four phases |
| [05-user-workflows.md](05-user-workflows.md) | What integration feels like per persona (member, steward, admin, partner, future village); the anti-patterns designed out |
| [06-risk-and-feasibility.md](06-risk-and-feasibility.md) | Ten risks with likelihood/impact and mitigations; per-layer feasibility scores; verdict |
| [07-questions-and-next-steps.md](07-questions-and-next-steps.md) | Nine questions only you can answer, what we provision for you, proposed working sequence |

## The one-line contract behind all of it

> Write where you act. Read anywhere. Never enter anything twice. Everything an AI moves across the boundary arrives as a proposal, never as a fact.

## Live surfaces for orientation

- Sera API (Amora): `https://amora-api.saberra.com` (`/health` is public)
- Sera dashboard (Amora): `https://amora.saberra.com`
- MCP: same host, `/mcp` (Streamable HTTP), OAuth or bearer
- Your side, which we consumed while writing this: `https://amora.regencivics.earth/map`, `/.well-known/village.json`, `/api/public/org.json`
