# DECISIONS: Architectural Decision Log

ADR-style log of load-bearing architectural choices and their why. Append new entries to the bottom. Don't edit historical entries; if a decision gets reversed, write a new entry that supersedes it and link the old one.

Format per entry:
- ADR-N: short title
- Date
- Status: Accepted / Superseded / Deprecated
- Context: what made this decision necessary
- Decision: what we picked
- Why: 1-3 specific reasons
- Trade-offs: what we gave up
- Where it lives in code (if applicable)

---

## ADR-1: JWT cookie auth (not session store)

- Date: project inception
- Status: Accepted
- Context: needed user auth across Google + Apple + email magic link.
- Decision: stateless JWT in HttpOnly cookie. Signed with `JWT_SECRET`. Verified by `sdk.verifySession()` reading the `app_session_id` cookie.
- Why: no session store to operate. Trivial to share across subdomains via cookie domain. Survives server restarts. Simple horizontal scaling.
- Trade-offs: revocation only via cookie expiry or token rotation. Currently no revocation list.
- Code: `server/_core/sdk.ts`, `server/_core/cookies.ts`, `server/_core/oauth.ts`.

## ADR-2: Drizzle ORM on MySQL (Railway)

- Date: project inception
- Status: Accepted
- Context: needed a database with schema-as-code.
- Decision: Drizzle on MySQL hosted by Railway.
- Why: Railway's MySQL is cheap + managed. Drizzle's TypeScript types let us catch schema drift at compile time. No ORM magic; queries are explicit.
- Trade-offs: MySQL's JSON support is weaker than Postgres. Drizzle is younger than Prisma; some sharp edges.
- Code: `drizzle/schema.ts`, `server/db.ts`.

## ADR-3: tRPC for API surface

- Date: project inception
- Status: Accepted
- Context: needed a strongly-typed client/server boundary.
- Decision: tRPC routers under `server/routes/` with the client at `client/src/lib/trpc.ts`. End-to-end types via shared `appRouter`.
- Why: zero schema duplication. Every server change is a compile-time client check. `httpBatchLink` reduces request count on page mount.
- Trade-offs: not REST-friendly for third parties (we expose a few REST endpoints separately under `/api/*` for webhooks etc).
- Code: `server/_core/trpc.ts`, `server/_core/context.ts`, `server/routers.ts`, `client/src/lib/trpc.ts`.

## ADR-4: Wouter router (not React Router)

- Date: project inception
- Status: Accepted
- Context: needed client-side routing.
- Decision: Wouter (3.x).
- Why: 1.5KB. Zero magic. Hooks-only API matches the rest of the codebase.
- Trade-offs: no nested route tree. No data router pattern. No route-level loaders. We compose those ourselves with hooks where needed.
- Code: `client/src/App.tsx` (route table).

## ADR-5: Vite + Workbox PWA (not Next.js)

- Date: project inception
- Status: Accepted
- Context: needed bundling + dev server + offline support.
- Decision: Vite + `vite-plugin-pwa` (Workbox under the hood). Service worker generated at build with runtime caching for images / API / fonts.
- Why: Vite's dev experience is faster than Next. PWA with Workbox needs minimal config. We don't need SSR; the app is auth-gated for most surfaces.
- Trade-offs: no SSR means SEO needs more attention (handled via per-route `useSeo` helper + per-route OG images). The service worker has bitten us multiple times (cache poisoning, stale chunk reloads). Workarounds documented inline + in `cowork-vm-quirks.md`.
- Code: `vite.config.ts`, `client/src/main.tsx`.

## ADR-6: Two-anchor token model (Fund + Game, four tokens)

