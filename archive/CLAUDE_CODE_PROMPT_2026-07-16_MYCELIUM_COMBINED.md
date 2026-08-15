# Claude Code Build Prompt — The Mycelium (M1 + M2), combined

One session, one build. This weaves the partner review and the two Mycelium prompts into a single ordered runway: the ontology, the Worldview Pack, the agent contract, local retrieval, memory hygiene, and the encrypted backup, plus the guardrail fixes the review flagged. Build Stage 1 then Stage 2. Everything here is decoupled from the Harvest phases and needs none of them to ship.

Source docs (read first, in this order):
- `HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md` (the review, §2 M1/M2 scope, §3 ADRs, §4 domain language, §5 rule check).
- `CLAUDE_CODE_PROMPT_2026-07-16_MYCELIUM_M1_WORLDVIEW_PACK.md` and `..._M2_RETRIEVAL_HYGIENE.md` (the two source prompts this consolidates).
- Repo: `CLAUDE.md`, `STEERING.md` §1-8, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, `.ai/docs/DOMAIN-LANGUAGE.md`, `.ai/docs/DECISIONS.md`.
- Vault: `second-brain/AGENT GUIDE.md`, `second-brain/90 Voice Profile/Rye Voice Profile.md`, `second-brain/_pipeline/build_provenance.py`.
- Context for consumers: `AGENTIC_FOUNDATIONS_RESEARCH_2026-07-16.md`, `server/lib/elders.ts`.

## The frame

The vault knows how Rye writes and what he has said. It does not yet formalize what Rye means and believes, and nothing outside his machine can load it. This build fixes both. It gives every server-side agent (AI Elders, ship companions, ReGen Guide, admin assistant, and the future admin and outreach agents) one versioned source for Rye's voice, concepts, and positions, plus a local retrieval and hygiene layer so the memory stays coherent as more agents read and write. Treat this as foundational memory infrastructure, not an app feature.

## Already fixed before this session (review R1, R3)

- The Harvest Phase 1 prompt has been restored to repo root. Its foundation (the `quick_notes` migration, `ownerProcedure`, `/api/harvest/*` bridge, `_pipeline/ingest_inbox.py`) does NOT exist yet. Harvest Phase 2 now carries a BLOCKED banner. Do not touch the Harvest phases in this session. They are a separate, parallel build.
- This session must NOT build Harvest anything. The Mycelium is independent by design.

## Decisions Rye confirms (gates, batched at the top)

