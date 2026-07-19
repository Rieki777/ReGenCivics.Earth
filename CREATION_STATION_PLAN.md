# The Harvest: Creation Station + Two-Way Bridge - Comprehensive Plan v2

Status: Draft v2, 2026-06-26. Author: Rye + Claude (Cowork). Supersedes v1 and the Phase 2 and 3 sketches in `SECOND_BRAIN_SPEC.md`. v2 folds in a three-perspective review (security, architecture, product).

## The vision in one paragraph

Capture ideas the moment they arrive, by voice or text, from inside regencivics.earth. They flow into your local second brain, get sorted and connected, and ripen. When you want copy, you tap Develop on an idea and it comes back as ready-to-edit posts and articles at regencivics.earth/admin-create, called The Harvest. You edit in place to make it yours, and the style parts of your edits teach the system to sound more like you. You stay in control. The pipeline tends the ideas, you decide what gets written.

## 1. The pipeline that replaces the Kanban board

Kanban makes you the manager. The replacement is a **readiness feed with a Develop action**, so the assistant tends and you decide.

Two tiers:

- **Ripe ideas.** A short list of ideas that are ready to become something, each with a one-line "why now" (for example, three notes cluster here, last touched yesterday, connects to your Father's Day post). Not yet drafted. Each has a **Develop** button.
- **Drafts.** Copy that exists because you tapped Develop, or because an idea cleared a high confidence bar. This is where you edit and ship.

**Develop is the primary verb.** Tapping it runs an immediate generation for that idea across the channels you pick, with a quick angle choice first (two or three angles, pick one). This mirrors the riff engine you already trust. Auto-drafting is limited to the top one to three highest-confidence items per run, so the feed feels curated, not spammy.

**Ripeness, defined deterministically (v1, zero-token, matches deterministic-first):**

```
ripeness = 0.35*material + 0.25*recency + 0.25*cluster + 0.15*theme_focus   # 0..1
```

- material: `min(1, word_count / 250)`, plus 0.15 if the note has a link.
- recency: reuse the vault `weight` already in frontmatter (`0.78^years_old`).
- cluster: `min(1, related_note_count / 5)`, related meaning notes sharing at least two themes, from the MOC graph.
- theme_focus: 1.0 for one or two themes, 0.5 for three, 0.2 for zero or four-plus.

Draft only when ripeness crosses 0.6 for the first time (a transition), never re-draft an unchanged ripe idea. Show the score components on each item so it is legible and correctable. LLM spend goes to drafting ripe items, not to scoring.

## 2. Architecture: two layers, and where work runs

**Capture and display layer (cloud, regencivics.earth).** The FAB add-note capture, the /admin-create page, and the server-side generation worker. Holds the capture inbox, the drafts feed, edit history, and the current voice profile snapshot.

**Brain layer (local, Obsidian vault).** The source of truth for thinking. All sorted, theme-tagged, cross-linked notes. Sorting, tagging, cross-linking, and ripeness scoring run here, deterministically, on your private data.

**Where generation runs: server-side.** v1 said drafting happens locally. Review found that both your Windows machine and the Cowork sandbox are intermittent, so a local hourly worker would leave the feed stale. Drafting and the hourly cadence move to a Railway scheduled worker, which has guaranteed uptime, the database, `invokeLLM`, and Resend. The bridge pushes up only the curated, non-sensitive note text plus the voice profile snapshot, so raw personal material still never leaves your machine. This reverses a v1 decision and gets an ADR.

**Private-first, stated honestly.** Raw captures and voice transcripts do transit and briefly reside in the cloud so capture can work from anywhere. The boundary is enforced by deletion: once the bridge pulls a capture into the vault and confirms the write, the cloud `quick_notes` row and its R2 audio object are hard-deleted. A retention cap purges anything older than a set window even if unprocessed. Only curated idea text and the voice profile ever persist across the boundary.

## 3. The two-way bridge

A sync loop with at-least-once delivery and idempotent apply.

1. **Capture identity.** Every capture mints a UUID (`capture_id`) at creation. It travels into vault frontmatter and into every downstream record, so nothing is processed twice.
2. **Pull captures down.** The bridge calls `GET /api/harvest/captures?since_id=<n>`, a monotonic id cursor, never a timestamp, so nothing is dropped at the boundary. New captures are written to the vault `00 Inbox`.
3. **Intake, append-only.** A new `_pipeline/ingest_inbox.py` reads `00 Inbox`, creates one atomic note per capture with standard frontmatter and `capture_id`, tags themes, cross-links, and moves the raw capture to a processed folder. The existing `sort_v2.py` is a one-shot re-import tool and is never run in the loop, since it wipes and rebuilds.
4. **Acknowledge after write.** Only after the vault note is written and flushed does the bridge call `POST /api/harvest/mark-processed`. If it crashes first, the same ids come back next run and intake dedups on `capture_id`.
5. **Generate server-side.** The Railway worker scores transitions, drafts developed and top-confidence items, and upserts into `creation_items` on a unique key `(owner_id, capture_id, channel)`. Drafts are write-once: once an item leaves `ready` (edited or shipped), the worker never overwrites it.
6. **Pull edits down.** Saved edits flow back so the learning loop can study the style parts.

Auto-populating means the worker runs hourly, plus the Refresh button and Develop for on-demand. A status line on /admin-create shows the last run and counts, and warns if generation has not run in over two hours.

## 4. Capture: friction is the enemy

Telegram works offline, opens instantly, and never fails. Capture has to match that or you go back to Telegram.

- **Text** saves optimistically and works offline. It queues locally (service worker or local queue) and syncs when back online. Installable as a PWA so it opens like an app.
- **Voice.** Recording is stored the instant you stop, so the note exists even if transcription is pending or the network is down. Transcription runs async, server-side, at capture time, so `body` fills in without depending on re-fetching audio later.
- **Cleanup pass.** After transcription, a cheap pass fixes obvious transcription errors in your words, and offers to split a long rambly note into separate ideas. You see the cleaned version with a "view raw" toggle and a re-record button.
- Any capture failure is treated as a P0. This is the root of the whole system.

## 5. The Harvest at /admin-create

- A **big button on the admin dashboard** takes you there.
- Two tiers as in section 1: ripe ideas with Develop, and drafts to edit.
- Each item shows a **why now** line and, for drafts, the score components.
- **Source provenance on every card.** Clicking a card opens a detail view that traces the piece to its origin: the raw capture or Telegram messages that seeded it (with dates), the link tree of every URL inside those sources, the related notes in the vault, and a jump into the Obsidian note. Nothing is orphaned from where it came from. The drafting prompt is built from these raw sources so drafts use your own words and invent no facts. This mirrors the local command center, which already does this.
- Controls beyond Ship: **Snooze** (hide for N days), **Not this** (suppress this idea or angle, a negative signal into ripeness), **Steer** (a box like "focus on the fundraising angle"), and **Regenerate** with inline nudges (shorter, more personal, lead with the question). Regenerations do not count as voice edits.
- **Channels:** LinkedIn, Facebook, Instagram, Threads and X, a newsletter blurb, and an **Article** output wired to the existing article assembly line (title, angle, theme MOCs, seed notes). One channel drafts eagerly, the rest draft on demand when you expand the item, to control cost.
- **Mark as posted** captures which channel it went to, and optionally lets you paste back the final posted text, which is the cleanest voice signal of all.
- **One-button email push for big announcements.** The newsletter blurb has a Send action through Resend. It is hardened: only an edited-and-saved item can be sent, never a raw draft. Send returns a preview plus a signed confirm token bound to the exact body hash and recipient list, and the actual send requires that token back, so an injected note can never silently become an email. Hard caps (for example one send per ten minutes, three per day), an idempotency key so a double-click is a no-op, and CAN-SPAM basics (unsubscribe link, postal address, honor the Resend suppression list). Every send is logged as who, when, recipient count, and body hash, with no recipient PII in plaintext.

## 5b. Compose to Publish: one idea to a full package

A compose box sits at the top of The Harvest. You drop an idea by text or voice, and it fans out into a complete, publishable package grounded in your own notes.

**Input.** Text or voice (reusing the Phase 1 capture and transcription, with the cleanup pass). The moment an idea lands, the system retrieves your related notes and source messages and shows what it is drawing from, so you can add or remove sources. Drafting uses those raw words and the voice profile, never generic invention.

**Output, as one Publication object:**

1. **An article for the site.** Drafted in your voice from your sources, with image slots marked (hero and inline). Each slot gets two or three generated options in your visual identity, each with alt text. The article is created as a hidden preview first, at a private URL, with SEO and OG metadata auto-filled and the hero as the OG image. The voice grader runs before publish. One button makes it public.
2. **Social posts per channel.** LinkedIn, Facebook, Instagram, Threads and X, each drafted in that channel's register with character counts and the right media. One button publishes to a channel, or Publish all once approved. Publishing runs through a social publishing API so you connect your channels once, rather than five fragile integrations. Publish now or schedule.
3. **Optional email blast** for a big announcement, using the hardened one-button send from section 5.

**Staged, never one-shot.** One idea creates the whole package, but every surface has its own approve and publish control, and a single review screen shows everything that will go out before anything does. Publishing to the live site, to social, and to the list are irreversible public actions, so each is gated, rate-limited, and never fired from a raw or unapproved draft. An unpublish window covers mistakes.

**The Visual Identity profile.** The image twin of the Voice Profile, in `90 Voice Profile/Visual Identity.md`. It holds your recurring aesthetic (aurora over food-forest villages, mycelia and crystal kingdoms, children and animals, ancient and futuristic) and grounds every image prompt. It learns from which generated options you pick, the same way the voice loop learns from edits.

**Learning.** Which images you choose trains the visual profile. Your per-channel edits train per-channel voice sub-profiles, since LinkedIn and X differ. The final posted text, captured on publish, is the cleanest signal of all.

## 6. The learning loop, done safely

When you edit an item and save, the system learns the style parts of your edit. The safeguards matter as much as the mechanism.

- **Style versus content.** Most edits are content (a fact, the ask, cutting an off-topic line), and learning from those produces garbage rules. On save, a one-tap classifier asks "mostly style or mostly content," defaulting to content. Only style-tagged edits feed rule extraction. Large rewrites above a token threshold are treated as content and are logged, not learned.
- **Fixed taxonomy.** Extracted rules are limited to word swaps, sentence length, opener and closer patterns, punctuation, formatting, and aside insertion. Rules that reference a specific topic or named entity are rejected.
- **Hard rules are supreme.** The five publishing rules (no em-dashes, no contrast-framing, and so on) are immovable. Any candidate rule that contradicts a hard rule is auto-rejected. A candidate that contradicts an existing learned rule is flagged for a quick yes or no, not auto-merged.
- **In-product control.** A Voice rules screen lets you see, edit, demote, or delete any learned rule. The plan's transparency promise needs a surface, not just a file.
- **Storage.** Store derived rules and small diffs, not full verbatim edit pairs, so the system does not become an archive of the private things you chose to cut. Scrub obvious PII. Rules live in `voice_rules` with weight and lastSeen. The vault note is a rendered view of the top rules, regenerated, not appended forever.
- **Bounded context.** Load only the top N rules by weight (for example 25) plus a few recent style examples into any prompt. Decay rules not reinforced, prune, and run a periodic consolidation pass. Injected voice context stays a fixed budget regardless of tenure.

## 7. Data model

Cloud (MySQL, owner-gated, filtered by `owner_id = ctx.user.id`):

- `quick_notes` - id, capture_id (uuid, unique), owner_id, body, source (text or voice), audio_key null, themes json null, status (inbox or processed), created_at. Hard-deleted after the bridge confirms the vault write.
- `creation_items` - id, owner_id, capture_id, channel, ripeness, body, source_refs json (the capture ids, vault note refs, and raw message ids that seeded this, for the provenance view), status (ready, edited, shipped), created_at, updated_at. Unique key `(owner_id, capture_id, channel)`. Write-once from the worker once status leaves ready.
- `source_index` - an addressable store of raw messages and captures (id, date, text, links, forwarded_from, media), so any card can show exactly where it came from. Built locally from the export, mirrored to the app for the ideas that seed the feed.
- `voice_edits` - id, owner_id, item_id, channel, edit_kind (style or content), ai_version, edited_version, created_at. Purged after rule extraction.
- `voice_rules` - id, owner_id, rule, weight, first_seen, last_seen.
- `harvest_runs` - last_bridge_run_at, last_generation_run_at, counts, for the status line.
- `publications` - id, owner_id, source_refs json, article_item_id, channel_item_ids json, image_keys json, email_item_id null, status (draft, partially_published, published), created_at. Groups everything that comes from one composed idea.
- `publication_targets` - id, publication_id, surface (site, linkedin, facebook, instagram, threads, x, email), status (draft, approved, scheduled, published, failed), scheduled_for null, external_url null, published_at null. Per-surface state, so publishing is staged and idempotent.
- `images` - id, owner_id, publication_id, slot (hero, inline), r2_key, alt_text, prompt, chosen bool.

Local vault addition: `90 Voice Profile/Visual Identity.md`, the image-prompt profile, loaded by the image generator the way the Voice Profile is loaded by the drafter.

Local vault: `00 Inbox` intake, `_pipeline/ingest_inbox.py`, `90 Voice Profile/Learned From Edits.md` as a rendered view, existing folders and pipeline for sorting and cross-linking.

## 8. Everything else, folded in

- Auto-suggested links and orphan finder run in the local intake and graph build.
- The D3 force graph is added to the command center HTML and later a read-only view in The Harvest.
- The weekly "three article proposals" digest is pulled forward, since articles are the real goal.
- One idea, many outputs is exactly the per-channel and article fan-out.
- Resurfacing waits until the learning loop has calibrated, so it does not re-push uncalibrated drafts.
- The deterministic voice grader runs free on every generated draft as a pre-filter, and only calls the LLM to fix a draft it flags.
- Observability: the status line, plus a warning or optional email if generation stalls.

## 9. Security and privacy

- **True owner gate.** Do not reuse `adminProcedure`, which admits any admin or superadmin. Add an `ownerProcedure` that checks `ctx.user.id === ENV.ownerUserId`. Every Harvest and capture procedure filters by `owner_id = ctx.user.id`, and `owner_id` is always taken from the session, never from input.
- **Bridge token.** Bearer token on the `/api/harvest/*` routes, constant-time compare with the existing `timingSafeEqualStr`. On 401 call `recordWebhookFailure(ip, 'harvest-bridge')` and fail closed. Rate-limit both the failure and success paths. Support two tokens for zero-downtime rotation, documented in the ops playbook. Log path, ip, and counts only, never the token or bodies.
- **Prompt injection.** Treat every capture and transcript as untrusted data. Wrap it in delimiters in all prompts and instruct the model it is source material, never instructions. Validate and sanitize generated output before storage and display. Vault-loading agents treat `00 Inbox` bodies as data, not commands. Never let a drafting run auto-trigger a send or a delete.
- **Email send** hardened as in section 5.
- **Transcription caps.** Cap upload size and audio duration, set a fetch timeout, add a per-day transcription budget and a circuit breaker, allowlist mimetypes.
- **R2 audio.** Store in a private path, not the public assets prefix. Serve only through an owner-gated, short-lived signed URL. Lifecycle rule deletes audio once transcribed and pulled.
- **ADRs** for the two-layer split, the server-side generation reversal, the owner-gating decision, the email-send design, and the transcription provider.

## 10. Phases, reordered around trust

**Phase 1, capture and bridge.** The FAB add-note with voice and text and offline capture, the `quick_notes` table with `capture_id`, server-side transcription, the id-cursor bridge endpoints, and the append-only intake. Replaces Telegram. Highest priority.

**Phase 2, Develop on demand and the backlog seed.** The /admin-create page, the dashboard button, the ripe-ideas tier, the Develop action with angle choice, Article and one eager channel, edit in place, and Mark as posted. Seed the first feed from your existing vault backlog so the first open shows real copy from ideas you recognize. You stay in control, and this generates the edit data the learning loop needs.

**Phase 3, the learning loop.** `voice_edits` and `voice_rules`, the style-versus-content classifier, the taxonomy, hard-rule supremacy, the Voice rules control screen, and bounded context.

**Phase 4, the self-driving layer.** Auto-drafting of top-confidence items, resurfacing, the weekly digest, the graph view, and the email push. This comes after the voice model has calibrated on real edits, so the first impression is good.

**Phase 5, Compose to Publish.** The top-of-page compose box, the Publication object, image generation in the Visual Identity profile with alt text, article preview and publish to the site, and social publishing through an aggregator API with staged per-surface approval. This is the most integration-heavy and the most irreversible, so it ships last and behind the strongest confirm gates. The compose input can land earlier as a simple wrapper over Develop, with the publishing integrations following.

## 11. Handoff breakdown

| Work | Who | Notes |
|---|---|---|
| Vault-side intake, ripeness scoring, cross-linking, rule extraction | Claude (Cowork) | Runs against the mounted vault. No deploy. |
| The bridge script (HTTPS, id-cursor, ack-after-write) | Claude (Cowork) | Calls the live endpoints. Built after they deploy. |
| tRPC routers, `ownerProcedure`, the FAB, /admin-create, the Railway generation worker, migrations, email-send hardening (code) | Claude Code | Mirrors existing patterns. Written into the repo. |
| Apply DB migrations on Railway, then push | Rye | Order matters: migrate first, verify with `--status`, then push. Router fails soft if a table is missing. |
| Set env vars: transcription key, bridge token, owner user id | Rye | Railway variables. |
| Confirm your user row is the owner id | Rye | The access gate. |
| Git push to main and confirm the deploy | Rye | Standard ship flow. |
| Voice and copy review, and the Voice rules screen | Rye | The learning loop depends on your edits. |

## 12. Decisions locked (2026-06-26)

1. **Name.** The Harvest. Page at regencivics.earth/admin-create.
2. **Transcription.** Hosted API first (Deepgram or OpenAI Whisper API). Local Whisper stays on the roadmap.
3. **Cadence.** Hourly server-side, plus Refresh and Develop on demand.
4. **Channels.** LinkedIn, Facebook, Instagram, Threads and X, a newsletter blurb with the hardened one-button email push, and an Article output.
5. **Generation location (revised).** Server-side on Railway, not local. ADR to follow.

## 13. Open items

1. Transcription provider choice between Deepgram and OpenAI Whisper API.
2. The email list source and how recipients consented, for the compliance basics.
3. Whether the backlog seed drafts articles, social, or both on first run.
4. Social publishing approach: an aggregator API (Postiz self-hosted, Buffer, Ayrscribe, Blotato) versus per-platform integrations. Recommendation: aggregator, because Instagram, Threads, and X each restrict automated posting and per-platform auth is brittle. Confirm the aggregator supports every target channel.
5. Image generation provider for the Visual Identity slots (the Nano Banana Pro or another model), and where images are stored and served from (private R2, then attached to the article and posts).
6. How the site blog publishes: the existing blog data model and preview mechanism, so the article publish writes to it cleanly.
