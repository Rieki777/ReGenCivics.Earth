# Claude Code Build Prompt — The Harvest, Phase 4 (Self-Driving Layer)

Stage 5 of `BUILD_SEQUENCE_MASTER.md`. Source of truth: `CREATION_STATION_PLAN.md` v2 §5, §8, §10. Prereq: Harvest Phase 3 (Stage 4) is deployed, so the voice model has begun calibrating on real edits. This phase lets the feed drive itself, adds the weekly rhythm and the graph, and ships the hardened one-button email send.

Read first: `CLAUDE.md`, `STEERING.md`, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md` (Risk 3 and the send path), and the Resend usage already in the repo.

## Goal

The Harvest surfaces ripe work without being asked, resurfaces old ideas when they connect to new ones, proposes three articles each week, shows the idea graph, and can send a big announcement as an email behind a hard confirm gate. Auto-drive ships now, after the voice model has calibrated, so the first auto-drafts are good.

## Build items

### 1. Auto-drafting of top-confidence items
- Extend the generation worker: in addition to Develop-on-demand, auto-draft the top one to three highest-confidence ripe transitions per run (plan §1). Respect the per-run cap, draft one eager channel, and run the voice grader as the free pre-filter.
- Feed backpressure: if the ready feed already holds more than M items, pause auto-drafting until Rye clears some. A full feed means stop, not accelerate.

### 2. Resurfacing
- When a new capture clusters with an older ripe idea (shared themes above a threshold), resurface the older idea in the feed with a why-now that names the connection. Honor Snooze and Not this so a resurfaced idea Rye rejected stays down.

### 3. Weekly article digest
- A scheduled job (weekly) clusters the week's captures and proposes three articles, wired to the article assembly line, delivered into the feed and optionally summarized to Rye. This is closer to the real goal (essays), so keep it prominent.

### 4. Graph view
- A read-only view in /admin-create rendering the idea graph (themes as hubs, notes as nodes), mirroring the local command center's graph. Owner-gated.

### 5. Hardened one-button email send (plan §5)
- Only an edited-and-saved item can be sent, never a raw draft.
- Send returns a preview plus a signed confirm token bound to the exact body hash and recipient list. The actual send requires that token back; a re-render that does not match the hash is rejected. This stops an injected note from silently becoming an email.
- Hard caps via `rateLimited` (for example one send per ten minutes, three per day) and a cost circuit-breaker. An idempotency key so a double-click is a no-op.
- CAN-SPAM basics: unsubscribe link, postal address, honor the Resend suppression list.
- Log who, when, recipient count, and body hash. No recipient PII in plaintext. Persist the ai-vs-shipped version for audit.

### 6. Observability
- Surface `harvest_runs` health: last auto-draft run, last digest, last send. Warn if the worker stalls.

## Ship gate
```
python3 scripts/audit-truncation.py
pnpm typecheck
pnpm test   # auto-draft respects the cap and backpressure; resurfacing honors Snooze/Not this; email send requires a matching confirm token; caps and idempotency enforced; unedited draft cannot be sent
```
Per new className, grep it in client/src. Evidence column required.

## Handoff Breakdown — Who Does What

### YOU (Rye)
| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Provide the email list source and confirm the consent basis | Compliance and list ownership | Your ESP / Resend audience |
| 2 | Apply any migrations, verify, then push | VM cannot reach Railway MySQL | `run-migration.ts --all` then `--status` |
| 3 | Confirm the weekly digest schedule is enabled | Railway dashboard | Railway → service → Settings |
| 4 | Git push and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 5 | Send the first announcement yourself through the confirm gate | The send is yours alone to trigger | /admin-create newsletter item |

### CLAUDE CODE
| # | Task | Status |
|---|------|--------|
| 1 | Auto-draft with cap and backpressure | READY TO BUILD |
| 2 | Resurfacing with Snooze/Not this honored | READY TO BUILD |
| 3 | Weekly digest scheduled job wired to the assembly line | READY TO BUILD |
| 4 | Graph view in /admin-create | READY TO BUILD |
| 5 | Hardened email send: confirm token, caps, idempotency, CAN-SPAM, audit | READY TO BUILD |
| 6 | Observability on `harvest_runs` | READY TO BUILD |
| 7 | Tests per ship gate | READY TO BUILD |

### CLAUDE (Cowork)
| # | Task | Status |
|---|------|--------|
| 1 | Confirm the local graph render matches the command center, adjust the export if needed | READY TO BUILD |

### WAITING ON YOU
The email send is inert until your item 1 (list and consent) is settled. Everything else can build now.

## Remaining after this
- Stage 6, Harvest Phase 5 (compose to publish).
