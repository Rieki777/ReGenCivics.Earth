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
- Where it lives in code: `server/jobs/anastasiaForumJob.ts`, `server/lib/anastasia-forum.ts`, `server/lib/elder-safety.ts` (`ANASTASIA_VOICE`, forum prompts), `server/lib/elder-retrieval.ts` (`retrieveCanonPassages`), `server/_core/index.ts` (interval). Env: `ANASTASIA_FORUM_ENABLED`. Extends ADR-18.

---

## Adding new ADRs

When you make a load-bearing decision (something a future contributor would re-litigate without context), add an entry. Keep it terse. The "Why" section is the most valuable part: it captures the reasoning that's invisible from the code alone.

If a decision gets reversed, write a NEW entry that explains the reversal and mark the OLD entry `Superseded by ADR-N`. Don't delete history.
