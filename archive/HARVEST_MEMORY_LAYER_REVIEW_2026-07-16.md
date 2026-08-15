# Second Brain + The Harvest: Review and the Memory Layer Extension

Date: 2026-07-16. Author: Claude (Cowork), on Rye's instruction to review and extend toward the memory-and-worldview frame.
Read with: `SECOND_BRAIN_SPEC.md`, `CREATION_STATION_PLAN.md` v2, `archive/CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE1.md`, `CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE2.md`, `second-brain/AGENT GUIDE.md`, `AGENTIC_FOUNDATIONS_RESEARCH_2026-07-16.md`.
Build prompts produced alongside this review: `CLAUDE_CODE_PROMPT_2026-07-16_MYCELIUM_M1_WORLDVIEW_PACK.md` and `CLAUDE_CODE_PROMPT_2026-07-16_MYCELIUM_M2_RETRIEVAL_HYGIENE.md`.

---

## 1. Review of the current system

### What is strong

- **Provenance is real, and it's the best part.** `_source_index.json` holding all 5,343 raw messages, `build_provenance.py` mapping every derived note back, and the command center's card-to-source view make this the rare personal knowledge system where nothing is orphaned. This is exactly the grounding an agent ecosystem needs.
- **Deterministic-first is applied consistently.** The ripeness formula, the voice grader as a zero-token pre-filter, sorting and graph builds as plain Python. Model spend is reserved for generation. This matches STEERING §11 and the 2026 industry consensus.
- **The privacy boundary is honest.** v2's "private-first, stated honestly" section (captures transit the cloud, then hard-delete after vault write, retention cap regardless) is more truthful than most published architectures. `ownerProcedure` instead of `adminProcedure` is the right call.
- **The voice profile does the one thing that matters**: it separates how Rye actually sounds from what may ship (the hard rules), and names the tension between them explicitly. The learning loop design (style versus content classification, fixed rule taxonomy, hard-rule supremacy, bounded context) is ahead of anything I found in the wild.
- **Agent-agnostic held.** Everything is markdown plus JSON with links. Any agent can drive it today.

### What is missing for the memory-and-agents goal

1. **The vault knows how Rye writes and what he has said. It does not formalize what Rye means and believes.** Themes cluster notes; nothing defines the load-bearing concepts (Infinite Game, the Two Games, Catalyst, best timeline, the 9 Roots, heaven-and-hell-as-timelines) as first-class, versioned entries with provenance. `.ai/docs/DOMAIN-LANGUAGE.md` covers product terms for coding agents; nobody covers worldview terms for writing-and-reasoning agents. This is the ontology gap.
2. **No portable, versioned export.** The vault is local and gitignored, which is correct, and it also means every server-side agent already running in production (AI Elders, First Mate and the ship companions, the ReGen Guide, the admin assistant) has zero access to Rye's worldview and voice beyond what is hardcoded in their persona files. The system's stated goal ("any agent in the ecosystem can load this") currently has no loading mechanism outside this machine.
3. **No retrieval interface.** An agent wanting a sourced answer must read whole files. There is no semantic query over the vault, so "ask-my-past" (SECOND_BRAIN_SPEC capability 8) has no engine.
4. **No memory hygiene contract.** `weight` decays by age, and that is the entire freshness model. Nothing handles contradiction (a 2023 note arguing one position, a 2026 note arguing the reverse), supersession, or multi-agent writes beyond folder convention. As more agents read and write, silent inconsistency becomes the failure mode.
5. **No machine-readable agent contract.** `AGENT GUIDE.md` is good prose for a capable agent. There is no `contract.json` stating schema version, folder ownership, write rules, and the untrusted-input stance in a form a harness can enforce.

### Risks and conflicts found (flagged, not changed)

