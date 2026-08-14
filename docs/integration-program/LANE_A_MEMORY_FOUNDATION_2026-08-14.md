# Lane A: the memory foundation

Handoff spec. Written 2026-08-14 against `origin/main` (1428603). Every `file:line` was read, not
inferred. A fresh session should be able to execute this without rediscovering anything.

**Outcome:** "what did we decide about X" is answerable from the village's own record, with zero
third-party dependency, and every assistant call's token cost is recorded.

**Not in this lane:** the `memory` module, the `memory.ask` capability, `server/lib/memory.ts`, any
vendor driver, the credential plane, the webhook receiver. That is Lane B. Lane A touches **no file
under `shared/`**.

---

## Read first

`CLAUDE.md` at the repo root, then `docs/ARCHITECTURE.md`. The house traps section of CLAUDE.md is
not optional reading; several of them are load-bearing below.

---

## Step 0. Environment. No code.

```bash
git worktree add C:/Users/taren/Desktop/Amora/wt-memory -b wt/memory-foundation origin/main
```

Do **not** work in `wt-integrate`. It is the map-artifact lane's home, sits one unpushed commit
ahead, and has neither `node_modules` nor `.env`.

Copy a `.env` in from `C:/Users/taren/Desktop/Amora/gov-overflow` (it has `TEST_DATABASE_URL`), then
`pnpm install --frozen-lockfile`.

**Proof:** `node scripts/check-voice.mjs` exits 0 rather than `ERR_MODULE_NOT_FOUND`, and
`pnpm exec vitest run server/ledger.test.ts` reports passed tests greater than zero rather than
skipped.

Effort: 15 min.

---

## Step 1. Unblock the organize route. It is dead today.

`server/lib/knowledge.ts:508-518`, `relevantSyntheses`, runs:

```
SELECT s.body, r.title, r.recorded_at FROM call_syntheses s JOIN recordings r ON r.id = s.recording_id
WHERE s.is_example = 0 ORDER BY r.recorded_at DESC LIMIT 1000
```

`recordings` has no `recorded_at`. It is created at `drizzle/0028_automation_pipeline.sql:6-18` with
`id, source, external_id, title, url, duration_s, status, created_at`, and the only later ALTER is
`is_example` (`drizzle/0046_standing_examples.sql:32`). A repo-wide grep for `recorded_at` in
`drizzle/` returns two hits, both on `regen_entries`
(`drizzle/0026_health_snapshots_and_regen_entries.sql:30, 32`). MySQL raises `ER_BAD_FIELD_ERROR` at
parse time regardless of row count.

The single caller is unguarded: `const ownVoice = await relevantSyntheses(getPool(), query, 3);` at
`server/index.ts:8690`, inside `POST /api/admin/assistant/organize`. Express is `^4.21.2` and does
not forward async rejections; `server/lib/errors.ts:115-117` registers a process
`unhandledRejection` listener that suppresses Node's default crash. **Expected symptom: the request
never responds.** Confirm that before and after, because it is the proof the lane fixed a live
defect. Nothing in the suite covers it (`grep -rn 'assistant/organize' server/*.test.ts` returns
nothing).

**Fix:**

```
"SELECT s.body, r.title, s.created_at AS recorded_at FROM call_syntheses s JOIN recordings r ON r.id = s.recording_id " +
  "WHERE s.is_example = 0 ORDER BY s.created_at DESC LIMIT 1000"
```

`call_syntheses.created_at` exists (`drizzle/0028_automation_pipeline.sql:40`). Behaviour-preserving:
`SecondBrainHit.recordedAt` is only rendered as a date beside a call title at `server/index.ts:8699`.
Leave `rankSyntheses` and `SynthesisRow` untouched so `server/lib/knowledge.test.ts:351-359` stays
green.

**Proof:** a new test in `server/loop.e2e.test.ts` that POSTs
`{ messages: [{ role: "user", content: "how do we decide things" }] }` to
`/api/admin/assistant/organize` as founder and gets a response (503 `assistant-unavailable` with no
key configured) rather than hanging. This is the first server-side test of the route in the repo.

Effort: 20 min. **Do not proceed until that test is green.**

---

## Step 2. Claim the migration number and write the usage table.

New file `drizzle/0078_assistant_usage.sql`.

**Re-run the three-way scan first.** `ls drizzle/` is two behind reality:
`0076_voice_rates_and_settled.sql` lives on the pushed `wt/foundation-economy` branch, and
`0077_housing_availability.sql` exists only as an untracked file on `wt-housing`'s disk, invisible to
every git command run elsewhere. There are 27 worktrees. A collision already shipped once: both
`0062_characters` and `0062_map_keys`, and both `0063_map_scene_publish` and `0063_profile_body`,
appear in the added-file history.

