# Movement Coordination Engine: Spec v1

Date: 2026-06-23
Author: Rye + Claude (Cowork CTO planning session)
Supersedes the trigger design in `CLAUDE_CODE_PROMPT_2026-06-23_RIVERSIDE_YOUTUBE_PIPELINE.md`. That document's pipeline stages still apply for the video handling; this document is the larger system that wraps them and turns a recorded session into coordinated work across the movement.

Read `CLAUDE.md`, `.ai/docs/STEERING.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, and `CONTEXT_THE_TWO_GAMES.md` before building. The token model rules in `CLAUDE.md` (private-first, `creditPrivateTokens`) are binding for every bounty in this spec.

---

## 1. The vision in one paragraph

A session gets recorded and lands on the public YouTube channel as the raw live cut. A scheduled routine notices it, puts it on the site so the community can watch immediately, then produces an edited version with chapters, an overview, decisions made, and action items. The action items are the important part. When a role is named in the call and given something to do, that becomes a real task in that role holder's profile, with a sociocratic overview of how to complete it and a $ReGen bounty for finishing. Over time, Claude agents and schedules running on top of this turn every session into coordinated, rewarded work across the whole movement.

---

## 2. The two foundational gaps to close first

The codebase audit found two missing primitives. Nothing in the vision works until these exist.

**Gap A: no person-to-role link.** `client/src/data/gameRoles.ts` defines 20 sociocratic roles (13 `kind: "game"`, 7 `kind: "fund"`), and `client/src/pages/Team.tsx` renders them, but there is no table that says "Maya holds Forum Gardener." Without it we cannot route a task from a mention to a person. Build `roleHolders`.

**Gap B: tasks are hardcoded, not data-driven.** Quests live as static objects in client/server code. `questCompletions` and `activeQuestSignals` record progress, but there is no table an agent can write a brand new task into. Build `callTasks`.

These two tables are the spine of the coordination engine.

---

## 3. Architecture overview

```
[Session recorded, lands on YouTube as raw live cut]
        |
        v
TRIGGER: poll public YouTube channel RSS (no API key, no quota)
   https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}
        |
        v
INGEST
  1. discover     -> new videoId -> upsert recordings row (kind="raw"), publish to site NOW
  2. transcribe   -> captions (timedtext) or Whisper fallback -> transcriptJson
        |
        v
UNDERSTAND (LLM, Rye voice, bot provenance, input sanitized)
  3. synthesize   -> overview, chapters, decisions[], actionItems[]
  4. extractTasks -> role-tagged task proposals with evidence quote + timestamp + suggested bounty
        |
        v
EDIT (the "edited one")
  5. cleanCut     -> Riverside clean export if available, else ffmpeg trim of the YT download
  6. publishEdited-> upload edited cut, attach chapters, serve community
        |
        v
ROUTE + GATE
  7. resolveRoles -> map each named role to a roleHolders.userId (or mark open-to-circle)
  8. reviewQueue  -> proposed tasks land in an admin queue; Rye bulk-approves (token-bearing gate)
        |
        v
DELIVER
  9. assign       -> approved task becomes an open callTask on the holder's profile
 10. notify       -> notifications row (type "mention"/"quest_complete") + optional email/Telegram
        |
        v
COMPLETE + REWARD
 11. claim/submit -> holder does the work, submits artifact
 12. consent      -> circle steward consents (sociocratic done-check)
 13. reward       -> creditPrivateTokens(userId, "regen", bounty, "call_task_bounty", callTaskId)
        |
        v
