# The memory module, the module library, and where the paywall actually lives

Prepared 2026-08-14, verified against `origin/main` (1428603). Every claim carries a `file:line`.
Companion to `SABERRA_INTEGRATION_REVIEW_2026-08-14.md`.

---

## The correction

I told you the paid tier sits on three off-switches: module lifecycle, capability, secret. That
framing is wrong in a way that matters.

**The module flag is a good feature switch and a poor paywall.** `setModuleLifecycle` has seven
refusal paths and not one of them makes a network call, reads a secret, or checks a licence
(`server/lib/modules.ts:203-269`). The actor is a local admin or founder JWT
(`server/index.ts:1142-1147, 5215-5228`). And a fork owns its own source tree, where
`shared/modules.ts` is a plain exported array, so any guard you add can be deleted from the village's
own checkout. There is also no remote lever at all: the lifecycle cache loads once at boot with no
TTL, no reload route, and no cross-process notification (`modules.ts:42-66`, sole caller
`server/index.ts:3691`).

So the flag answers "is this village running memory." It can never answer "did they pay."

**The credential is the entitlement.** That is the one plane where you hold something the fork
cannot edit, and the platform already ships the exact pattern: `PLATFORM_ASSISTANT_KEY` resolves
through `resolveKey` (`server/lib/assistant.ts:113-128`), is metered separately by
`platformDailyCap` (`:139-144`), and is deliberately kept **out** of `SECRET_KEYS` (`:23-28`) so no
fork admin ever sees it.

Keep the module flag and the capability. Just stop thinking of them as the paywall. They are
configuration; the key is the licence.

---

## The one decision that determines everything else

You said "they need to pay Saberra to unlock it." That sentence picks a credential plane, and the
credential plane decides who holds the off-switch. Pick it deliberately.

**Option A: you resell.** The Saberra key is platform-provisioned, lives in `process.env` only,
never enters `SECRET_KEYS`, and is metered by its own daily cap. Rotation is instant revocation and
needs no cooperation from the fork. This is the `PLATFORM_ASSISTANT_KEY` pattern exactly.

**Option B: the village contracts Saberra directly.** The key becomes a `SECRET_KEYS` entry
(`server/lib/secrets.ts:26-46`) that the village pastes into its own Integrations card, and **you
hold nothing.** No off-switch, no meter, no churn signal. That is a coherent marketplace posture,
and it means the memory module is integration work you did once, not a tier you own. Price it that
way.

**Never both for the same credential.** `secretStatus` reports source and last4 to every fork admin
(`secrets.ts:109-117`), so a resold key in `SECRET_KEYS` shows a village the last four characters of
a key that is not theirs.

My recommendation stands: Option A for Saberra as the first module, because you need the reference
deal, the price discovery, and the leverage. Move toward Option B once the library has three or more
entries and its own gravity. The mechanism is the same either way, which is why you can build now
and decide the money later.

---

## What this means for the module library

The idea is stronger than I realised, because the catalog is already half-built as data.

- `shared/modules.ts` is already a **platform catalog**: 18 modules, 4 core, 14 optional, each with
  founder-facing name, description, `requires`, `recommends`, `capabilities`, `variableKeys`,
  `apiPrefixes` (`shared/modules.ts:62-430`). The header already declares this copy is platform
  language, "never one village's brand" (`:8-9`).
- Optional modules already ship OFF by absent row (`drizzle/0015_module_framework.sql:4-6`), so
  every existing fork inherits a new catalog entry dark, with no migration.
- `module_events` is already an append-only audit of every flip with the actor
  (`0015_module_framework.sql:21-33`).
- **You already have distribution telemetry without building any.** `/api/platform/info` and
  `/.well-known/village.json` publish which modules a village runs at rank `members` or above
  (`server/index.ts:8019-8022, 16308-16317`), keyed to a non-configurable instance identity minted
  at first boot (`server/lib/identity.ts:45-59`). That is a village-consented, read-only signal of
  who has what installed, with no phone-home to write.

