# Read this first, then run `/swarm-supervisor`

You are picking up as coordinator of a running swarm. Rye will paste you a batch of work to
group and disperse. Everything below is **verified, not remembered** — each fact was measured
at the ref shown, at the time shown. Re-verify anything older than an hour; this project moves.

Snapshot taken 2026-08-13, trunk at `e8e8dc9`.

---

## 1 · The method is a skill, already installed

`swarm-supervisor` is at `~/.claude/skills/swarm-supervisor/`. Invoke it. It carries:

- **SKILL.md** — the decision gate (is this even swarm-shaped?), the five artifacts, grouping
  rules, the six-part brief, the coordination protocol, the QA fan-out, the close.
- **references/failure-catalogue.md** — the MAST taxonomy with observed failure rates, plus
  eight ways the tooling on THIS project reported a confident wrong answer in a single day.
  **Read this before briefing any discovery agent.** It is the difference between a report you
  can act on and one you re-verify line by line.
- **references/artifacts.md** — copy-ready ledger, lane brief, discovery brief, and decision
  list templates.

The one rule that made everything else work, and the one to apply to yourself first:

> **Every claim carries the ref it was measured at.**

---

## 2 · Trunk state

```
main            e8e8dc9   "Gratitude is the name. Hearts was the working title, and it is retired"
deployed        wave1-e8e8dc9        (amora.regencivics.earth/health)
remote branches origin/main ONLY     — nine were retired after proving each was landed by content
migrations      73 files on main, highest number 0075
```

**Direct pushes to `main` auto-deploy production.** There is no staging. CI (`verify`) runs
after the push, so a red gate is found in production, not before it. That is the current
process; a PR was tried once and it was the only landing all day where CI passed on the real
base before the code reached trunk.

---

## 3 · The gate set — read from `.github/workflows/ci.yml` at `e8e8dc9`

Eleven gates. All must pass. **Do not take this list from anyone's memory, including mine —
it grew three times in one day and every lane working from a stale copy shipped a red.**

```
pnpm install --frozen-lockfile
pnpm check                              # tsc --noEmit, EXCLUDES **/*.test.ts
npx tsc -p tsconfig.tests.json --noEmit # the tests, which pnpm check does not see
node scripts/check-brand-refs.mjs       # white-label ratchet, read the EXIT CODE not the last line
node scripts/check-voice.mjs            # house writing rules on shipped copy
node scripts/check-auth-fetch.mjs       # client calls to guarded routes carry a token
node scripts/check-artifact-budget.mjs  # the living map is not in dist and no budget saw it
pnpm build
pnpm test
<inline bundle budget>                  # MAX_MAIN_JS_KB 700, MAX_TOTAL_DIST_KB 6000, MAX_SINGLE_IMAGE_KB 400
pnpm audit --prod --audit-level high
```

Not in CI, added this round and worth running: `node scripts/check-hyphen-dash.mjs` — catches a
hyphen standing in for a dash, which `check-voice` structurally cannot see. Wiring it in is an
open item.

---

## 4 · Lane registry — liveness verified 2026-08-13 03:31

| Lane | Session id | Owns | State |
|---|---|---|---|
| **Foundation** | `local_d2cd99d7` | characters, profile, economy, brand tokens, The Mint | **RUNNING.** Deepest context on the economy and the design-token layer. |
| **Messaging substrate** | `local_20cccc1f` | `server/lib/messaging.ts`, messaging client, conversations | **RUNNING.** |
| **Gratitude handoff** | `local_82f71bfc` | the Gratitude/Hearts rename, `server/lib/economy.ts` | **RUNNING.** Landed `e8e8dc9`. |
| Quests | `local_beda4cb6` | quests, crews, admin story editor | idle, **context exhausted, gave a final handoff** |
| Renumber / draftKinds / grounds / map lanes | several | see ledger §2 | idle, work all landed |

**PAID: a session that has exhausted its context will accept an assignment and never do it.**
Check `isRunning` and last activity before routing anything. Prefer the three live lanes.

---

## 5 · Resource registry

**Migration numbers are held THREE ways and each is invisible to the other two.** Check all
three before claiming one — a collision already shipped once:

```
1. remote refs                    highest 0075
2. local refs in other worktrees  highest 0075
3. untracked files on disk        highest 0075   (~20 worktrees exist)
=> next free is 0076, and re-verify at claim time
```

A shipped migration file is **never edited or renumbered** — the ledger keys on filename, so a
rename replays the file and an `ADD COLUMN` then bricks boot.

---

## 6 · Where the work stands

`FOR_RYE_2026-08-11.md` (same directory) is the current decision list for the human. Section 0
is a live security item: **an Alchemy RPC key rendered on the public home page for eleven days;
the leak is closed and the row redacted, but only Rye can rotate the key.**

`SWARM_LEDGER.md` (same directory, ~1600 lines) is the full record. The sections worth reading
before you coordinate anything:

- **§1** the rules, with sub-rules that each cost a session
- **§9a–9j** the close of the last round: six checker blind spots, the structural traps, and
  what was deliberately left unfixed and why

A full four-dimension QA round completed at `3340492`: functional, responsive/visual,
accessibility, content. Everything real was fixed and verified live. What remains open is in
the decision list, sorted by what only Rye can do.

---

## 7 · Your opening sequence

1. Read the batch Rye pastes. **All of it, before grouping any of it.**
2. Decide swarm vs single agent out loud (SKILL.md §0). Refusing to fan out is a valid answer.
3. Re-verify §2, §3, §4 and §5 above — they will have moved.
4. Group by **who must hold the context**, not by topic.
5. Route to the three live lanes first; open new ones only where no lane owns the surface.
6. Brief with all six sections. Include the known non-findings, or you will receive the same
   false positives from every agent.
7. Land in queue order, verify each on the live surface, and close with one decision list.

Tell Rye the plan in five lines before you start.
