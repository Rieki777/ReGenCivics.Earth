# Integration Strategies and the Source-of-Truth Map

This is the core document. It maps both systems component by component, assigns a single source of truth to every overlapping entity, and proposes a phased architecture where each phase is independently valuable and small.

## The shape of the fit

Reading both codebases side by side, the systems are not actually competing products. They are two halves of one loop:

- **Amora-Game is the action layer**: where members show up, find quests, hold seats, earn recognition, RSVP, post, build the map. It is present-tense, member-facing, gamified, and consent-gated. Its data is *designed* (someone authored that quest, that seat, that structure).
- **Saberra is the memory layer**: it passively captures what actually happened (meetings, emails, transcripts), turns it into structured records, and makes it queryable through Sera. Its data is *observed* (nobody typed it in; it was extracted from real communication and awaits review).

The "competing single sources of truth" problem is real but narrow. Of the roughly 90 tables on your side and 26 databases on ours, the genuine collisions are five: **people, circles/roles (org chart), events, decisions, and gratitude**. Everything else is cleanly one-sided. The fix is not merging schemas; it is assigning ownership per component and syncing one direction only.

Both platforms also share the same constitutional rule, independently arrived at: **AI proposes, humans consent** (your `assistant_drafts` queue; our Draft/Candidate/Pending review queues). Every integration mechanism below preserves that rule at the boundary: nothing crosses systems as confirmed fact; everything crosses as a reviewable proposal.

## Source-of-truth matrix

"SoT" = the system where the record is created, edited, and authoritative. The other system may hold a read-only mirror, clearly marked as mirrored.

| Component | SoT | Rationale and sync direction |
|---|---|---|
| **Map, land, structures, zones** | Amora-Game | Saberra has no spatial model at all. No sync needed; optionally Saberra records (projects, resources) can carry your `structure_key` as a text property so Sera can answer "what happened at the Workshop." |
| **Quests, progression, stages, badges** | Amora-Game | Game-native concepts. Saberra never writes them. Saberra-extracted Tasks can be *offered* as quest candidates via your draft queue (Phase 2). |
| **Tokens, ledger, exchange, stays, library, commerce** | Amora-Game | Economic state with double-entry integrity. Saberra must never write here. |
| **Forum, feed, messaging** | Amora-Game | Conversation surfaces. Optionally a meeting summary can be posted as a forum thread via the draft queue, mirroring your existing call-synthesis flow. |
| **Org chart: circles, seats (org_roles), assignments, relations** | **Amora-Game** | The hard call, argued below. Your org chart is operational (drafts, publish, term dates, Peerdom-style relations, map addressing). Saberra's Circles/Roles/Role Assignments become a **mirror** so Sera can reason over them; extraction that detects org changes ("Maya stepped into the Land circle lead") is routed to your org-draft queue as a proposal instead of being written as fact on our side. |
| **Members (accounts, identity, stage, wallet)** | Amora-Game | `users` is authoritative for anyone who has an account. |
| **The wider people universe (external contacts, partners, orgs, CRM history)** | Saberra | Profiles + Interactions cover people who will never have a game account. Join key is email; game members appear in Profiles as a mirrored subset flagged as members. |
| **Meetings, transcripts, meeting assets** | **Saberra** | This is our core competence: capture, dedup (five emails about one meeting become one record), access management, extraction. Your Riverside recording pipeline can either continue in parallel or forward transcripts to Saberra ingest (Phase 3) so there is one meeting memory. |
| **Decisions (record of what was decided)** | Saberra | Decision Candidates with implementation tracking, extracted from real meetings. |
| **Decision-making process (proposals, votes, rule changes)** | Amora-Game + Hypha | Your mechanics_proposals to Hypha on-chain vote flow is the binding process. Saberra records the *outcome* as memory. Clean split: process there, record here. |
| **Tasks / action items from meetings** | Saberra | Extracted commitments ("Eric will fix the pump by Friday") with assignee and status. Distinct from quests (designed, reward-bearing). Bridge, not merge: a task can be promoted to a quest by a human in your admin, via the draft queue. |
| **Events (gatherings, RSVPs, capacity)** | Amora-Game | Your events module is operational (RSVPs, map placement, capacity). Saberra stops extracting into its own Events DB for Amora, or keeps it as a mirror; extraction that detects a planned gathering becomes an event *proposal* to your side. |
| **Gratitude** | Amora-Game (the economy); Saberra (the observation) | Your gratitude carries token value through a double-entry ledger; ours is an extracted observation ("X thanked Y in the meeting"). Never auto-credit tokens from AI extraction. Safe bridge: extracted gratitudes surface as one-tap suggestions in the game ("Sera noticed Nikita thanked you for the nursery work. Send gratitude?"), so the human act stays the economic event. |
| **Risks, tensions, commitments, retrospectives** | Saberra | No counterpart on your side; pure gain for the community. Surfaced in-game read-only if desired. |
| **Knowledge: canon, policies, KB** | Saberra | Deep memory with review queues. Your `village_brief` (the "village brain" Maia reads) stays as the local fast-context document, but can be *generated or refreshed from* Saberra canon rather than hand-maintained. |
| **Q&A over institutional memory** | Saberra (Sera) | Sera is the memory oracle. Maia remains the in-game persona and can delegate memory questions to Sera via MCP (Phase 1). One assistant the user sees; two engines behind it. |
| **Recognition of what the AI may do** | Both, unchanged | Each side keeps its own human-approval queue. Cross-system traffic always lands in the receiving side's queue. |