[Schedule page, forum thread, subscriber email, profiles updated, $ReGen awarded]
```

Design stance as CTO: everything is auto-prepared end to end, but two surfaces are gated because they touch people and money. Task creation with a token bounty passes through a one-click admin approval (step 8), and final token award passes through sociocratic consent (step 12). An AI misreading "Sam, can you look at the water rights" should never silently mint $ReGen or spam a role holder. The gates are bulk and fast, not bureaucratic.

---

## 4. New data model

All three changes in one migration: `drizzle/0XXX_movement_coordination.sql`, plus `schema.ts` additions. Apply via `npx tsx scripts/run-migration.ts` (HUMAN step).

### 4.1 `roleHolders` (closes Gap A)

```sql
CREATE TABLE roleHolders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleSlug VARCHAR(64) NOT NULL,          -- stable slug derived from gameRoles title, e.g. "forum-gardener"
  roleTitle VARCHAR(128) NOT NULL,        -- display, mirrors gameRoles.title
  kind ENUM('game','fund') NOT NULL DEFAULT 'game',
  circle VARCHAR(128),                    -- mirrors gameRoles.circle
  userId INT NULL,                        -- null = role currently open
  season VARCHAR(50),                     -- which season this holding applies to
  isActive TINYINT NOT NULL DEFAULT 1,
  notifyEmail TINYINT NOT NULL DEFAULT 1,
  notifyInApp TINYINT NOT NULL DEFAULT 1,
  aliases JSON,                           -- name/handle variants the LLM may hear in a transcript
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX roleHolders_roleSlug_idx (roleSlug),
  INDEX roleHolders_userId_idx (userId)
);
```

Seeding: a script reads all 20 roles from `gameRoles.ts`, writes one `roleHolders` row per role with `userId = NULL`. This is the "table for sending unique messages" Rye asked for: every team role present, ready to attach a person. `aliases` lets the LLM match "the Gardener" or a first name back to the role. Rye fills in real `userId` values (HUMAN step, only Rye knows who holds what).

When a task targets a role with `userId = NULL`, it does not go to a profile. It surfaces on the Opportunity board (`client/src/pages/Opportunity.tsx`) as open to the circle.

### 4.2 `callTasks` (closes Gap B)

```sql
CREATE TABLE callTasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recordingId INT NOT NULL,               -- FK to recordings.id
  sourceVideoId VARCHAR(32) NOT NULL,     -- YouTube videoId for traceability
  roleSlug VARCHAR(64),                   -- targeted role (nullable for general asks)
  assigneeUserId INT NULL,                -- resolved holder, null = open to circle
  title VARCHAR(255) NOT NULL,
  summary TEXT,                           -- one-paragraph what-and-why
  sociocraticOverview JSON,               -- { purpose, whyThisRole, steps[], definitionOfDone, consentCircle }
  bountyTokenType VARCHAR(16) DEFAULT 'regen',
  bountyAmount INT DEFAULT 0,             -- $ReGen, integer token units
  evidenceQuote TEXT,                     -- the transcript line that produced this task
  evidenceTimestampSeconds INT,           -- deep-link into the video
  status ENUM('proposed','approved','open','claimed','submitted','completed','declined','expired')
         NOT NULL DEFAULT 'proposed',
  createdByAgent VARCHAR(64) DEFAULT 'coordination-engine',
  approvedBy INT NULL,                    -- userId of the admin who approved (the gate)
  claimedAt TIMESTAMP NULL,
  submittedArtifactUrl VARCHAR(512),
  submittedArtifactText TEXT,
  consentedBy INT NULL,                   -- circle steward who consented to done
  completedAt TIMESTAMP NULL,
  rewardLedgerId INT NULL,                -- FK to userTokenLedger.id once paid
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX callTasks_assignee_idx (assigneeUserId, status),
  INDEX callTasks_role_idx (roleSlug, status),
  INDEX callTasks_recording_idx (recordingId)
);
```

Status lifecycle: `proposed` (AI wrote it) to `approved` (Rye gate) to `open` (visible to holder) to `claimed` to `submitted` to `completed` (consent + reward) or `declined`/`expired`. One table, no separate proposals table.

`sociocraticOverview` JSON shape, modeled on the `powers`/`rights`/`responsibilities`/`domains` framing already in `gameRoles.ts`:

```json
{
  "purpose": "Why this task matters to the movement",
  "whyThisRole": "Why it lands with the Forum Gardener specifically",
  "steps": ["Concrete step 1", "Step 2", "Step 3"],
  "definitionOfDone": "The observable outcome that counts as complete",
  "consentCircle": "Incubation Circle"
}
```

### 4.3 `recordings` extensions

Add to the existing `recordings` table (line 2224 of `schema.ts`), on top of the v1 pipeline columns:

```sql
ALTER TABLE recordings
  ADD COLUMN youtubeVideoId VARCHAR(32) NULL UNIQUE,  -- the raw live videoId from RSS
  ADD COLUMN recordingKind ENUM('raw','edited') NOT NULL DEFAULT 'raw',
  ADD COLUMN editedYoutubeUrl VARCHAR(512) NULL,      -- the edited cut, when produced
  ADD COLUMN overview TEXT NULL,
  ADD COLUMN decisionsJson JSON NULL,
  ADD COLUMN actionItemsJson JSON NULL;
