# Saberra Data Model

Everything Saberra knows lives in three stores: the client's Notion workspace (the memory itself, 26 databases), an operational Postgres (plumbing), and a platform Postgres (tenant registry). This doc covers all three, plus the trust tiers and the extraction output types, so you can decide what to read, what to mirror, and what to ignore.

## The trust gradient (read this first)

Every record in Saberra carries an implicit trust tier. Any integration must preserve it.

| Tier | Meaning | Examples |
|---|---|---|
| **Raw capture** | Verbatim source material, no interpretation | Source Emails, Meeting Assets, transcripts |
| **Extracted (unreviewed)** | Claude's structured reading of a source. Status is Draft / Candidate / Pending / Not Started | freshly created Tasks, Decision Candidates, Risks, KB articles, Canon Change Requests |
| **Human-confirmed** | A person reviewed, edited, or acted on it | approved decisions, assigned roles, resolved review-queue items |

This maps cleanly onto your `assistant_drafts` philosophy: AI proposes, humans consent. The two systems agree on this at the constitutional level, which is the main reason the integration is feasible at all.

## The 26 Notion databases

Grouped by function. "Upsert key" is how the worker dedupes.

### Capture layer (raw, high volume)

| DB | Purpose | Upsert key |
|---|---|---|
| Source Emails | Every ingested email: From/To/CC, subject, snippet, detected links, processing status, detected language | Message ID |
| Meetings | One record per real-world meeting: title, date, Meet/Calendar links, processing status, summary | Capture Key (calendar event ID, else meet code + date, else normalized title + organizer + date) |
| Meeting Assets | One record per asset (Recording / Transcript / Gemini Notes) with access status | Meeting + Asset Type |
| Messages | Operational emails with a Claude-extracted summary | Message ID |
| Processing Events | Audit log of every poll and extraction (Notion copy is trimmed; Postgres holds the full trail) | n/a (append) |

### People and structure (the overlap zone with Amora-Game)

| DB | Purpose | Key fields |
|---|---|---|
| Profiles | People and organizations: members, guests, partners, external contacts. Upsert by name through a participant resolver (alias map, fuzzy match, possible-duplicate tagging instead of silent merges) | Membership Type: Founding Member / Full Member / Associate Member / Guest / Steward / Partner |
| Circles | Governance circles | Circle Lead, Rep Steward (relations to Profiles) |
| Roles | Role cards | Role Name, related Circle |
| Role Assignments | Person to role links | Energization Level: Energized / Willing / Unwilling |
| Projects | Named initiatives | upsert by name |
| Interactions | CRM contact history, auto-logged on every processed email/meeting | relation to Profiles |

### Work and governance

| DB | Purpose | Notable fields |
|---|---|---|
| Tasks | Action items extracted from meetings/emails | assignee relation, status, Purpose Alignment (when the tenant's governing purpose is active) |
| Decision Candidates | Decisions detected in sources | Implementation Status (default Not Started), Implemented Date, Purpose Alignment |
| Risks | Flagged risks | auto Review Date (High = +30d, Medium = +90d); Status: Open / Acknowledged / Mitigated / Accepted / Closed; a Collapse Pattern taxonomy of seven community-failure modes (interpersonal conflict, no shared vision, poor governance, financial fragility, burnout, wrong people, scale trap) with relations to contributing decisions and tasks |
| Tensions | Named governance/operational gaps | |
| Commitments | Ongoing inter-party agreements | |
| Canon Change Requests | Proposed changes to community canon, always Pending Review | |
| CCOS Ledger Entries | Governance actions, Draft only | |
| Memory Review Queue | Memory candidates awaiting human review | |
| Sensitive Review | Admin-only, lives outside the main teamspace | |

### Community and knowledge

| DB | Purpose |
|---|---|
| Knowledge Base | Articles extracted as Draft for review; also the target of the `save_document` MCP tool |
| Policies | Active policies, read during extraction for conflict detection |
| Gratitudes | Appreciations between members detected in sources (no token value attached; see the source-of-truth discussion in doc 04 before wiring this to your Gratitude economy) |
| Events | Community gatherings (distinct from governance meetings) |
| Retrospectives | Structured end-of-cycle reviews |
| Resources | Shared commons and stewardship records |

Schema canon is code: `src/config/notionSchemas.ts` defines all 26 databases plus every cross-database relation, and a repair tool (`schema-doctor`) converges any live workspace onto it. So the schema you observe in Amora's workspace is reliable and identical across tenants.

## Extraction output types

One extraction pass over a transcript or email can emit any of these entity arrays, each mapped to one database above: decisions, tasks, risks, memory candidates, canon change candidates, sensitive flags, profile updates, project updates, circle updates, role updates, role assignment updates, ledger entries, KB articles, tensions, agreements (Commitments), gratitudes, events, retrospectives, resources, spend, metric updates, plus a single meeting summary. Each decision/task/risk also carries internal attention-signal fields (time sensitivity, reversibility, affected scope) used for significance scoring.

This list is effectively the menu of what Saberra could push to Amora-Game as draft proposals.

## Postgres: operational store (per tenant or pooled)

Not memory. The tables an integration might care about:

| Table | What it holds |
|---|---|
| `chat_thread_store` | Sera conversation threads per user (cross-device) |
| `user_preferences` | Sera's cross-session memory about a person |
| `tenant_name_aliases` | Learned nickname resolution ("Jess" = Jessica X), taught by Sera and by confirmed merges |
| `token_ledger`, `token_usage_by_source` | AI cost accounting per day per source |
| `processing_events`, `retry_queue`, `worker_heartbeat` | Pipeline health |
| `dashboard_users`, `dashboard_sessions`, `dashboard_invites` | Per-user dashboard auth (admin/member roles) |
| `user_gmail_tokens` | Per-user Google grants for Sera's send-email/calendar/Drive actions |
| `mcp_connection_tokens` | Revocable per-connector MCP credentials (minted by the OAuth flow) |
| `chat_feedback` | Thumbs up/down triage with AI-assisted root-cause analysis |
| `sera_stream_tokens`, `meet_ingest_tokens` | Short-lived scoped tokens so browsers never hold the master API secret |
| `semantic_embeddings` | Embedding cache for search |

## Postgres: platform registry

One row per tenant in a `tenants` table: name, plan, status, capture mode (imap / webhook / dual), capture address, Notion API key and the map of 26 database IDs, extraction settings (language, granularity, addendum, correction mode), governing purpose, API secret, URLs. Plus `tenant_health` (liveness telemetry) and `inbound_mail` (the SES capture queue). You will never touch this directly; it is what makes `POST /tenants/provision` a one-call client setup, which matters for the "42 land projects" conversation.

## Identity semantics (important for any join with `users` in Amora-Game)

- The natural join key between systems is **email**. Saberra Profiles usually carry an email (from senders/recipients/organizers); your `users.email` is unique.
- Saberra Profiles is a superset of your members: it includes external partners, guests, one-time meeting participants, and organizations. Do not assume every Profile maps to a game user.
- Names are unreliable join keys. Saberra maintains a per-tenant alias map precisely because "Jess" can be three people.
- **Confidential identities**: some Profiles are stable codenames for protected parties. They have no real email exposed anywhere in API output. An integration must tolerate profiles that will never join to a real account, and must never attempt to re-identify them.

## What is deliberately absent

No coordinates, parcels, or spatial data of any kind. No token/currency ledger with economic meaning (Gratitudes here are records of appreciation, not transferable value). No progression/stage system. No forum or messaging content store. Those are your domain, and doc 04 proposes keeping it that way.