### Why the org chart belongs to Amora-Game

We considered the reverse (Saberra as org SoT, game mirrors it) and rejected it:

1. Your org model is richer where it matters operationally: seats with aim/domain/accountabilities, terms with end dates, documented (non-member) holders, typed relations (deputy, mentor, successor), reviewable org drafts, and map addressing. Ours is a flat Circles/Roles/Assignments triple designed for extraction, not administration.
2. Your org chart is already exported as a **signed, versioned, public, person-free document** (`/api/public/org.json` plus Markdown mirrors). That is a purpose-built sync source; we would be foolish not to consume it.
3. Members change the org through your UI with consent flows. Nobody should edit an org chart in Notion and hope it propagates.

What Saberra keeps: the *history and evidence* around the org chart. Who actually energized which role (extracted from meetings), role health over time, transition briefs when a seat changes hands. Mirror the structure, own the memory about it.

## Integration mechanisms available today (no new code)

1. **Email capture**: anything mailed or CC'd to the tenant capture address is ingested. Your Resend-based notifications could copy significant events (a published org draft, a closed cycle) into memory with zero API work.
2. **`POST /extract` and `POST /api/saberra-meet/ingest`**: push any text (a call transcript from Riverside, a decision thread from your forum) into the extraction pipeline.
3. **`POST /ask` / `/ask-stream`**: query Sera from your server (secret in your write-only secrets store, same pattern as Stripe).
4. **MCP**: Maia (or any admin's Claude) connects to Sera's MCP server and gains `ask_sera` / `search_memory` / `extract_content` / `save_document` as tools.
5. **Signed org export**: we consume `/.well-known/village.json` and `/api/public/org.json` to mirror structure into Notion. Person-level assignment data would need an authenticated route on your side (your public docs are deliberately person-free, and we respect that invariant).
6. **`GET /backup` / Notion API**: bulk or entity-level reads of everything Saberra holds.

## What would need to be built (small, and split fairly)

| Piece | Side | Size | Purpose |
|---|---|---|---|
| Outbound webhook emitter | Saberra | small (single write choke point exists) | push typed events (task created, decision detected, meeting processed, gratitude observed) with shared-secret header, fail-closed, following your existing inbound-webhook conventions |
| `POST /api/webhooks/saberra` | Amora-Game | small (clone of the Riverside webhook pattern) | receive those events, route them into `assistant_drafts` / org drafts / notification surfaces for human accept |
| Org mirror job | Saberra | small | scheduled pull of `org.json` (plus an authenticated holders route if you add one) into Notion Circles/Roles/Role Assignments, marked mirrored |
| Maia-to-Sera MCP client | Amora-Game | small-medium | register Sera's MCP tools in Maia's loop; answers cite Notion sources |
| "Ask the village memory" in-game panel | Amora-Game | medium, optional | direct member-facing Sera chat inside the game (proxied through your server with the member's role) |
| Transcript forwarding | Amora-Game | tiny | Riverside webhook handler additionally POSTs the transcript to Saberra ingest |

## Phased plan

**Phase 0 (this week, zero code): shared conventions.** Agree the source-of-truth matrix above. Agree email as the identity join key. Give your admins the Sera MCP connector so they can feel the memory layer from Claude while we build.

**Phase 1 (first real increment): memory becomes reachable from the game.** Maia gains Sera's MCP tools; Riverside transcripts forward to Saberra ingest; Saberra mirrors the org chart from your signed export. Result: one meeting pipeline, one memory, org-aware Sera, no UI changes on your side.

**Phase 2: the loop closes.** Saberra outbound webhooks plus your `/api/webhooks/saberra` receiver. Extracted tasks, decisions, gratitude observations, and meeting summaries appear in your draft queues as proposals. Members see meeting outcomes in the game without anyone touching Notion.

**Phase 3: productization.** In-game "village memory" panel; village_brief generated from canon; Saberra tenant provisioning offered to other ReGen villages (your fork plus our `POST /tenants/provision` makes "new village with map, game, and memory" a one-day setup). This is the joint offering for the other 41 land projects.

Each phase is useful alone, reversible, and requires no schema migration on either side.