- Date: 2026-04
- Status: Accepted
- Context: needed a token system that's legible to both VC capital allocators AND a movement community.
- Decision: split governance + economic across two halves of the system. Fund side: RCVoice (governance) + $RCivics (economic). Game side: RGVoice (governance) + $ReGen (economic). Bridge metaphor binds them.
- Why: VC investors need legibility (Reg D fund, LP-style governance, accredited-only). Movement participants need playable mechanics (quests, gratitude, contribution scores). Trying to do both with one token always felt off; splitting lets each side use the right vocabulary.
- Trade-offs: 4 tokens = more cognitive load on participants. Documentation has to be careful about Fund vs Game framing constantly. Single-token projects are simpler to explain.
- Code: `drizzle/schema.ts` (player_profiles columns), `server/db.creditPrivateTokens`, `client/src/components/TokenBox.tsx`.
- See: `CONTEXT_THE_TWO_GAMES.md`, STEERING Section 5.

## ADR-7: Private-first ledger with claim bridge to public chain

- Date: 2026-04
- Status: Accepted
- Context: every economic feature on the site needs to read + write balances, but on-chain writes are slow + expensive. We also wanted players to feel free to play without making every action a Base transaction.
- Decision: every economic feature reads `total = private + public` but writes only to `private`. Public chain writes happen exclusively when the player explicitly claims via Hypha redeem-tokens. One-way flow.
- Why: zero gas for game-internal credits. Server can credit + debit instantly. Players can cash out to Base whenever (transfer the value out, not back). On-chain stuff stays sacred: nothing on-chain ever silently revokes.
- Trade-offs: server is the source of truth for unclaimed value. If the server goes down or its DB corrupts, unclaimed balances are at risk. Mitigations: append-only ledger (`user_token_ledger`), audited reconciliation.
- Code: `server/db.creditPrivateTokens`, `server/_core/claimFlow.ts`, `playerProfiles.requestClaim`.
- See: STEERING Section 5, CLAUDE.md Token model section.

## ADR-8: Hypha as the on-chain governance layer (not custom contracts)

- Date: 2026-04
- Status: Accepted
- Context: needed on-chain coordination for proposals, treasury, voting.
- Decision: use Hypha DAO (`https://app.hypha.earth`) on Base. Two DHOs: `regen-games`, `regen-civics`. ReGen Civics handles proposal origination (forum threads + claim flow); Hypha handles ratification + execution.
- Why: Hypha is purpose-built for DHO-style governance with tokens, votes, treasury. Building this ourselves would be 6+ months of contract development we can't afford. Hypha's contracts are audited. Their team is collaborative.
- Trade-offs: dependency on Hypha's roadmap + uptime. Some friction in the user journey (the Hypha bridge is non-trivial). We've contributed PRs upstream to smooth the experience.
- Code: `apps/web/src/lib/hypha-bridge/` (the bridge module), `server/lib/hypha-bridge/webhook-receiver.ts`.
- See: `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`, STEERING Section 6.

## ADR-9: Privy auth migration → rolled back (kept gov subdomain only)

- Date: 2026-03 (added) → 2026-04 (rolled back on main)
- Status: Superseded by ADR-1 (JWT cookie auth on main). Privy retained on `apps/gov/` (gov.regencivics.earth Next.js app).
- Context: explored Privy for unified wallet + auth UX, especially for Web3 features.
- Decision (rolled back): main site reverted to JWT cookie auth. Privy stays in the gov subdomain Next.js app where wallet UX is core to the product (governance + treasury).
- Why we rolled back main: Privy added complexity (wallet provider, embedded wallet UX, additional cookie/storage state) without clear win for the main site's auth use case (Google + Apple + email is enough). Sign-in began breaking in ways we couldn't fully diagnose under Privy.
- Trade-offs: two auth systems on two subdomains. Bridging session state across them is manual (passport page).
- Cleanup: 2026-04-25 commit `657f230` removed remaining Privy stub files from main: `client/src/_core/providers/PrivyAuthProvider.tsx`, `client/src/_core/hooks/usePrivyAuth.ts`, `server/_core/privy.ts`, `ENV.authProvider`. Database columns (`privyDid`, `privyAccessTokenHash`) kept for data preservation.
- See: `privy-archive/`, `PRIVY_AUTH_MIGRATION_SPEC.md`.

