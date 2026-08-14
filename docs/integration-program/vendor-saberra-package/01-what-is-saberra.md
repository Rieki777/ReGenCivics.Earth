# What Saberra Is: Architecture Overview

Audience: the Amora-Game / ReGen Civics team. This is the ground-truth technical description of Saberra as of 2026-08-11. Companion docs: `02-data-model.md` (every database and field), `03-api-reference.md` (every endpoint and MCP tool), `04-integration-strategies.md` (how our systems could fit together).

## One-paragraph summary

Saberra is an institutional memory system for communities and organizations. It ingests the raw exhaust of how a group actually operates (emails, meeting recordings, Google Meet transcripts, Gemini notes, forwarded threads, pasted documents) and uses Claude to extract structured records: decisions, tasks, risks, roles, circles, commitments, tensions, gratitudes, events, resources, profiles, projects. Those records land in a 26-database Notion workspace that belongs to the client. On top of that memory sits **Sera**, an AI assistant that answers questions, generates reports, detects governance drift, and takes actions (email, calendar, Drive) on behalf of members. Amora is one of five live tenants.

## The core philosophy: capture is passive, publishing is human

The single most important design constraint: **the ingestion worker never approves, publishes, or applies anything.** Every extracted record is created as Draft / Candidate / Pending and waits for human review. Canon (the community's agreed truth) changes only through people. This matters for integration because it means Saberra's data has an explicit trust gradient: raw capture, then extracted-but-unreviewed, then human-confirmed. Any consumer of Saberra data (including a game UI) can and should distinguish those tiers.

## System components

```
                        ┌─────────────────────────────────────────────┐
  roots@amora.cr  ───►  │  Capture (SES webhook or IMAP)              │
  Meet recordings ───►  │      ↓                                      │
  Transcripts     ───►  │  Sera Worker (Railway, per-tenant)          │
  Forwarded mail  ───►  │   classify → dedup → Claude extraction      │
                        │      ↓                                      │
                        │  Notion workspace (26 DBs, client-owned)    │
                        │  Postgres (ops + control plane)             │
                        └────────────┬────────────────────────────────┘
                                     │
                        ┌────────────▼────────────────────────────────┐
                        │  Sera API  (amora-api.saberra.com)          │
                        │   /ask /search /extract /report /backup ... │
                        │   MCP server (5 tools, OAuth or bearer)     │
                        ├─────────────────────────────────────────────┤
                        │  Sera Dashboard (amora.saberra.com)         │
                        │   chat, governance, people, projects, CRM   │
                        └─────────────────────────────────────────────┘
```

Four service types run from one TypeScript/Node codebase, selected by env var:

- **Worker** (per-tenant, always-on): polls capture sources every ~3 minutes, runs classification, dedup, and Claude extraction, writes to Notion, maintains health telemetry.
- **API** (pooled, multi-tenant): the Sera API. Resolves the tenant per request. This is the surface an integration talks to.
- **Dashboard** (pooled, multi-tenant): the human web UI ("Control Center"), per-user login.
- **Operator** (internal): Saberra's own fleet monitoring. Not integration-relevant.

Hosting is Railway. Amora's endpoints:

- API: `https://amora-api.saberra.com`
- Dashboard: `https://amora.saberra.com`

## Where data lives (three stores, different jobs)

| Store | Owner | What lives there |
|---|---|---|
| **Notion workspace (26 DBs)** | The client (Amora) | All institutional memory: the entities themselves. This is the human-visible, human-editable canon surface. Full inventory in `02-data-model.md`. |
| **Postgres (ops)** | Saberra | Operational state: processing events, token ledgers, chat threads, user preferences, learned name aliases, retry queues, session/auth tables. Not memory, plumbing. |
| **Postgres (platform)** | Saberra | The tenant registry: one row per client with config, capture mode, credentials, health. Control plane only. |

The deliberate consequence: **the client owns their memory.** Amora can open Notion and read, edit, or export everything Saberra ever wrote. Saberra's Postgres holds nothing a client would grieve losing.

## The extraction pipeline in one pass

1. An email arrives at the capture address (Amora: SES webhook capture, forwarded from `roots@amora.cr`).
2. The worker classifies it: Google Meet asset (recording / transcript / Gemini notes), operational email, or forwarded thread.
3. Dedup: Message-ID lookup against Notion for emails; a Capture Key strategy for meetings (calendar event ID, then meet code + date, then normalized title + organizer + date) so five emails about one meeting produce one Meeting record.
4. Claude extraction: a structured prompt produces typed entity arrays (decisions, tasks, risks, profile updates, tensions, commitments, gratitudes, events, retrospectives, resources, spend, KB articles, canon change candidates, sensitive flags, and a meeting summary).
5. `writeToNotion` upserts each entity into its database, resolving people through a participant resolver (alias map, fuzzy matching, possible-duplicate tagging rather than silent merges).
6. Everything is audit-logged (Processing Events) and shows up in the dashboard's review queues.

Per-tenant knobs: extraction language, granularity (essential / standard / full), a free-text extraction addendum ("This is a housing cooperative"), and a language correction mode.

## Sera, the assistant layer

Sera is an agentic Claude loop with ~30 internal tools over the tenant's data: query any of the 26 databases with filters and exact counts, text search, create/update/archive records, merge duplicates, render charts, run web research, build member profiles, send email, create calendar events, save to Drive, and remember facts about users and name aliases across sessions. It answers in the community's language, cites Notion sources, and streams over SSE. It has two modes (ask, report) and generates typed reports (project status, governance audit, member activity, risk summary, team overview, meeting prep).

Sera is exposed three ways: the dashboard chat UI, the HTTP API, and an **MCP server** (Model Context Protocol) that Claude.ai and Claude Code connect to directly. Details in `03-api-reference.md`.

## Governance model Saberra encodes (relevant overlap with your Roles/Circles work)

Saberra ships first-class entities for a sociocracy-adjacent operating system (called CCOS in our schema): **Circles** (with Circle Lead and Rep Steward relations), **Roles** (role cards), **Role Assignments** (person to role, with an Energization Level of Energized / Willing / Unwilling), **Decision Candidates** (with implementation tracking), **Tensions**, **Canon Change Requests**, and a **CCOS Ledger**. There is also a "governing purpose" (GPS) setting per tenant, and extraction can tag Purpose Alignment on tasks and decisions when active. Since Amora-Game also models roles and circles, this is the highest-value and highest-risk overlap area; see the source-of-truth matrix in `04-integration-strategies.md`.

## Multi-tenancy and what "a client" means

A tenant is one community: its own Notion workspace (duplicated from a canonical template), its own capture address, its own worker, its own API secret, its own branded URLs. Adding a tenant is a registry entry plus a provisioning call that discovers the duplicated Notion databases by title. This matters for your side: if ReGen Civics has 42 land projects, the Saberra-side question is whether each project is a tenant (own memory, own Sera) or whether a hub is a tenant. Provisioning is automated enough that per-project tenancy is realistic.

## Privacy features worth knowing about

- **Confidential Identity layer**: per-tenant pseudonymization of specific protected parties. The real name is swapped for a stable codename at every boundary (Notion writes, Claude calls, logs, API responses, which are deep-redacted). Any integration surface will see codenames, never the underlying identity. Do not build anything that assumes it can enumerate "all real people."
- **Sensitive Review**: extraction can flag content as sensitive; those records go to an admin-only database outside the main teamspace.
- **Member vs admin roles** on both the dashboard and the API affect what Sera will disclose.

## What Saberra does NOT have (honest gaps, relevant to integration)

- **No outbound webhooks or event bus.** Today, consumers pull (API queries, `/backup` snapshot, CSV export). If the game UI needs push freshness, that is new work on our side; it is scoped in `04-integration-strategies.md` as the one piece of net-new Saberra infrastructure the integration likely justifies.
- **No public read API per entity type.** Sera's `/ask` and `/search` are semantic surfaces; `/backup` is a bulk snapshot. There is no `GET /tasks?status=open` REST resource today. Also scoped in `04`.
- **No geographic/spatial data anywhere.** Saberra has no coordinates, parcels, or map entities. Your map layer has zero collision with our schema, which is good news.
- The Notion API is the de facto read/write surface for entity CRUD, and the client owns that workspace, so a third party granted a Notion integration token can already read and write the memory directly, subject to Notion rate limits (roughly 3 requests/second per token, eventual-consistency on queries).

## Verification honesty

Everything above is written from the live codebase and current tenant registry, not from marketing. Where a companion doc makes a claim about behavior, it names the endpoint or file that proves it. If something here contradicts what you observe against the live API, tell us; the live system wins.
