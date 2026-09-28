# Align social scheduling with the Harvest verification layer

You own the scheduling side of ReGen Civics social. A parallel session just
changed the publishing pipeline underneath you. Read this before touching
anything, because two of the changes are hard gates that will silently break
an auto-advancing scheduler.

Nothing here asks you to rebuild what you have. The goal is one cohesive
system, not a second one.

## What landed

Branch `ship-rite-truth`, commits `7d5d797` and `a13c7fb`. Migrations `0216`
and `0217` are **already applied to production**. Next free migration is `0218`.
The branch is **not merged to main**, so this is not deployed yet.

Four new columns on `publication_targets`:

| Column | Meaning |
|---|---|
| `verification_status` | `unverified` / `passed` / `flagged`. The machine's verdict on whether the copy is TRUE. Deliberately separate from `status`, which stays the human workflow state. |
| `verification_flags` | `[{claim, problem, severity}]` where severity is `block` or `warn`. NULL means never checked. |
| `verified_at` | Timestamp of the last check. |
| `first_comment` | Where the link goes, because a URL in the body suppresses reach on LinkedIn and Instagram. |
| `weekly_note` | One honest sentence on whether a published post landed. |

New code: `server/lib/content-verify.ts` (`verifyDraft`, `hasBlockingFlags`),
`server/lib/content-canon.ts` (the canon facts drafts are checked against),
`harvest.verifyTarget` and `harvest.updateTargetFields` procedures, and a
`harvest.notesDue` query.

## Five things your scheduler must respect

**1. Never let a target reach `published` with an unresolved `block` flag.**
`harvest.approveTarget` refuses when `hasBlockingFlags(verificationFlags)` is
true, and `publishTarget` refuses anything not already `approved`. That chain
holds only if you go through those procedures. If any part of your scheduler
sets `status = 'approved'` with a direct UPDATE, or calls `publishTarget` after
flipping status yourself, you route around the only fact-check in the system.
Call `harvest.approveTarget` and let it refuse.

**2. Editing copy invalidates the verdict.** `harvest.editItem` resets every
target carrying that item to `unverified` and clears the flags. If your
scheduler rewrites, truncates, or re-drafts copy on its way out the door, it
must reset verification the same way and re-run `harvest.verifyTarget`, or it
will publish text that was checked in a different form.

**3. `first_comment` is a second publish action and nothing posts it yet.**
`publishTarget` makes exactly one Buffer call
(`https://api.bufferapp.com/1/updates/create.json`) per surface and records
`buffer:<updateId>`. The first comment is currently copy-and-paste by hand. If
you are scheduling posts, you are the natural owner of "post the body, then
post the first comment as a reply." Decide whether that is a second Buffer
update, a follow-up job keyed off `externalUrl`, or explicitly left manual, and
write the decision down. Silently dropping it means every scheduled post loses
its link.

**4. Hashtags cap at 2, and usually zero.** Rye settled this on 2026-07-24.
`CHANNEL_REGISTER` in `server/lib/harvest.ts` says so, and `gradeVoice` enforces
it with a `no-hashtag-spam` flag. Instagram previously said five. If any part of
your scheduling layer appends tags, trim to the cap.

**5. Run the voice grader on anything you generate.** `gradeVoice` in
`server/lib/voice-grader.ts` picked up a batch of new rules: assistant phrases
("Here's the thing", "Hope this helps", "After careful consideration"), sweeping
claims, ornamental adverbs, `pivotal` / `foundational`, and the contracted grand
pronouncement ("This isn't a budget. It's a statement of intent."). `draftChannel`
already grades and runs an LLM repair pass. Any drafting path you own should do
the same rather than emitting ungraded copy.

## Two decisions that are yours to make

**`publication_targets.scheduledFor` is a dead column.** It exists and nothing
in the codebase reads it. I checked. It is a seam that was left deliberately, so
it is yours to either wire up or delete. Do not assume something is already
honouring it.

**Where does timing actually live?** `publishTarget` posts to Buffer with no
`scheduled_at` and no `now=true`, which means the post lands in the Buffer
profile queue and Buffer's own per-profile schedule decides when it goes out.
So today there are potentially two schedulers: yours, and Buffer's, and the app
cannot see Buffer's. Pick one owner:

- Buffer owns timing. Then `scheduledFor` should go, and your job is deciding
  *what* enters the queue and in what order, not when it fires.
- We own timing. Then pass `scheduled_at` to Buffer explicitly, populate
  `scheduledFor` as the source of truth, and reconcile the two.

Either is defensible. Having both silently is not.

## Ride the cron rhythm that already exists

There are eleven cron endpoints in `server/_core/index.ts`, all Bearer
`CRON_SECRET`. The two that matter here:

- `POST /api/cron/harvest-generation`, hourly, runs `runGeneration()`
  (`MAX_AUTO_DRAFTS_PER_RUN` 3, `READY_BACKPRESSURE_LIMIT` 15,
  `RIPENESS_THRESHOLD` 0.6).
- `POST /api/cron/harvest-digest`, weekly, runs `runWeeklyDigest()`, which now
  also returns `notesDue`: published surfaces still missing a `weekly_note`.

The analytics loop was deliberately hung off the weekly digest rather than
given its own schedule. Please extend that rhythm instead of adding a twelfth
cron. If you genuinely need a new one, read the `regen-railway-crons` skill
first: there are three specific traps documented there (shell expansion, silent
401, secret drift) that have bitten this repo before.

## Ground rules for the work

- **Migrations are hand written.** `drizzle-kit generate` is banned in this
  repo; the journal is frozen at 0047 and generating would try to recreate
  every existing table. Write `drizzle/0218_*.sql` by hand per
  `drizzle/README.md`, then update `drizzle/schema.ts` to match. Apply with
  `npx tsx scripts/run-migration.ts drizzle/0218_*.sql`.
- **LLM calls go through `server/_core/llm.ts`** (`invokeLLM`, ADR-43), never a
  raw fetch to OpenRouter. That layer owns provider failover and the site-wide
  daily cost circuit breaker. Tag the tier: `light` for classification and
  extraction, `standard` for writing in voice.
- **The tree is shared.** Rye works in it concurrently and commits mid-session.
  Stage only your own paths, never `git add -A`.
- **UI changes can be verified now.** `pnpm ui:harness` for a dev server on
  :5199, `pnpm ui:shots` to screenshot. Add a story in `harness/stories.tsx`;
  `@/lib/trpc` is stubbed, so no server or database is needed. See
  `harness/README.md`.

## What good looks like

When you are done, someone should be able to answer these without reading code:
who decides when a post fires, what happens to the first comment, and what
stops a factually wrong draft from being scheduled. If any of those three has
two answers, the system is not yet cohesive.

Start by telling me which of the two timing models you are choosing and why,
and what you found already reading or writing `scheduledFor`. Do not start
building until that is settled.
