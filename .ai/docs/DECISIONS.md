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
- Status: Accepted (Phase 1 shipped). Superseded in part by ADR-17: the `callTasks` flow is replaced by the unified bounty engine; `roleHolders` and the recordings extensions are retained.
- Context: the codebase had no person-to-role link (gameRoles.ts defines 20 sociocratic roles but no table said "Maya holds Forum Gardener") and no data-driven task surface (quests were hardcoded, no row an agent could write a new task into). Without those two primitives, a recorded session could not turn a named action item into routed, rewarded work.
- Decision: add two MySQL tables, `roleHolders` (person-to-role link, seeded from gameRoles.ts) and `callTasks` (data-driven tasks with a status lifecycle: proposed, approved, open, claimed, submitted, completed, declined, expired). Extend `recordings` with `youtubeVideoId`, `recordingKind`, `editedYoutubeUrl`, `overview`, `decisionsJson`, `actionItemsJson` so the same row carries both the raw live cut and the edited cut plus the LLM understanding outputs.
- Why: closes the two foundational gaps the audit found, gives every later phase (RSS poll, LLM extract-tasks, admin approval queue, profile rendering, reward) a single canonical table to read and write. One status lifecycle keeps the gate logic in one place. Reuses the existing token contract (creditPrivateTokens with source tag `call_task_bounty`) so the private-first model holds.
- Trade-offs: every token-bearing task now passes through two human gates (admin approve, circle steward consent) which is slower than autonomous payout. Accepted because real $ReGen / $RCivics is at stake and an LLM misreading "Sam, can you look at the water rights" should never silently mint tokens or spam a role holder. The gates are designed to be bulk + fast, not bureaucratic.
- Where it lives in code: `drizzle/0142_movement_coordination.sql`, `drizzle/schema.ts` (roleHolders + callTasks + recordings extensions), `server/routes/roleHolders.ts`, `server/routes/callTasks.ts`, `client/src/components/admin/AdminRoleHoldersTab.tsx`, `scripts/seed-role-holders.ts`.
- Spec: `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`.

---

## ADR-17: Unified bounty engine (replaces callTasks; two-sided contribution bounties)

- Date: 2026-06-24
- Status: Accepted (build queued; spec + execution prompt ready, not yet shipped)
- Context: a second bounty type was needed, code contributions where one player proposes a fix or feature and another ships and merges it. Building it as a flow parallel to `callTasks` would create a second token-payout code path, doubling the surface for double-pay bugs and the number of audit surfaces. The `callTasks` payment flow is pre-launch with no live data, so it can be replaced outright.
- Decision: one bounty engine. A bounty has one or more payable roles (a call task is one `doer` role; a contribution is a `proposer` plus a `shipper`). A single function `payRole` is the only path that credits a bounty reward. Big-bang replacement: delete the `callTasks` table and router, no migration or backfill. New tables: `bounties` (work lifecycle only), `bounty_roles` (sole owner of payment state), `bounty_events` (immutable audit log), `webhook_deliveries` (idempotency), `bounty_permissions` (canAccept, canReverse). Integrity: a unique `idempotencyKey` on `user_token_ledger` makes a duplicate credit impossible at the DB; GitHub webhook deliveries are de-duplicated; separation of duties (accepter cannot equal proposer, one user cannot auto-collect multiple roles on a bounty); a one moon cycle settlement hold (29.5 days, 708 hours) before bounty tokens can claim to Base, during which a `canReverse` admin can reverse; a season minting budget (built, off at launch) and a citizenship tier floor (built, set to `explorer` so any account qualifies). Empowerment model: only `canAccept` accounts accept proposals and only `canReverse` accounts reverse payouts; `rieki.cordon@gmail.com` is seeded with both, and the owner grants `canAccept` to others through an admin section.
- Why: one hardened payout path instead of two is the core security win; "two-sided" generalizes to N roles so future reward shapes (reviewer, booster) are configuration rather than new systems; pre-launch status removes all migration risk from a big-bang.
- Trade-offs: rewrites a working (if unused) payment path. The role abstraction adds a bounty-to-roles join on reads. The optional guards add config surface in `game_variables`.
- Where it lives in code (on build): `drizzle/NNNN_bounty_engine.sql`, `drizzle/schema.ts`, `server/db` `payRole` / `reverseRole`, `server/routes/bounties.ts`, `server/_core/oauth.ts` (GitHub provider), `server/webhooks/github`, `player_profiles` GitHub columns.
- Supersedes the `callTasks` portion of ADR-16. Builds on ADR-6 (token model) and ADR-7 (private-first ledger with claim bridge).
- Spec: `BOUNTY_ENGINE_SPEC.md`. Execution prompt: `CLAUDE_CODE_PROMPT_2026-06-24_BOUNTY_ENGINE.md`.

---

## ADR-18: CORE (Church of the Regenerative Earth) as a subdomain inside this monorepo

- Date: 2026-07-01
- Status: Accepted (Phase 0 shipped: scaffold + static port of the seven church pages; runtime host switch live)
- Context: CORE needs its own site at `core.regencivics.earth` with two live features (an Ask Anastasia chatbot on the Claude API, and Stripe donations with a priest/priestess payment role). Two paths existed: stand up a separate app/deployment for the subdomain (mirroring how `gov.regencivics.earth` is served), or build CORE inside this repo and switch on the host at runtime. A codebase search found no existing host-based route switch in `client/src/App.tsx`; the multi-subdomain evidence is only the CORS allowlist in `server/_core/index.ts`.
- Decision: build CORE inside the regen-civics monorepo and select it at runtime. `App.tsx` branches at the top (`isCoreHost()` -> `window.location.hostname.startsWith("core.")`) into a dedicated `CoreShell` that lazy-loads `client/src/pages/core/CoreApp.tsx`, its own Wouter `Switch`, `CoreNav`, and `CoreFooter`. The church tree is the root on the core subdomain; on the main domain `/church` redirects to `https://core.regencivics.earth`. All church styles are scoped under `.core-root` in `client/src/pages/core/core.css` and map to the existing design tokens (`--color-forest-*`, `--font-*`), so no second color system is introduced and the main site is untouched. The branch is a pure wrapper (`App` -> `CoreShell` | `MainApp`) so each side keeps a stable, independent hook order.
- Why: reuses the existing Express + Vite + tRPC server, Drizzle + MySQL, JWT-cookie auth, the Hypha bridge, `@anthropic-ai/sdk`, the `/api/img` proxy, R2, and the OG router with zero new infrastructure. One deploy, one build pipeline, one auth domain (cookie is already `.regencivics.earth`-scoped per ADR-10, so a logged-in user is recognized on the subdomain). A single codebase keeps the church's data-driven payment roles and the elder-chat retrieval next to the tables and routers they depend on.
- Trade-offs: the church chunk ships in the same repo/build as the main app (mitigated by lazy-loading the entire `CoreApp` so it never enters the main bundle); the runtime host check means both apps share one server process and one Railway service rather than isolating the church deploy. Accepted: the church is small and benefits far more from reuse than from isolation. If CORE later needs independent scaling or release cadence, it can be extracted to its own deployment without changing the page components (only the mount point in `App.tsx`).
- Where it lives in code: `client/src/App.tsx` (`isCoreHost`, `CoreShell`, `MainApp`, `/church` redirect), `client/src/pages/core/` (CoreApp, CoreNav, CoreFooter, seven pages, NotFound, core.css, useCoreSeo, useCoreReveal, AnastasiaChat), `client/public/core/formation-document.docx`. DB tables, tRPC routers, Stripe, and the elder-chat retrieval land in later phases.
- Builds on ADR-4 (Wouter), ADR-10 (subdomain-shared cookie), ADR-11 (R2 + `/api/img`). Spec: `CLAUDE_CODE_PROMPT_CORE_CHURCH_SITE.md`.

---

## ADR-19: Zeffy as the preferred CORE donation processor, Stripe as secondary fallback