## ADR-10: Cookie domain `.regencivics.earth` (subdomain-shared)

- Date: 2026-04 (commit `fa79801`)
- Status: Accepted
- Context: needed sessions shared between regencivics.earth and gov.regencivics.earth.
- Decision: session cookie set with `domain=.regencivics.earth`, `sameSite=lax`, `secure=true` (production), `httpOnly=true`.
- Why: leading-dot domain auto-shares the cookie across all subdomains. SameSite=lax is the right setting for OAuth top-level-redirect flows AND iPhone Safari behavior (which silently drops SameSite=none cookies when Secure is unreliable).
- Trade-offs: across-deploy cookie attribute drift can lead to multi-cookie scenarios where a browser ends up with three `app_session_id` cookies (host-only, `.regencivics.earth`, `regencivics.earth` no-dot). Discovered + fixed 2026-04-25 (commit `b767d54`) with the `clearAllSessionCookies` defensive multi-clear pattern.
- Code: `server/_core/cookies.ts`.

## ADR-11: Cloudflare R2 for assets, proxied through `/api/img`

- Date: project inception
- Status: Accepted
- Context: needed image hosting with resize + caching.
- Decision: assets live at `assets.regencivics.earth` (Cloudflare R2). Server proxies through `/api/img?url=...&w=...` for on-the-fly resize and `Cache-Control` headers.
- Why: R2 is dirt cheap (no egress fees). Proxy lets us add `Cache-Control: public, max-age=31536000, immutable` per-image. Easy to migrate provider later.
- Trade-offs: server is in the image hot path (~30ms overhead per cold request). Mitigated by aggressive caching at Cloudflare edge.
- Code: `server/_core/index.ts` `/api/img` route.

## ADR-12: Service Worker `images-v3` cache with 200-only response gate

- Date: 2026-04-25 (commit `7179492` and follow-up)
- Status: Accepted
- Context: CloudFront 503s on third-party images (specifically the Opportunity page assets) were poisoning the SW image cache, serving the failed responses for 7 days.
- Decision: bumped cache name to `images-v3`. Added Workbox `CacheableResponsePlugin` with `statuses: [0, 200]` so 5xx and 4xx never get cached.
- Why: 5xx error caching was a real bug bite. The 200-only gate is standard Workbox practice.
- Trade-offs: opaque (cross-origin no-cors) responses with status 0 are still cached, which is correct for embedded fonts + the like.
- Code: `vite.config.ts` runtimeCaching.

## ADR-13: Auto-archive convention for dated docs

- Date: 2026-04-23
- Status: Accepted
- Context: repo root was getting cluttered with `FIXES_TO_MAKE_*.md` and `CLAUDE_CODE_PROMPT_*.md` files that had outlived their usefulness.
- Decision: any dated file (matching `*_YYYY-MM-DD*.md` pattern) older than 1 week migrates to `archive/`. Spec/reference docs (visual style guides, design rules, canonical reference) stay in root regardless of age.
- Why: dated docs are execution plans for one moment in time; the actual changes live in commits + SHIPPED_LOG. Specs are evergreen and should be discoverable from root.
- Trade-offs: the heuristic for spec-vs-implementation is judgment-driven. Skim the first 10 lines: "READ THIS FIRST / Pick up from / Skip nothing" → archive. "Generate / produce / Style: ..." → keep.
- See: STEERING Section 8, `~/.claude/memories/rye-working-style.md` doc cleanup convention.

## ADR-14: Ship gate enforced on every "VERIFIED" claim

- Date: 2026-04-18
- Status: Accepted
- Context: an audit of commit `b06b7aa` found 5 of 13 fixes marked "resolved" were false. 15 source files on disk were truncated mid-statement with NUL-byte padding. Build would have broken.
- Decision: three gates must pass before claiming VERIFIED or DONE:
  1. `python3 scripts/audit-truncation.py` (zero truncated)
  2. `rg -g '*.css' '<className>'` for any new className (CSS exists)
  3. `pnpm typecheck` (exit 0)
