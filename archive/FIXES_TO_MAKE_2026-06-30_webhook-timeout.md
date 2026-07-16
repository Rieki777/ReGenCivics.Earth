# Fixes to Make — 2026-06-30

Webhook delivery timeouts on the Bounty Engine GitHub webhook, diagnosed live from the GitHub webhook delivery log and the Railway service panel during a Cowork session.

Short version: this is not a secrets or env problem. Both webhook secrets are already set. The GitHub webhook times out because the request body is consumed twice by two body parsers, and the handler then crashes before it can respond. The fix is code, in `server/webhooks/github.ts` and `server/webhooks/riverside.ts`.

---

## Fix 1 — GitHub webhook times out on every delivery (Critical)

**Status:** BLOCKED (fix is CODED-ready below, but cannot deploy until the build is green; see Blocker A)

**Symptom:** Every delivery to `https://regencivics.earth/api/webhooks/github` fails with "We couldn't deliver this payload: timed out." Confirmed across `check_suite.completed`, `pull_request.opened`, `pull_request.edited`, and `pull_request.closed` events, all dated 2026-06-29. A manual redeliver on 2026-06-30, with the service showing Online and 2/2 replicas, also timed out. GitHub never receives a response. The failure is never a 401, so the signature is never even the question.

**Root cause:** Double body-parse.

`server/_core/index.ts` line 247 mounts a global `express.json()` on all routes, with a `verify` callback that stashes the raw bytes as `req.rawBody` for any path starting with `/api/webhooks/`. That is the intended pattern, and the Resend, Loomio, and Hypha handlers already read `req.rawBody`.

`server/webhooks/github.ts` was not migrated to that pattern. It still mounts its own `express.raw({ type: "application/json" })` on the route and reads `const rawBody = req.body as Buffer`. Because the global `express.json()` runs first and consumes the stream, `body-parser` marks the body as already read, so the route-level `express.raw()` no-ops and `req.body` stays a parsed object rather than a Buffer. The handler then calls `crypto.createHmac(...).update(req.body)` on that object, which throws a TypeError. The throw happens inside an async route handler with nothing catching it, so Express never sends a response and the request hangs until GitHub's 10 second timeout fires.

**Fix:** Read the raw payload from `req.rawBody` (the string captured by the global `verify` callback) and drop the route-level raw parser, matching the migrated handlers.

In `server/webhooks/github.ts`:

1. Remove the `express.raw({ type: "application/json" })` middleware from both `app.post("/api/webhooks/github", ...)` and the `/api/webhooks/github/revert-check` route. The `import express from "express"` can stay or go depending on other use.
2. Replace `const rawBody = req.body as Buffer;` with a string read:
   ```ts
   const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);
   ```
3. Update `verifyGithubSignature` to hash a string:
   ```ts
   function verifyGithubSignature(rawBody: string, sigHeader: string | undefined): boolean {
     if (!GITHUB_WEBHOOK_SECRET || !sigHeader) return false;
     const computed = `sha256=${crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET).update(rawBody, "utf8").digest("hex")}`;
     try {
       return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sigHeader));
     } catch {
       return false;
     }
   }
   ```
4. Anywhere the handler does `rawBody.toString("utf-8")` before `JSON.parse`, parse the string directly: `JSON.parse(rawBody)`. Or use the already-parsed `req.body` for the payload object and keep `rawBody` only for signature verification.

**Files changed:** `server/webhooks/github.ts`

---

## Fix 2 — Riverside webhook carries the same latent bug (Low)

**Status:** BLOCKED (same build blocker; also see the note on relevance)

**Symptom:** No live symptom, because nothing is currently delivering signed pushes to `/api/webhooks/riverside`. If anything did, it would time out for the same reason as Fix 1.

**Root cause:** Same double body-parse. `server/webhooks/riverside.ts` mounts `express.raw({ type: "application/json" })` and reads `req.body` as a Buffer, after the global `express.json()` already consumed the body.

**Fix:** Same shape as Fix 1. Verify the HMAC over `(req as any).rawBody`, parse the payload from `req.body` or `JSON.parse(rawBody)`, and drop the route-level `express.raw()`.

