# Saberra API and MCP Reference

Everything an external system can call today. Base URL for Amora: `https://amora-api.saberra.com`. The dashboard (human UI) is `https://amora.saberra.com`.

## Authentication

- **Bearer secret**: every protected route takes `Authorization: Bearer <SERA_API_SECRET>`. One secret per tenant, 32 random bytes hex, timing-safe compared. This is the credential we would provision for the Amora-Game server (held server-side in your `server/lib/secrets.ts` store, exactly like your Stripe key; never shipped to the browser).
- **Scoped short-lived tokens** exist for two flows (browser streaming, meeting ingest) so clients never hold the master secret. If we build a game-facing surface we can mint a scoped token type the same way.
- **MCP OAuth**: the MCP server also supports full OAuth 2.0 with PKCE and dynamic client registration, minting revocable per-connection tokens. This is how Claude.ai connects; a third-party MCP client can use the same flow.
- All responses pass through confidential-identity redaction. There is no way to opt out from the outside.

## Core endpoints (protected unless noted)

### Ask and search

| Route | Body | Returns |
|---|---|---|
| `POST /ask` | `{question, mode?: 'ask'\|'report', history?, images?, documents?, role?: 'admin'\|'member'}` | `{answer, sources: [{title, url}], tokens, costUsd?, charts?: [{title, svgBase64}]}` |
| `POST /ask-stream` | same, over SSE | event types: `text`, `thinking`, `sources`, `charts`, `tokens`, `suggestion`, `notice`, `error`, `ping` (15s keepalive). Rate limit 20/min/IP. Accepts the API secret or a one-time stream token. |
| `POST /search` | `{query, databases?: string[]}` | raw keyword/semantic search results across the 26 DBs |
| `POST /report` | `{type: project_status \| governance_audit \| member_activity \| risk_summary \| team_overview \| meeting_prep, subject?, dateRange?, saveToKb?}` | `{report, sources, tokens}` |
| `GET /health-score` | none | `{score, grade, breakdown}` 0 to 100 org-health from live records, cached 10 min |
| `POST /transition-brief` | `{personName? \| roleName? \| circleName?}` | handover brief for a person/role/circle transition |

`role: 'member'` restricts what Sera will disclose; pass the requesting user's role through if you proxy from the game.

Sera behind `/ask` is agentic: it can query any database with filters and exact counts, create/update/archive records, merge duplicates, render charts, search the web, and (for users who connected Google) send email, create calendar events, and save to Drive. Write actions are consent-gated in conversation.

### Ingestion (push content into memory)

| Route | Body | Notes |
|---|---|---|
| `POST /extract` | `{text, sourceTitle?, sourceDate?, sourceType?, sourceActor?, relatedContext?}` | full extraction pass; creates draft records; returns `{extracted, tokens, createdRecords}`. 10 MB limit. |
| `POST /reprocess` | `{text, pageId?, sourceDate?}` | re-extract and link to an existing Meeting/Source Email page |
| `POST /api/saberra-meet/ingest` | `{meeting: {title, date, duration, participants, notes, transcript, actions}}` | direct meeting ingest; also accepts a scoped ingest token |
| Email | send/forward to the tenant capture address | zero-API integration path: anything mailed there is captured, deduped, extracted |

The email path is worth underlining: your platform already sends transactional email via Resend. CC or forward to the capture address and Saberra ingests it with no code on our side.

### Bulk read

| Route | Returns |
|---|---|
| `GET /backup` | full JSON snapshot of all 26 databases, paginated |
| Dashboard export | admin-triggered ZIP of per-database CSVs |
| Notion API directly | the client owns the workspace; a Notion integration token grants full structured read/write at ~3 req/s. For entity-level sync this is currently the best read/write surface. |

### Health and ops

| Route | Auth | Returns |
|---|---|---|
| `GET /health` | none | service status, tenant, release, config completeness |
| `GET /stats` | bearer | 7-day metrics: emails ingested, tokens consumed, errors, cost estimate |

### Tenant lifecycle (for the multi-village conversation)

`POST /tenants/provision` creates a complete tenant from one call: Notion workspace discovery (from a duplicated template), capture address, API secret, settings. `POST /tenants/:id/activate` and `PATCH /tenants/:id` manage lifecycle. Relevant if other ReGen villages want their own Saberra memory.

## MCP server

Saberra exposes a Model Context Protocol server at the API host (`/mcp`, Streamable HTTP; legacy SSE at `/mcp/sse`). Server name `sera`. Auth: bearer secret or the OAuth flow above. Five tools:

| Tool | Input | Effect |
|---|---|---|
| `ask_sera` | `{question}` | full Sera Q&A, answer plus sources |
| `search_memory` | `{query}` | raw search |
| `extract_content` | `{text, source_title?, source_date?, source_type?}` | extraction to draft records; long jobs return an async receipt |
| `save_document` | `{title, summary?, key_points?, category?, audience?, ...}` | writes one Knowledge Base record as Draft |
| `reprocess_content` | `{text, page_id?, source_date?}` | re-extract against an existing page |

Why this matters for you: **Maia can become an MCP client.** The Anthropic SDK supports MCP servers natively, so Maia could call `ask_sera` / `search_memory` as tools inside her existing loop, with her existing draft-queue discipline unchanged. That gives the game deep institutional memory without either side writing a custom protocol. Any admin's Claude.ai or Claude Code can also connect to the same server today.

## Inbound webhook

`POST /webhook/notion` receives Notion change events (HMAC-verified). Note: Notion edits do not trigger re-extraction (deliberate; write-loop risk).

## What does not exist yet (so you don't go looking)

- **No outbound webhooks or event push.** Today you would poll (`/backup`, Notion queries, or `/search`). If the integration needs push freshness, the honest answer is that we build an outbound webhook emitter following your own inbound-webhook conventions (shared secret header, fail-closed, JSON body with `source` and typed payload). It is the one piece of net-new Saberra infrastructure this integration clearly justifies, and it is small: our pipeline already funnels every write through one service, so there is a single choke point to emit from.
- **No entity-level REST resources** (`GET /tasks` etc.). The Notion API fills this role for now.
- **No per-user API keys.** Auth is per-tenant plus scoped tokens.

## Rate limits and budgets

- `/ask-stream` 20/min/IP; `/demo` 10/min/IP; transcription 5/min/IP.
- Notion API: ~3 req/s per integration token, queries are eventually consistent (a just-written page may not appear in a query for a few seconds).
- Sera questions have an optional monthly soft budget per tenant (never blocks; warns admins at 80%). AI cost is metered per source in the token ledger, so "questions asked from the game" would be visibly attributable and billable.