```bash
git log --all --diff-filter=A --name-only --pretty=format: -- 'drizzle/*.sql' | grep -oE '00[0-9]{2}' | sort -u | tail -5
ls drizzle/*.sql | tail -5
```

Then `ls <path>/drizzle/*.sql` for **every** path in `git worktree list`. That third scan is the only
one that finds 0077. **Never renumber afterwards:** `server/db/migrate.ts` keys the ledger on
filename, so a renamed applied file replays and an `ADD COLUMN` bricks boot.

**House style:** title line `-- 0078: what each assistant call actually cost.`, prose explaining why
token counts cannot be reconstructed from `rate_hits`, `--` comments on their own lines and never
ending in `;` (the splitter cuts on line-final semicolons and this halved a statement in 0015),
`CREATE TABLE IF NOT EXISTS`, trailing `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;` matching
`drizzle/0061_walk_log.sql:47`.

**Columns:** `id` varchar(64) NOT NULL; `village_id` varchar(64) NOT NULL; `mode` varchar(24) NOT
NULL (varchar, not enum: there are already 7 modes and Lane B adds more); `model` varchar(64) NOT
NULL; `key_source` varchar(16) NOT NULL; `user_id` varchar(64) NULL; `input_tokens`,
`output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` int NOT NULL DEFAULT 0;
`iterations` int NOT NULL DEFAULT 1; `stop_reason` varchar(24) NULL; `created_at` timestamp NOT NULL
DEFAULT CURRENT_TIMESTAMP.

`village_id` comes from `instanceIdentity()` (`server/lib/identity.ts:45-59`), minted once at first
boot and deliberately not configurable. It is confirmed in scope: Rye is the single biller across a
library of vendors, so the rollup is a central cross-village query. It and `user_id` are the two
columns that cannot be backfilled.

Indexes with trailing comments naming their query: `PRIMARY KEY (id)`,
`KEY assistant_usage_day_idx (mode, created_at)`, `KEY assistant_usage_user_idx (user_id, created_at)`,
`KEY assistant_usage_village_idx (village_id, created_at)`.
No dedupe column: a nullable column in a MySQL UNIQUE key admits infinite duplicates.

Store **all four** token fields. `input_tokens` is the uncached remainder only, so a naive sum
under-reports the moment anyone enables prompt caching.

This is append-only ops data. It must not touch the double-entry ledger (CLAUDE.md economy
invariants; recognition-kind tokens are non-purchasable).

Effort: 45 min.

---

## Step 3. Capture usage on the existing single-shot path.

`server/lib/assistant.ts`. Add:

```ts
export interface AssistantUsage {
  inputTokens: number; outputTokens: number;
  cacheCreationInputTokens: number; cacheReadInputTokens: number;
}
```

Widen the ok branch of `AssistantResult` (`:201-203`) to carry `usage`, `stopReason: string | null`,
`iterations: number`, `toolsUsed: string[]`. Populate at `:271-277` from `data?.usage` with
`Number(x ?? 0)` per field and `data?.stop_reason ?? null`.

Make them **required, not optional.** An optional field silently produces zero-cost rows when a call
site forgets. Verified safe: every `ok: true` assertion in `server/lib/assistant.test.ts` reads by
property access (`:224, :271, :283`), and the four `toEqual({ ok: false, ... })` assertions
(`:187, :209, :217, :276`) are all on the error branch.

The writer `recordAssistantUsage(pool, {...})` goes in a **new** server lib file, not inside
`assistant.ts`, whose header at `:84` states it takes none of the server's globals and whose ~40 unit
tests run with no database.

Call it from all five sites (`server/index.ts:6930, 8178, 8717, 8970, 12172`) immediately after the
`if (!call.ok)` guard, awaited, logging loudly on failure. Also write one row from the raw synthesis
path after `server/index.ts:9375` with mode `synthesize`: that is the most token-expensive path in
the product (up to 400 transcript segments, max_tokens 2000) and is currently unmetered. Roughly six
lines, no behaviour change.

Add `userId?: string | null` to `AssistantRequest` (`:190-199`) and supply it: concierge has `user`
in scope from `:6878`, studio has `actor` at `:8916`, launch and organize need an
`await authedUser(req)`, proposal passes null. **`user_id` cannot be backfilled once rows exist**, so
it goes in from day one even though nothing enforces a per-user ceiling yet.