Four things to get right when the library becomes a real surface:

1. **Connectors, not apps.** Every entry is first-party code in your repo that talks to a third
   party over HTTP behind a credential. No third-party code in a fork's Express process.
2. **The brand guard will not police vendor names, and you may assume it does.**
   `scripts/check-brand-refs.mjs` bans four *village* names (`:36-41`), so "Saberra" and "Sera" are
   invisible to it in every zone. The "platform copy, never one village's brand" rule in the
   registry header is a convention, not a gate. If the library lists vendors, either extend the
   guard or keep vendor names out of `shared/modules.ts` entirely and put them on the Integrations
   card (`client/src/pages/Admin.tsx:1386-1391`), where an admin reads them and a member does not.
3. **The entry contract is where you win.** Require of any module that feeds Maia: verbatim quote,
   source anchor, timestamp, or it does not render. That is your existing bar
   (`drizzle/0028_automation_pipeline.sql:55-68` makes quote and timestamp `NOT NULL`). Saberra
   meets your standard to be listed; you do not lower yours to accept them.
4. **`preview` is a trap for a trial.** `moduleActivity()` drops every Pulse event below rank
   `members` (`server/lib/modules.ts:303-312`), so a module trialled in `preview` writes nothing to
   the Pulse and looks inert exactly while it is being evaluated. Trial at `members`.

---

## Do this before the negotiation, not after

**Local past-tense memory is roughly 20% wired, and finishing it takes about a week.** This is the
highest-leverage thing in the whole conversation, because it converts your alternative-to-buying
from a promise into a demo.

What already exists and has no callers:

- `village_record` has the right schema and a working `(source, source_ref)` idempotency key
  (`drizzle/0052_village_brain.sql:64-88`); its only writer `recordAppend` has **zero callers**
  (`server/lib/villageBrain.ts:322-349`). Its own docstring promises "derivation runs on a schedule"
  and none of the 13 `registerJob` calls derives records, so the table is empty in every deployment.
- `village_brief_revisions` is written transactionally so "since when" is answerable, and no code
  path ever SELECTs it (`villageBrain.ts:268-270`).
- Forum decision threads already carry `{status, outcome, decidedBy, decidedAt}`
  (`drizzle/0019_forum.sql:13-16`) and reach no prompt.
- `ASSISTANT_MODES.toolCalls` budgets 2/4/2 reader calls per turn (`server/lib/assistant.ts:47,
  56-64`) against an engine that posts once with no tools (`:225-282`).
- Seven gated, token-capped, prompt-fenced readers with zero callers
  (`server/lib/villageReaders.ts:152-279`).

Steps 1 to 3 below get you to "what did we decide about X" answerable with no vendor at all. Walk
into the meeting able to say: *we answer that today; what we would pay you for is depth and
cross-village synthesis.*

---

## Build list

### Before the negotiation (about a week)

**1. Wire the tool loop that already has a budget.** (2-3 days)
Add a bounded loop to `callAssistant` (`server/lib/assistant.ts:225-282`) spending
`ASSISTANT_MODES[mode].toolCalls`, calling `readerCatalog(viewer)` and `callReader`
(`server/lib/villageReaders.ts:91-109`), wrapping every result with `fenceForPrompt` (`:135-143`).
Deps are already injected at `server/index.ts:1044-1050`. Move the per-IP and daily-budget checks
*inside* the loop, per iteration. This converts 279 lines of dead-but-correct gating into the
product, and it is the capability Saberra is otherwise being paid to supply.

**2. Fill the past tense with what you already own.** (1-2 days)
Register a derivation job beside network-sync (`server/index.ts:3656-3660`) over `forum_threads
WHERE kind='decision'`, writing through `recordAppend` with `(source='decision',
source_ref=thread_id)`. Gate it `if (effectiveLifecycle("forum") === "off") return;`. **It must be
registered after `initStores()` / `loadModuleSettings` (`server/index.ts:3691`)** or it silently
reads platform defaults. Then add a `decisions.recent` reader at `villageReaders.ts:152`.

