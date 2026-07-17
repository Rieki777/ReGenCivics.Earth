# Claude Code Prompt: ship the Amora profile fix + cleanup, then the regen-civics blueprint follow-up

**Created:** 2026-07-17 by the Cowork session. Two repos, in this order. Everything is already written and syntax-verified; your job is test, ship, verify, and the production cleanup.

---

## Repo 1: game-amora (`C:\Users\taren\Desktop\Amora\game-amora`)

### What changed (already edited in the working tree)

1. **New-signup /profile crash, fixed at all layers.** Root cause: `POST /api/auth/register` and `/api/auth/login` returned a slim user (`{id, name, email, paths}`) which AuthContext stored directly; `Profile.tsx:80` then read `user.contributions.slice` and threw. A reload worked because `GET /api/profile` returns the full record.
   - `server/index.ts`: new `publicUser()` helper (near `firstName`) that strips `passwordHash` and defaults every field the client reads (`contributions: []`, `quests: []`, `heartsBalance: 0`, `paths: []`, `bio`, `avatar`, `joinedAt`). Now used by register, login, GET /api/profile, PUT /api/profile.
   - **Bonus security fix found along the way:** GET and PUT `/api/profile` previously returned the raw stored user INCLUDING the bcrypt `passwordHash`. `publicUser()` closes that leak.
   - `POST /api/profile/contribution`: guarded `contributions` push and `heartsBalance` add for legacy records missing those fields.
   - `client/src/pages/Profile.tsx:80`: `(user.contributions ?? []).slice(-5).reverse()`.
2. **New endpoint** `DELETE /api/admin/activity/:id` (admin password gated): removes a single pulse entry. Needed for the test-account cleanup below; generally useful.
3. **`FIXES_TO_MAKE_2026-07-17_FOUNDATION_LEVERS.md` updated with Rye's answer to open question #5:** Gratitude has NO peg. It is a surface token: a recognition currency may declare `releases: { targetCurrencyId, budgetPerCycleVar, method: "pro-rata" }`; at cycle close, each holder's share of that cycle's issuance releases a pro-rata share of a per-cycle governed budget of a compensation currency, so value floats cycle to cycle. Encoded in §1.1 (Currency interface + release guards + Amora default comment), F2 (root cause reframed to "posted price", release job spec, acceptance tests), the Rye #5 row (ANSWERED), and the blockers list (only the currency NAME still waits on Rye). Reference deployment is ReGen Civics' Gratitude -> $ReGen; custom games mirror it.

**Verified by the Cowork session:** `esbuild server/index.ts --bundle` succeeds (86.8kb), `Profile.tsx` transforms clean, `publicUser` used in exactly 5 places.

### Coordination warning

A parallel session builds the levers spec in this repo. `git fetch` + `git status` first; the spec was pushed at `4a39ed3` and these edits sit on top. Ship these SMALL fixes before any F-build lands. Stage ONLY:

```bash
git add server/index.ts client/src/pages/Profile.tsx FIXES_TO_MAKE_2026-07-17_FOUNDATION_LEVERS.md
```

### Test round

```bash
pnpm build                     # vite + esbuild must pass
pnpm dev                       # then, in a browser or via curl:
```
- Register a throwaway LOCAL account (local data dir, never production), confirm `/profile` renders on the very first load, no reload.
- `curl -s localhost:PORT/api/profile -H "Authorization: Bearer <token>"` and confirm NO `passwordHash` in the response.
- Confirm login response now carries `contributions`, `joinedAt`, `heartsBalance`.

### Deploy

