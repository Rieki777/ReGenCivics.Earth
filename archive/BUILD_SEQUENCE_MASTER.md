# Build Sequence Master — The Harvest + The Mycelium

Status: 2026-07-16. The single ordered runway that weaves the Harvest phases (capture, creation, publishing) and the Mycelium track (memory and worldview) into one coherent build. Each stage is one Claude Code session. Ship and deploy between stages. Do not start a stage until its dependencies are green.

## Why these two tracks are one plan

The Harvest turns Rye's ideas into published articles and posts. The Mycelium turns Rye's vault into a versioned worldview and voice that any agent can load. They meet at one seam: the Harvest's drafting should speak in Rye's voice, and the Mycelium is what holds that voice. So the memory layer is built early, and every later Harvest phase loads it. The learning loop then feeds what it learns back into the Mycelium, so the whole system compounds.

## The order

| Stage | Build | Prompt file | Depends on | Delivers |
|------|-------|-------------|-----------|----------|
| 1 | Harvest Phase 1: Capture + Bridge | `CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE1.md` | none | Voice and text capture in the admin, `quick_notes`, `ownerProcedure`, the bridge, local inbox intake. Replaces Telegram. |
| 2 | The Mycelium (M1 + M2) | `CLAUDE_CODE_PROMPT_2026-07-16_MYCELIUM_COMBINED.md` | none | Concept and position ontology, the Worldview Pack loaded by every agent, the agent contract, local retrieval, memory hygiene, encrypted backup. |
| 3 | Harvest Phase 2: Feed + Develop + Provenance | `CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE2.md` | Stage 1 deployed, Stage 2 pack | The /admin-create feed, Develop on demand, source provenance on every card, edit in place. Drafting loads the Worldview Pack. |
| 4 | Harvest Phase 3: Learning loop | `CLAUDE_CODE_PROMPT_2026-07-16_HARVEST_PHASE3_LEARNING_LOOP.md` | Stage 3 | Edit-and-learn voice loop with style-versus-content classification and a Voice rules screen. Learned rules feed the pack. |
| 5 | Harvest Phase 4: Self-driving layer | `CLAUDE_CODE_PROMPT_2026-07-16_HARVEST_PHASE4_SELF_DRIVING.md` | Stage 4 | Auto-drafting of top-confidence items, resurfacing, the weekly article digest, the graph view, and the hardened one-button email send. |
| 6 | Harvest Phase 5: Compose to Publish | `CLAUDE_CODE_PROMPT_2026-07-16_HARVEST_PHASE5_COMPOSE_PUBLISH.md` | Stage 3 (4 preferred) | The compose box, the Publication object, image generation in the Visual Identity profile, article publish to the site, social publishing via an aggregator. |

Stages 1 and 2 are independent and could run in either order or in parallel. Everything from Stage 3 on is linear. The Mycelium is placed at Stage 2 (rather than split around Harvest Phase 2 as the review first suggested) because M2 has no Harvest dependency, so building the whole memory layer in one session is cleaner and gets the encrypted backup in place sooner. The only hard rule is that the pack (Stage 2) exists before Harvest drafting (Stage 3) so drafts speak in Rye's voice, and the loader is fail-soft so a missing pack never blocks a build.

## The cross-seams (where the tracks touch)

1. **Pack into drafting.** Stage 3's generation worker loads the Worldview Pack through `server/lib/worldview.ts` (`getVoiceProfile`, `getStyleRules`, `getConcept`) instead of a raw profile snapshot. Fail-soft if the pack is absent.
2. **Learned rules into the pack.** Stage 4's learning loop writes `voice_rules`. The pack builder (Stage 2, `build_worldview_pack.py`) folds the top rules by weight into `style_rules.json` on the next build, so learned voice gains versioning and distribution for free. Re-run the pack build after Stage 4 ships.
3. **Retrieval into provenance.** Stage 2's local `ask.py` retrieval can later gain a cloud twin over the curated `source_index` rows only, giving the Harvest provenance view semantic search after Stage 3. Full-vault retrieval stays local-only per ADR-N+1.
4. **Concepts into cards.** Once `08 Concepts` exists (Stage 2), the provenance view (Stage 3) can link a card to the worldview concepts it touches, not just its raw sources.

## Consolidated decisions Rye makes (across all stages)

Batch these so the build can run without stalling.

- **Stage 1:** transcription provider (Deepgram or OpenAI Whisper API) and key, `OWNER_USER_ID`, `HARVEST_BRIDGE_TOKEN`.
- **Stage 2:** confirm the names (the Mycelium, Worldview Pack), bless the seeded concept and position list, accept the three ADRs, approve the local embedding model, choose a backup destination and hold the encryption key, `WORLDVIEW_UPLOAD_TOKEN`, `WORLDVIEW_R2_KEY_PREFIX`.
- **Stage 4:** none new; the learning loop runs on your edits.
- **Stage 5 (Phase 4):** the email list source and consent basis for the send.
- **Stage 6 (Phase 5):** the social publishing aggregator (Postiz, Buffer, Ayrscribe, Blotato), the image generation model, and how the site blog publishes.

## The rhythm per stage

For every stage: Claude Code builds the code, you apply migrations on Railway in order then push, confirm the deploy, then Cowork does the local vault work and any seed or bridge run. Each prompt ends with a Handoff Breakdown that names exactly who does what. Never start the next stage until the current one is deployed and verified.

## Status of the prompts

- Stages 1, 2, 3: prompts exist in root.
- Stages 4, 5, 6: prompts created alongside this master (Harvest Phase 3, 4, 5).
- Harvest Phase 2's prompt carries a banner pointing here for its place in the order.
