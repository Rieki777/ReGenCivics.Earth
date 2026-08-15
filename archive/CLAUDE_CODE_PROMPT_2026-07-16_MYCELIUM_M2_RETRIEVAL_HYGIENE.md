# Claude Code Build Prompt — The Mycelium, M2 (Local Retrieval + Memory Hygiene + Backup)

Source of truth: `HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md` §2 (M2) and Proposed ADRs N+1 and N+2 in §3. Prereq: M1's ontology folders and `contract.json` exist in the vault. Nothing in this phase deploys to the cloud; it is almost entirely local vault infrastructure, so the Claude Code column is small by design. The privacy rule of this phase: **no vault text is ever sent to a hosted model for indexing** (ADR-N+1).

Read first: `second-brain/AGENT GUIDE.md` (including the M1 contract section), `second-brain/contract.json`, `_pipeline/build_provenance.py` (reuse its note-to-source mapping), `STEERING.md` §7 (VM quirks: run these scripts on Rye's machine or a stable local environment, FUSE truncation risk applies to large index files).

## Goal

Any local agent can ask the vault a question and get ranked, sourced answers. The vault stays coherent as multiple agents write: contradictions are surfaced for Rye instead of accumulating silently, superseded ideas are retained as history and excluded from the pack, and the whole brain has an encrypted backup.

## Build items

### 1. Local embeddings index (Cowork) — `_pipeline/build_embeddings.py`
- Local embedding model only (a small sentence-transformers model, downloaded once, pinned by name and revision in the script). CPU is fine at this corpus size (~6k notes and messages).
- Chunk and embed: every note body (per note) and every `_source_index.json` message (per message). Store vectors plus metadata (path or source id, date, themes, bucket) in `_pipeline/_embeddings/` (gitignored with the vault; add the folder to the vault ignore conventions).
- Incremental: re-embed only changed files by content hash. `--rebuild` for a full pass. Never write partial index files (build to temp, atomic rename), per the FUSE truncation caution.

### 2. Query interface (Cowork) — `_pipeline/ask.py`
- `python3 ask.py "question" [--k 8] [--themes t1,t2] [--since 2025-01]` returns ranked chunks, each with: score, note path or source id, date, and the provenance chain (note → source ids) reusing `build_provenance.py`'s mapping. `--json` for agent consumption.
- Answers are retrieval only. Generation stays with whatever agent called it, which then quotes sources by id. This keeps the script deterministic and token-free.
- Document in AGENT GUIDE ("Ask the vault") and in `contract.json` as the sanctioned read interface for semantic queries.

### 3. Memory hygiene (Cowork)
- **Supersession**: `supersedes` / `superseded_by` frontmatter honored everywhere: `build_graph_and_dashboards.py` renders superseded notes dimmed in MOCs, `build_worldview_pack.py` (M1) already excludes them, `ask.py` down-ranks them and labels them `superseded` in results.
- **`last_affirmed`**: optional frontmatter date; when present, recency weight computes from it instead of the source date. Rye re-endorsing an old idea makes it current again.
- **`_pipeline/consolidate.py`**: a zero-token audit that writes `00 Inbox/Consolidation Report.md`: (a) contradiction candidates: position pairs sharing 2+ themes or aliases with opposing language, listed for human judgment, never auto-resolved; (b) orphan notes with no theme links; (c) stale high-weight items (high ripeness, untouched 90+ days); (d) alias collisions between `08 Concepts` and DOMAIN-LANGUAGE; (e) contract violations (files edited outside their folder's write mode since last run, via content hashes). Recommended cadence: run after each ingest batch, or weekly.

### 4. Encrypted backup (Cowork script, Rye runs)
`_pipeline/backup_vault.py`: tar the vault (excluding `_embeddings`, rebuildable), encrypt locally (age or GPG, key held by Rye alone), write `second-brain-backup-YYYY-MM-DD.tar.age` to a destination Rye chooses (external drive, or a private R2 path uploaded with the M1 token endpoint pattern). Encryption always happens before anything leaves the machine. Keep the last N backups, print a restore command. Document restore in AGENT GUIDE.

### 5. Claude Code column (small, all repo-side)
- If Rye chooses R2 as the backup destination: extend the M1 upload endpoint (or a sibling route) to accept the encrypted archive to a private prefix with a size cap and the same token. The server never holds the decryption key.
- Add `ask.py --json` output shape to `contract.json`'s documented interfaces (schema bump, minor).

## Ship gate (before any VERIFIED claim)
```
python3 scripts/audit-truncation.py          # repo side, if any repo files changed
pnpm typecheck                                # only if the backup route is built
# Vault side (Cowork provides evidence in the handoff table):
python3 _pipeline/build_embeddings.py && python3 _pipeline/ask.py "test question" --json   # returns ranked, sourced results
python3 _pipeline/consolidate.py             # report file written, sections present
```
Evidence column required for each row: command output paths, sample query results, report excerpt.

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Choose the backup destination (external drive, R2, or both) and generate the encryption key | Custody of the key is the whole design | `age-keygen` (Cowork gives the exact command); store the key outside the vault |
| 2 | Approve the pinned local embedding model (a one-time ~100MB download) | Your machine, your disk | Reply in session |
| 3 | Review the first Consolidation Report and rule on contradiction candidates | Only you know which position is current | `00 Inbox/Consolidation Report.md` |
| 4 | If R2 backup chosen: set the token env (reuse M1's) and push + deploy the backup route | Railway + git access | Standard ship flow |
| 5 | Run the first backup and confirm a test restore | Trust in a backup comes from one restore | `python3 _pipeline/backup_vault.py` then the restore command it prints |

### CLAUDE CODE — can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | Backup upload route (only if Rye picks R2), private prefix, size cap, token | BLOCKED on Rye item 1 |
| 2 | Contract schema bump for the ask interface | READY TO BUILD after Cowork item 2 |

### CLAUDE (Cowork) — local vault work

| # | Task | Status |
|---|------|--------|
| 1 | `build_embeddings.py`, incremental, atomic writes, pinned local model | READY TO BUILD after Rye item 2 |
| 2 | `ask.py` with provenance chain + `--json` | READY TO BUILD after item 1 |
| 3 | Supersession + `last_affirmed` honored across graph, pack, and ask | READY TO BUILD |
| 4 | `consolidate.py` + first report | READY TO BUILD |
| 5 | `backup_vault.py` with local encryption | READY TO BUILD after Rye item 1 |
| 6 | AGENT GUIDE + contract.json updates, change-log lines | READY TO BUILD |

### WAITING ON YOU
Cowork items 1 and 5 wait on your items 2 and 1. Claude Code item 1 waits on your destination choice. Everything else can start now.

## Remaining after this
- Optional cloud retrieval twin over the curated `source_index` rows only (post Harvest Phase 2), so The Harvest's provenance view gains semantic search. Local-only remains the rule for the full vault.
- Scheduled consolidation (a Cowork scheduled task) once the report format has settled.