```

The raw row publishes to the site at step 1. The same row gains `editedYoutubeUrl` at step 6, so the Schedule page can show "watch the live cut" and "watch the edited version" from one record.

---

## 5. The trigger: poll the public YouTube channel

This replaces both Zapier and the Riverside-first trigger. The live unedited recording is already public on `@regencivics`, so:

- Poll `https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}` on an interval (default 10 min). No API key, no quota cost, returns the latest ~15 uploads with `videoId`, `title`, `published`.
- Diff against `recordings.youtubeVideoId`. Anything new and unseen starts the pipeline.
- Resolve the channel id once from the handle and store it as `YOUTUBE_CHANNEL_ID`.

Keep the YouTube Data API only for the optional edited-cut re-upload (step 6) and for richer metadata, exactly as scoped in the v1 doc. The RSS poll is the heartbeat. Run it in the worker (`server/worker/pipelineWorker.ts`) from the v1 doc.

Guard rails: ignore videos shorter than a floor (e.g. 120s) to skip shorts and tests; ignore videos whose title matches a configurable skip pattern; idempotent on `youtubeVideoId` so a redeploy never double-creates.

---

## 6. Understanding the call (LLM stage)

Input is the transcript. This is untrusted text going to an LLM, so follow `AI-AUTOMATION-RISKS.md`: strip control characters and prompt-injection markers, cap length, label all generated output with bot provenance, and rate-limit. Use `invokeLLM` (same as `videoSummary.ts` and `digestJob.ts`).

Two passes:

**Pass 1, synthesize.** Produce `overview` (one Rye-voice paragraph), `chaptersJson`, `decisionsJson` (array of decisions made), `actionItemsJson` (array of `{ owner, item }`). This is the record of the call.

**Pass 2, extract tasks.** From the action items and the transcript, emit task proposals. For each: `title`, `summary`, targeted `roleSlug` (matched against `roleHolders.roleSlug` and `aliases`), `sociocraticOverview`, a suggested `bountyAmount`, and the `evidenceQuote` plus `evidenceTimestampSeconds`. The prompt must require an exact supporting quote for every task and must refuse to invent a task without one. Tasks with no role match get `roleSlug = NULL` and route to the Opportunity board.

Bounty suggestion is a starting number only. The model proposes, Rye disposes at the gate. Anchor suggestions on the role `band` and `hoursPerWeek` already in `gameRoles.ts` so a 30-minute ask and a multi-week build do not get the same award.

---

## 7. The edited cut (the "edited one")

Per Rye's earlier choice, editing is "both": prefer a Riverside clean export when present, fall back to our own ffmpeg/auto-editor trim of the YouTube download. Reuse the v1 doc's `clean` and `upload` stages. The edited cut can be published as a second unlisted-then-public YouTube video or as a replacement, set by `editedYoutubeUrl`. Chapters, overview, and the link to the forum discussion go in its description. The raw cut stays available so nothing is lost.

---

## 8. Routing, the gate, and delivery

**Resolve roles.** For each proposed task, look up `roleHolders` by `roleSlug`. If a holder exists, set `assigneeUserId`. If the role is open (`userId NULL`), leave `assigneeUserId NULL` and flag open-to-circle.

**The gate (step 8).** Proposed tasks sit at `status = 'proposed'` in an admin review queue, a new tab in `AdminRecordingsTab.tsx` or a sibling `AdminTasksTab`. Rye sees title, evidence quote with a timestamped play button, resolved assignee, and suggested bounty. Rye can approve, edit bounty, reassign, or decline, individually or in bulk. Approve flips to `approved` then `open` and stamps `approvedBy`. This is the one human checkpoint that protects the token economy and the role holders' attention. It is intentional, not an oversight.

**Deliver.** On `open`, create a `notifications` row (`playerId = assigneeUserId`, `type = "mention"`, `title`, `body`, `link` to the task). Respect `roleHolders.notifyEmail`/`notifyInApp`. Optional Telegram via existing `notify.ts`. The task renders in the holder's profile (`PlayerProfile.tsx`) as an open task/opportunity, showing the sociocratic overview and the $ReGen bounty. Open-to-circle tasks render on `Opportunity.tsx`.

---

## 9. Completion and reward (token model compliant)

Holder claims (`claimed`), does the work, submits an artifact (`submitted`), mirroring the existing `questCompletions` artifact pattern (photo/text/link/video). A circle steward consents that the definition of done is met (`consentedBy`, status `completed`). On completion:

```
creditPrivateTokens({
  userId: assigneeUserId,
  tokenType: "regen",
  amount: bountyAmount,
  source: "call_task_bounty",   // new source tag, free string per the token model
  sourceId: callTaskId,
  description: `Bounty for "${title}" from session ${sourceVideoId}`
})
```

Store the returned ledger id in `callTasks.rewardLedgerId`. This writes one append-only `userTokenLedger` row and updates `player_profiles.regenPrivate` atomically, exactly as the token model requires. Reads (scores, voice weight) use total = private + public; this spec never writes public balances. A second notification confirms the award.

Add `call_task_bounty` to the documented source-tag list and append an ADR to `.ai/docs/DECISIONS.md` for the coordination engine, plus a `DOMAIN-LANGUAGE.md` entry for "call task" and "role holder."

---

## 10. The agent and schedule layer (the coordination flywheel)

This is what makes it a movement engine rather than a pipeline.

- A scheduled routine runs the YouTube poll and the full pipeline (the worker).
- A weekly coordination agent reviews open `callTasks`: nudges holders with stale claims, re-opens expired tasks to the circle, and reports to Rye what is moving and what is stuck. Model it on `digestJob.ts`.
- A roles-reconciliation agent diffs `gameRoles.ts` against `roleHolders` so new or renamed roles always have a row, and flags roles that are still open.
- Each agent is a thin scheduled job calling shared services, with bot provenance and the same rate-limit discipline. No agent ever awards tokens or messages a holder without passing the two gates in this spec.

---

## 11. Build order

Phase 1, foundation: `roleHolders` and `callTasks` tables, seed script from `gameRoles.ts`, Rye fills holders. No video yet. Outcome: a person can be tied to a role, and a task can be written to a profile by hand and rewarded.

Phase 2, ingest and understand: YouTube RSS poll, raw publish to site, transcript, synthesize, extract tasks into the proposed queue. Outcome: a real session produces a draft overview, decisions, and proposed tasks Rye can see.

Phase 3, gate and deliver: admin review queue, approve flow, notifications, profile and Opportunity board rendering. Outcome: an approved task reaches a real person.

Phase 4, reward and edit: completion, consent, `creditPrivateTokens`, the edited cut, Schedule page enrichment.

Phase 5, flywheel: the weekly coordination and roles-reconciliation agents.

Ship each phase behind the Ship Gate. Do not mark VERIFIED without evidence.

---

## 12. Open decisions (CTO defaults chosen, flip any)

1. Token-bounty approval gate: defaulted ON (Rye bulk-approves before tasks reach people). Recommended given real $ReGen is at stake.
2. Completion consent: defaulted to a circle steward consenting before payout. Alternative: auto-pay on artifact submission for low bounties under a threshold in `game_variables`.
3. Edited cut publishing: defaulted to a separate YouTube video, raw cut preserved. Alternative: replace the raw cut.
4. Bounty currency: defaulted to `$ReGen` (game side) for all call tasks. Fund-side roles could instead earn `$RCivics`; needs a rule per `CONTEXT_THE_TWO_GAMES.md`.

---

## 13. Ship Gate (mandatory before any VERIFIED or DONE)

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<any-new-className>' client/src/
pnpm typecheck
```