**Proof:** run the demo question, then
`SELECT mode, model, input_tokens, output_tokens, iterations FROM assistant_usage ORDER BY created_at DESC LIMIT 5`
returns a row with non-zero tokens. Plus a unit test asserting a reply with no `usage` object yields
zeros, not NaN.

Effort: 3 h.

---

## Step 4. The derivation job.

`server/lib/villageBrain.ts`, three new exports.

**(a) `decisionToRecord(row)`**, a pure function placed after `capMarkdown` (`:68-75`) and before the
Reads banner (`:148`). Maps one decision thread to a `RecordAppend` with `section: "decisions"` (a
real `BRIEF_SECTIONS` id, `shared/villageBrief.ts:99`) and `source: "decision"` (already in
`RECORD_SOURCES`, `shared/villageBrief.ts:152`, and in the SQL enum at
`drizzle/0052_village_brain.sql:72`, so **no `shared/` edit and no migration**).

`occurredAt` comes from `meta.decidedAt` **only** when `Number.isFinite(d.getTime())` and the year is
1990-2037, else `created_at`. Never `new Date()`. `occurred_at` is a MySQL timestamp (range
1970-2038) and `meta` is unvalidated client JSON: `server/index.ts:5645` spreads the client's object
*after* the default, so anyone holding `proposal.open` chooses `decidedAt`.

**(b) `decidedThreadsToDerive(pool, limit = 200)`** in the Reads section after `recordSummaries`
(`:192-209`):

```
SELECT id, title, body, meta, created_at, last_reply_at FROM forum_threads
WHERE kind = 'decision' AND is_example = 0 AND hidden_at IS NULL AND locked_at IS NOT NULL
ORDER BY created_at ASC LIMIT ?
```

Then the `typeof meta === "string"` JSON.parse guard copied from `server/index.ts:5525-5526`, then
filter `meta?.status === 'decided'` in JS.

`locked_at IS NOT NULL` is the forgery filter. The decide route sets meta and `locked_at` in one
update (`server/index.ts:5931`); the create route's INSERT sets no `locked_at` and spreads the
client's meta after the default (`:5645`). That is the only structural fingerprint separating a real
decision from a forged one.

`ORDER BY created_at ASC` so successive daily runs walk a backlog forward. Newest-first with a LIMIT
means a village with 500 historical decisions files 200 on day one and the rest never.

**(c) `deriveDecisions(pool)`** returning `{scanned, created, alreadyDerived, lost}`. Do not swallow
errors: `server/lib/scheduler.ts:58-66` is the right handler and routes to `reportError` for free.

Two silent data defects in `recordAppend` this will hit. First, `record_dedupe_idx (source,
source_ref)` is a **plain KEY, not UNIQUE** (`drizzle/0052_village_brain.sql:80`) and `source_ref` is
nullable (`:73`), so dedupe is a SELECT-then-INSERT with no constraint behind it. Second, the slug is
`<YYYY-MM-DD>-<source>-<slugified title>` with no id (`villageBrain.ts:331-333`) against
`UNIQUE KEY record_slug_uq (slug)` (`0052:78`), so two decisions with the same title on the same day
collide: the second hits `ER_DUP_ENTRY`, the catch at `villageBrain.ts:346-347` returns
`{created: false, slug}` where the slug belongs to a **different** decision, and the caller cannot
tell "already derived" from "lost the race". So count, per row, whether `(source, source_ref)` was
already present *before* calling `recordAppend`, and report `created`, `alreadyDerived` and `lost`
separately. Any non-zero `lost` goes into the job's return string.

**Registration.** Extend the existing import at `server/index.ts:302-305` (do not add a second import
from the same module). Register between the `});` closing recording-rss at `:3683` and the comment at
`:3684`:

```ts
registerJob("record-derive", 24 * 60 * 60 * 1000, async () => {
  if (effectiveLifecycle("forum") === "off") return "forum module off";
  // getPool() and everything else INSIDE the closure
});
```

**The module check and `getPool()` must be inside the closure.**
`await loadModuleSettings(getPool())` is at `server/index.ts:3691`, *after* the whole registerJob
block (3342-3683). Until it runs, the settings Map is empty and `storedLifecycle` returns `off` for
every non-core module (`server/lib/modules.ts:70`). `forum` is not core. A check evaluated at
registration time is `off` permanently for the process's life, because `registerJob` captures a value
and not a call. Every existing job uses the inside-the-closure idiom (`server/index.ts:3369, 3443,
3482, 3519, 3569, 3657, 3663`).