**Relevance note:** Per `CLAUDE_CODE_PROMPT_2026-06-23_RIVERSIDE_YOUTUBE_PIPELINE.md`, Riverside has no native webhooks and the recording trigger is being replaced by a poller plus a `WebhookInboxSource` guarded by `PIPELINE_INBOX_SECRET`. When that pipeline lands, this endpoint's auth model changes. Fix it now for correctness so it does not become a silent trap later, but it is not on the critical path.

**Files changed:** `server/webhooks/riverside.ts`

---

## Blocker A — HEAD fails to build, nothing can deploy (Critical)

**Status:** HUMAN STEP REQUIRED to reproduce, then CLAUDE CODE to fix

**Symptom:** The active Railway deployment on the `ReGenCivics.Earth` service is 5 days old ("chore: update SHIPPED_LOG, migrations applied, pending device verify"). Newer commits, including the Safari batch archive commit, show "Deployment failed during build process, Failed to build an image." The visible build step was `node scripts/validate-html.mjs && node scripts/check-unoptimized-images.mjs && tsc --noEmit && vite build ...` and the error text was cut off in the Railway panel.

**Why it matters here:** Even a correct webhook fix cannot reach production until the build is green again. This is independent of the webhook bug and needs its own pass. Reproduce locally with `pnpm build` (or the exact build command in `package.json`) and read the full error, then fix.

---

## Non-issues, do not change

- Do not rotate `GITHUB_WEBHOOK_SECRET`. It is already set in Railway and a secret is already configured on the GitHub webhook. The timeouts are not signature failures. Rotating it would trigger a redeploy that currently cannot build, and would briefly desync Railway from GitHub for no benefit.
- Do not add `RIVERSIDE_WEBHOOK_SECRET`. It is intentionally absent, and the Riverside push model is being replaced (see Fix 2 relevance note). The relevant future secret is `PIPELINE_INBOX_SECRET`.
- The original "secrets unset, failing open" framing does not match this codebase. Both webhook secrets are set, so the handlers already enforce verification.

---

## Verify after deploy

Once Blocker A is resolved and the webhook fix is deployed:

1. In GitHub, repo `Rieki777/ReGenCivics.Earth`, Settings, Webhooks, open the `/api/webhooks/github` hook, Recent Deliveries, click Redeliver on the most recent `check_suite.completed` event.
2. Confirm the response is `200`, not a timeout and not a `401`. A `200` proves the endpoint responds and the signature matches.
3. Ship Gate before any VERIFIED claim: `python3 scripts/audit-truncation.py`, `rg` for any new className if applicable, `pnpm typecheck` exit 0.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Reproduce and share the full Railway build error, or approve Claude Code reproducing it via `pnpm build` in the VM | Railway build log view, deploy approval | Railway, `ReGenCivics.Earth` service, failed deploy, View logs |
| H2 | `git add -A && git commit && git push` after Claude Code writes the fix | Claude Code may hold index.lock | local terminal |
| H3 | Approve the Railway deploy once the build is green | Railway dashboard | Railway, Deployments |
| H4 | Redeliver the GitHub webhook event and confirm 200 | Browser action, signed-in GitHub | GitHub, repo Settings, Webhooks, Recent Deliveries |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | Diagnose the webhook timeout root cause | DONE |
| C2 | This fixes doc | DONE |
| C3 | Apply Fix 1 in `server/webhooks/github.ts` (read `req.rawBody`, drop route-level `express.raw()`, hash a string) | CODED-ready, not yet applied |
| C4 | Apply Fix 2 in `server/webhooks/riverside.ts` (same pattern) | CODED-ready, not yet applied |
| C5 | Reproduce Blocker A with `pnpm build`, read full error, fix the build | IN PROGRESS once started |
| C6 | Run the Ship Gate before marking anything VERIFIED | pending |

### WAITING ON YOU before Claude Code can proceed

- Blocker A gates deployment of Fix 1 and Fix 2. Claude Code can write and typecheck both fixes now, but nothing reaches production until the build is green (H1 to H3).
- H4 is the final confirmation and can only happen after a successful deploy.