**3. Read what is already written.** (0.5 day)
Add a `brief.history` reader over `village_brief_revisions`, audience and `maxTokens` set like its
neighbours (`villageReaders.ts:46-59`).

### The module and its gates

**4. Add the `memory` module, shipping off.** (0.5 day)
One `ModuleDef` appended at `shared/modules.ts:426`: `{id:"memory", requires:[],
recommends:["forum"], capabilities:["memory.ask"], variableKeys:["memory.enabled"],
apiPrefixes:["/api/memory"]}`. No `openStateCheck`: memory holds no debt, per the messaging rule at
`shared/modules.ts:192-197`. Mount `app.use("/api/memory", requireModule("memory"))` beside
`server/index.ts:5323`. Gates: `description` is voice-scanned (`check-voice.mjs:49` covers
`shared/`; `NON_COPY_KEYS` spares `name` only). Add `docs/modules/memory.md` **and** a `MODULE_DOCS`
key (`server/lib/knowledge.ts:281`) together or neither, or Maia's admin prompt lists the module as
having no written contract (`server/index.ts:8691, 8704`).

**5. Add `memory.ask` in lockstep.** (0.5 day)
Three files: the union (`shared/capabilities.ts:21-41`), `ALL_CAPABILITIES` (`:48-69`), and
`CAPABILITY_CONSEQUENCE` (`shared/draftKinds.ts:105`). Only the third is a total
`Record<Capability,...>`, so it is the **only compile error**. Omitting it from `ALL_CAPABILITIES`
compiles clean and silently makes the key ungrantable by badges and invisible in the Admin badge
editor (`client/src/pages/Admin.tsx:5525, 5683`). Also note `scripts/check-examples.mjs:115-145`
re-parses that array **by regex**, so reformatting it breaks a CI prover with an unrelated-looking
error. Leave `memory.ask` **out of `STAGE_UNLOCKS`** deliberately, with a comment in the register of
the `map.publish` block (`capabilities.ts:106-115`).

**6. New file `server/lib/memory.ts` as an owned driver seam.** (2 days)
Model it on `villageReaders.ts`, not on `payments.ts`. Export `MemoryDriver {id, describe, module?,
capability?, audience, maxTokens, available(), search(pool, q, viewer): Promise<MemoryHit[]>}` where
`search` **never throws** and a dead driver returns `[]`. Plus `registerMemoryDriver`,
`memoryDrivers(viewer)`, `memoryRefusal` delegating to `readerRefusal`'s existing order
(`villageReaders.ts:81-88`), `recall()`, and `wireMemory({moduleIsOn, boolVar})` mirroring
`wireReaders` (`:61-74`). Two drivers under `server/lib/memoryDrivers/`: `local.ts` over
`relevantSyntheses` (`server/lib/knowledge.ts:488-518`), `briefAll` (`villageBrain.ts:174`) and step
2's decisions query; and `saberra.ts` as **the only file in the repo that knows the vendor exists.**
`recall` is the only function new features ever call.

**7. Teach `guardedFetchJson` a bearer, without a second dialer.** (0.5 day, security-critical)
Add `headers?: Record<string,string>` to the existing opts (`server/lib/toolcheck.ts:108`), thread
into `dialPinnedJson` (`:133-139`), merge **before** the Content-Type/Content-Length spread
(`:156-161`) so a caller cannot clobber the length. **The part that must not be skipped:** the
redirect recursion at `:188` passes arguments through unchanged, so strip credential-bearing headers
when the redirect target's origin differs. Do not write a simpler helper; `:93-107` forbids exactly
that and names the SSRF it already caused in `network.ts`.