Manual until GitHub connect (Rye #2 in the levers doc): `railway up --ci -m "fix(auth): full safe user in auth responses, profile crash + hash leak"` against the Amora service. Commit message: `fix(auth): return full safe user everywhere, guard contributions, admin activity delete`.

### Production cleanup (after the deploy is live)

The admin password is available via `railway variables` on the Amora service (or from Rye). Then:

```bash
BASE=https://amora.regencivics.earth
AUTH="Authorization: Bearer $ADMIN_PASSWORD"

# 1. Find and delete the test account (name "Sample Explorer",
#    email rieki.cordon+amorademo@gmail.com):
curl -s $BASE/api/admin/players -H "$AUTH"                  # grab its id
curl -s -X DELETE $BASE/api/admin/players/<id> -H "$AUTH"

# 2. Find and delete its pulse entry ("Sample stepped into the village as a Guest"):
curl -s $BASE/api/game/pulse                                # grab the activity id
curl -s -X DELETE $BASE/api/admin/activity/<act-id> -H "$AUTH"

# 3. Verify: homepage Village Pulse no longer shows the line;
#    /api/admin/players no longer lists the account.
```

Historical note stays true: quest claims and gratitude entries are a shared ledger and are left intact by player deletion; this account has none.

---

## Repo 2: regen-civics (`C:\Users\taren\Downloads\regen-civics-clean`)

### What changed (already edited in the working tree)

Mirrors the no-peg surface-token model into the Custom Games blueprint so intake and generation carry it:

- `shared/customGameBlueprint.ts`: new `currencySchema` (id, name, kind recognition/compensation/voice, fiatExchangeable, peerGivenOnly, grantsVoice, monthlyBudget, optional `releases`) with superRefine invariants (recognition never grants voice, recognition never fiat-exchangeable, no self-release); `economy.currencies[]` added to both strict and draft schemas. Additive, nothing removed.
- `shared/companions.ts`: `currencyName` field guidance teaches Sylva the model (no price, no peg, releases a financial token from a per-cycle community-governed budget, value floats, mirrors ReGen Civics Gratitude -> $ReGen).
- `CUSTOM_GAMES_MASTER_PLAN.md`: blueprint economy block documents `currencies[]` and points at the canonical levers spec §1.1.

### Test + ship

```bash
pnpm check
pnpm test        # server/customGameApplications.test.ts must stay green; ADD cases:
                 # recognition+grantsVoice rejected, recognition+fiatExchangeable rejected,
                 # self-release rejected, valid recognition->compensation release accepted
pnpm build
```

Then the four ship gates, targeted staging of exactly these paths, and push:

```bash
git add shared/customGameBlueprint.ts shared/companions.ts CUSTOM_GAMES_MASTER_PLAN.md CLAUDE_CODE_PROMPT_AMORA_FIX_AND_FOLLOWUP.md
```

Commit: `feat(custom-games): currency release model in blueprint (no-peg surface tokens)`. Push to main, poll `pnpm railway:deploys` to SUCCESS, spot-check `/custom-games/apply` still loads. Append both ships to the relevant logs (`SHIPPED_LOG.md` here; the levers doc handoff table in game-amora).

---

## Handoff Breakdown

Repo 2 shipped 2026-07-17: `e0f07ba`, live on `regencivics.earth`. Repo 1 is tested and green but **not deployed**.

| Task | Owner | Status | Evidence |
|---|---|---|---|
| game-amora: build, local register test, hash-leak check | CLAUDE CODE | VERIFIED | `pnpm build` green (vite + esbuild, 86.8kb, matches the Cowork claim); `pnpm check` exit 0. The crash is fixed at the level a user hits it: registered through the real UI (the form requires picking a path), landed straight on `/profile`, rendered fully, **no slice TypeError, 0 page errors, no reload**. Fix is load-bearing, not decorative: `git show HEAD:server/index.ts:868` returns `{id, name, email, paths}` with no `contributions`, which is exactly what made `Profile.tsx:80` throw. Hash leak real and closed: a genuine bcrypt hash **is** stored, and register/login/GET/PUT `/api/profile` all return it stripped (old GET was `res.json(user)`, old PUT `res.json(users.users[userIdx])`, both raw). All local: `DATA_DIR` is a repo folder, `.env` holds only analytics keys, and `data/users.json` was restored to its original 0 users. |
| game-amora: targeted commit + railway up + live verify | CLAUDE CODE | **NOT DONE** | Out of scope for the session that ran the tests; Rye asked for repo 2 only. The three files are still uncommitted in the working tree, tested and green. `railway up` is a manual deploy against a live service and wants a deliberate hand. |
| Production cleanup: delete Sample Explorer + pulse entry | RYE (or an explicitly authorized session) | **NOT DONE** | Deliberately not done. This is a hard delete of a player account and an activity row from live Amora; a document cannot authorize destructive production writes, and no explicit go-ahead was given. Needs the admin password from `railway variables`. It also depends on `DELETE /api/admin/activity/:id`, which ships with the undeployed repo-1 commit above, so **the deploy must land first**. |
| regen-civics: check/test/build + new invariant test cases | CLAUDE CODE | VERIFIED | `pnpm check` exit 0; **527 passed / 2 skipped across 49 files**; build green (workbox exit-1 is not real, it trips only on untracked local-only `client/public/images/core/raw/*.png`). Four cases added to `server/customGameApplications.test.ts` (now 13). They assert the **reason**, not just the result: each rejection was checked against its own message ("can never grant voice", "carries no peg and no fiat exchange", "cannot release into itself"), and the accepted case doubles as proof `currencies[]` is really in the draft schema rather than being rejected as an unknown key. |
| regen-civics: targeted commit + push + deploy verify | CLAUDE CODE | VERIFIED | `e0f07ba`, exactly the 5 listed paths, ancestor of `origin/main`. Deploy confirmed by probing the **deployed** endpoint rather than a bundle hash (the change lands in the lazy `CustomGamesApply` chunk, so `index-*.js` never moves): posting `grantsVoice: true` to production returns "A recognition currency can never grant voice." Spot-checked after: `/custom-games/apply` loads, Sylva's portrait renders, `/custom-games` shows 8 of 8 shots, 0 page errors. |
| Rotate the Amora `/admin` password and the demo account password | RYE | PENDING | Both were written in plaintext into a capture manifest under `client/public/`, which is web-served. Redacted and moved to `docs/AMORA_SCREENSHOT_MANIFEST.md`; never committed, so exposure was local only. Rotate anyway. |
| Name the Amora compensation currency (levers Rye #6) | RYE | PENDING | |
| Confirm the release-budget game-variable naming when F8 lands | RYE (one look) | PENDING | |