- Why: false-positive fixes had been shipping. The gate is mechanical so no excuses.
- Trade-offs: ~30 seconds of friction per claim. Worth it.
- Code: `scripts/audit-truncation.py`, `.claude/skills/regen-ship-gate/SKILL.md`.
- See: STEERING Section 3.

## ADR-15: `.ai/` directory for agent steering (this directory)

- Date: 2026-04-25
- Status: Accepted
- Context: steering material had been scattered across `CLAUDE.md`, skill SKILL.md files, memory files, and inline comments. Hard to point a fresh agent at "the loadbearing constraints."
- Decision: adopt the `.ai/docs/` convention from `agentic-node-starter` (MIT). Top-level `.ai/README.md` manifest. `.ai/docs/STEERING.md` for hard constraints, `DOMAIN-LANGUAGE.md` for terminology, `DECISIONS.md` (this file) for ADRs, `security/` for OWASP-grounded security baseline. CLAUDE.md remains the project entry point and references `.ai/docs/STEERING.md`.
- Why: single canonical source for hard constraints. Reduces CLAUDE.md sprawl. Keeps the steering layer separate from the skills layer (which is process) and the memory layer (which is preferences).
- Trade-offs: more files to maintain. Mitigation: only update when a real change happens; not a documentation-theater habit.
- Code: `.ai/`.
- Source pattern: https://github.com/miquael/agentic-node-starter

---

## ADR-16: Movement Coordination Engine (call tasks, role holders, gated bounties)

- Date: 2026-06-23
- Status: Accepted (Phase 1 shipped)
- Context: the codebase had no person-to-role link (gameRoles.ts defines 20 sociocratic roles but no table said "Maya holds Forum Gardener") and no data-driven task surface (quests were hardcoded, no row an agent could write a new task into). Without those two primitives, a recorded session could not turn a named action item into routed, rewarded work.
- Decision: add two MySQL tables, `roleHolders` (person-to-role link, seeded from gameRoles.ts) and `callTasks` (data-driven tasks with a status lifecycle: proposed, approved, open, claimed, submitted, completed, declined, expired). Extend `recordings` with `youtubeVideoId`, `recordingKind`, `editedYoutubeUrl`, `overview`, `decisionsJson`, `actionItemsJson` so the same row carries both the raw live cut and the edited cut plus the LLM understanding outputs.
- Why: closes the two foundational gaps the audit found, gives every later phase (RSS poll, LLM extract-tasks, admin approval queue, profile rendering, reward) a single canonical table to read and write. One status lifecycle keeps the gate logic in one place. Reuses the existing token contract (creditPrivateTokens with source tag `call_task_bounty`) so the private-first model holds.
- Trade-offs: every token-bearing task now passes through two human gates (admin approve, circle steward consent) which is slower than autonomous payout. Accepted because real $ReGen / $RCivics is at stake and an LLM misreading "Sam, can you look at the water rights" should never silently mint tokens or spam a role holder. The gates are designed to be bulk + fast, not bureaucratic.
- Where it lives in code: `drizzle/0142_movement_coordination.sql`, `drizzle/schema.ts` (roleHolders + callTasks + recordings extensions), `server/routes/roleHolders.ts`, `server/routes/callTasks.ts`, `client/src/components/admin/AdminRoleHoldersTab.tsx`, `scripts/seed-role-holders.ts`.
- Spec: `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`.

---

## Adding new ADRs

When you make a load-bearing decision (something a future contributor would re-litigate without context), add an entry. Keep it terse. The "Why" section is the most valuable part: it captures the reasoning that's invisible from the code alone.

If a decision gets reversed, write a NEW entry that explains the reversal and mark the OLD entry `Superseded by ADR-N`. Don't delete history.