**Proof:** pure unit tests for the `decidedAt` fallback, the missing-`decidedBy` shape
(`server/seeds/examples-seed.json:321-324` has neither), a 200+ char title, and an all-punctuation
title (`slugify`'s fallback at `villageBrain.ts:59`). Plus a DB-backed test running `deriveDecisions`
twice over the same fixture, asserting the second run reports `created: 0` with an unchanged row
count, and that an `is_example = 1` thread is never derived.

Effort: 4 h.

---

## Step 5. The reader that answers the question.

None of the seven existing readers reads `village_record` (`server/lib/villageReaders.ts:154, 170,
188, 205, 225, 241, 261`). Without this step the job fills a table the tool loop cannot see and the
lane's outcome is unprovable.

Append `record.decisions` to the READERS array between the `badges.all` entry ending at `:278` and
the closing `];` at `:279`.

`audience: "member"` (so the follow-up member route is a route and nothing else), no `module` key
(the brain is core, `villageReaders.ts:50-51`), no capability, `maxTokens: 800`.

**Zero arguments.** `callReader(key, ctx)` takes no input (`villageReaders.ts:99-102`) and
`VillageReader.read(ctx)` takes only ctx (`:58`). Widening them breaks three test files that import
those names, and `pnpm check` will not catch it because `tsconfig.json` excludes `**/*.test.ts`.
Return an **array** of the newest ~25 rows (title, occurred_at, truncated body, source) and let
`capTokens` (`:112-127`) degrade it to `{items, truncated: n}`. The model does the selecting from the
fenced list. Argument-taking readers are a deliberate follow-up.

```
SELECT ... FROM village_record WHERE section = 'decisions' AND is_example = 0
ORDER BY occurred_at DESC, created_at DESC LIMIT 25
```

**Write the SQL as double-quoted string literals joined with `+`.** The `is_example` scan at
`server/lib/villageReaders.test.ts:162-164` matches only `/"SELECT[^"]*"(?:\s*\+\s*"[^"]*")*/g`. A
backtick template literal, or SQL opening with a WITH clause, is invisible to it: it does not fail,
it is simply never checked, and the floor at `:177` stays satisfied by the seven existing readers.

The `describe` line is the model-facing tool description and is **shipped copy** through
`scripts/check-voice.mjs`. One plain sentence, no dashes, no contrast framing.

**Proof:** `READER_KEYS` length goes 7 to 8; a DB-backed test asserts derived rows come back and
example rows do not; `callReader("record.decisions", ctx)` with a non-admin viewer returns data
rather than a refusal.

Effort: 1.5 h.

---

## Step 6. The tool loop, with no route passing tools yet.

`server/lib/assistant.ts`.

Add an internal, not exported, `type WireMessage = { role: "user" | "assistant"; content: string | any[] }`.
Leave `ChatMessage` (`:79-82`) and `sanitizeMessages` (`:156-166`) untouched: the loop builds
`WireMessage[]` from the sanitized `ChatMessage[]` and never feeds arrays back through the validator,
whose `typeof m.content === "string"` filter would drop them.

Add optional `tools?` and `runTool?(name)` to **`AssistantRequest`** (`:190-199`), not to
`AssistantDeps` (`:86-93`). The reader ctx is per-viewer; a module-level dep would make it global.

**Tool names cannot contain dots.** Anthropic requires `^[a-zA-Z0-9_-]{1,128}$` and every reader key
has a dot. Sending them raw is a 400 on the first request, which `assistant.ts:266-270` maps to a
generic 502 with the upstream body only in a `console.error`. Build the `roles.all` ↔ `roles_all`
mapper and its round-trip test over `READER_KEYS` **before** the first live call, plus a one-line
test asserting every generated name matches the regex.

**Restructure `callAssistant` (`:225-282`).** Keep the mode lookup (`:226-227`), the per-IP burst
check (`:229-231`) and the key resolution (`:238-239`) before the loop. **Delete** the pre-loop
day-budget check (`:233-236`) and platform-cap check (`:243-248`) and place exactly one of each
inside the loop, immediately before each POST. `overLimit` counts and inserts in the same call
(`server/index.ts:3175-3180`), so leaving the originals in place double-charges the bucket.

The ceiling is a local integer: `for (let i = 0; i <= spec.toolCalls; i++)`. It must **not** be a
bucket check, because `server/index.ts:3186-3189` catches any DB error and returns false, failing
open. In a loop that delegates its ceiling to the rate limiter, one DB hiccup is unbounded spend.

Send `tools` only when `req.tools?.length && spec.toolCalls > 0`. Send
`tool_choice: { type: "auto", disable_parallel_tool_use: true }` on non-final iterations and
`tool_choice: { type: "none" }` with tools still present on the final one. No `anthropic-beta`
header: tool use is GA under the `anthropic-version: 2023-06-01` already sent at `:256`.

On `stop_reason === 'tool_use'`: push `{ role: "assistant", content: data.content }` **raw** (the
joined text loses the tool_use ids and the next request 400s), then one user turn carrying all
results as `{ type: "tool_result", tool_use_id: b.id, content: fenceForPrompt(key, data) }`, or
`{ ..., content: r.error, is_error: true }` on a refusal. `callReader` applies `capTokens` but not the
fence (`villageReaders.ts:99-109`), so fencing every tool result is the loop's job and is
non-negotiable.

Sum usage across iterations; return the total plus `iterations` and `toolsUsed`.
`console.warn` when the loop exits with `stopReason` still `tool_use`.

**`parseJsonReply` turns a broken loop into a 200 with a plausible sentence.** It returns the
caller's fallback on empty text with no error (`:176-186`). If the budget runs out while the model
still wants a tool, the last response has no text block, `:272-276` joins to `''`, and organize's
fallback (`server/index.ts:8721-8723`) serves a fluent, on-brand, entirely model-free sentence at
HTTP 200. Nothing logs. The three fixes above (`tool_choice: none` on the final turn, returning
`stopReason` and warning, and asserting a sentinel string in the test) are all required.

**Upgrade the unit harness.** `server/lib/assistant.test.ts:27-47` returns the identical payload for
every `fetchImpl` call, with no `stop_reason` and no `usage`. A loop reading `data.stop_reason` sees
undefined on iteration 1, breaks immediately, and all ~40 tests pass without executing a tool turn.
Add `replies?: any[]` shifted per call, falling back to `opts.reply`; every existing test stays
byte-identical because none passes `replies`.

**Proof:** unit tests for a two-iteration happy path (`bodies[0].tools` non-empty; `bodies[1].messages`
ends with a `tool_result` whose `tool_use_id` matches), budget exhaustion (final body carries
`tool_choice: none`, text non-empty), a refusal riding back as `is_error`, and
`h.buckets.filter(b => b.startsWith("assistant-day:organize:")).length === 2`. All five routes still
behave identically because none passes `tools` yet.

Effort: 6 h.

---

## Step 7. Wire organize, and prove it over HTTP.

`server/index.ts:8678-8733`. Organize is the right first mode: it is the only routed mode with a
non-zero declared `toolCalls` (2, `assistant.ts:61`) that also has a live client
(`client/src/pages/JourneyToLaunch.tsx:74`) and a transparency channel the UI already renders
(`server/index.ts:8728-8731` into `JourneyToLaunch.tsx:126-129`).

Explicitly not first: **proposal** (public, 250/day, and its `complete`/`proposal` fields gate a form
submission, so an empty final turn makes proposals unsubmittable); **concierge** (a tie-break whose
whole design is that most questions cost zero tokens); **launch** (`toolCalls: 0`); **studio**
(`toolCalls: 4` but no client caller anywhere).

Add `const actor = await authedUser(req)` (the route gates on `isAdmin` at `:8679` and resolves no
user at all, unlike studio at `:8916`; note `isAdmin` at `:1142-1147` stashes the user on
`(req as any).adminUser`, so `adminActor(req)` at `:1150-1153` is a cheaper second source). Then
`const ctx = await capabilityCtx(actor)` (`:2375`, pattern at `:8748-8750`) and a `ReaderViewer`
`{ id: actor?.id ?? null, isAdmin: true, holds: (cap) => hasCapability(cap, ctx) }`.

Pass `tools` built from `readerCatalog(viewer)` using each reader's `describe` as the description and
the mapped key as the name, and `runTool: (name) => callReader(toolNameToKey(name), { pool: getPool(), viewer })`,
into the existing `callAssistant` call at `:8717-8719`.

Extend `consulted` (`:8728-8731`) with `readers: call.toolsUsed ?? []`. Keep `references` a string
array: `JourneyToLaunch.tsx:129` does `.join("; ")` and would render `[object Object]` if the shape
changed under it.

**The acceptance test.** `server/loop.e2e.test.ts:2581-2606` is the only Anthropic stub in the repo
and it proves nothing as written: it returns the same payload for every request and ignores the body
it collects, so it can never emit a `tool_use` turn; and its content block is
`content: [{ text: ... }]` with **no `type` field**, so `assistant.ts:273`'s `b?.type === 'text'`
filter yields `text === ''` and the silent-fallback hazard fires.

Write a new request-aware stub in its own `it()`, placed **after** the S54 block (2480-2683), because
port 3783 is single-occupancy: the child server is spawned once with
`ANTHROPIC_BASE_URL: "http://127.0.0.1:3783"` (`:115`) and S54 binds and closes 3783 inside its own
try/finally (`:2606, 2670-2673`). `vitest.config.ts` sets `fileParallelism: false` and CLAUDE.md
forbids isolating with `vitest -t`. Bind 3783 only inside your own try, close in a finally, set the
key with `PUT /api/admin/email-config { assistant_api_key: "test-key" }` and clear it in the finally
exactly as S54 does (`:2611, 2672`), or the key leaks into later tests in the same child process.

The stub parses the collected body: if `body.tools` is present and the last message is not a
tool_result, respond
`{ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_1', name: 'record_decisions', input: {} }], usage: {...} }`;
otherwise
`{ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ reply: 'SENTINEL_SECOND_TURN' }) }], usage: {...} }`.
**Every content block must carry `type`.**

Six assertions:

1. the stub saw exactly 2 requests
2. request 1 carried a tools array containing `record_decisions`
3. request 2's last message is role user with `content[0].type === 'tool_result'`,
   `content[0].tool_use_id === 'toolu_1'`, and its content contains `<village-data reader="record.decisions">`
4. the route's `reply` equals `SENTINEL_SECOND_TURN`, not response 1
5. `consulted.readers` contains `record.decisions`
6. `SELECT COUNT(*) FROM rate_hits WHERE bucket = 'assistant-day:organize:<today>'` equals exactly 2

Assertion 6 is the only one a loop that silently fell back to single-shot cannot satisfy.

Effort: 5 h.

---

## Step 8. Show the citation.

`client/src/pages/JourneyToLaunch.tsx:126-129`. Add a rendered line for `m.consulted.readers` beside
the existing `references.join("; ")` and `ownRecord`, guarded so an older cached response with no
`readers` key still renders. This page is the only consumer of `consulted` in the client. It is in
the brand ratchet zone.

Effort: 45 min.

---

## Step 9. Gates, in CI order, cold.

Eleven, not the five CLAUDE.md names:

```bash
pnpm check
rm -f node_modules/typescript/tsbuildinfo && npx tsc -p tsconfig.tests.json --noEmit
node scripts/check-brand-refs.mjs
node scripts/check-voice.mjs
node scripts/check-auth-fetch.mjs
node scripts/check-artifact-budget.mjs
pnpm build
pnpm test
pnpm audit --prod --audit-level high
```

Plus the bundle-budget block from `.github/workflows/ci.yml` (MAX_MAIN_JS_KB=700,
MAX_TOTAL_DIST_KB=6000).

Notes that cost sessions:

- **`pnpm check` cannot see this lane's breakage.** `tsconfig.json` excludes `**/*.test.ts`, and Lane
  A changes exported signatures in exactly the three files with existing pure tests importing them by
  name. `tsconfig.tests.json` is a **blocking CI gate CLAUDE.md does not list**, and it must run cold:
  the incremental cache does not re-check files whose dependencies did not change.
- **The brand ratchet has zero headroom.** A read-only run reports 63 references against a baseline of
  63, exactly at the cap. Zones include `server/index.ts`, `client/`, `drizzle/`, `scripts/` and every
  `*.test.ts(x)` file, which is the new migration, the new tests and the index.ts edits. One village
  name in a migration comment, a fixture or a sample question inside a tool description fails CI.
  Read `$?`, never `tail -1` (a failing run's last line is blank). Never `--update-baseline`.
- **The voice gate polices the new strings.** `server` is in its scan roots and tests are exempt, so
  the reader's `describe` line and the job's return string are shipped copy.
- **The brain tripwire is a raw source-text scan.** `server/lib/villageBrain.test.ts:42-48` asserts
  that `feedback.ts`, `network.ts` and `villageExport.ts` do not contain the literals `village_brief`,
  `village_record`, `village_brief_revisions`, `briefAll` or `recordSummaries`. Even a comment
  mentioning them fails the suite.
- **Add no dependency.** Everything the loop needs is raw fetch, which `assistant.ts:250` already
  uses. CI runs Node 22 and this box is on 25.x.

---

## Acceptance

### The demo, live, against real decision threads

1. Open a forum decision thread and record an outcome through `POST /api/forum/threads/:id/decide`
   (`server/index.ts:5914`) so meta and `locked_at` are set together.
2. Trigger the job, confirm the row:
   `SELECT slug, title, occurred_at, source_ref FROM village_record WHERE source = 'decision' ORDER BY created_at DESC LIMIT 5`
3. In JourneyToLaunch's organize tab ask "what did we decide about \<topic\>" and get an answer that
   names the decision and shows `record.decisions` in the consulted line.
4. Ask again and show the token cost of both.

Screenshot step 3. The citation line under the answer is the entire user-visible deliverable.

### Five numbers to report back. These feed the vendor negotiation.

1. **The corpus.** `SELECT COUNT(*) FROM forum_threads WHERE kind = 'decision'`, then the same with
   `AND is_example = 0 AND hidden_at IS NULL AND locked_at IS NOT NULL AND JSON_EXTRACT(meta, '$.status') = 'decided'`.
   Report both. The gap is the number of threads that look like decisions and are not, and it is the
   first honest measure of whether this village has a record worth selling memory against.
2. **The derivation yield.** `{scanned, created, alreadyDerived, lost}` from run one and run two. Run
   two must report `created: 0` with an unchanged row count. Any non-zero `lost` is the slug collision
   and must be reported, not hidden.
3. **The cost of one past-tense answer.** From `assistant_usage`: `iterations` (must be 2 for a
   tool-using turn), the four token fields and their total. Convert to USD using the current published
   price for whatever `model` string the row actually holds. Report the same for a non-tool question
   in the same mode, so there is a delta for what a memory lookup costs over a plain answer.
4. **The spread.** Ask ten past-tense questions, then `COUNT(*)`, `AVG`, `MAX` of
   `input_tokens + output_tokens` over the last hour. Report how many of the ten actually triggered a
   tool call (`iterations = 2`) versus answered from the prompt alone. That ratio is the real
   per-question cost of the memory feature. A single sample is not a negotiating position.
5. **The budget arithmetic that changed.** Organize's `dailyBudget` of 50 now means 50 upstream calls,
   roughly 25 tool-using conversations, because the day-bucket check moved inside the loop. Report
   `SELECT COUNT(*) FROM rate_hits WHERE bucket LIKE 'assistant-day:organize:%'` after the ten-question
   run: it must equal the number of upstream POSTs, not the number of questions.

### Proving the green is not hollow

1. `.env` exists in the working worktree and contains `TEST_DATABASE_URL`. Without it, 19 of 60 test
   files skip behind `describe.skipIf(!testDbConfigured())` (`server/db/testDb.ts:70-72`), including
   `loop.e2e.test.ts`, the acceptance criterion, and the summary still says passed.
2. The vitest Duration is in **minutes**. Provisioning alone costs about 1.25s per migration file
   across 74 files.
3. The skipped count equals a baseline captured **before** any edit.
4. `pnpm exec vitest run server/loop.e2e.test.ts` alone reports passed tests greater than zero.
5. Quote the result of acceptance assertion 6 (the `rate_hits` count) in the handback.

Note the lane's own three unit files are pure and pass with no database, so a session can watch its
own new tests go green having never once exercised the migration, the job, or the loop over HTTP.

### Report what was not proven

No member-facing surface exists, so members cannot ask anything yet. The concierge prompt still
injects member-written quest titles, descriptions and tags unfenced (`server/index.ts:6912-6914`).
`member` and `synthesize` modes remain declared with no routes. The per-user token ceiling is
measured and not enforced.

---

## Deliberately out of scope

- **A member-facing route.** Lane A.2, immediately after. The outcome is provable through organize
  today. Making the `record.decisions` reader `audience: "member"` now means A.2 is a route and
  nothing else. Do not read `member: { toolCalls: 2 }` at `assistant.ts:59` as an instruction.
- **A per-mode model override.** The model id is hardcoded in three places (`assistant.ts:77`,
  `server/index.ts:9357, 9393`) but they agree, so the billing rollup stays self-consistent.
- **The five hardcoded "Maia" surfaces.** A real white-label defect, unrelated to memory, spanning
  four files that other lanes are actively editing. Its own task.
- **Retrofitting `fenceForPrompt` onto existing prompts.** True defect, own task, with
  `server/index.ts:6912-6914` as the entry point. The loop fences by construction, which is free.
- **The forum meta forgery vector** (`server/index.ts:5645` spreads client meta after the default, so
  anyone holding `proposal.open` can publish a thread that already reads as decided). Lane A filters
  around it with `locked_at IS NOT NULL`. Fixing the create route is a forum authorization task.
- **Fail-closed rate limiting and a per-user ceiling.** Measure, do not enforce. Flipping
  `server/index.ts:1061` closed makes a DB hiccup return 503 on the public proposal intake, which
  `assistant.ts:17-21` exists to protect.

---

## Lane protocol

Lane B (the vendor lane) runs concurrently. Both branches cut from `origin/main` (1428603).

- **Separate worktrees.** Lane B uses `wt-memory-vendor` on `wt/memory-vendor`. Neither lane works in
  `wt-integrate`.
- **`shared/` is 100% Lane B.** Lane A touches no file there, and needs nothing there: `decisions` is
  already a `BRIEF_SECTIONS` id, `decision` is already in `RECORD_SOURCES` and in the SQL enum, and
  Lane A adds no module and no capability. This is the single biggest de-collision available and it
  is a hard rule.
- **`server/index.ts` is owned by zone.** Lane A: the wiring block at 1047-1062; the job block
  appending after `});` at 3683; the five callAssistant sites at 6930, 8178, 8717, 8970, 12172 and the
  organize body 8678-8733; the raw synthesis path 9351-9393. Lane B: imports at 214, 315, 320-324; the
  secrets boot block **narrowed to 1032-1046 and 1063-1084**; admin integrations 12056-12087. Lane A's
  wiring sits inside Lane B's original block, which is why it is narrowed. Both lanes leave a one-line
  marker comment at the boundary.
- **New routes go in named places.** Lane A appends after the assistant routes at 12093-12126. Lane B
  appends after its integrations block at 12087.
- **Lib file ownership is exclusive.** Lane A owns `assistant.ts`, `villageReaders.ts`,
  `villageBrain.ts`, `knowledge.ts` and the new usage writer. Lane B must not import from
  `villageReaders.ts`; if it needs readers it asks for an exported surface at merge time.
- **Migration blocks allocated once:** Lane A takes 0078, Lane B takes 0079-0080. Both run the
  three-way scan first. Never renumber.
- **Stage with `git add -p`, never `git add .`,** and never write a file wholesale. `wt-housing` holds
  9 uncommitted entries including +242 lines in `server/index.ts`; `wt-doors` holds 9,
  `wt-map-inspector` 13, `wt-map-overlays` 4.
- **Announce before any full `pnpm test`.** Every `.env` points `TEST_DATABASE_URL` at the same MySQL
  host and the harness provisions a fresh scratch schema per suite. Treat a first "Hook timed out" as
  load, re-run that file alone once, then debug it as code.
- **Merge order:** Lane A merges to main first. Lane B rebases onto the merged main and reconciles
  `server/index.ts` once, by hunk. Before either merge, use `git cherry main <branch>`, not
  `git diff --stat main...branch`, which counts the other side's commits.
- **A push is not a green.** A direct push to main lands before verify reports. `gh` is installed:
  read the run afterwards.

---

## Decisions for Rye, each with a default so nothing blocks

1. **Migration blocks.** Lane A 0078, Lane B 0079-0080. *Default: confirm in one message to both
   lanes.* If you cannot, the lanes take 0080/0081 and lose two numbers.
2. **Does `dailyBudget` still mean upstream calls?** *Default: yes, move the check inside the loop.*
   Organize's 50 stays 50 real Anthropic calls and the number you bill against stays honest. Accept
   out loud that 50 becomes roughly 25 tool-using conversations. The alternative turns organize into
   up to 150 upstream calls and studio's 150 into up to 750, invisibly, which is the kind of silent
   multiplier a single biller cannot carry.
3. **Does the per-IP burst guard move inside the loop?** *Default: no.* It is an abuse guard about a
   caller, not a spend guard, and organize is admin-only where every founder shares one office IP.
4. **Does `assistant_usage` carry a `village_id`?** **ANSWERED: yes.** Rye is the single biller across
   a library of vendors, so the rollup is a central cross-village query and not a per-deployment
   export. Source it from `instanceIdentity()` (`server/lib/identity.ts:45-59`), which is minted once
   at first boot and deliberately not configurable, so it is stable and not spoofable by config.
   Column: `village_id` varchar(64) NOT NULL, written on every row, with
   `KEY assistant_usage_village_idx (village_id, created_at)`. Note this is the one column that cannot
   be backfilled, which is why it goes in ahead of the billing work that will read it.
5. **Member route in Lane A or A.2?** *Default: A.2, immediately after.* Say whether that is the same
   session or a different one.
6. **Does Lane A fix the forum forgery vector?** *Default: no, filter around it and spawn the fix the
   same day.*
7. **Per-user token ceiling: what number?** *Default: measure, do not enforce.* Give the number after
   reading acceptance number 4.