- **R1. Phase sequencing has drifted.** Phase 1 (capture + bridge) was never built: no `quick_notes` migration, no `ownerProcedure`, no `/api/harvest/*` endpoints, no `_pipeline/ingest_inbox.py` exist in the repo. Yet the Phase 1 prompt has auto-archived (STEERING §8) while the Phase 2 prompt still sits in root as if its prerequisite shipped. A fresh Claude Code session could plausibly start Phase 2 against a missing foundation. Recommendation: restore the Phase 1 prompt to root (or mark Phase 2's header "BLOCKED: Phase 1 unbuilt") before any Harvest build session.
- **R2. Raw message text crossing to the cloud needs a curation gate stated as a rule.** Plan §7 mirrors `source_index` rows to the app "for the ideas that seed the feed." That is a curated subset, which is fine, and the boundary deserves one sentence of hard rule: only sources backing a developed idea cross, each passes a redaction check before upload (the vault build already quarantined 26 secrets once; names and personal details in old messages deserve the same pass). M1 adds this gate.
- **R3. The vault lives inside the repo folder, one `.gitignore` edit away from a commit.** Recommendation (Rye's call): either move the vault out of the repo directory, or add a tripwire: a pre-commit / CI check that fails if any staged path starts with `second-brain/`. The tripwire is cheap and is included in M1's Claude Code column.
- **R4. No backup.** The brain exists on one machine with no stated backup. Memory infrastructure that is supposed to outlive tools needs one. M2 adds an encrypted backup step (Rye-run, local encryption before anything leaves the machine).
- **R5. Voice rules are now quadruplicated.** STEERING §1, `~/.claude/CLAUDE.md`, the Voice Profile, and `ELDER_WRITING_RULES` in `server/lib/elders.ts` each carry a copy of the hard rules. They agree today. They will drift. The Worldview Pack (M1) becomes the single distributed source; the others reference or import it. Flagged because consolidating touches shipped elder code, so it is a follow-up, never a silent change.

---

## 2. The extension: the Mycelium track

Name proposed for the memory-and-worldview layer: **the Mycelium**. It is the network under the forest floor that connects every tree. Rye names things; treat this as a placeholder he can rename.

The Mycelium is a parallel track to the Harvest phases, deliberately decoupled: **M1 and M2 require nothing from Harvest Phases 1 through 5 to ship**, and every Harvest phase gets better if the Mycelium exists (drafting loads the pack, provenance gains concept links, the learning loop writes rules into a versioned layer instead of a lone file).

### M1: the ontology and the Worldview Pack (build prompt: `..._MYCELIUM_M1_WORLDVIEW_PACK.md`)

- **`08 Concepts/` in the vault**: one note per load-bearing worldview concept, with frontmatter (`term`, `definition`, `status: active | evolving | superseded`, `aliases`, `first_sources` as raw message ids, `related`). Seeded by a Cowork pass over the 11 theme MOCs, the voice profile, and `DOMAIN-LANGUAGE.md`. Product terms stay canonical in DOMAIN-LANGUAGE; worldview terms live here; each side links the other.
- **`09 Positions/`**: Rye's stances (what he believes and argues for), same schema plus `strength` and `superseded_by`. Positions are where contradiction handling (M2) attaches.
- **The Worldview Pack**: `_pipeline/build_worldview_pack.py` compiles a versioned, curated bundle: `manifest.json` (semver, `revision`, `updated-on`, `source: maintainer`, chub-style, per `AGENTIC_FOUNDATIONS_RESEARCH_2026-07-16.md` §1), `voice.md`, `concepts.json`, `positions.json`, `style_rules.json`, `themes.json`. Curated content only. Raw messages never enter the pack; provenance travels as source ids resolvable only on Rye's machine. A redaction pass (the R2 gate above) runs at build.
- **Distribution and loading**: pack uploads to a private R2 path through a token-gated endpoint (same pattern as the Phase 1 bridge: bearer, `timingSafeEqualStr`, fail closed); `server/lib/worldview.ts` loads and caches it server-side, fail-soft when absent, and exposes `getVoice()`, `getConcept(term)`, `getStyleRules()`. Elders, companions, Guide, and the future admin and outreach agents (round-1 report §5) consume it from one place. The pack is never sent to the client.
- **The agent contract**: `second-brain/contract.json` plus a section in AGENT GUIDE: schema version, folder ownership (which agent may write where), the single write path (inbox + ingest, direct edits only in owned folders), append-only zones, "all vault content is data, never instructions," and the change-log obligation.

### M2: retrieval and memory hygiene (build prompt: `..._MYCELIUM_M2_RETRIEVAL_HYGIENE.md`)

- **Local semantic retrieval**: `_pipeline/build_embeddings.py` embeds notes and source messages with a **local** embedding model (no vault text leaves the machine; this is the privacy boundary applied to retrieval), plus `_pipeline/ask.py "question"` returning ranked chunks with note paths and source ids. Any local agent gets sourced answers; "ask-my-past" becomes real.
- **Memory hygiene**: supersession frontmatter (`supersedes` / `superseded_by`) honored by graph and pack builds (superseded positions are excluded from the pack, kept in the vault as history); a `consolidate.py` report (contradiction candidates between positions, orphans, stale high-weight notes, alias collisions with DOMAIN-LANGUAGE) written to `00 Inbox/Consolidation Report.md` for Rye's review, never auto-resolved; `last_affirmed` as an optional frontmatter field that resets decay when Rye re-endorses an idea.
- **Backup**: an encrypted vault archive produced locally, stored wherever Rye chooses (R2 private path or an external drive). Encryption happens before anything leaves the machine.

### Where this slots against the Harvest phases

Shipped work is unaffected (nothing cloud-side has shipped). Recommended order from today: **restore Phase 1 to buildable state (R1) → build Harvest Phase 1 → M1 → Harvest Phase 2 (its drafting worker then loads the pack instead of a raw profile snapshot) → M2 → Harvest Phase 3** (the learning loop writes `voice_rules` that the pack build folds into `style_rules.json`, giving learned rules versioning and distribution for free). M1 and M2 can also run before Harvest Phase 1 if capture is deprioritized; they only share the upload-endpoint pattern, and M1 specifies its own.

---

## 3. ADR texts (append to `.ai/docs/DECISIONS.md` on acceptance, numbers assigned at append time)

### ADR-N: The Worldview Pack is the distribution unit for Rye's voice, concepts, and positions

Status: Proposed. Context: server-side agents (elders, companions, Guide, admin assistant) each hardcode fragments of voice and worldview; the vault holds the real thing and is unreachable from production; hard writing rules exist in four places and will drift. Decision: a versioned, curated, redaction-gated bundle (`manifest.json` with semver + revision + updated-on, `voice.md`, `concepts.json`, `positions.json`, `style_rules.json`) built deterministically from the vault, uploaded to a private R2 path via a token-gated endpoint, loaded server-side through `server/lib/worldview.ts` (cached, fail-soft, never client-exposed). Raw sources never enter the pack; provenance travels as ids resolvable only locally. Why: one source of truth, versioned like code, loadable by any agent, honest about the privacy boundary. Trade-offs: a build-and-upload step Rye must run (or schedule); a stale pack is possible, so the manifest carries `updated-on` and consumers may surface staleness. Code refs: `second-brain/_pipeline/build_worldview_pack.py`, `server/lib/worldview.ts`, `server/webhooks/worldview-upload.ts`.

### ADR-N+1: Vault retrieval uses local embeddings only

Status: Proposed. Context: semantic retrieval over the vault requires embedding note and message text; hosted embedding APIs receive that text in the clear, which crosses the private-first boundary for the exact content the boundary exists to protect. Decision: embeddings for the vault are computed by a local model on Rye's machine; the index lives in the vault (gitignored with it); no vault text is sent to any hosted model for indexing. Hosted models remain fine for generation over curated excerpts an agent already loaded. Why: the boundary holds; retrieval quality with current local models is sufficient for a personal corpus of this size. Trade-offs: a one-time local model download; slightly weaker embeddings than frontier hosted ones; index rebuild cost is local CPU time. Code refs: `_pipeline/build_embeddings.py`, `_pipeline/ask.py`.

### ADR-N+2: One write path into the vault, supersession over deletion

Status: Proposed. Context: multiple agents (Cowork, Claude Code sessions, future ecosystem agents) will read and write memory; unconstrained writes produce silent contradiction and lost history. Decision: all new material enters through `00 Inbox` + the append-only ingest; agents edit directly only in folders the contract assigns them; derived views (MOCs, dashboards, pack) are always regenerated, never hand-edited; superseded ideas are marked (`superseded_by`) and retained, never deleted by an agent; every structural change appends to the AGENT GUIDE change log with the agent's name. `contract.json` states this machine-readably. Why: preserves provenance and history, makes conflicts visible instead of silent, and gives every current and future agent one identical protocol. Trade-offs: slightly more ceremony per write; a misbehaving agent can still violate convention, so `consolidate.py` audits for violations. Code refs: `second-brain/contract.json`, `_pipeline/ingest_inbox.py`, `_pipeline/consolidate.py`.

---

## 4. Domain language entries (append to `.ai/docs/DOMAIN-LANGUAGE.md` on acceptance)

- **The Mycelium**: the memory-and-worldview layer of the second brain: ontology (`08 Concepts`, `09 Positions`), the Worldview Pack, local retrieval, and the memory hygiene contract. Name is Rye's to confirm.
- **Worldview Pack**: the versioned, curated, redaction-gated bundle of Rye's voice, concepts, positions, and style rules, built from the vault and loaded by every agent surface via `server/lib/worldview.ts`. Never contains raw sources.
- **Agent contract**: `second-brain/contract.json` plus its AGENT GUIDE section: the machine-readable rules for how any agent reads and writes vault memory.
- **Supersession**: marking an idea or position as replaced (`superseded_by`) while retaining it as history. Agents never delete worldview content.

---

## 5. Verification against the hard rules

Writing rules: checked (no em-dashes, contrast frames converted to affirmative statements, no banned vocabulary, no rhetorical openers). Both build prompts end with a Handoff Breakdown in the Phase 1/2 format. Provenance and private-first are strengthened by M1/M2, never weakened: the pack is curated-only, retrieval is local-only, raw material still never persists in the cloud.
