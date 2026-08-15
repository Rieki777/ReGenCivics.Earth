# Claude Code Build Prompt — The Mycelium, M1 (Ontology + Worldview Pack + Agent Contract)

Source of truth: `HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md` §2 (M1) and the three Proposed ADRs in §3. Parent plan: `CREATION_STATION_PLAN.md` v2. This phase is independent of Harvest Phases 1 through 5: nothing here requires `quick_notes`, the bridge, or /admin-create to exist. It gives every server-side agent (elders, ship companions, ReGen Guide, admin assistant, future admin and outreach agents) one versioned source for Rye's voice, concepts, and positions.

Read first: `CLAUDE.md`, `STEERING.md` §1-6, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, `second-brain/AGENT GUIDE.md`, `second-brain/90 Voice Profile/Rye Voice Profile.md`, `.ai/docs/DOMAIN-LANGUAGE.md`. Mirror the token-gated webhook pattern in `archive/CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE1.md` item 5 (`timingSafeEqualStr`, `recordWebhookFailure`, fail closed, rate-limited both paths).

## Goal

Rye's worldview and voice become a versioned artifact any agent can load. The vault gains a concept and position ontology with provenance. A deterministic build compiles the Worldview Pack; a token-gated endpoint receives it into private R2; `server/lib/worldview.ts` serves it to every LLM surface, fail-soft. A machine-readable contract governs how agents read and write the vault.

## Build items

