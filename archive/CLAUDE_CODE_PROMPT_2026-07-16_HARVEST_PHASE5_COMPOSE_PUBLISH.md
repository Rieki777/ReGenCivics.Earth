# Claude Code Build Prompt — The Harvest, Phase 5 (Compose to Publish)

Stage 6 of `BUILD_SEQUENCE_MASTER.md`, the last. Source of truth: `CREATION_STATION_PLAN.md` v2 §5b and §7. Prereq: Harvest Phase 2 (Stage 3) deployed; Phase 4 (Stage 5) preferred so the voice model is calibrated. This phase is the front door and the exit: one idea in, a full publishable package out, with staged human approval before anything goes public. It is the most integration-heavy and the most irreversible, so it ships last and behind the strongest gates.

Read first: `CLAUDE.md`, `STEERING.md`, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, the existing blog data model and preview mechanism, and the image generation option (`.claude/skills/nano-banana-pro` if used server-side).

## Goal

Rye drops an idea by text or voice at the top of The Harvest. It fans out, grounded in his own notes, into an article with images and per-channel social posts, grouped as one Publication. He approves each surface, and one review screen shows everything before anything publishes. Nothing public fires from a raw or unapproved draft.

## Build items

### 1. Migrations
- `publications`, `publication_targets`, `images` per plan §7. Owner-gated. Rye applies then pushes.

### 2. Compose box (top of /admin-create)
- Text or voice input, reusing the Phase 1 capture and transcription plus the cleanup pass. On drop, retrieve related notes and sources (reuse provenance) and show what it is drawing from, so Rye can add or remove sources. Drafting uses those raw words and the Worldview Pack voice, never generic invention.

### 3. The Publication object
- One composed idea creates one `publications` row grouping the article, the per-channel posts, the images, and optionally the email. `publication_targets` holds per-surface state (draft, approved, scheduled, published, failed) so publishing is staged and idempotent.

### 4. Visual Identity profile and image generation
- Cowork creates `second-brain/90 Voice Profile/Visual Identity.md`, the image-prompt profile (Rye's recurring aesthetic: aurora over food-forest villages, mycelia and crystal kingdoms, children and animals, ancient and futuristic).
- The server generates two or three options per image slot (hero, inline) in that profile, each with alt text (accessibility is a project rule). Store to a private R2 path with owner-gated signed URLs. Rye picks; the choice trains the visual profile the way edits train voice.

### 5. Article publish
- Draft the article in Rye's voice from the sources, with image slots filled by chosen images. Create it as a hidden preview first, at a private URL, with SEO and OG metadata auto-filled and the hero as the OG image. Run the voice grader before publish. One owner-gated action makes it public, writing to the site blog.

### 6. Social publishing through an aggregator
- Integrate one social publishing API (Rye picks: Postiz self-hosted, Buffer, Ayrscribe, or Blotato) so channels connect once. Per-channel preview with character counts and media attach. Publish now or schedule. Per-channel publish plus Publish all after approval. Record `external_url` and `published_at` per target.
- Do not build five separate platform OAuth integrations. Instagram, Threads, and X restrict automated posting; the aggregator absorbs that.

### 7. Staged publish and safety
- Every surface has its own approve and publish control. One review screen shows everything that will go out before anything does. Publishing to the site, to social, and to the list are irreversible, so each is gated, rate-limited, and never fired from a raw or unapproved draft. Treat the composed idea text as untrusted. Provide an unpublish window where the platform allows it.

## Ship gate
```
python3 scripts/audit-truncation.py
pnpm typecheck
pnpm test   # a publication groups its targets; article publishes as hidden preview then public; social publish is idempotent per target; images carry alt text; nothing publishes without per-surface approval
```
Per new className, grep it in client/src. Evidence column required.

## Handoff Breakdown — Who Does What

### YOU (Rye)
| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Pick the social publishing aggregator and connect your channels | Account, billing, channel auth | Aggregator dashboard |
| 2 | Pick the image generation model and set its key | Account and billing | Provider dashboard, then Railway Variables |
| 3 | Confirm how the site blog publishes (data model, preview) | Only you know the live blog setup | Point Claude Code at it |
| 4 | Apply migrations, verify, then push | VM cannot reach Railway MySQL | `run-migration.ts --all` then `--status` |
| 5 | Git push and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 6 | Approve and publish each first Publication yourself | Public actions are yours to trigger | /admin-create compose and review screen |

### CLAUDE CODE
| # | Task | Status |
|---|------|--------|
| 1 | Migrations for publications, targets, images | READY TO BUILD |
| 2 | Compose box wired to retrieval and the pack | READY TO BUILD |
| 3 | Publication object and per-surface state machine | READY TO BUILD |
| 4 | Image generation with options, alt text, private R2 | READY TO BUILD |
| 5 | Article preview and publish to the blog, SEO/OG, voice-graded | READY TO BUILD |
| 6 | Aggregator integration, per-channel preview and publish | READY TO BUILD |
| 7 | Staged review screen and confirm gates | READY TO BUILD |
| 8 | Tests per ship gate | READY TO BUILD |

### CLAUDE (Cowork)
| # | Task | Status |
|---|------|--------|
| 1 | Create the Visual Identity profile from the vault's recurring imagery | READY TO BUILD |
| 2 | Fold the Visual Identity profile into the Worldview Pack build (a new pack file) | READY TO BUILD |

### WAITING ON YOU
Image generation waits on your item 2, social publishing on your item 1, the article publish on your item 3.

## Remaining after this
- The full sequence is complete. Follow-ups: wiring elders and companions to the pack (its own small prompt), scheduled consolidation, and the optional cloud retrieval twin.