**8. The credential plane.** (1 day)
In `memory.ts`, add `resolveMemoryKey()` mirroring `resolveKey` (`assistant.ts:122-128`) and
`memoryDailyCap()` mirroring `platformDailyCap` (`:139-144`), keeping absent (default) and explicit
`0` (means zero) distinct. Under Option A the platform key is **env-only and never in
`SECRET_KEYS`**. Under Option B, append `saberra_api_key` and `saberra_webhook_secret` to
`SECRET_KEYS` and their env twins to `ENV_FALLBACK` (`secrets.ts:26-46`; the
`Record<SecretKey,string>` makes a missing twin a typecheck error) and add CARDS entries at
`Admin.tsx:1386-1391`, or they join the three keys that are API-reachable with no UI. Append one row
per env var to `docs/FORK_RUNBOOK.md` in the same session.

**9. 503 on lapse, never 404.** (0.5 day)
Every `/api/memory` route and the Saberra driver return `{ok:false, status:503,
error:"memory-unavailable"}` when the key is gone, the allowance is spent, or the upstream fails,
mirroring `assistant.ts:235/239/246`. `404 {error:"module_disabled"}` stays reserved for "this
village does not run this" (`modules.ts:171-173`). On any refusal Maia falls back to the local
driver, the way the concierge falls back to `deterministicWinner` (`server/index.ts:6920-6946`).
**If you skip this, revoking the credential leaves a live surface over a dead backend**, because
`requireModule` reads lifecycle and nothing else.

**10. Optional: refuse to turn the module ON while unentitled.** (0.5 day)
One method on the `LifecycleGuards` interface (`modules.ts:197-201`), one refusal beside the
`legalReview` block (`:224-231`), wired at the single call site (`server/index.ts:5218-5227`).
Understand what this is: a refusal on the **enable transition**, not revocation. It turns nothing
off, and a fork can delete it from its own source.

### Cleanups that this work exposes

**11.** `loadModuleSettings` runs once at boot with no reload route (`modules.ts:42-66`). If anything
other than `setModuleLifecycle` ever writes that table, two replicas disagree until restart.

**12.** Close the orphan-capability leak: `/api/game/me` (`server/index.ts:14445`) and
`/api/game/progression` (`:15026`) serve every held capability unfiltered by module, and
`ProfileJourney.tsx:63-67` renders each as a chip. So **today, a village whose memory lapses keeps
seeing `memory.ask` painted as a held power.** Filter using the `ModuleDef.capabilities` mapping
that only the admin catalog reads today (`shared/modules.ts:35-37`). Then add a launch-checklist row
with `appliesWhenModule:["memory"]` (the skip-when-off machinery exists at
`server/lib/launch.ts:94-97`), worded like `assistant-key`: "No memory key. Maia still answers from
the village's own record."

**13. The tests that would otherwise never exist.**
(a) **Add `server/lib/memoryDrivers/*.ts` to the OUTWARD list in `server/lib/villageBrain.test.ts:43-47`
in the same commit that creates them.** See the trap below.
(b) Assert the rendered assistant name follows `wcfg.assistantName`.
(c) Assert `STAGE_UNLOCKS["memory.ask"]` is undefined, beside the `map.publish` block in
`shared/capabilities.test.ts:94-127`.
(d) Extend the secrets block at `server/loop.e2e.test.ts:2914-2925` so a new key masks to last4 and
never appears in a body.
(e) One test that a memory refusal degrades to a local answer rather than an error.

---

## Traps

- **The "brain never leaves the fork" guarantee is a hardcoded three-file allowlist.**
  `server/lib/villageBrain.test.ts:43-47` lists exactly `feedback.ts`, `network.ts` and
  `villageExport.ts`, with a floor of `>= 2` at `:63`. A new `memoryDrivers/saberra.ts` that reads
  `briefAll` and POSTs it outward **passes that sweep green forever.** The test is source-level on
  purpose, which is exactly what makes a missing filename fatal.
- **A 302 from the vendor hands over the bearer token.** `toolcheck.ts:188` recurses with arguments
  unchanged, and the private-range guard does not help because the attacker's host is legitimately
  public.