- Date: 2026-07-01
- Status: Accepted (coded; both paths write to the same `church_donations` ledger; live once Rye configures either processor)
- Context: Rye asked for Zeffy over Stripe because Zeffy charges nonprofits zero platform fees (it funds itself through an optional donor tip at checkout, never deducted from the gift), while Stripe takes its standard ~2.9% + 30c per transaction. Zeffy's integration model is fundamentally different from Stripe's: there is no "create checkout session" API. A donation form (amounts, one-time/monthly, campaign branding) is built once in the Zeffy dashboard and then embedded on the site via a dashboard-generated URL; Zeffy's public API (`api.zeffy.com/api/v1`) is read-only (Payments, Contacts, Campaigns, Bearer token). Webhooks exist (`payment.completed`, POST with a JSON payload, needs a 2xx response or Zeffy retries) but Zeffy does not document an HMAC signature scheme the way Stripe/GitHub do.
- Decision: Zeffy is the PREFERRED path; the Stripe checkout flow built earlier stays as a secondary fallback, not removed. `client/src/pages/core/DonateOptions.tsx` shows the Zeffy embed (`ZeffyDonate.tsx`, an `<iframe>` at the dashboard URL from `ZEFFY_EMBED_URL`) first when configured, with a "prefer to give by card directly?" disclosure that reveals the existing Stripe `DonateForm` beneath it. If Zeffy is not configured, the Stripe form is primary exactly as before, so nothing regresses while Zeffy is being set up. `church_donations` gained a `provider` enum (`stripe` | `zeffy`) plus `zeffyPaymentId` / `zeffyCampaignId` columns (migration `0154_core_zeffy.sql`, additive ALTER on top of `0153`) so both processors write to one ledger and one reconciliation view. Since Zeffy's webhook has no documented signature verification, the webhook route (`server/webhooks/zeffy.ts`) folds a shared secret (`ZEFFY_WEBHOOK_TOKEN`, chosen by us) into the URL path itself (`/api/webhooks/zeffy/:token`) as the auth boundary, plus idempotency on `zeffyPaymentId` and the existing `webhook_deliveries` table so a guessed URL or a retry can never double-insert a donation. `scripts/reconcile-zeffy.ts` is a read-only-API-based backup reconciliation script (Rye-run, optional daily cadence) in case a webhook delivery is ever lost.
- Why: the fee difference is real money that should reach the church rather than a payment processor, so preferring Zeffy is a straightforward win once it is set up. Keeping Stripe as a fallback preserves the fully-built, tested checkout/webhook/ledger work from the first pass and gives a working alternative if a donor's card fails inside the Zeffy embed, if Zeffy has an outage, or if Rye wants both surfaced.
- Trade-offs: Zeffy's per-processor differences (no server-created checkout session, no documented HMAC) mean the two payment surfaces are not symmetric in code, and Zeffy amounts/toggles are configured in their dashboard rather than in our component, so changing preset amounts is now a Zeffy-dashboard edit, not a code change. The shared-secret-in-URL webhook auth is weaker than HMAC; acceptable given idempotency + the append-only ledger means a replay can at most re-acknowledge a real completed payment, never fabricate one, and the token is never logged or shown to the client.
- Where it lives in code: `server/lib/zeffy.ts`, `server/webhooks/zeffy.ts`, `server/routes/churchDonations.ts` (`zeffyEnabled` query), `client/src/pages/core/{ZeffyDonate,DonateOptions}.tsx`, `drizzle/0154_core_zeffy.sql`, `drizzle/schema.ts` (`churchDonations.provider` + zeffy columns), `scripts/reconcile-zeffy.ts`.
- Supersedes nothing; extends ADR-18. Env vars: `ZEFFY_EMBED_URL`, `ZEFFY_API_KEY` (optional, reconciliation only), `ZEFFY_WEBHOOK_TOKEN`.

---

## ADR-20: Church role title renamed priest/priestess -> Steward