Every Handoff row claiming VERIFIED needs evidence (file:line, grep result, script output). No evidence means the status stays CODED.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Resolve and set `YOUTUBE_CHANNEL_ID` for @regencivics | Account knowledge | Railway Variables |
| H2 | Fill `roleHolders.userId` for each filled role | Only you know who holds what | run seed script, then a short admin form (Claude Code builds it) |
| H3 | Run the coordination migration | Railway DB only reachable from your machine | `npx tsx scripts/run-migration.ts drizzle/0XXX_movement_coordination.sql` |
| H4 | Run the `roleHolders` seed script | Needs DATABASE_URL | `npx tsx scripts/seed-role-holders.ts` |
| H5 | Set YouTube Data API creds for the edited re-upload (from v1 doc H3, H4, H5) | Google console + your channel | console.cloud.google.com, Railway |
| H6 | Approve proposed tasks in the review queue each week | The token-bounty human gate | admin Tasks tab |
| H7 | Set the worker as a Railway service | Railway dashboard | New Service from repo |
| H8 | `git add -A && git commit && git push`, approve deploy | Claude Code may hold index.lock | local terminal, Railway |

### CLAUDE CODE: already done or can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | This spec | DONE |
| C2 | v1 pipeline build doc (video stages) | DONE |
| C3 | `roleHolders` + `callTasks` migration and `schema.ts` | CODED (after build) |
| C4 | `scripts/seed-role-holders.ts` from `gameRoles.ts` | CODED (after build) |
| C5 | YouTube RSS poll source + worker integration | CODED (after build) |
| C6 | Synthesize + extract-tasks LLM stages with provenance and sanitization | CODED (after build) |
| C7 | Admin review queue (AdminTasksTab) + approve/reassign/bounty edit | CODED (after build) |
| C8 | Notifications wiring + profile and Opportunity board rendering | CODED (after build) |
| C9 | Completion, consent, `creditPrivateTokens` reward path | CODED (after build) |
| C10 | Weekly coordination + roles-reconciliation agents | CODED (after build) |
| C11 | ADR in DECISIONS.md, DOMAIN-LANGUAGE entries, source-tag doc update | CODED (after build) |

### WAITING ON YOU before Claude Code can proceed

- H2 and H4 gate any real routing. Until holders are set, every task routes open-to-circle on the Opportunity board, which is a fine soft-launch state.
- H3 gates any live run, since the new tables must exist first.
- H1 gates the trigger. Until set, the poll has no channel to watch.