1. Name: "the Mycelium" and "Worldview Pack", or rename. Placeholders until confirmed.
2. Accept the three Proposed ADRs below (§ADRs), or amend. On acceptance they append to `.ai/docs/DECISIONS.md` with real numbers.
3. Review flags to rule on: R2 (the redaction gate, built into M1 item 2), R3 (vault-in-repo: the CI tripwire is built here; moving the vault out of the repo is optional and Rye's call), R4 (backup, built in M2), R5 (voice rules live in four places today; the pack becomes the single source and the elder code consolidation is a later follow-up, never a silent change in this session).
4. M1 item 1 needs Rye to bless the seeded concept and position list before any notes are written.
5. M2 needs Rye to approve the pinned local embedding model and choose a backup destination and hold the encryption key.

---

# Stage 1 — M1: Ontology + Worldview Pack + Agent Contract

Goal: Rye's worldview and voice become a versioned artifact any agent can load. The vault gains a concept and position ontology with provenance. A deterministic build compiles the Worldview Pack. A token-gated endpoint receives it into private R2. `server/lib/worldview.ts` serves it to every LLM surface, fail-soft. A machine-readable contract governs vault reads and writes.

### 1. Vault ontology (Cowork, local, no deploy)
- Create `second-brain/08 Concepts/`, one note per load-bearing worldview concept. Frontmatter: `term`, `definition` (one to three sentences in Rye's words), `status: active | evolving | superseded`, `aliases: []`, `first_sources: []` (raw message ids from `_source_index.json`), `related: []`, `tags: [second-brain, concept]`. Seed pass: read the 11 theme MOCs, the Voice Profile, and `DOMAIN-LANGUAGE.md`; extract candidates (Infinite Game, the Two Games, Catalyst, the Great Work, best timeline, the 9 Roots of Capital, heaven and hell as timelines, one unified organism, network-owned, Regenerative Renaissance, and the rest). Rye reviews the candidate list before notes are written. Product terms stay canonical in `DOMAIN-LANGUAGE.md`; concept notes link there rather than redefining.
- Create `second-brain/09 Positions/`, same schema plus `strength: core | held | exploratory` and `superseded_by` (empty default). Positions are stances Rye argues for, each grounded in `first_sources`.
- Update `AGENT GUIDE.md` folder conventions and append a change-log line.

### 2. Pack builder (Cowork, local) — `_pipeline/build_worldview_pack.py`
Deterministic, zero-token. Reads `08 Concepts`, `09 Positions`, `90 Voice Profile`, `07 Themes`. Emits `second-brain/_dist/worldview-pack/`:
- `manifest.json`: `schema_version`, semver `version`, `revision` (monotonic), `updated-on`, `source: maintainer`, counts, sha256 of each file.
- `voice.md` (rendered voice profile), `style_rules.json` (the five hard rules, plus top learned rules by weight once Harvest Phase 3 ships), `concepts.json`, `positions.json` (active and evolving only, superseded excluded), `themes.json`.
- Redaction gate (review R2): refuse to build if any output contains a raw message body, an email address, a phone number, or a string matching the secret patterns from the 2026-06-26 quarantine. Provenance ships as source ids only.
- `--validate-only` flag.

### 3. Upload endpoint — `server/webhooks/worldview-upload.ts`
`POST /api/worldview/upload`, multipart or JSON body of the pack files, max size cap. Bearer token via `timingSafeEqualStr` against `ENV.worldviewUploadToken` (accept `ENV.worldviewUploadTokenNext` for rotation). On mismatch: `recordWebhookFailure(ip, 'worldview-upload')`, 401, fail closed in production, rate-limited both paths. Writes to a private R2 prefix (never the public assets prefix, never served by `/api/img`). Log path, ip, version, byte count only. Reject a pack whose `revision` is not greater than the stored one.

### 4. Server loader — `server/lib/worldview.ts`
- `loadWorldviewPack()`: reads the private R2 object, verifies manifest hashes, caches in memory with a TTL, fail-soft (all getters return null and callers keep current hardcoded behavior when no pack exists).
- Getters: `getVoiceProfile()`, `getStyleRules()`, `getConcept(termOrAlias)`, `getPositions()`, `getPackMeta()` (version, updated-on, for staleness display in admin).
- Wire ONE consumer this phase as proof: the ReGen Guide system prompt prepends `voice.md` and `style_rules.json` when the pack is present. Elders, companions, and admin surfaces follow in a later wiring pass; do not rewrite shipped persona logic now (their persona files may note the pack as a pending import).
- Pack content is server-side prompt material only, never returned to the client. Treat pack text as trusted-curated but still wrapped as source material, never instructions that override system prompts.

### 5. Agent contract (Cowork, local)
`second-brain/contract.json`: `schema_version`, folder map with owner and write mode (`ingest-only`, `agent-editable`, `generated`, `human-only`), the single write path rule, append-only zones, supersession rule (mark, never delete), the untrusted-input stance, and the change-log obligation. Add a matching "Contract" section to `AGENT GUIDE.md`. `_pipeline/` scripts gain a startup check that warns when run against a vault whose `schema_version` is newer than expected.

### 6. Repo tripwire (review R3)
A CI check (extend an existing workflow) plus a note in `docs/GOLDEN_RULE.md`: fail if any staged or committed path begins with `second-brain/`. The vault is gitignored today; this catches the day the ignore file is edited carelessly.

### 7. Env vars (Rye sets in Railway)
`WORLDVIEW_UPLOAD_TOKEN`, `WORLDVIEW_UPLOAD_TOKEN_NEXT` (optional), `WORLDVIEW_R2_KEY_PREFIX`. Add to `.env.example` with comments, read in `server/_core/env.ts`. Loader and endpoint fail soft when unset.

---

# Stage 2 — M2: Local Retrieval + Memory Hygiene + Backup

Prereq: Stage 1's ontology folders and `contract.json` exist. Almost entirely local vault infrastructure, so the Claude Code column is small. The privacy rule of this stage: no vault text is ever sent to a hosted model for indexing (ADR-N+1). Run these scripts on Rye's machine or a stable local environment; heed the FUSE truncation risk on large index files (STEERING §7): build to temp, atomic rename, never write partial index files.

### 1. Local embeddings index (Cowork) — `_pipeline/build_embeddings.py`
- Local embedding model only (a small sentence-transformers model, downloaded once, pinned by name and revision in the script). CPU is fine at this corpus size (~6k notes and messages).
- Chunk and embed every note body (per note) and every `_source_index.json` message (per message). Store vectors plus metadata (path or source id, date, themes, bucket) in `_pipeline/_embeddings/` (gitignored with the vault; add to the vault ignore conventions).
- Incremental: re-embed only changed files by content hash. `--rebuild` for a full pass. Atomic writes only.

### 2. Query interface (Cowork) — `_pipeline/ask.py`
- `python3 ask.py "question" [--k 8] [--themes t1,t2] [--since 2025-01]` returns ranked chunks, each with score, note path or source id, date, and the provenance chain (note to source ids) reusing `build_provenance.py`'s mapping. `--json` for agent consumption.
- Retrieval only. Generation stays with whatever agent called it, which then quotes sources by id. Deterministic and token-free.
- Document in `AGENT GUIDE.md` ("Ask the vault") and in `contract.json` as the sanctioned semantic read interface.

### 3. Memory hygiene (Cowork)
- Supersession: `supersedes` / `superseded_by` frontmatter honored everywhere. `build_graph_and_dashboards.py` renders superseded notes dimmed in MOCs; `build_worldview_pack.py` already excludes them; `ask.py` down-ranks and labels them `superseded`.
- `last_affirmed`: optional frontmatter date; when present, recency weight computes from it instead of the source date. Rye re-endorsing an old idea makes it current again.
- `_pipeline/consolidate.py`: a zero-token audit writing `00 Inbox/Consolidation Report.md`: (a) contradiction candidates (position pairs sharing 2+ themes or aliases with opposing language, for human judgment, never auto-resolved); (b) orphan notes with no theme links; (c) stale high-weight items (high ripeness, untouched 90+ days); (d) alias collisions between `08 Concepts` and `DOMAIN-LANGUAGE.md`; (e) contract violations (files edited outside their folder's write mode since last run, via content hashes). Cadence: after each ingest batch, or weekly.

### 4. Encrypted backup (Cowork script, Rye runs) — `_pipeline/backup_vault.py`
Tar the vault (excluding `_embeddings`, rebuildable), encrypt locally (age or GPG, key held by Rye alone), write `second-brain-backup-YYYY-MM-DD.tar.age` to a destination Rye chooses (external drive, or a private R2 path via the M1 token endpoint pattern). Encryption always happens before anything leaves the machine. Keep the last N backups, print a restore command. Document restore in `AGENT GUIDE.md`.

### 5. Claude Code column for M2 (small, repo-side)
- If Rye picks R2 as the backup destination: extend the M1 upload endpoint (or a sibling route) to accept the encrypted archive to a private prefix with a size cap and the same token. The server never holds the decryption key.
- Add `ask.py --json` output shape to `contract.json`'s documented interfaces (schema bump, minor).

---

## How this connects to the Harvest phases (do not build them here, just honor these seams)

- When Harvest Phase 2's generation worker is built, its drafting loads the Worldview Pack via `server/lib/worldview.ts` (`getVoiceProfile`, `getStyleRules`) instead of a raw profile snapshot.
- When Harvest Phase 3 ships, its learned `voice_rules` feed `style_rules.json` at pack build, giving learned rules versioning and distribution for free.
- The Harvest curated `source_index` mirror can later gain a cloud retrieval twin over curated rows only; the full-vault rule stays local-only (ADR-N+1).

## Combined ship gate (before any VERIFIED claim)
```
python3 scripts/audit-truncation.py                 # repo side
pnpm typecheck                                       # endpoints + loader + backup route
pnpm test    # M1: upload rejects bad token + stale revision; loader fail-soft when absent; hashes verified; Guide prompt includes voice.md when pack present. M2: backup route token + size cap if built; contract schema bump.
# Vault side (Cowork provides evidence):
python3 _pipeline/build_worldview_pack.py --validate-only    # redaction gate passes, no raw bodies/PII in outputs
python3 _pipeline/build_embeddings.py && python3 _pipeline/ask.py "test question" --json   # ranked, sourced results
python3 _pipeline/consolidate.py                              # report written, all sections present
```
Per new className, grep it in client/src (this build should add none). Evidence column required for every row.

## Consolidated Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do (ordered)
| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Confirm the names (the Mycelium, Worldview Pack) or rename | Naming is yours | Reply in session |
| 2 | Bless the seeded concept and position lists before notes are written | It is your worldview; agents must not canonize guesses | Cowork shows the candidate list |
| 3 | Accept the three Proposed ADRs (or amend) | Load-bearing choices are yours | Review doc §3, appended on acceptance |
| 4 | Approve the pinned local embedding model (~100MB one-time download) | Your machine, your disk | Reply in session |
| 5 | Choose backup destination and generate the encryption key | Custody of the key is the whole design | `age-keygen` (Cowork gives the command); store the key outside the vault |
| 6 | Set `WORLDVIEW_UPLOAD_TOKEN` (+ `_NEXT`), `WORLDVIEW_R2_KEY_PREFIX` in Railway | Dashboard login | Railway → ReGenCivics.Earth → Variables. Token via `openssl rand -hex 32` |
| 7 | Git push to main and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 8 | Run the first pack build and upload after deploy | Needs your machine plus the live endpoint and token | `python3 _pipeline/build_worldview_pack.py` then the upload step Cowork provides |
| 9 | Review the first Consolidation Report and rule on contradictions | Only you know which position is current | `00 Inbox/Consolidation Report.md` |
| 10 | Run the first backup and confirm a test restore | Trust in a backup comes from one restore | `python3 _pipeline/backup_vault.py` then the printed restore command |

### CLAUDE CODE — can be done without Rye
| # | Task | Stage | Status |
|---|------|-------|--------|
| 1 | `worldview-upload.ts`: token, caps, private R2, revision check, fail closed, rate-limited | M1 | READY |
| 2 | `server/lib/worldview.ts` loader: cache, hash verify, fail-soft getters | M1 | READY |
| 3 | Wire the ReGen Guide prompt to the pack (fail-soft) | M1 | READY |
| 4 | Env reads + `.env.example` (worldview vars) | M1 | READY |
| 5 | CI tripwire for `second-brain/` paths + `GOLDEN_RULE.md` note | M1 | READY |
| 6 | M1 tests per ship gate | M1 | READY |
| 7 | Backup upload route (only if Rye picks R2), private prefix, size cap, token | M2 | BLOCKED on Rye #5 |
| 8 | `contract.json` schema bump for the ask interface | M2 | READY after Cowork ask.py |

### CLAUDE (Cowork) — local vault work, no deploy
| # | Task | Stage | Status |
|---|------|-------|--------|
| 1 | Seed `08 Concepts` + `09 Positions` (after Rye #2) | M1 | READY |
| 2 | `build_worldview_pack.py` + redaction gate + `--validate-only` | M1 | READY |
| 3 | `contract.json` + AGENT GUIDE contract section + change-log | M1 | READY |
| 4 | Append DOMAIN-LANGUAGE entries (review §4) once Rye accepts | M1 | READY |
| 5 | Upload script (calls the live endpoint with the token) | M1 | BLOCKED on Rye #6, #7 |
| 6 | `build_embeddings.py`, incremental, atomic writes, pinned local model | M2 | READY after Rye #4 |
| 7 | `ask.py` with provenance chain + `--json` | M2 | READY after Cowork #6 |
| 8 | Supersession + `last_affirmed` honored across graph, pack, ask | M2 | READY |
| 9 | `consolidate.py` + first report | M2 | READY |
| 10 | `backup_vault.py` with local encryption | M2 | READY after Rye #5 |
| 11 | AGENT GUIDE + contract.json updates, change-log lines | M2 | READY |

### WAITING ON YOU
Cowork M1 #1 waits on Rye #2. Cowork M1 #5 and Rye #8 wait on Rye #6 and #7. Cowork M2 #6 waits on Rye #4. Cowork M2 #10 and Claude Code #7 wait on Rye #5. Everything else can start now.

## ADR texts to append to `.ai/docs/DECISIONS.md` on acceptance (numbers assigned at append)

### ADR-N: The Worldview Pack is the distribution unit for Rye's voice, concepts, and positions
Status: Proposed. Context: server-side agents (elders, companions, Guide, admin assistant) each hardcode fragments of voice and worldview; the vault holds the real thing and is unreachable from production; hard writing rules exist in four places and will drift. Decision: a versioned, curated, redaction-gated bundle (`manifest.json` with semver + revision + updated-on, `voice.md`, `concepts.json`, `positions.json`, `style_rules.json`) built deterministically from the vault, uploaded to a private R2 path via a token-gated endpoint, loaded server-side through `server/lib/worldview.ts` (cached, fail-soft, never client-exposed). Raw sources never enter the pack; provenance travels as ids resolvable only locally. Why: one source of truth, versioned like code, loadable by any agent, honest about the privacy boundary. Trade-offs: a build-and-upload step Rye runs or schedules; a stale pack is possible, so the manifest carries `updated-on` and consumers may surface staleness. Code refs: `second-brain/_pipeline/build_worldview_pack.py`, `server/lib/worldview.ts`, `server/webhooks/worldview-upload.ts`.

### ADR-N+1: Vault retrieval uses local embeddings only
Status: Proposed. Context: semantic retrieval requires embedding note and message text; hosted embedding APIs receive that text in the clear, crossing the private-first boundary for exactly the content the boundary protects. Decision: vault embeddings are computed by a local model on Rye's machine; the index lives in the vault (gitignored); no vault text is sent to any hosted model for indexing. Hosted models remain fine for generation over curated excerpts an agent already loaded. Why: the boundary holds; local retrieval quality is sufficient for a personal corpus this size. Trade-offs: a one-time local model download; slightly weaker embeddings than frontier hosted; index rebuild is local CPU time. Code refs: `_pipeline/build_embeddings.py`, `_pipeline/ask.py`.

### ADR-N+2: One write path into the vault, supersession over deletion
Status: Proposed. Context: multiple agents will read and write memory; unconstrained writes produce silent contradiction and lost history. Decision: all new material enters through `00 Inbox` + append-only ingest; agents edit directly only in folders the contract assigns them; derived views (MOCs, dashboards, pack) are always regenerated; superseded ideas are marked (`superseded_by`) and retained, never deleted by an agent; every structural change appends to the AGENT GUIDE change log with the agent's name. `contract.json` states this machine-readably. Why: preserves provenance and history, makes conflicts visible, gives every agent one protocol. Trade-offs: slightly more ceremony per write; a misbehaving agent can still violate convention, so `consolidate.py` audits for it. Code refs: `second-brain/contract.json`, `_pipeline/ingest_inbox.py`, `_pipeline/consolidate.py`.

## Domain language entries to append to `.ai/docs/DOMAIN-LANGUAGE.md` on acceptance
- The Mycelium: the memory-and-worldview layer of the second brain (ontology, Worldview Pack, local retrieval, hygiene contract). Name is Rye's to confirm.
- Worldview Pack: the versioned, curated, redaction-gated bundle of Rye's voice, concepts, positions, and style rules, built from the vault and loaded by every agent surface via `server/lib/worldview.ts`. Never contains raw sources.
- Agent contract: `second-brain/contract.json` plus its AGENT GUIDE section, the machine-readable rules for how any agent reads and writes vault memory.
- Supersession: marking an idea or position replaced (`superseded_by`) while retaining it as history. Agents never delete worldview content.

## Remaining after this session
- Harvest Phase 1 (capture + bridge), then Phase 2, 3, 5, via their own prompts in root. Phase 2 is BLOCKED until Phase 1 ships.
- Wiring elders, companions, and admin surfaces to the pack (a follow-up pass; touches shipped persona code in `server/lib/elders.ts`, so it gets its own small prompt and review, per review R5).
- Optional cloud retrieval twin over curated `source_index` rows only, after Harvest Phase 2.
- Scheduled consolidation as a Cowork task once the report format settles.