- Date: 2026-07-01
- Status: Accepted (coded; live once migration `0155_core_steward_rename.sql` runs)
- Context: Rye asked for the church's payment-rights role to carry a single, gender-neutral official title, "Steward," instead of the two gendered titles priest/priestess used in the first pass (ADR-18).
- Decision: rename the title everywhere it is load-bearing or user-facing, without rewriting history. `church_role_holders.role` becomes a single-value enum (`steward`) via `drizzle/0155_core_steward_rename.sql` (a safe three-step MySQL enum change: widen the enum, move any existing priest/priestess rows to `steward`, then narrow the enum), matched by the equivalent change in `drizzle/schema.ts`. `server/routes/churchRoles.ts`'s `churchRoleEnum` and `grantRole` input default to `steward`. All prose (code comments, `DOMAIN-LANGUAGE.md`, `OPS-PLAYBOOK.md` Procedure 12, `CORE_HANDOFF_2026-07-01.md`, `CLAUDE_CODE_PROMPT_CORE_CHURCH_SITE.md`, `START_HERE_CORE_CHURCH.md`) and UI copy (Transparency's "Stewards" card, Reconciliation's gate copy) were updated to match. Left untouched on purpose: ADR-18 and ADR-19's own prose (historical record of what was true at the time they were written, per this file's "don't edit old ADRs" convention) and `anastasia_canon.md` (its many uses of "priest" are Vladimir Megre's literary/historical references, unrelated to this role, and the canon must stay verbatim).
- Why: a single title matches the church's own "no ruling class" framing (Transparency page) better than a gendered pair, and collapsing to one enum value removes a class of "did they mean priest or priestess" ambiguity from the code without losing the ability to add role variants later (the field stays an enum, not a boolean).
- Trade-offs: none material. The enum-with-one-value shape is slightly unusual but keeps the column extensible and matches this codebase's existing preference for enums over booleans on role-like fields.
- Where it lives in code: `drizzle/0155_core_steward_rename.sql`, `drizzle/schema.ts`, `server/routes/churchRoles.ts`, `server/lib/church-permissions.ts`, `server/routes/churchDonations.ts` (comments), `client/src/pages/core/{Transparency,Reconciliation}.tsx`.
- Extends ADR-18; does not supersede it (the underlying architecture is unchanged, only the title).

---

## ADR-21: Anastasia as an autonomous community presence (deterministic-first forum comments)

- Date: 2026-07-02
- Status: Accepted (coded; on by default once ANTHROPIC_API_KEY + corpus are present, silenceable via env)
- Context: Rye asked to extend the Ask Anastasia chat so she also brings the canon's wisdom into the main community forum, commenting on posts and replying to responses to her comments. This is a recurring, autonomous, public behavior on the shared forum used by the whole site, so STEERING section 11 (deterministic-first) and section 2 (ask on data-model-shaping forks) both apply. Rye's decisions: comment on all categories except administrative ones (with an easily-edited ban list), use her judgment about which posts merit a comment, go live immediately, comment plus reply once to direct replies to her, and poll a few times a day.
- Decision: split it deterministic vs nondeterministic. The deterministic part is a plain DB poll (`server/jobs/anastasiaForumJob.ts`, registered on a 6-hour interval in `server/_core/index.ts`): it finds new posts with no reply from her and unanswered direct replies to her top-level comments, using NOT EXISTS correlated subqueries so the forum itself is the cursor (no tracking table, restart-safe, never double-posts). The nondeterministic part is only the comment text: retrieve top-k canon passages for the post/reply (reusing the shared `retrieveCanonPassages`) and one `invokeLLM` call per item. She posts as an auto-provisioned bot user (`openId bot:anastasia`), whose `createdAt` is the natural no-backfill cutoff so she never comments on the 45 pre-existing posts. Her voice and the no-AI-writing rules live in one shared `ANASTASIA_VOICE` block (elder-safety.ts) used by both the chat and the forum prompts. Safety/honesty defaults: every comment carries a short AI-presence disclosure; a deterministic crisis check and a model-side PASS gate both skip posts that express distress or do not call for her voice; "reply once" is enforced structurally (she only answers replies whose parent is one of her top-level comments); per-run caps bound the work; excluded categories are a single edit-in-place slug list; and `ANASTASIA_FORUM_ENABLED=false` silences her without a redeploy.
- Why: deterministic-first keeps token spend to exactly the comments written, and the NOT-EXISTS-as-cursor design means zero new schema and no risk of duplicate or backfilled comments even across restarts. Grounding every comment in retrieved canon and gating on the model's own judgment keeps her from posting hollow or off-topic comments, which matters more than volume given the forum is low-traffic (two posts in the last 30 days).
- Trade-offs: she posts publicly and autonomously, so a bad comment is visible until moderated; mitigated by the disclosure line, crisis/PASS gates, the hardened canon-grounded voice, per-run caps, and the instant env kill switch. The model still judges appropriateness, which is not perfectly reliable; the caps and the "go live immediately" choice (over a review-queue mode) were Rye's call. Excluded categories and cadence are code constants, so changing them is a small edit, not a config toggle.
- Where it lives in code: `server/jobs/anastasiaForumJob.ts`, `server/lib/anastasia-forum.ts`, `server/lib/elder-safety.ts` (`ANASTASIA_VOICE`, forum prompts), `server/lib/elder-retrieval.ts` (`retrieveCanonPassages`), `server/_core/index.ts` (interval). Env: `ANASTASIA_FORUM_ENABLED`. Extends ADR-18. Generalized to multiple elders by ADR-22 (files renamed: `elder-forum.ts`, `elderForumJob.ts`, env `ELDER_FORUM_ENABLED`).

---

## ADR-22: Multiple elders via a registry; forum routing + @mentions; source attribution moved to Transparency

- Date: 2026-07-02
- Status: Accepted (coded; live once each elder's corpus is built)
- Context: Rye asked to add a second elder (Yeshua, the Essene Gospel of Peace) alongside Anastasia and to make the pattern hold for more elders later, plus three changes to how the elders work: name them "AI Elder <Name>" and drop the per-comment forum disclosure (the name is the disclosure); remove author credit from the elders' own voices, chat, and comments; and evolve the forum so one best-fit elder comments per post rather than all elders piling on, with any elder callable by an @mention.
- Decision: one registry (`server/lib/elders.ts`) is the source of truth for every elder (id, `AI Elder` display name, handle, bot openId, domain, persona voice, forum-enabled, avatar, and a Transparency-only source note). The persona prompts (`elder-safety.ts`) and the chat (`elderChat.ts`) became elder-generic, taking an `Elder`. Anastasia's forum code was generalized to `server/lib/elder-forum.ts` + `server/jobs/elderForumJob.ts`. Yeshua's canon is scraped (`scripts/scrape-yeshua-canon.py`) into `yeshua_canon.md` in the same markdown-with-`# BOOK`/`## section` shape the corpus builder already reads; only his teaching texts are included, the translator's modern first-person scholarship pages are excluded so retrieval never makes him speak a modern memoir as his own. Forum model: a new post is routed by one cheap LLM call to the single best-fit elder (or none), and only that elder comments; an `@handle` mention in a post or reply brings the named elder in regardless; a direct reply to an elder's top-level comment gets one reply from that elder. Attribution (ADR-19-style honesty, and the original build spec's non-negotiable to credit Megre): Rye chose option B, so the elders never name their sources in voice/chat/comments, and one quiet acknowledgment of both sources (Megre for Anastasia, Szekely for Yeshua) lives on the Transparency page. The per-comment forum disclosure was removed; the "AI Elder" name is the standing disclosure.
- Why: a registry makes "add elder N" a config entry plus a canon file, not a code fork. Routing-by-best-fit keeps a low-traffic forum from being crowded by several AI voices on one thread, while @mentions still let a member call any elder. Deterministic-first holds: polling and candidate selection are plain DB reads; the only model calls are one router call per un-handled post and the comment texts. Option B keeps the elders reading as living teachers rather than book-bots while still acknowledging sources openly in one honest place.
- Trade-offs: this reverses the original build spec's explicit "credit Vladimir Megre on the Elders page and in the chatbot" non-negotiable; done on Rye's direct, informed instruction (recorded here so future agents do not "restore" the credit as a fix). Cross-corpus retrieval-score routing is not reliable under FULLTEXT, so routing costs one small LLM call today; it can become pure cosine-score routing once Voyage embeddings are enabled. The router and the appropriateness (PASS) gate are model judgments, bounded by per-run caps and the `ELDER_FORUM_ENABLED` kill switch.
- Where it lives in code: `server/lib/elders.ts`, `server/lib/elder-safety.ts`, `server/lib/elder-forum.ts`, `server/jobs/elderForumJob.ts`, `server/routes/elderChat.ts`, `client/src/pages/core/{Elders,ElderChat,Transparency}.tsx`, `scripts/scrape-yeshua-canon.py`, `yeshua_canon.md`. Env: `ELDER_FORUM_ENABLED` (replaces `ANASTASIA_FORUM_ENABLED`). Supersedes the Anastasia-specific parts of ADR-21; extends ADR-18. Reverses the Megre-credit non-negotiable from the CORE build spec, per Rye (option B).

---

## ADR-23: Remove Loomio; governance deliberation lives in the ReGen Gov app

- Date: 2026-07-02
- Status: Accepted (coded + shipped)
- Context: The forum -> Loomio -> Hypha pipeline (ADR-era spec `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` + `LOOMIO_INTEGRATION_SPEC_2026-04-09.md`) built a full Loomio integration: a webhook receiver at `/api/webhooks/loomio`, an API sender (`sendPromotionToLoomio`), bioregion subgroup sync (`syncLoomioSubgroups`), an OIDC provider for shared auth, and a set of `loomio*` columns on the governance tables. Loomio was never brought live — the `LOOMIO_API_KEY` in Railway stayed the placeholder `PLACEHOLDER_SET_WHEN_LOOMIO_IS_LIVE`, so `sendSignedPromotionsToLoomio` no-op'd every hour and the webhook receiver rejected every call. gov.regencivics.earth was pointed at the custom **ReGen Gov** Next.js app (`apps/gov`), not Loomio. Two `loomio` + `loomio-worker` Railway services (plus their Postgres) ran idle, costing money. The public DecisionsDashboard even carried a false "Governance powered by Loomio" credit. Rye asked to remove Loomio entirely — site mentions, code, and Railway services.
- Decision: delete the Loomio integration. Removed `server/webhooks/loomio.ts` (webhook receiver + API sender + subgroup sync + promotion snapshot), its registration in `server/_core/index.ts`, and the `sendSignedPromotionsToLoomio` job + call in `server/jobs/governanceJobs.ts`. Stripped every user-facing "Loomio" mention (DecisionsDashboard footer + external-link, Governance/GameMechanics copy, CommunityPost promote button, the ReGen Gov logo's "POWERED BY LOOMIO" subtitle, shared-types labels). Dropped the dormant `loomio*` columns from `forumPromotionRequests`, `forumPostDecisions`, `governanceTenants`, and `governanceAgreements` (migration `0162_drop_loomio_columns.sql`) — they were provably empty since Loomio never wrote to them. Removed the pure-Loomio Railway variables (`LOOMIO_API_URL/KEY`, `LOOMIO_WEBHOOK_HMAC_SECRET`, `LOOMIO_GROUP_*`) and deleted the `loomio` / `loomio-worker` / their Postgres services. **Kept** the OIDC provider (`server/routes/oidc.ts`) and its `OIDC_LOOMIO_*` env vars: the live ReGen Gov app authenticates through it under the client id `loomio-gov`, so removing it would break gov login. The `hyphaBridges.source` enum value `loomio_decision` was left in place (internal identifier, not a site mention; changing a live MySQL enum is a heavier migration for no user benefit).
- Why: dead infrastructure that costs money and lies to users on the public site is worse than no feature. Nothing depended on the Loomio code paths (the API key was a placeholder), so removal is behavior-preserving for the running system while cutting the idle Railway spend and the false credit. Governance already happens in the ReGen Gov app; the forum promotion pipeline and the Hypha bridge are untouched.
- Trade-offs: the OIDC provider keeps a Loomio-flavored name (`OIDC_LOOMIO_*`, client id `loomio-gov`) because renaming it means a coordinated code + Railway change with a gov-login outage window; deferred as optional cleanup. The `loomio_decision` bridge-source enum value also remains. The `forumPostDecisions` table is retained (the promotion pipeline still writes to it); only its Loomio columns were dropped.
- Where it lives in code: deleted `server/webhooks/loomio.ts`; edited `server/_core/index.ts`, `server/jobs/governanceJobs.ts`, `server/routes/governance.ts`, `server/routes/oidc.ts` (comments only), `drizzle/schema.ts`, `drizzle/0162_drop_loomio_columns.sql`, `client/src/pages/{DecisionsDashboard,Governance,GameMechanics,CommunityPost}.tsx`, `client/src/components/governance/ForumThreadDecisionBanner.tsx`, `client/public/brand/regen_logo.svg`, `packages/shared-types/*`, `.env.example`, `DEV_CONTEXT.md`, `.ai/docs/DOMAIN-LANGUAGE.md`. Archived `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` + `LOOMIO_INTEGRATION_SPEC_2026-04-09.md`.

---

## ADR-24: One notification spine on `notifications`; deterministic forum fan-out

- Date: 2026-07-03
- Status: Accepted (coded; live once migration 0163 runs)
- Context: Two parallel notification tables had drifted: `user_notifications` (campaign/contribution events, read by NotificationBell, no link column) and `notifications` (bounty/coordination events keyed on `playerId`, with a `link` column almost nothing populated). No forum event notified anyone: mentions, replies, gratitude, and elder/Guide responses all went unseen unless the user happened to revisit the thread. Phase 1 of the forum upgrade plan (2026-07-02, decisions locked by Rye) called for one spine, deep links to the exact comment, and email delivery.
- Decision: `notifications` is the single spine. Migration 0163 renames `playerId` to `userId` (its writers always stored `users.id`), widens the type enum to forum + legacy types, adds actor/source columns (`actorId`, `postId`, `replyId`), delivery stamps (`emailedAt`, `pushedAt` for the coming web-push phase), and a unique `dedupeKey`; back-fills every `user_notifications` row with owner, read state, timestamps, and a link matching the old bell's navigation; and seeds `forum_subscriptions` from existing authors/repliers so live threads notify from day one. All fan-out is deterministic (STEERING 11) in `server/lib/forum-notify.ts`, runs fire-and-forget after mutations commit, and is idempotent end to end: `dedupeKey` for notification inserts, a unique key on `forum_mentions` for edit re-parses, `emailedAt` for email sends. One person gets one notification per event (mention wins over direct reply wins over thread activity). Person-level mutes (`forum_user_mutes`) and thread mutes gate delivery server-side. Email goes through the existing Resend path with per-type prefs on `playerProfiles.notificationPrefs`, immediate or daily-digest cadence, a 20/day hard cap, and never to banned users. `user_notifications` stays in the schema until a follow-up migration drops it after a soak period.
- Why: leaving two tables is what made the bell lie (forum events invisible, contribution events un-linkable). Consolidating in one migration, back-fill included, avoids a half-state where old unread rows vanish. Deterministic fan-out costs zero tokens forever and the dedupe keys make Railway restarts and retried hooks harmless, the same scar the token ledger already carries (`idempotencyKey`).
- Trade-offs: between the migration running and the next deploy finishing, the previously-deployed code writes `playerId` and fails (caught + logged) for bounty/coordination notifications, a window of a few minutes. The migration must run before push since deploys do not run migrations. Grouping in the bell is computed per page server-side rather than materialized; fine at current scale.
- Where it lives in code: `drizzle/0163_forum_notifications.sql`, `server/lib/forum-notify.ts`, `server/lib/notification-email.ts`, `server/jobs/notificationDigestJob.ts`, notificationsRouter in `server/routes/forum.ts`, hooks in `forum.ts`/`gratitude.ts`/`regenGuide.ts`/`elderForumJob.ts`, `client/src/components/NotificationBell.tsx`, `client/src/pages/{Notifications,NotificationSettings}.tsx`.

---

## ADR-25: Deterministic For You feed (affinity tables + frozen-clock cursor)

- Date: 2026-07-03
- Status: Accepted (coded; live once migration 0168 runs)
- Context: The forum feed was pinned-then-chronological only while rich player signals (bioregion, category/author engagement, citizenship tier, capitals) sat unused. Phase 2 of the forum upgrade plan calls for a personalized feed with zero LLM in the ranking path (STEERING 11) and Rye's locked decision: For You default for signed-in users, Latest for signed-out.
- Decision: ranking is pure SQL over nightly-precomputed signals. `forumAffinityJob` (24h interval) aggregates 90 days of posts/replies/reactions/gratitude into `user_forum_affinity` (category/user/tag dimensions, recency-decayed, normalized 0..1, full refresh each run). `forum_post_tags` is a maintained projection of the JSON-string `forumPosts.tags` column so tag scoring is an indexed join instead of LIKE scans. `forumFeed.feed` scores a bounded candidate window (90 days activity, cap 500) with score = base x freshness x relevance x unread, constants in `shared/forumFeed.ts` shared with the client's "why am I seeing this" tooltip so the explanation is honest. Cursor stability: freshness depends on now(), so page one stamps an asOf timestamp and every subsequent page recomputes against that frozen clock, paging by (score, id). Latest keeps the untouched `forum.posts` procedure as the regression guard. `forum_post_reads` powers unread state; `user_follows` is one polymorphic follow table (user/category/bioregion/tag). Person-mutes (scope feed/both) exclude authors from For You and Following. Newcomer mode (account under 14 days or under 3 interactions) blends seed posts. The capitals boost ships disabled: posts carry a nullable `capital` column but nothing writes it until the composer picker (Phase 3.3); the feed must not fake it with keyword matching.
- Why: precomputing affinity nightly makes the read-time query one indexed round trip and costs zero tokens forever. The frozen-clock cursor prevents the duplicate/skipped posts a live-recomputed score causes mid-scroll. Sharing constants between scorer and tooltip keeps the ranking explainable, which is a trust feature in a community product.
- Trade-offs: affinity is up to 24h stale (fine for a low-traffic forum); the candidate window means posts idle longer than 90 days never surface in For You (reachable via Latest, search, categories); the affinity job is a full refresh (delete + rewrite), simple over incremental at current scale.
- Where it lives in code: `drizzle/0168_forum_feed.sql`, `shared/forumFeed.ts`, `server/jobs/forumAffinityJob.ts`, `server/routes/forumFeed.ts`, `client/src/components/{CommunityFeedTabs,FollowButton}.tsx`, read tracking in `client/src/pages/CommunityPost.tsx`. Extends ADR-24.

---

## ADR-26: Profile unification scoped to symmetric sync, not a table merge (Phase 2B)

- Date: 2026-07-03
- Status: Accepted (coded; migration 0169 applied)
- Context: The forum upgrade plan's Phase 2B called for merging userProfiles into playerProfiles because both "hold conflicting copies of display name / bio / avatar" and the forum read one table while the game read the other. Before writing the migration I checked the live data: 9 userProfiles rows, 6 playerProfiles, ZERO display-field conflicts, ZERO non-zero forum stats (reputation all 0; postCount/replyCount are recomputed live from row counts anyway), and 4 userProfiles rows with no playerProfiles row. userProfiles also holds onboarding-only fields (path, investmentRange, projectName, projectUrl, organizationName, questInterests) that have no home in playerProfiles and are actively written by the OnboardingWizard.
- Decision: scope Phase 2B to the safe, reversible slice that its actual goal (Phase 3 builds against one model) needs, and skip the risky full merge the data does not justify. Migration 0169 ADDS the forum-relevant columns to playerProfiles (website, forumLocation, preferredLanguage, reputation, onboardingComplete, forumLastActiveAt), back-fills them from userProfiles (straight copy; display fields only where playerProfiles is empty), and creates an empty profile_merge_conflicts audit table. The forum now reads playerProfiles via new db.getForumProfile / writes via db.updateForumProfile, and reputation lives on playerProfiles. userProfiles is KEPT (onboarding depends on it) and the two tables are held identical by SYMMETRIC sync: updatePlayerProfile mirrors pp->up (pre-existing) and upsertUserProfile now mirrors up->pp for all shared fields. No table drop, no data move, no touch to auth/onboarding writers.
- Why: the plan's premise (conflicting copies) was empirically false, so the expensive, irreversible merge + drop carried real risk (auth, onboarding, every profile surface; 4 orphan rows; onboarding fields with nowhere to go) for no current benefit. Symmetric sync makes drift impossible going forward, which is the actual concern the plan raised, without a data migration. Phase 3 can build UserForumProfile / ForumPostCard against playerProfiles as intended.
- Trade-offs: userProfiles is not eliminated, so two tables persist (kept identical by sync). A future migration can drop userProfiles once onboarding fields are relocated and grep confirms zero reads; that is deferred, not lost. The symmetric writes double a profile-save's row updates (negligible at this scale). If the two sync paths ever diverge in field coverage they could drift again; both cover the same shared-field set today and are commented as a pair.
- Where it lives in code: drizzle/0169_profile_unify.sql, drizzle/schema.ts (playerProfiles columns + profile_merge_conflicts), server/db.ts (getForumProfile, updateForumProfile, upsertUserProfile forward sync, reputation on playerProfiles, getUserForumStats), server/routes/forum.ts (userProfile reader + updateProfile writer). Supersedes the Phase 2B plan's merge-and-drop approach with a scoped symmetric-sync approach; extends ADR-25.

---

## ADR-27: The Assembly as the one door for Game governance (stacked page, Hypha keeps the binding vote)

- Date: 2026-07-03
- Status: Accepted (shipped; Phases 1-6 of ASSEMBLY_PAGE_SPEC.md live)
- Context: Game governance was split across `/proposals`, `/community/decisions`, and forum threads, so members never knew where a decision actually lived. The spec (ASSEMBLY_PAGE_SPEC.md) locked a set of decisions: Game-only scope (the Fund never appears), a stacked single-scroll page with no tabs, an aim line required at raise time, two lanes (full + minor lazy-consent), 48h last call, 30d resting, and delegation that links out to Hypha rather than rebuilding voting.
- Decision: `/assembly` is the single surface for the whole proposal lifecycle (Forming, Last call, Deciding, Record); the old routes redirect permanently. Deliberation happens here and in the forum; the BINDING vote stays on Hypha, reached through the Hypha Bridge with the `assembly-proposal-to-contribution` intent. `proposal_votes` is deprecated but never dropped in this build.
- Why: one door means one mental model for members who are not governance nerds; keeping the binding vote on Hypha means ReGen Civics never becomes a shadow voting system and on-chain legitimacy stays where the DAO already is.
- Trade-offs: the page carries a lot of lifecycle state in one scroll; Hypha remains a hard dependency for ratification; members must cross an app boundary to cast the binding vote.
- Where it lives in code: `client/src/pages/AssemblyPage.tsx` (+ section components), `server/routes/assembly.ts`, `server/jobs/assemblyLifecycleJob.ts`, migrations 0164-0165, redirects in the router config. Extends ADR-23 (deliberation in our stack, decisions on Hypha).

---

## ADR-28: The Signal — aggregate-only -3..+3 sensing, never a vote

- Date: 2026-07-03
- Status: Accepted (shipped; migration 0164)
- Context: Proposals needed a temperature read long before a binding vote, and up/down voting was rejected: it polarizes early, rewards mobilization over insight, and duplicates what Hypha does. Locked decisions: 7-point scale (-3..+3), open to any signed-in member (tier gate built but off), ranking by net points with an average floor of +1.0 as an advance gate.
- Decision: one adjustable signal per member per proposal, stored individually but surfaced ONLY as aggregates (histogram, net points, count). Negative scores prompt an optional "what would move you" note that surfaces unattributed and feeds the AI synthesis. Signals decay to a stale badge when old; a second signal overwrites the first.
- Why: aggregate-only display keeps early sensing honest (nobody performs their score for an audience); the moveNote turns opposition into design input instead of a fight; net points ranking surfaces both enthusiasm and breadth without pretending to be a mandate.
- Trade-offs: individual signals exist in the DB (aggregate-only is a display rule, enforced in code review, not cryptography); a 7-point scale is more cognitive load than up/down; the advance gates are tunable game variables, so governance can change its own thresholds (by design, but worth knowing).
- Where it lives in code: `proposal_signals` table (migration 0164), signal procedures in `server/routes/assembly.ts`, pill row + histogram in the Assembly page components. Extends ADR-27.

---

## ADR-29: The Evolution Engine — ratified decisions execute themselves, autonomy is community-governed

- Date: 2026-07-03
- Status: Accepted (Rung 1 live; Rung 3 coded dark, gated, NOT approved to ship; Rung 2 design placeholder)
- Context: Ratified proposals used to wait for a human (Rye) to apply them, which made the community's authority theoretical and Rye a bottleneck. The spec's ladder: Rung 0 humans apply by hand, Rung 1 ratified variable changes auto-apply, Rung 2 content auto-applies (later), Rung 3 features auto-build/auto-ship via GitHub (dark launch only). The machine's leash must itself be governed by the same mechanism as every other game rule.
- Decision: proposals carry a structured `executionPayload` validated at raise time (bounds for variable changes; scopePaths + acceptance criteria for features, protected paths rejected immediately). On a confirmed ratification, `dispatchExecution` runs the payload idempotently (one applied execution per proposal, recorded append-only in `governance_executions`): variable changes go through `applyVariableChange`, the same bounds-checked path as `game.updateVariable`, attributed to the provisioned "The Evolution Engine" bot user. Autonomy is governed by `evolution.max_autonomy_tier` (default 1), `evolution.launch_window_hours`, and `evolution.circuit_breaker_failures` (migration 0170) — raising the tier is an act of meta-governance, not a deploy. Below tier 3 a ratified feature parks in `paused` and nothing is created on GitHub. Protected paths (`.github/assembly-protected-paths.json`, enforced fail-closed by `scripts/check-protected-paths.mjs`) and the circuit breaker are code-enforced and NOT community-tunable below their floors. The ratification event does not arrive by webhook yet, so `assembly.confirmRatification` is an admin-gated stub that records the Hypha outcome and runs the dispatcher (gap logged in SHIPPED_LOG.md).
- Why: Rung 1 makes community authority real for the safest change class (bounded numbers the game already exposes) while keeping one shared write path, one audit trail, and one attribution story. Governing the tier with a game variable means the community, not the maintainer, decides how much power the machine holds — which is the point of the project. Building Rung 3 dark lets the whole pipeline be tested without any path to production until both the community votes the tier up AND a human ships the go-ahead.
- Trade-offs: the admin-confirm stub means a human still relays the Hypha outcome (trust bridge until the webhook exists); Rung 3's dark code is maintenance surface that cannot fire; tier 3, when someday enabled, lets an LLM merge to main off a community vote — the protected paths, machine gates, launch window with Steward pause, and circuit breaker exist precisely to bound that, and Phase 7 still requires explicit human go-ahead before any of it is finished.
- Where it lives in code: `server/lib/evolution.ts`, `server/lib/github-governance.ts` (dark), `scripts/check-protected-paths.mjs` + `.github/assembly-protected-paths.json`, `governance_executions` (migration 0167), autonomy variables (migration 0170), `confirmRatification` + `evolutionStatus` in `server/routes/assembly.ts`, launch-window advance in `server/jobs/assemblyLifecycleJob.ts` (inert below tier 3). Tests: `server/evolution.test.ts`, `server/evolution-guard.test.ts`. Extends ADR-27; the spec's locked decision 10 is canonical.

---

## ADR-30: Gratitude moves to the lunar-cycle proportional economy (no credit at send time)

- Date: 2026-07-03
- Status: Accepted (coded + shipped)
- Context: Three gratitude models coexisted. (1) `gratitude.send` credited the recipient a flat 5 $ReGen per message at send time. (2) The bounty flow (`game.sendGratitude`) used a 1–5 amount against season-keyed `gratitude_budgets`/`gratitude_transactions`. (3) `GRATITUDE_SYSTEM_SPEC.md` (2026-04-03) specified the intended model — per-lunar-cycle tier budgets split proportionally across unique recipients, with an end-of-cycle $ReGen pool distribution — but it was never built. Rye chose to build the spec model for real while shipping the profile Gratitude tab (`GRATITUDE_TAB_BUILD_SPEC.md`).
- Decision: sends no longer credit tokens. A send is a free acknowledgment recorded in `gratitudeLog` with a `cycleId`; one acknowledgment per (sender, recipient, cycle), enforced by `uniq_ack_per_cycle`. Cycles are lunations computed deterministically in `shared/lunar.ts` (mean synodic month anchored to the 2000-01-06 reference new moon; `cycleNumber` = lunation count, the stable natural key). Per-user budgets snapshot tier/multiplier/streak into `gratitude_cycle_budgets` on first touch. At cycle close (`server/lib/gratitude-cycles.ts:closeDueCycles`, run as Step 8 of the nightly batch job and exposed as `gratitude.closeCycles` admin mutation), each sender's effective budget splits across their unique recipients (written to `gratitudeLog.weight`), and recipients earn from the cycle pool proportional to weight received — floored to whole tokens, credited via `creditPrivateTokens` with `source: 'gratitude_received'` and idempotency key `gratitude_dist:{cycleId}:{userId}`, recorded in `gratitude_distributions`. No clawback of historical flat-5 credits: `$ReGen earned from gratitude` reads the ledger sum over `source='gratitude_received'`, so legacy credits and cycle distributions add up continuously. No reciprocity mechanics anywhere in the UI (no send-back buttons, no exchange counts) — Rye's explicit call; gratitude flows forward, not as social debt.
- Why: the flat 5-per-send model made gratitude a mintable faucet (every message printed tokens) and carried no signal weight — a Sage's acknowledgment counted the same as a throwaway. The proportional model caps issuance at the pool, makes attention scarce (budget splits), rewards being appreciated rather than being prolific, and matches the shipped Game Mechanics narrative. Deterministic lunar math (no ephemeris API) keeps every environment agreeing on cycle boundaries.
- Trade-offs: mean-synodic boundaries drift up to ~14h from the true new moon (accepted; stability beats astronomy). The bounty path (`game.sendGratitude`, source `gratitude_bounty`) still credits at send time — folding it into acknowledgments is deferred so the GratitudeDrawer UI change ships separately. Recipients now wait until cycle close to earn, which weakens the instant-feedback loop; the tab's power meter and per-person share give the immediate feedback instead.
- Where it lives in code: `drizzle/0163_gratitude_cycles.sql`, `drizzle/schema.ts` (gratitudeCycles, gratitudeCycleBudgets, gratitudeDistributions, gratitudeLog.cycleId/weight, userNotifications.link + gratitude type), `shared/lunar.ts`, `server/lib/gratitude-cycles.ts`, `server/routes/gratitude.ts` (send cutover + myOverview/myJournal/publicJournal/closeCycles), `server/routes/batchJobs.ts` (Step 8), `client/src/components/profile/GratitudeTab.tsx`, `client/src/pages/PlayerProfile.tsx` (gratitude tab), `client/src/components/NotificationBell.tsx` (link-first navigation), `server/gratitudeCycles.test.ts`.

## ADR-31: The ReGen Ship as a CORE program with a hybrid money flow

- Date: 2026-07-10. Status: Accepted.
- Context: Rye owns a 2006 Fleetwood Revolution LE motorhome and lends it to the Church of the Regenerative Earth for a regenerative travel program, the ReGen Ship. It needs insured rentals, a booking flow, and a defensible way for crews to support the church.
- Decision: The ship is a CORE program. Its web home is regencivics.earth/ship/* with a program card on core.regencivics.earth. Money flows in two legally separate parts: (1) the insured rental charged on the platform (Outdoorsy), which activates the coverage older rigs require, and (2) a suggested voyage offering to CORE, reusing `churchDonations` with a `program` tag (`regen_ship`, `regen_ship_gift`) so Transparency and Reconciliation segment ship revenue. Platform exposure is controlled: list at the $600/night anchor, instant book off, all dates blocked, approved guests get a custom offer at the trial rate. The offering is never required and booking never depends on it (Section 3.3 guardrails).
- Why: Outdoorsy is the only major platform that insures rigs older than 15 years for both physical damage and liability. Keeping the rental and the offering separate keeps the church asset protection intact and the offering genuinely voluntary. Reusing churchDonations means one ledger, one reconciliation view, one webhook path.
- Trade-offs: if the offering drifts into effectively-required territory the platform could treat it as circumvention, so the guardrails are load-bearing, not decoration. Two-line pricing is more to explain than one number, but honesty about the split is the point.
- Where it lives: `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md`, `server/lib/ship-config.ts` (prices, program tags, isConfigured guards), `server/routes/ship.ts`, `client/src/pages/ship/*`, `server/lib/ship-emails.ts`.

## ADR-32: Leaflet + react-leaflet regional treasure map alongside GlobeMap

- Date: 2026-07-10. Status: Accepted.
- Context: The ship needs a regional, interactive treasure map of Cascadia with typed pins (springs, waterfalls, food forests, land projects), a live ship position, and seed-planting layers. The existing GlobeMap is a 3D globe for the worldwide land-project view.
- Decision: Add Leaflet + react-leaflet v5 with OpenStreetMap tiles (no API key) as a separate regional map component (`client/src/pages/ship/ShipMap.tsx`). GlobeMap stays untouched. Pins are emoji divIcons, which avoids Leaflet broken default-marker asset behavior entirely.
- Why: Leaflet is the standard for a 2D tiled regional map and needs no key or paid tiles. Keeping it separate from GlobeMap avoids destabilizing the existing globe. Emoji divIcons dodge the well-known bundler issue with Leaflet marker images.
- Trade-offs: a second mapping library adds bundle weight, mitigated by the route being lazy-loaded. OSM tiles have usage etiquette; fine at this scale.
- Where it lives: `client/src/pages/ship/ShipMap.tsx`, `package.json` (leaflet, react-leaflet, @types/leaflet).

## ADR-33: The `ship_*` table family, `ship_quest` token source, and Season 2 referral attribution

- Date: 2026-07-10. Status: Accepted.
- Context: The ship needs its own persistence for bookings, locations, the quest, concierge sessions, plantings, the log, the passport, and position pings, plus a way to reward quest actions and attribute land-project referrals.
- Decision: A 15-table `ship_*` family in `drizzle/schema.ts` (migration 0175, plus 0176 widening `linkedQuestId` to a varchar slug). Quest rewards credit `$ReGen` on the private ledger via `creditPrivateTokens` with a new source tag `ship_quest` (referral bookings use `ship_referral`), following the `quest_completion` pattern (STEERING section 5). Season 2 application referral attribution adds nullable `shipReferralHandle` / `shipReferralUserId` columns to `applications`; the referral quest action auto-verifies when that application is shortlisted.
- Why: a dedicated table family keeps the ship self-contained and reviewable. Reusing the private-ledger credit path means the token rules already hold. Attributing referrals on the existing applications table avoids a parallel referral system.
- Trade-offs: loose-FK convention (nullable int columns, no enforced constraints) matches the rest of the schema but pushes referential integrity into the application layer. "Shortlisted" is interpreted operationally (admin verifies) since the applications status enum has no literal `shortlisted` value.
- Where it lives: `drizzle/schema.ts` (ship tables + applications columns), `drizzle/0175_regen_ship.sql`, `drizzle/0176_ship_quest_link.sql`, `server/lib/ship-logic.ts`, `server/routes/ship.ts`, `scripts/seed-ship-locations.ts`, `scripts/seed-ship-quest.ts`.

---

## ADR-34: Self-hosted PMTiles basemap for the treasure map (kill the OSM tile dependency)

- Date: 2026-07-10. Status: Accepted. Supersedes the raster-tile choice in ADR-32.
- Context: The `/ship/map` basemap was blank in production. `ShipMap.tsx` requested raster tiles from `https://{s}.tile.openstreetmap.org/...`, but the CSP `img-src` in `server/_core/security.ts` never listed that origin, so every tile request was blocked. Pins (local DOM) rendered over a gray box.
- Decision: Self-host the whole basemap as a single PMTiles archive on R2 (`assets.regencivics.earth/ship/basemap.pmtiles`), extracted from the Protomaps daily build clipped to the US-Cascadia bbox `[-126.0, 39.5, -110.5, 49.5]`. Render it with `protomaps-leaflet` reading the R2 URL over HTTP range requests. No OSM tile origin, no CSP widening (`img-src`/`connect-src` already allow `*.regencivics.earth`). A dev-only `VITE_SHIP_BASEMAP_DEV_OSM` flag falls back to raster OSM for local work when the PMTiles file is not yet uploaded.
- Why: (1) The CSP will never need to trust a third-party tile CDN, closing the class of bug that broke the map. (2) R2 has no egress fees, so an in-region basemap is effectively free bandwidth and faster than public OSM tiles. (3) A single PMTiles file is the groundwork for offline caching (a voyage happens where there is no cell signal). (4) Bounds are locked to the bioregion, so the extract stays small (1-3 GB) and the map is Cascadia, not the whole planet.
- Trade-offs: `protomaps-leaflet` is in maintenance mode; the future upgrade path if we outgrow it is MapLibre GL with the same PMTiles source (no data re-extraction). The basemap must be refreshed manually (quarterly, or when the region needs newer OSM edits) by re-running `scripts/build-ship-basemap.ts`. The extract + upload needs R2 creds; when they are absent locally the script emits the exact command for the credential holder to run once.
- Where it lives: `scripts/build-ship-basemap.ts` (extract + multipart upload), `client/src/pages/ship/ShipMap.tsx` (protomaps-leaflet layer), `client/src/pages/ship/shipMapConfig.ts` (bbox, zoom, basemap URL, dev flag), `server/_core/security.ts` (dead OSM URL removed from the comment history; no directive change needed), `drizzle/README.md` (refresh command).

## ADR-35: Ship map v2 data model — multi-source provenance and the verified/unverified tiers

- Date: 2026-07-10. Status: Accepted. Extends ADR-33.
- Context: The map needed to hold both a hand-curated verified tier and a bulk open-data tier (OSM springs, NOAA thermal springs, Falling Fruit food forests) pulled from external datasets under different licenses, plus field-verifiable boondock metadata for the "40-ft-capable free camping within an hour" coverage goal.
- Decision: Extend `ship_locations` with provenance and field columns (`source`, `sourceUrl`, `sourceLicense`, `externalId`, `maxRigLengthFt`, `accessNotes`, `waterQualityUrl`, `lastVerifiedAt`, `verifiedCount`, `region`) plus a composite unique index `(source, externalId)` so every importer is idempotent (upsert on re-run). Bulk-imported rows land `isVerified=false` and render translucent/dashed; only hand-confirmed or admin-verified rows are the "treasure." Attribution (`sourceUrl` + `sourceLicense`) is stamped on every imported row and shown in the detail drawer, satisfying ODbL/CC-BY-NC-SA.
- Why: one table with a `source` tag keeps the map queryable as a single layer while preserving where each pin came from and under what license. The composite unique lets importers re-run safely against production. Field columns turn the map into a working tool for RV voyages (rig fit, road access, water tests) rather than a pretty pin board.
- Trade-offs: Falling Fruit is CC-BY-NC-SA (non-commercial); the map is a free community feature of a church program and Rye is securing explicit blessing (companion Task 10), so the importer header flags the license and the data stays attributed and removable by `source`. Coordinates for sensitive springs stay unverified until reviewed.
- Where it lives: `drizzle/schema.ts` (`shipLocations`), `drizzle/0177_ship_map_v2.sql`, `scripts/seed-ship-springs-osm.ts`, `scripts/seed-ship-hotsprings.ts`, `scripts/seed-ship-foodforest-ff.ts`, `scripts/seed-ship-curated.ts`, `server/routes/ship.ts` (`map.*`).

## ADR-36: Game-board treasure map — Esri satellite basemap + voyage-range rendering

- Date: 2026-07-10. Status: Accepted. Extends ADR-34 (does not supersede it: the self-hosted PMTiles archive stays on R2 as the offline/fallback basemap).
- Context: Rye wanted the treasure map to (1) reduce overwhelm by always rendering only what sits within a reasonable 3-day drive of the anchorage (Ashland for now; the anchorage will move with the ship), and (2) read as a game board over satellite imagery. Satellite raster cannot practically be self-hosted at useful zooms today (a public-domain NAIP pipeline was considered and deferred: multi-hour build, ~10+ GB), so this decision re-admits exactly one third-party tile origin.
- Decision: Esri World Imagery + the World Boundaries and Places reference labels (both on `https://server.arcgisonline.com`, one CSP `img-src` origin, image tiles only). All range rendering derives from a single `ANCHORAGE` constant: 250 road miles/day × 3 days ÷ 1.3 road-to-crow factor ≈ 577 mi straight-line horizon. `VoyageRangeLayer` draws fog beyond the horizon, gold per-day rings, and a compass rose at home port; `ClusterLayer` splits pins into an interactive in-range index and a dimmed, unclickable beyond-horizon index; map bounds lock to the range bbox. Rye chose 250 mi/day, dimmed-not-hidden out-of-range pins, and the day rings explicitly (2026-07-10).
- Why: (1) The anchorage-relative board is one constant away from following the ship's live position later. (2) Dimming behind fog keeps the wider world legible without cluttering play. (3) One img-src origin for image tiles is a far smaller CSP surface than the script/fetch origins ADR-34 was written to prevent.
- Trade-offs: a third-party dependency for imagery (Esri terms require attribution, which the map shows in two places); imagery unavailable offline (the PMTiles fallback path remains); Esri could change tile endpoints (single constant in `shipMapConfig.ts`).
- Where it lives: `client/src/pages/ship/shipMapConfig.ts` (ANCHORAGE, range math, tile URLs), `client/src/pages/ship/shipMapLayers.tsx` (BasemapLayer, VoyageRangeLayer, ClusterLayer split), `client/src/pages/ship/ShipMap.tsx` (bounds, copy, counts), `server/_core/security.ts` (img-src), `server/ship-map.test.ts` (range tests).

## ADR-37: Fresh databases come from a checked-in baseline, not from replaying migrations

- Date: 2026-07-16. Status: Accepted. Resolves the foundation audit's Carryover A and finding C5.
- Context: the DB-backed suites (evolution, ratification, forum, applications, contributions, citizenship-tiers, emoji-reactions, ...) did not gate pushes; the CI integration job sat disabled because a fresh MySQL could not be built. The audit attributed this to `run-migration.ts` applying "only `0048+`", with the base schema trapped in the frozen drizzle-kit journal, and framed the fix as a choice between relaxing the no-`drizzle-kit push` rule for CI or dumping a baseline.
- What the evidence actually showed: **that diagnosis was wrong.** `run-migration.ts` filters on `/^\d{4}.*\.sql$/` and always discovered every file from `0000`; all of `0000`-`0047` are recorded in `_migrations_applied`. The audit most likely ran `--status` against the dev DB, saw one pending file, and read "only one pending here" as "only applies 0048+". Building a genuinely empty database and replaying all 194 files (MySQL 9.4, 2026-07-16) gave **157 applied, 36 failed** across five independent root causes: a bare `maxValue` in `0096_game_system.sql` (`MAXVALUE` is a MySQL reserved word, so that file is a syntax error, has never run, and cascades into 20 further failures); MariaDB-only `IF NOT EXISTS` forms in `0074`/`0098`; `DROP PROCEDURE` in `0037`/`0041` rejected by the prepared-statement protocol the runner uses; duplicate `CREATE TABLE` in `0036`/`0040`; and data-dependent seeds in `0105`/`0107`. The blocker was never the journal. It was 36 broken files.
- Decision: build fresh databases from a generated, checked-in `drizzle/ci-baseline.sql` (structure for all tables, rows only for a short `REFERENCE_TABLES` allowlist, plus the `_migrations_applied` history it covers), then run `run-migration.ts --all` on top. The CI `integration` job does exactly this against a `mysql:9.4` service container (matching the production server version), then runs `check-schema-drift.ts` and `pnpm test:all`. drizzle-kit stays entirely out of the loop, so the frozen-journal rule needs no carve-out. Rye chose the baseline over `drizzle-kit push` on 2026-07-16, before the 36-failure evidence landed; that evidence strengthens the choice rather than changing it, since `push` would also have papered over the broken history.
- Why: the 36 files are already applied in production and must never re-run there, so repairing them buys nothing for the live database while risking it. Freezing them as history and snapshotting the result is the cheaper and safer trade. Carrying `_migrations_applied` inside the baseline is what keeps the job honest: new migrations still apply and are still tested, so the baseline does not become a way to skip them.
- Trade-offs: the baseline is a generated file that must be regenerated when the base schema drifts (`dump-ci-baseline.ts`), and `check-schema-drift.ts` is the thing that tells you when. `REFERENCE_TABLES` is a judgement call and is deliberately tiny (`forumCategories` only, because `forum.test.ts` asserts the seeded `general` category exists); `game_variables` is excluded on purpose, since the evolution engine rewrites those values through governance and dumping them would churn the file.
- Known drift this surfaced: `check-schema-drift.ts` found, on its first run, that `schema.ts` declares two tables (`referrals`, `share_events`) and seven columns that exist in **no** database, and that mounted routers use them: `server/routes/sharing.ts` (routers.ts:185) inserts into both tables, and `server/routes/orgRatings.ts` (routers.ts:194) writes `organisations.regenerativeScore`. Those are live production errors. They are grandfathered in the check's `KNOWN_DRIFT` set so the gate can go green and catch new drift, and are tracked for repair under separate commits. The set is frozen: new drift fails.
- Where it lives: `drizzle/ci-baseline.sql`, `scripts/dump-ci-baseline.ts`, `scripts/load-ci-baseline.ts`, `scripts/check-schema-drift.ts`, `.github/workflows/ci.yml` (`integration` job), `drizzle/README.md`.

---

## ADR-38: The Worldview Pack is the distribution unit for Rye's voice, concepts, and positions

- Date: 2026-07-16. Status: Accepted (per Rye's standing "do everything" instruction on the master build sequence; flag to Rye if this needs amending).
- Context: server-side agents (elders, companions, Guide, admin assistant) each hardcode fragments of voice and worldview; the vault holds the real thing and is unreachable from production; hard writing rules exist in four places and will drift.
- Decision: a versioned, curated, redaction-gated bundle (`manifest.json` with semver + revision + updated-on, `voice.md`, `concepts.json`, `positions.json`, `style_rules.json`, `themes.json`) built deterministically from the vault, uploaded to a private R2 path via a token-gated endpoint, loaded server-side through `server/lib/worldview.ts` (cached, fail-soft, never client-exposed). Raw sources never enter the pack; provenance travels as ids resolvable only locally.
- Why: one source of truth, versioned like code, loadable by any agent, honest about the privacy boundary.
- Trade-offs: a build-and-upload step Rye runs or schedules; a stale pack is possible, so the manifest carries `updated-on` and consumers may surface staleness.
- Code refs: `second-brain/_pipeline/build_worldview_pack.py`, `server/lib/worldview.ts`, `server/webhooks/worldview-upload.ts`.

## ADR-39: Vault retrieval uses local embeddings only

- Date: 2026-07-16. Status: Accepted (same basis as ADR-38).
- Context: semantic retrieval requires embedding note and message text; hosted embedding APIs receive that text in the clear, crossing the private-first boundary for exactly the content the boundary protects.
- Decision: vault embeddings are computed by a local model on Rye's machine (fastembed ONNX `BAAI/bge-small-en-v1.5`, pinned in the script); the index lives in the vault (gitignored); no vault text is sent to any hosted model for indexing. Hosted models remain fine for generation over curated excerpts an agent already loaded.
- Why: the boundary holds; local retrieval quality is sufficient for a personal corpus this size.
- Trade-offs: a one-time local model download; slightly weaker embeddings than frontier hosted; index rebuild is local CPU time.
- Code refs: `_pipeline/build_embeddings.py`, `_pipeline/ask.py`.

## ADR-40: One write path into the vault, supersession over deletion

- Date: 2026-07-16. Status: Accepted (same basis as ADR-38).
- Context: multiple agents will read and write memory; unconstrained writes produce silent contradiction and lost history.
- Decision: all new material enters through `00 Inbox` + append-only ingest; agents edit directly only in folders the contract assigns them; derived views (MOCs, dashboards, pack) are always regenerated; superseded ideas are marked (`superseded_by`) and retained, never deleted by an agent; every structural change appends to the AGENT GUIDE change log with the agent's name. `second-brain/contract.json` states this machine-readably.
- Why: preserves provenance and history, makes conflicts visible, gives every agent one protocol.
- Trade-offs: slightly more ceremony per write; a misbehaving agent can still violate convention, so `consolidate.py` audits for it.
- Code refs: `second-brain/contract.json`, `_pipeline/harvest_bridge_pull.py`, `_pipeline/consolidate.py`.

---

## Adding new ADRs

## ADR-41: The Federation Bridge — typed intents for partner-network handoffs

- Date: 2026-07-17. Status: Accepted (Rye delegated acceptance of this ADR in-session, 2026-07-16; supersede to veto). Text also recorded in `FIXES_TO_MAKE_2026-07-16_MULTIPLAYER_COORDINATION.md` per the build prompt.
- Context: improvement 11 makes ReGen legible to the wider movement (GEN, OpenCivics, BioFi, Ethereum localism). Read surfaces shipped first: `GET /api/federation/projects.json` (public project directory with the shared/impact.ts summary) and the Federation section of `llms.txt`. The open question was how partner handoffs with side effects (a partner network enrolling a project, syncing a quest format, referencing our seasons calendar) should work.
- Decision: partner-network handoffs follow the Hypha Bridge pattern (`server/lib/hypha-bridge/`, STEERING §6): a dedicated `server/lib/federation-bridge/` module owning every cross-network handoff as a TYPED INTENT (named intent kind, zod-validated payload at both ends, signed short-lived token when the handoff carries identity), never hand-rolled links or ad-hoc webhooks. Read-only surfaces (projects.json, llms.txt) stay plain public endpoints outside the bridge. The module is NOT built yet: implementation waits for the first concrete partner integration; this ADR locks the pattern so that integration extends a bridge instead of inventing a link.
- Why: the Hypha Bridge already proved the shape (11 intents, validation at raise and execution, no hand-rolled redirects). Repeating it means every partner integration inherits validation, auditability, and a single place to reason about trust. Locking the pattern before the first partner arrives prevents the first integration from setting a worse precedent under deadline pressure.
- Trade-offs: slightly more ceremony for the first partner integration than a quick webhook; acceptable because cross-network writes are exactly where ad-hoc trust goes wrong.
- Code refs: `server/lib/hypha-bridge/` (the pattern), `server/_core/index.ts` (`/api/federation/projects.json`), `client/public/llms.txt` (Federation section), `shared/impact.ts` (what is public).

---

## ADR-42: The verification ladder, and the split between internal credit and public tokens

- Date: 2026-07-17. Status: Accepted (Rye delegated acceptance in-session, 2026-07-16; supersede to veto). Text also recorded in `FIXES_TO_MAKE_2026-07-16_MULTIPLAYER_COORDINATION.md` per the build prompt.
- Context: improvement 14 (proof of regeneration). The game's integrity rests on one link: tokens and glory flow from things that actually happened on real land. We already hold verified provenance tiers on the ship map (ADR-35), a source-tagged token ledger (STEERING §5), and quest completion records.
- Decision, part 1 (the ladder): four rungs of verification, each earning more internal credit than the last.
  1. **Self-report** (multiplier 1.0): the player logs the completion. Today's baseline.
  2. **Peer attestation** (1.25): a co-crew member attests the completion. One attestation per member per quest; the attester must be on the same crew; both sides logged (`quest_completion_attestations`). The +25% rides as private credit with source tag `quest_attested_bonus`.
  3. **Steward verification** (1.5): a recognized steward verifies. Not yet implemented; the source-tag pattern extends (`quest_steward_bonus`).
  4. **Evidence-backed** (2.0): geotagged photo, before/after, harvest weight. Not yet implemented; waits for the media upload primitive. Only rungs 3 and 4 feed impact data, QF weight, and the public map when those wirings land.
- Decision, part 2 (**Rye's amendment, the core clause**): the ladder governs the INTERNAL economy only, i.e. private token credits through `creditPrivateTokens`. Issuance and claims of REAL PUBLIC tokens are verified by humans through **Hypha voting**; that is what Hypha governance is for. The ladder feeds reputation and internal credit; Hypha votes gate the chain. No rung, at any multiplier, mints or moves a public token.
- Why: without verification, growth corrodes trust; with too much bureaucracy, verification kills play. Rung 2 is pure social mechanics (no media infrastructure) and makes verification itself a social act between crewmates. Keeping public tokens behind human Hypha votes means the automated ladder can never become an attack surface on the chain economy.
- Trade-offs: peer attestation is collusion-prone at small scale; acceptable because it only moves bounded internal credit, is one-per-member-per-quest, is fully logged, and the multiplier gap to steward/evidence rungs keeps incentives pointed up the ladder.
- Code refs: `drizzle/0200_memory_attestation.sql`, `server/routes/questCrews.ts` (`attestCompletion`), `server/db/tokens.ts` (`creditPrivateTokens`), STEERING §5.

---

## ADR-43: OpenRouter primary with per-task model tiers (cheapest model for the job)

- Date: 2026-07-17. Status: Accepted.
- Context: every LLM call site got the same model. The chain ran first-party Anthropic (claude-haiku-4-5, $1/$5 per M tokens) first with OpenRouter only as a credit-exhaustion failover (`openai/gpt-4o-mini`). Rye asked for OpenRouter as the default across the ecosystem, Kimi K3 in the roster, and the least expensive model per task.
- Decision: the chain order flips. OpenRouter runs FIRST for every `invokeLLM`/`streamLLM` call; direct Anthropic is the failover. Calls carry a `task` tier and OpenRouter picks the cheapest model that handles it: `light` (classification, routing, tagging, alt text, translation) defaults to `google/gemini-2.5-flash-lite` ($0.10/$0.40 per M); `standard` (persona chat, companions, guides, writing in voice; the untagged default) to `moonshotai/kimi-k2.5` ($0.40/$1.90, multimodal, covers the ship cook/shipwright image calls); `complex` (Assembly synthesis, decision drafting, C-suite briefing) to `moonshotai/kimi-k3` ($3/$15, frontier reasoning, 1M context). Each tier is overridable via `LLM_MODEL_LIGHT` / `LLM_MODEL_STANDARD` / `LLM_MODEL_COMPLEX`; legacy `OPENROUTER_MODEL`, when set, pins the standard tier so an existing Railway var keeps its meaning. `isFailoverError` additionally fails over on model-routing errors (404 model/provider messages, "No allowed providers"), because with OpenRouter primary a deprecated slug must fall through to Anthropic instead of 404ing every AI feature (as happened 2026-07-14).
- Why: pricing spread per task is 30x ($0.10 vs $3 input). Light tasks are high-volume and quality-insensitive; complex governance tasks are rare and reasoning-bound. Routing each to the cheapest adequate model cuts the bill where volume lives and buys a frontier model where judgment lives. OpenRouter first also means one dashboard for spend and instant model swaps via env, no deploy.
- Trade-offs: tool-forced structured output and image blocks now cross OpenRouter's Anthropic-protocol translation for non-Anthropic models; mitigated by the Anthropic failover staying warm and all three default tiers being multimodal tool-callers. Model slugs can deprecate; mitigated by the 404 failover + env overrides. This OpenRouter account cannot reach `anthropic/*` slugs, so tier vars must never name one (pinned by a test).
- Code refs: `server/_core/llm.ts` (`LLMTask`, `pickOpenRouterModel`, `providerChain`, `isFailoverError`), `server/_core/env.ts` (tier vars), `server/llm-failover.test.ts`, call-site tags in `server/routes/{governance,assembly,admin,knowledge,tools,quick-notes,players}.ts`, `server/lib/{elder-forum,publications}.ts`, `server/jobs/{glossaryJob,digestJob}.ts`.
- Amended by ADR-45 same day: the Kimi defaults failed the eval harness and were reverted; tier changes are harness-gated now.

---

## ADR-45: Model swaps are harness-gated; reasoning models are incompatible with the current call shapes

- Date: 2026-07-17. Status: Accepted. Amends ADR-43 (architecture stands; the Moonshot model choices are reverted). Numbered 45 because a concurrent session claimed ADR-44 (companion voices) first; entries appear out of order in this file, dates are authoritative.
- Context: hours after ADR-43 shipped, the new golden-prompt harness (`scripts/eval-llm-candidates.ts`) failed the live standard tier. Kimi k2.5 returned empty persona replies and no tool_use blocks through OpenRouter's Anthropic-protocol endpoint; Kimi k3 rejected requests outright ("tool_choice 'specified' is incompatible with thinking enabled"); gemini-2.5-pro and openrouter/auto failed the same shapes. The pattern: REASONING/THINKING models as a class break our three call shapes: (1) forced `tool_choice` for structured output, (2) reading only `text` content blocks, (3) tiny maxTokens caps (16 for the elder router) that reasoning tokens consume before any text emerges. Non-thinking models (gemini-2.5-flash-lite, gpt-4o-mini) pass all 5 prompts cleanly.
- Decision, part 1 (the gate): no tier default in `env.ts` and no `LLM_MODEL_*` Railway var may name a model that has not passed `npx tsx scripts/eval-llm-candidates.ts --model <slug> --tier all`. The monthly model review recommends swaps only from harness-passing candidates.
- Decision, part 2 (the revert): standard and complex tiers default to `openai/gpt-4o-mini` (passed 5/5); light stays `google/gemini-2.5-flash-lite` (passed 5/5). Production Railway vars set to match. Frontier reasoning models stay OUT until part 3 lands.
- Decision, part 3 (the real fix, deferred): to use reasoning-class models (Kimi k3, gemini pro/3.5, gpt-5.x), `server/_core/llm.ts` needs reasoning-aware plumbing: disable thinking where the endpoint allows it or read thinking+text blocks, replace forced tool_choice with schema-in-prompt + JSON validation for models that reject forcing, and give reasoning models a separate maxTokens floor. Do this as its own sprint with the harness as the acceptance test.
- Why: the harness exists precisely to catch capability-shape mismatches that pricing pages and benchmarks never show. It caught one in production on its first run; the lesson is structural, so the gate is structural.
- Trade-offs: the complex tier temporarily runs a small model (gpt-4o-mini) for Assembly synthesis and decision drafting, a quality step down from the intent of ADR-43; acceptable against silently broken governance surfaces, and the failover to claude-haiku covers errors. Revisit after part 3.
- Code refs: `scripts/eval-llm-candidates.ts` (the harness), `server/_core/env.ts` (reverted defaults + hard-rule comment), eval evidence in the 2026-07-17 SHIPPED_LOG entry.

---

## ADR-44: Companion voices — Kokoro in the browser, signature voices via hosted Qwen3-TTS

- Date: 2026-07-17. Status: Accepted.
- Context: every speaking surface (FormCompanion, ReGen Guide, Galley) used device `speechSynthesis`, which sounds robotic and varies wildly per OS. Rye wants companions that sound human, 5 shared voices plus 2 uniquely designed voices per character, at movement-friendly cost.
- Decision: two engines behind the existing `useSpeech` surface, best first with graceful decay. (1) Kokoro-82M (Apache 2.0) runs in the visitor's browser via `kokoro-js` (WASM/WebGPU, ~90MB one-time cached download, model from the HF CDN): the default everywhere, five curated voices (Bella, Emma, Puck, George, Fable), zero cost at any scale, private by construction. (2) Signature character voices synthesize server-side on Qwen3-TTS (Apache 2.0) at DeepInfra behind `TTS_API_KEY` (`server/lib/tts.ts`): two designed voices per persona in `server/lib/ttsVoices.ts`, preset+instruct until an approved designed clip is uploaded once to `/v1/voices/add` and mapped in `TTS_VOICE_MAP`, cloned voice thereafter. Device `speechSynthesis` stays as the floor; a stored device-voice choice still resolves. CSP grew `'wasm-unsafe-eval'`, `worker-src blob:`, and HF CDN connect-src entries for the browser engine.
- Why: Kokoro is the only path where great voices cost $0 forever and work offline, which fits both lean operations and community-first values (speech never leaves the device). Qwen3-TTS's instruct control plus one-time cloning gives each character an ownable voice for about $0.006 per spoken reply, cached server-side so greetings cost once. Keeping all three engines under `useSpeech` means no call-site changed and any failure only ever degrades voice quality, never removes voice.
- Trade-offs: first Kokoro utterance can wait up to 12s on a slow connection before falling back to a device voice for that line. The 90MB download is heavy on mobile data (mitigated: browser-cached, kicked off at companion mount, never blocks captions). Hosted path is a paid third party; mitigated by the flag, the cache, `companion_tts` rate limit, and a 600-char cap.
- Code refs: `client/src/components/companion/{kokoroVoices,hostedVoices,useVoice,VoicePicker}.ts(x)`, `server/lib/{tts,ttsVoices}.ts`, `server/routes/companion.ts` (`voices`, `speak`), `server/_core/security.ts` (CSP), `VOICE_TTS_RESEARCH_2026-07-17.md`.

---

When you make a load-bearing decision (something a future contributor would re-litigate without context), add an entry. Keep it terse. The "Why" section is the most valuable part: it captures the reasoning that's invisible from the code alone.

If a decision gets reversed, write a NEW entry that explains the reversal and mark the OLD entry `Superseded by ADR-N`. Don't delete history.