- **The timeout is socket-idle per hop, not a deadline.** `toolcheck.ts:155` passes `timeoutMs` to
  `https.request` and `:188` passes it unchanged to each redirect, so five hops is up to 6x. A
  memory call inside an assistant turn at the 10s default can hang a member's request for a minute.
- **Turning off the badges module silently lifts every badge deny.** `capabilityCtx` skips badge
  grants and badge *denies* together when badges is off (`server/index.ts:2381-2389`), and a deny is
  the only thing that beats a role. Never assume `off` is the safer state.
- **No test asserts a single word of assistant copy.** `assistant.test.ts:85-141` covers the mode
  table, `resolveKey` and `platformDailyCap`; `loop.e2e.test.ts:1330-1343` drives
  `/api/assistant/coordinate` without checking what she says. A persona swap, or a vendor's voice
  arriving in her mouth, ships through all six gates green.
- **The house gates go blind on vendor text.** `check-voice.mjs` refuses to look at runtime content
  by explicit design (`:14-16`). The words members read stop being policed with nothing going red.
- **Migration numbers are claimed repo-wide across worktrees and branches**, and renaming a shipped
  migration replays it. If this needs a table, allocate against every worktree and every remote.
- **Persona replacement buys a rename and pays for a fork.** `server/index.ts:8693` already reads
  `const assistantName = wcfg.assistantName || "Maia"`, edited at `Admin.tsx:8070-8098`. Renaming
  costs zero code. Five surfaces hardcode "Maia" today and ignore the config
  (`ProposeQuest.tsx:165, 185`, `ProsperityJourney.tsx:57`, `Admin.tsx:1390`,
  `shared/launchRequirements.ts:173, 183`). Fix those once.

---

## What to say to Saberra, and when

**Say the reposition out loud, early, in one sentence:** "Saberra is one driver behind our memory
interface. There is a local driver alongside it." Once `server/lib/memory.ts` exists with two
registered drivers, that is a verifiable statement rather than a posture. Discovering it later reads
as bad faith; stating it now is just the design.

**Five contract terms that follow from code rather than from posture**, which is what makes them
easy to hold:

1. Per-instance isolation keyed on `instanceIdentity()`, minted once at first boot and deliberately
   not configurable (`server/lib/identity.ts:11-15, 45-59`), already travelling in
   `/.well-known/village.json`.
2. No training on tenant content and no cross-tenant retrieval, because
   `server/lib/knowledge.ts:12` and `villageBrain.test.ts:37-64` make it a tested guarantee.
3. Deletion propagation within a fixed window, because `/api/profile/export`
   (`server/index.ts:17173-17184`), `anonymizeMember` (`:17159`) and `shared/constitution.ts:104-108`
   are published promises to members.
4. A documented export of the tenant's own memory in a format the local driver can ingest. That is
   the price of being a source rather than the system of record.
5. No redirects on the API endpoint, and a bearer scoped per instance, because of the
   credential-forwarding hazard above.

**State the degradation contract as a requirement, not a courtesy:** if their service is
unavailable, one driver reports unavailable and Maia keeps answering from the village's own record.
Every integration in this codebase already works that way (`feedback.ts:14-16`: "the hub is a
listener, not a dependency"). It removes the outage threat from their side of the table, which is
exactly why steps 1-3 are worth building first.

**Make the MCP boundary a hard line.** If they offer MCP, it consumes the same reader catalog under
the same refusals. Every consent gate in this system lives in Express and not in MySQL, and a model
that composes SQL "holds all of it by construction" (`villageReaders.ts:5-10`). The rule is already
written for the next consumer: "the MCP server must not become a second permission system"
(`:25-27`). Saying this early prevents a wasted integration spec.

**The member-facing pitch is "Maia can also reach your archive," never "you get a different
assistant."** If attribution matters to them commercially, offer the Integrations card, where an
admin reads it and a member does not, and trade that placement for the isolation and deletion terms.