### 1. Vault ontology (Cowork, local, no deploy)
- Create `second-brain/08 Concepts/`, one note per load-bearing worldview concept. Frontmatter: `term`, `definition` (one to three sentences in Rye's words), `status: active | evolving | superseded`, `aliases: []`, `first_sources: []` (raw message ids from `_source_index.json`), `related: []`, `tags: [second-brain, concept]`. Seed pass: read the 11 theme MOCs, the Voice Profile, and `DOMAIN-LANGUAGE.md`; extract candidates (Infinite Game, the Two Games, Catalyst, the Great Work, best timeline, the 9 Roots of Capital, heaven and hell as timelines, one unified organism, network-owned, Regenerative Renaissance, and the rest); Rye reviews the list before notes are written. Product terms stay canonical in DOMAIN-LANGUAGE; concept notes link there instead of redefining.
- Create `second-brain/09 Positions/`, same schema plus `strength: core | held | exploratory` and `superseded_by` (empty default). Positions are stances Rye argues for, each grounded in `first_sources`.
- Update `AGENT GUIDE.md` folder conventions and append a change-log line.

### 2. Pack builder (Cowork, local) — `_pipeline/build_worldview_pack.py`
Deterministic, zero-token. Reads `08 Concepts`, `09 Positions`, `90 Voice Profile`, `07 Themes`. Emits `second-brain/_dist/worldview-pack/`:
- `manifest.json`: `schema_version`, semver `version`, `revision` (monotonic), `updated-on`, `source: maintainer`, counts, sha256 of each file.
- `voice.md` (rendered voice profile), `style_rules.json` (the five hard rules plus, once Harvest Phase 3 ships, top learned rules by weight), `concepts.json`, `positions.json` (active and evolving only; superseded excluded), `themes.json`.
- **Redaction gate**: refuse to build if any output contains a raw message body, an email address, a phone number, or a string matching the secret patterns used in the 2026-06-26 quarantine. Provenance ships as source ids only.
- `--validate-only` flag mirroring `chub build`.

### 3. Upload endpoint — `server/webhooks/worldview-upload.ts`
`POST /api/worldview/upload`, multipart or JSON body of the pack files, max size cap. Bearer token via `timingSafeEqualStr` against `ENV.worldviewUploadToken` (accept `ENV.worldviewUploadTokenNext` for rotation). On mismatch: `recordWebhookFailure(ip, 'worldview-upload')`, 401, fail closed in production, rate-limited both paths. Writes to a **private** R2 prefix (never the public assets prefix, never served by `/api/img`). Log path, ip, version, and byte count only. Reject a pack whose `revision` is not greater than the stored one.

### 4. Server loader — `server/lib/worldview.ts`
- `loadWorldviewPack()`: reads the private R2 object, verifies manifest hashes, caches in memory with a TTL, fail-soft (all getters return null and callers keep their current hardcoded behavior when no pack exists).
- Getters: `getVoiceProfile()`, `getStyleRules()`, `getConcept(termOrAlias)`, `getPositions()`, `getPackMeta()` (version, updated-on, for staleness display in admin).
- Wire ONE consumer in this phase as proof: the ReGen Guide's system prompt assembly prepends `voice.md` and `style_rules.json` when the pack is present. Elders, companions, and admin surfaces follow in later wiring passes (their persona files note the pack as a pending import; do not rewrite shipped persona logic in this phase).
- Pack content is server-side prompt material only. Never returned to the client. Treat pack text as trusted-curated but still wrap as source material, never as instructions that override system prompts.

### 5. Agent contract (Cowork, local)
`second-brain/contract.json`: `schema_version`, folder map with owner and write mode (`ingest-only`, `agent-editable`, `generated`, `human-only`), the single write path rule, append-only zones, supersession rule (mark, never delete), the untrusted-input stance, and the change-log obligation. Add a matching "Contract" section to `AGENT GUIDE.md`. `_pipeline/` scripts gain a startup check that warns when run against a vault whose `schema_version` is newer than they expect.

### 6. Repo tripwire (review R3)
A check in CI (extend an existing workflow) plus a note in `docs/GOLDEN_RULE.md`: fail if any staged or committed path begins with `second-brain/`. The vault is gitignored today; this catches the day the ignore file is edited carelessly.

### 7. Env vars (Rye sets in Railway)
`WORLDVIEW_UPLOAD_TOKEN`, `WORLDVIEW_UPLOAD_TOKEN_NEXT` (optional), `WORLDVIEW_R2_KEY_PREFIX`. Add to `.env.example` with comments, read in `server/_core/env.ts`. Loader and endpoint fail soft when unset.

## Ship gate (before any VERIFIED claim)
```
python3 scripts/audit-truncation.py
pnpm typecheck
pnpm test        # add: upload rejects bad token + stale revision; loader fail-soft when absent; hashes verified; Guide prompt includes voice.md when pack present
```
Per new className, grep it in client/src (this phase should add none). Evidence column required for each row.

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Review and bless the seeded concept and position lists before notes are written | It is your worldview; agents must not canonize guesses | Cowork shows you the candidate list |
| 2 | Confirm the name (the Mycelium, Worldview Pack) or rename | Naming is yours | Reply in session |
| 3 | Set `WORLDVIEW_UPLOAD_TOKEN` (+ `_NEXT`), `WORLDVIEW_R2_KEY_PREFIX` in Railway | Dashboard login | Railway → ReGenCivics.Earth → Variables. Token via `openssl rand -hex 32` |
| 4 | Accept the three Proposed ADRs (or amend), then they get appended to DECISIONS.md with real numbers | Load-bearing choices are yours | Review doc §3 |
| 5 | Git push to main and confirm the deploy | Claude Code cannot push or deploy | `/ship`, push, `pnpm railway:deploys` |
| 6 | Run the first pack build and upload after deploy | Needs your machine (the vault) plus the live endpoint and token | `python3 _pipeline/build_worldview_pack.py` then the upload step Cowork gives you |

### CLAUDE CODE — can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | `worldview-upload.ts` endpoint: token, caps, private R2, revision check, fail closed | READY TO BUILD |
| 2 | `server/lib/worldview.ts` loader with cache, hash verify, fail-soft getters | READY TO BUILD |
| 3 | Wire the ReGen Guide prompt assembly to the pack (fail-soft) | READY TO BUILD |
| 4 | Env reads + `.env.example` | READY TO BUILD |
| 5 | CI tripwire for `second-brain/` paths | READY TO BUILD |
| 6 | Tests per ship gate | READY TO BUILD |

### CLAUDE (Cowork) — local vault work, no deploy needed

| # | Task | Status |
|---|------|--------|
| 1 | Seed `08 Concepts` + `09 Positions` (after Rye's item 1) | READY TO BUILD |
| 2 | `build_worldview_pack.py` with the redaction gate + `--validate-only` | READY TO BUILD |
| 3 | `contract.json` + AGENT GUIDE contract section + change-log line | READY TO BUILD |
| 4 | Append DOMAIN-LANGUAGE entries (review doc §4) once Rye accepts | READY TO BUILD |
| 5 | Upload script (calls the live endpoint with the token) | BLOCKED until Rye items 3 and 5 |

### WAITING ON YOU
Cowork item 1 waits on your item 1. Cowork item 5 and your item 6 wait on your items 3 and 5. Everything else can start now.

## Remaining after this
- **M2** (`CLAUDE_CODE_PROMPT_2026-07-16_MYCELIUM_M2_RETRIEVAL_HYGIENE.md`): local retrieval, memory hygiene, consolidation report, encrypted backup.
- Wiring the elders, companions, and admin surfaces to the pack (follow-up pass; touches shipped persona code, so it gets its own small prompt and review).
- Harvest Phase 3's learned rules feeding `style_rules.json` at pack build.
