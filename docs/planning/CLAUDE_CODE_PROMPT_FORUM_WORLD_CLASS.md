# Forum World-Class Upgrade — Design + Build Plan

**Status:** PLANNED (nothing built yet). This doc is the executable spec for a build instance.
**Author:** design session 2026-07-02. Grounded in a full audit of the live code (file:line refs throughout).
**Read first:** `CLAUDE.md`, `.ai/docs/STEERING.md` (sections 1, 3, 11), `.ai/docs/security/AI-AUTOMATION-RISKS.md`, ADR-21/ADR-22 in `.ai/docs/DECISIONS.md`.

---

## Decisions locked (Rye, 2026-07-02)

1. **Feed default:** For You for signed-in users, Latest for signed-out. (Confirmed.)
2. **Web push + PWA notifications:** yes. Now in scope — see **Phase 1B**. Note: a service worker already exists and a past outage traced to SW cache handling (see memory `feedback_build_debugging`), so SW changes carry real risk and get their own care.
3. **Guide identity:** keep the existing **ReGen Guide** name and persona. The forum concierge is the *same* identity that already replies to `@regen-guide` mentions and posts devil's-advocate comments. One voice, one disclosure, everywhere. "Grove Guide" working title is dropped.
4. **Reply editing:** anytime, with a visible "edited" label. Needs `editedAt` columns (see Phase 3).
5. **Profile merge:** yes, unify `userProfiles` into `playerProfiles`. Promoted from a side-note to its own phase — **Phase 2B** — because both tables hold conflicting copies of display name / bio / avatar and it touches every profile reader. Own ADR, reversible migration.

## Critical second-pass review (what changed after the first draft)

Five real problems the first draft would have hit in the build, now fixed in-doc:

- **The notification-table swap would have broken the bell.** Deferring `userNotifications` "to later cleanup" meant existing unread rows (contribution accepted, etc.) would vanish from `NotificationBell` the moment it repointed to `notifications`. Phase 1 now does the *full* consolidation: migrate rows, repoint every writer, one table. No half-state.
- **Cursor pagination over a live-computed feed score is unstable.** For You scores change as freshness decays, so a naive cursor produces duplicate/skipped posts mid-scroll. Phase 2 now snapshots an `asOf` timestamp into the cursor so a scroll session ranks against a frozen clock.
- **Notification fan-out had no idempotency key.** The fire-and-forget hooks can double-run on retry/restart (the token ledger already learned this lesson with `idempotencyKey`). Added a dedupe unique key on notifications.
- **Mention parsing was naive.** `@word` matches emails (`user@host`), code blocks, and could double-fire on edit. Added explicit skip rules and edit semantics.
- **User-level muting/blocking was missing entirely.** A world-class forum lets you mute a person, not just a thread; it also gates their mentions from emailing you. Added to the follows/mute model.

## Third-pass review (final check before build)

Seven more fixes from a line-by-line re-read against the schema facts:

- **`notifications.playerId` vs `userNotifications.userId` identity must be verified before migrating.** The two tables key on differently named columns. If `playerId` is not literally `users.id`, the back-fill would deliver old notifications to the wrong people. Phase 1.1 now starts with a verification step.
- **The tag-affinity join was unbuildable as written.** `forumPosts.tags` is a **`text` column holding a JSON string** (`schema.ts:1471`), so `user_forum_affinity(dimension='tag')` can only be matched with `LIKE '%"tag"%'` string scans — no index, no clean join. Phase 2 now adds a `forum_post_tags` junction table (backfilled by parsing the JSON string, maintained on write) so tag scoring is a real indexed join.
- **The capitals boost was not computable.** Seeking-support posts don't declare *which* capital they seek, so "matches my top-3 capitals" had nothing to match against. The boost is now gated behind a small composer addition (an optional capital picker on seeking-support posts, Phase 3.3); the feed ships without it and turns it on when the field exists.
- **Feed query needed a bounded candidate set.** Scoring is computed at read time and can't be indexed, so the query now scores only a capped candidate window (posts active in the last 90 days, max 500) to hold the p95 target.
- **iOS reality check for push:** web push on iPhone requires the PWA to be installed to the home screen (iOS 16.4+). Noted in Phase 1B so nobody files it as a bug.
- **Signed-out visitors were locked out of the guide.** Rye's ask was to help *new* users, and the newest user has no account. Phase 4 now shows the welcome panel + canned chip answers to visitors (zero LLM, zero abuse surface); freeform chat still requires sign-in.
- **Person-mute had no acceptance test.** Added to Phase 1 criteria.

## Fourth-pass review (facts verified directly against the code)

This pass stopped re-reading prose and checked the load-bearing claims against the actual files. Three were wrong in ways that would have sent the build instance chasing ghosts:

- **The sanitizer name was invented.** The plan (and the original audit) said `sanitizeForClient`. The real function is **`sanitizeInput` in `server/_core/security.ts`**, already used by `createPost`/`createReply` and covered by `server/forum-sanitize.test.ts`. Corrected everywhere. A grep for the wrong name returns nothing and wastes the builder's first hour.
- **The service worker mechanism was wrong.** Verified in `vite.config.ts:12`: the SW is generated by `vite-plugin-pwa` in **`generateSW`** mode, and the file literally comments *"do not create a manual public/sw.js"*. You cannot hand-add a push handler. Phase 1B now specifies the `workbox.importScripts` + isolated `push-sw.js` path (or, as a last resort, migrating to `injectManifest`). This was the single most important catch — the old instruction was unbuildable.
- **`forumPosts.tags` is `text`, not `json`.** Confirmed at `schema.ts:1471` (`tags: text("tags")`). The `forum_post_tags` junction fix stands and is now even better justified (the only alternative is `LIKE` scans). Description corrected.
- **`notifications` is a live table, not dormant, and `playerId` = `users.id`.** Resolved the migration's one open risk by reading the writers: `bounties.ts`, `coordinationFlywheel.ts`, and `players.ts` all write/read it, and they set `playerId` from `ctx.user.id`/`role.userId`. So the back-fill is a straight copy (no join), but the consolidation must also repoint the `players.ts` reader and rename `playerId`→`userId`. Audit gap #2 and Phase 1.1 updated accordingly.
- **Confirmed correct (so the plan can rely on them):** `notifications` already has `link` + the `mention`/`forum_reply` enum values; `players.searchMentions` exists in `server/routes/players.ts`; `sanitizeInput` is tested in `server/forum-sanitize.test.ts`.

---

## The vision in one paragraph

The forum today is a well-built chronological bulletin board with an elder soul. The upgrade turns it into a **living commons that knows you**: every mention, reply, and gratitude finds you and drops you exactly at the comment that triggered it; the feed leads with what matters to *your* bioregion, your path, and the threads you tend; newcomers are greeted by a conversational guide that walks them to the right room; and the whole surface gets the polish pass (threading, composer, search, mobile, elder presence) that makes people *want* to spend time here. Everything ranking-related is deterministic (STEERING section 11); the LLM only speaks where a voice is needed.

---

## Ground truth from the audit (what exists, what's missing)

### Exists and works
- Schema: `forumCategories` / `forumPosts` / `forumReplies` (nested via `parentReplyId`) / `forumLikes` / `postReactions` (reputation-weighted) / `forumReports` / `forumPerspectives` — `drizzle/schema.ts:1441-1592, 3081-3100`.
- `server/routes/forum.ts` (1202 lines): full CRUD, cursor-paginated `posts`, MySQL FULLTEXT `search`, sensing/governance procedures, moderation router, rate limits on all mutations.
- Elder system (ADR-21/22): registry `server/lib/elders.ts`, 6-hour deterministic poll `server/jobs/elderForumJob.ts`, retrieval-grounded comments, crisis + PASS gates, `bot:{elderId}` users, `@elder` mention parsing (`mentionedElders()` at `server/lib/elders.ts:119`).
- LLM infra: `server/_core/llm.ts` — `invokeLLM` + `streamLLM` (streaming already proven in `server/routes/elderChat.ts`), retry/backoff, Zod-validated structured output. Voyage embeddings + MySQL FULLTEXT fallback in `server/lib/elder-retrieval.ts`.
- Rich player signals **unused by the forum**: `contributionScore`, `capitalScoresJson` (9 capitals, nightly), `citizenshipTier`, `lunarStreak`, `bioregionId`, `path`, quest history, gratitude log.
- Email: Resend + `emailLogs` + delivery webhooks + weekly digest job (`server/jobs/digestJob.ts`).
- Frontend: `Community.tsx` (5-element section picker), `CommunityPost.tsx`, `CommunityCategory.tsx`, `CommunityNewPost.tsx` (TipTap RichEditor), `NotificationBell.tsx`, `EmojiReactions`, `GratitudeButton`, `ThreadRoots` visualization, translation, link previews.

### Missing or broken (the gaps this plan closes)
1. **@mentions never notify.** Typeahead exists (`players.searchMentions`, `server/routes/players.ts:29`) and elder mentions route, but `createPost`/`createReply` never parse user handles or write notification rows.
2. **Two parallel notification tables, both live, read by different surfaces.** `userNotifications` (`schema.ts:1276-1303`, keyed on `userId`, no link column, `campaignId` abused as `postId`) is read by `NotificationBell.tsx` via the forum `notificationsRouter`, and deep-links only to profile/campaign/quest pages, never to a post or comment. Separately, `notifications` (`schema.ts:2596-2607`, keyed on `playerId` which is a `users.id`, has `type: mention|forum_reply` and a `link` column) is written by the bounty + coordination-flywheel code (`server/db/bounties.ts`, `server/jobs/coordinationFlywheel.ts`) and read by `players.ts` notification procedures — but its `link` column is populated by almost nothing and no forum event touches this table. So the consolidation (Phase 1) has to fold `userNotifications` into `notifications` *and* unify the two reader surfaces (`NotificationBell` + `players.ts`) onto one.
3. **No reply notifications, no gratitude notifications, no elder-replied notifications, no email delivery** for any forum event.
4. **Feed is pinned-then-chronological only** (`forum.ts:156`). No read state, no unread indicators, no personalization, no follows. Rich signals sit unused.
5. **Search is raw FULLTEXT** — no recency/engagement ranking, no filters, dropdown-only UI.
6. **Replies cannot be edited** (only deleted). No permalinks UI, no quote-reply, no sort, no collapse.
7. **Elder comments have zero special styling** — a `bot:anastasia` comment renders like any user.
8. **Composer gaps:** file upload is display-only (TODO at `CommunityNewPost.tsx:131`), no drafts, no @mention autocomplete inside the editor, no "similar threads" dedupe.
9. **Two profile tables drift:** `userProfiles` (forum: reputation, postCount) vs `playerProfiles` (game: everything else). Forum pages read one, game pages the other.
10. **No conversational entry point** on the forum. Guide chat exists elsewhere (passport) but not here.

---

## Architecture principles for the whole build

1. **Deterministic-first (STEERING §11).** Feed ranking, notification fan-out, read tracking, affinity computation: pure SQL/TS, zero LLM. LLM only where a voice speaks (guide chat, existing elder comments, digest prose).
2. **One notification spine, consolidated in full.** Standardize on the `notifications` table (it already has `type`, `link`, `isRead`, and the right index). **Do the whole migration in Phase 1**, not later: back-fill existing `userNotifications` rows into `notifications` (map `campaignId`→`postId`/`link`, preserve `read`→`isRead` and timestamps), repoint every `userNotifications` writer (contribution, campaign, quest, system producers) and its reader (`NotificationBell` via the forum `notificationsRouter`) onto `notifications`, unify with the reader already on `notifications` (`players.ts` procedures), rename `playerId`→`userId` for one consistent key, then drop `userNotifications` in a follow-up migration once no code references it. Leaving two tables is what makes the bell lie.
3. **Every notification is a deep link.** `link` is always populated with a canonical URL: `/community/post/:id#reply-:replyId` for comment-level events.
4. **LLM I/O is untrusted both directions** (AI-AUTOMATION-RISKS): sanitize inputs, sanitize outputs through `sanitizeInput` (from `server/_core/security.ts` — the same function `createPost`/`createReply` already use; see `server/forum-sanitize.test.ts`), never send email/phone/PII, rate-limit, provenance labels, env kill switches.
5. **Writing rules (STEERING §1) apply to every string** shipped to users: no em-dashes, no contrast framing, no banned AI words, direct grounded voice. This includes notification copy, empty states, guide prompts, and email templates.
6. **Ship gate before any VERIFIED claim** (truncation audit, className grep, `pnpm typecheck`), migrations via `npx tsx scripts/run-migration.ts` only.

---

# PHASE 1 — The Notification Spine (mentions, replies, deep links, email)

*The "little things" that make the forum feel alive. Highest leverage per line of code. Ship first.*

## 1.1 Schema (one migration, next `drizzle/NNNN_forum_notifications.sql`)

**Step zero (verified, act on it):** `notifications.playerId` is a `users.id` — confirmed by its writers (`playerId: ctx.user.id` in `players.ts:1140`, `playerId: role.userId` in `bounties.ts:212`). So the `userNotifications.userId` → `notifications.playerId` back-fill is a **straight copy, no join**. Standardize the column name to `userId` in this migration (rename `playerId`) so the whole codebase stops carrying two names for the same thing; repoint the existing `notifications` readers/writers (`players.ts`, `bounties.ts`, `coordinationFlywheel.ts`) to the renamed column in the same change. Do NOT skip the rename and leave `playerId` — the split name is exactly what let the two tables drift.

Extend the existing `notifications` table enum and add supporting tables:

```
notifications.type — widen enum to:
  forum_reply | mention | gratitude | reaction_milestone | elder_reply |
  thread_followed_activity | governance_stage | quest_complete | fund_update | vouch | system
  (+ the legacy userNotifications types being migrated in:
   contribution_accepted | contribution_rejected | campaign_milestone | new_contribution)

ALTER notifications ADD:
  actorId INT NULL            -- who did the thing (for avatar in the bell)
  postId INT NULL             -- denormalized for grouping ("3 new replies on X")
  replyId INT NULL
  emailedAt TIMESTAMP NULL    -- set when the email copy went out (dedupe)
  pushedAt TIMESTAMP NULL     -- set when web push fired (Phase 1B)
  dedupeKey VARCHAR(191) NULL -- UNIQUE. e.g. "mention:reply:8821:u42". INSERT IGNORE on it.
                              -- kills double-fire from retried/restarted fire-and-forget hooks.

-- One-time data migration (same file): copy userNotifications -> notifications,
-- mapping campaignId to postId + building link, read->isRead, preserving createdAt.
-- Then repoint all writers/readers; drop userNotifications in a later migration.

NEW forum_mentions:
  id, sourceType ENUM(post,reply), sourceId, mentionedUserId, mentionerUserId, createdAt
  UNIQUE(sourceType, sourceId, mentionedUserId)   -- idempotent re-parse on edit

NEW forum_subscriptions:            -- thread-level follow (auto + manual)
  id, userId, postId, reason ENUM(authored, replied, mentioned, manual), muted TINYINT DEFAULT 0, createdAt
  UNIQUE(userId, postId)

NEW forum_user_mutes:               -- person-level mute/block (world-class forums have this)
  id, userId, mutedUserId, scope ENUM(notifications, feed, both) DEFAULT 'both', createdAt
  UNIQUE(userId, mutedUserId)
  -- 'notifications': their mentions/replies never notify or email you.
  -- 'feed': their posts get zeroed in your For You / Following ranking (Phase 2).

playerProfiles.notificationPrefs JSON — extend shape (no migration needed, JSON):
  { mentionsEmail: 'immediate'|'daily'|'off',
    repliesEmail: 'immediate'|'daily'|'off',
    gratitudeEmail: 'daily'|'off',
    forumInApp: true }
```

## 1.2 Mention pipeline (server)

New module `server/lib/forum-notify.ts` — single entry points called from `createPost` (`forum.ts:470`) and `createReply` (`forum.ts:541`), and from `updatePost`/new `updateReply` (re-parse, only notify NEW mentions thanks to the unique key):

- `parseUserMentions(content)` — extend the elder mention regex to all handles: match `@([a-z0-9-]{3,40})`, resolve against `users.handle` in one `IN` query. **Edge cases that will bite if skipped:** require the char before `@` to be start-of-string or whitespace/punctuation (so `user@host.com` emails don't match); strip fenced code blocks and inline code before matching (don't notify from a code sample); dedupe the same handle mentioned twice. Skip self-mentions, skip banned users, skip elder handles (those already route via ADR-22), skip anyone who has muted/blocked the author (Phase 1 mute model). **Cap: first 10 resolved mentions per item** (anti-spam); ignore the rest silently.
- **Edit semantics:** on `updatePost`/`updateReply`, re-parse and notify only handles not already in `forum_mentions` for that source (the unique key makes this free). Removing a mention on edit does *not* retract an already-delivered notification.
- `notifyMention(...)` — insert `forum_mentions` row (INSERT IGNORE), insert `notifications` row with `link = /community/post/${postId}#reply-${replyId}` (or no fragment for post-body mentions), title `"{name} mentioned you"`, message = first 140 chars of content, plain text.
- `notifyReply(...)` — on `createReply`: notify the post author (`forum_reply`), the parent reply's author if nested (`forum_reply`), and all non-muted `forum_subscriptions` for the post (`thread_followed_activity`). One person, one notification per event (dedupe: if you were mentioned AND replied-to in the same reply, mention wins).
- `notifyGratitude(...)` — hook the existing gratitude send flow for `forum_post`/`forum_reply` source types: `"{name} sent you gratitude"` linked to the source.
- `notifyElderReply(...)` — hook `server/lib/elder-forum.ts` after an elder comments on your post or replies to you: `"AI Elder {name} responded to your post"`. This is a delight moment; deep-link straight to the elder's comment.
- `reaction_milestone` — deterministic thresholds only (1st, 5th, 10th, 25th reaction on an item), computed at toggle time from the count; never one-notification-per-reaction.
- `notifyGovernanceStage(...)` — when a followed thread advances (`enterSensing`, promotion to proposal, decision outcome), notify subscribers with type `governance_stage` deep-linked to the thread's governance strip. This is why people follow a decision thread; wire it into the existing sensing/promotion procedures.
- **Auto-subscribe:** author on `createPost` (reason `authored`), replier on `createReply` (reason `replied`), mentioned user on mention (reason `mentioned`). Mute toggle in the UI kills future `thread_followed_activity` for that thread.
- All inserts are fire-and-forget after the mutation commits (same async pattern as the existing image-gen/link-preview hooks at `forum.ts:470-538`), so posting latency never grows.

## 1.3 tRPC surface

Extend `notificationsRouter` (`forum.ts:1114`) — but pointed at the `notifications` table:
- `list({ cursor?, limit })` — cursor-paginated, joined with actor name/avatar, **grouped payload**: server collapses same-(type, postId) rows within 24h into `{ count, latest, actors[≤3] }`.
- `unreadCount` (keep 30s poll; it is cheap on the existing index).
- `markRead({ id })`, `markAllRead`, `markThreadRead({ postId })`.
- `subscriptions.setMuted({ postId, muted })`, `subscriptions.listMine`.
- `mutes.set({ mutedUserId, scope })`, `mutes.remove`, `mutes.listMine` (person-level mute/block).
- `prefs.get` / `prefs.set` (reads/writes `playerProfiles.notificationPrefs`).

## 1.4 Deep-link landing (client)

- `CommunityPost.tsx`: on mount, if `location.hash` matches `#reply-(\d+)`, wait for replies query, then `scrollIntoView` the `id="reply-{id}"` element (ThreadRoots already targets these IDs) and apply a 2s highlight pulse (`bg-[#7dd87d]/20` fading via CSS transition — add the class + keyframes to CSS, ship-gate grep applies). If the reply was deleted, show a small inline note "That reply is no longer here" instead of failing silently.
- `NotificationBell.tsx` rewrite: read the new router; each item navigates to `notification.link` (fall back to the old type-based map for legacy rows). Grouped items ("3 replies on {title}") link to the thread with `#reply-{latestId}`. Add "View all" footer → new page.
- **New page `/notifications`**: full history, filter chips (Mentions / Replies / Gratitude / Elders / All), infinite scroll, mark-all-read, link to prefs. Register route in `App.tsx`.
- Bell dropdown gets actor avatars (`BadgeRingAvatar` sm) and type glyphs: mention `@`, reply `↩`, gratitude `🙏`, elder `🌿`.

## 1.5 Email delivery (Resend)

- `immediate` prefs: send within the fire-and-forget hook for `mention` and `forum_reply` only, stamp `emailedAt`. Template: existing branded header/footer, one-line context, quoted excerpt (sanitized, max 300 chars), single CTA button "Open the conversation" → absolute deep link via `toAbsoluteUrl` with UTM. Subject examples (writing-rules compliant): `"Maya mentioned you in 'Water retention on the north slope'"`.
- `daily`: extend a nightly job (new `server/jobs/notificationDigestJob.ts`, plain deterministic aggregation, no LLM) that batches unread+unemailed rows per user into one email: "While you were away: 2 mentions, 5 replies, 1 gratitude."
- Every email: per-type unsubscribe link → `/settings/notifications` (prefs page, can live as a tab on the existing profile settings).
- Guard rails: never email banned users; max 20 notification emails per user per day (hard cap, log drop); respect `emailDigestFrequency: never` as a global off.

## 1.6 Acceptance criteria (Phase 1)

- [ ] Typing `@handle` in a reply creates a notification for that user whose click lands the browser scrolled to, and highlighting, that exact comment.
- [ ] Replying to a post notifies the author; replying nested notifies the parent author; neither ever double-notifies.
- [ ] Elder comment on my post produces an "AI Elder responded" notification with a working deep link.
- [ ] Mention email arrives within a minute (immediate pref), contains the deep link, logs to `emailLogs`.
- [ ] Muting a thread stops follow notifications but not direct mentions.
- [ ] Muting a person stops their mentions and replies from notifying or emailing me; unmuting restores it.
- [ ] Legacy notifications (contribution, campaign) survive the migration with correct owner, read state, and a working destination.
- [ ] 11 mentions in one post → exactly 10 notifications.
- [ ] `pnpm typecheck` green; migration applied via runner; ship gate run.

**Estimated size:** 1 migration, ~1 new server module, ~4 route changes, 2 client components + 1 page. The single highest-value phase.

---

# PHASE 1B — Web Push + PWA (third delivery channel)

*Reuses the Phase 1 fan-out. Push is just another sink alongside in-app and email. Depends only on Phase 1.*

**Caution flag (verified against `vite.config.ts` — read before writing any SW code):** the SW is **generated by `vite-plugin-pwa` in `generateSW` mode** with `registerType: "autoUpdate"`, registered through `client/src/components/ServiceWorkerRegister.tsx`. `vite.config.ts:11` explicitly says *"do not create a manual public/sw.js"* — Workbox owns the generated file. A past production outage traced to SW cache handling (`feedback_build_debugging`), so this is the one phase where "move fast" is the wrong instinct.

**This changes the mechanism.** You cannot hand-edit the generated SW to add a `push` handler. The two real options:
- **(Recommended, lowest risk) `workbox.importScripts`:** add a separate hand-written `client/public/push-sw.js` containing only the `push` + `notificationclick` handlers, and register it via `workbox: { importScripts: ['/push-sw.js'] }` in `vite.config.ts`. Workbox keeps owning all caching (the part that broke before); push lives in an isolated file it merely imports. This *is* the "keep push separate from cache logic" rule, enforced structurally.
- **(Bigger change, only if importScripts proves insufficient) migrate to `injectManifest`** with a custom `src/sw.ts`. This hands you the whole SW and therefore the whole cache-outage risk again. Avoid unless forced; if taken, it needs its own `/security-review` and device-tested rollout.

## 1B.1 Server
- VAPID keys in env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), generated once, stored like other secrets. Add `web-push` lib (check `npx skills find` / existing deps first).
- New `push_subscriptions` table: `id, userId, endpoint (unique), p256dh, auth, userAgent, createdAt, lastSeenAt, failureCount`.
- `server/lib/push.ts`: `sendPush(userId, { title, body, url, tag })`. Fan-out hook: after a notification row is written and if the user's prefs allow push, fire push with `url = notification.link`. On 410/404 from the push service, delete the dead subscription; on repeated failure, prune.
- Respect a per-type push pref (extend `notificationPrefs`: `mentionsPush`, `repliesPush`, etc.) and a global quiet-hours window (optional, deterministic).

## 1B.2 Client
- Put the `push` handler (show notification) and `notificationclick` handler (focus existing tab or open `event.notification.data.url` — the deep link) in the isolated `push-sw.js`, wired via `workbox.importScripts` per the caution flag. Do not touch the generated caching SW.
- Subscription registration (asking for permission, calling `pushManager.subscribe`, POSTing the subscription to the server) is normal client code — add it to or beside `ServiceWorkerRegister.tsx`, not in the SW file.
- Permission UX done right: never prompt on load. Prompt contextually after a positive moment (e.g. right after the user's first post gets its first reply, or from an explicit "Notify me" toggle in `/settings/notifications`). One ask, remember the dismissal.
- `web-app-manifest` audit: ensure `manifest.json` has name, icons (maskable included), `display: standalone`, theme color matching the forest palette, and start URL. Add an install affordance (subtle, dismissible) for engaged users.
- `manifest`/SW registration must not regress existing behavior; verify offline shell + update flow.
- **iOS reality:** Safari on iPhone only delivers web push when the PWA is installed to the home screen (iOS 16.4+). The permission prompt on iOS should therefore appear only in the installed context; in the browser context, show the install affordance instead. Document this in the settings page copy so users understand why.

## 1B.3 Acceptance criteria
- [ ] Opting in registers a `push_subscriptions` row; a mention delivers an OS-level push whose click opens the app scrolled to that comment.
- [ ] Revoking permission / dead endpoint prunes the row (no infinite retries).
- [ ] SW update ships without breaking the cached app shell (tested on device, screenshot evidence).
- [ ] Push respects per-type prefs and the global off switch.
- [ ] Lighthouse PWA installability passes.

---

# PHASE 2 — The Living Feed (read state, follows, deterministic personalization)

*"Reimagine how you're served content based on your past interactions and how you've been showing up." All deterministic. No LLM in the ranking path.*

## 2.1 The signal model — what "showing up" means here

We already know, per player (all in `playerProfiles` / ledger / logs, computed nightly today):

| Signal | Source | Feed use |
|---|---|---|
| Bioregion | `playerProfiles.bioregionId` | Boost posts tagged with your bioregion |
| Path (investor / land_project / ally / player) | `playerPaths` | Boost matching categories + post types |
| Citizenship tier | `citizenshipTier` | Newcomer mode vs steward mode |
| Category affinity | your posts/replies/reactions per category | Core relevance multiplier |
| People affinity | who you reply to, send gratitude to, react to | Boost their new posts |
| Participation | threads you authored / replied / were mentioned in | "Your threads" freshness |
| 9-capitals percentiles | `capitalScoresJson` | Match `seeking-support` posts to your strong capitals |
| Lunar streak / recency | `lunarStreak`, `lastActiveAt` | Catch-up density when returning |

## 2.2 Schema (one migration, `drizzle/NNNN_forum_feed.sql`)

```
NEW forum_post_reads:                -- unread state, the foundation for everything
  id, userId, postId, lastReadAt, lastSeenReplyCount INT
  UNIQUE(userId, postId), INDEX(userId, lastReadAt)

NEW user_follows:                    -- one polymorphic follow table
  id, userId, targetType ENUM(user, category, bioregion, tag), targetId VARCHAR(64), createdAt
  UNIQUE(userId, targetType, targetId)

NEW user_forum_affinity:             -- nightly-computed, read-optimized
  id, userId, dimension ENUM(category, user, tag), targetId VARCHAR(64),
  score DECIMAL(8,4), computedAt
  UNIQUE(userId, dimension, targetId), INDEX(userId, dimension)

NEW forum_post_tags:                 -- REQUIRED for tag scoring: forumPosts.tags is a TEXT
  id, postId, tag VARCHAR(64)        -- column holding a JSON string (schema.ts:1471), only
  UNIQUE(postId, tag), INDEX(tag)    -- matchable via LIKE scans. Backfill by parsing the JSON
                                     -- in this migration; maintain on createPost/updatePost.
                                     -- tags text stays (client reads it); this is the query projection.
```

## 2.3 Affinity job (deterministic, nightly)

New `server/jobs/forumAffinityJob.ts` (same interval-registration pattern as `digestJob`): one pass over the last 90 days of `forumPosts`, `forumReplies`, `postReactions`, `forumLikes`, `gratitudeLog`:

```
category affinity = Σ per event in category: post=5, reply=3, reaction=1, gratitude sent=4
user affinity     = Σ per interaction with that author: reply=3, gratitude=5, reaction=1
tag affinity      = same shape over post tags
all × recency decay: weight × 0.5^(ageDays/30)
normalize per user to 0..1; write via bulk upsert; delete rows < 0.05
```

Cheap, restart-safe, idempotent. Zero tokens forever.

## 2.4 Feed scoring (read-time SQL, new `forum.feed` procedure)

`forum.feed({ tab: 'for_you'|'latest'|'following'|'my_threads', cursor?, limit })`

`for_you` score, computed in one query joining affinity + follows + reads (constants in `shared/` so client can explain rankings):

```
base       = ln(1 + replyCount + 2×reactionCount)
freshness  = 0.5^(hoursSinceLastActivity/48)
relevance  = 1
  + 1.5 × categoryAffinity + 1.0 × authorAffinity + 0.75 × tagAffinity   -- tag via forum_post_tags join
  + 1.25 if post.bioregionId = my bioregion
  + 1.0  if I follow the author/category/tag/bioregion
  + 0.75 if post declares a capital that is one of my top-3   -- GATED, see below
  + 0.5  if governanceStage = 'sensing' and my tier can set a perspective
unreadBoost = 1.5 if never read, 1.2 if new replies since lastSeenReplyCount
score = base × freshness × relevance × unreadBoost
```

- **Capitals boost is gated, not launch-blocking:** posts have no capital field today, so this term has nothing to match and MUST ship disabled. It activates once the composer's optional capital picker for seeking-support posts exists (Phase 3.3) and posts start carrying a `capital` value (add a nullable `forumPosts.capital` enum of the 9 Roots in the Phase 2 migration so the column is ready). Do not fake it by keyword-matching post text.
- **Bounded candidate window:** score cannot be indexed, so never score the whole table. Candidate set = posts with activity in the last 90 days, capped at 500 by `lastReplyAt DESC`, then scored and sorted in the query. Older posts remain reachable via Latest, search, and category pages. Window size is a `game_variables` knob.

- `latest` = today's ordering (default for signed-out users; also the guaranteed escape hatch, always one tap away).
- `following` = only followed users/categories/tags/bioregions + subscribed threads, chronological.
- `my_threads` = participated threads ordered by new activity, unread counts inline.
- **Newcomer mode** (account < 14 days or < 3 interactions): `for_you` blends in `isSeed=1` posts, the guidelines thread, and top threads from their bioregion, so a cold-start feed still feels curated.
- Mark-read: `forum.markPostRead({ postId, replyCount })` fired from `CommunityPost` on view (debounced), powering unread dots everywhere.
- **Cursor stability (do not skip this):** the For You score depends on `NOW()` via the freshness term, so a live-recomputed score breaks cursor pagination — posts reshuffle between page fetches, causing duplicates and gaps mid-scroll. Fix: the first page stamps an `asOf` timestamp; the cursor carries `{ asOf, lastScore, lastPostId }`; every subsequent page computes freshness against the *same* `asOf` and pages by `(score, id) < (lastScore, lastPostId)`. A scroll session ranks against a frozen clock; a fresh visit gets a fresh clock. `latest`/`following`/`my_threads` sort by real columns and don't need this.
- **Mutes apply here:** posts by users in `forum_user_mutes` (scope feed/both) are excluded from For You and Following.

## 2.5 Client UX for the feed

- **Feed tabs** at the top of the section-picker area on `/community`: For You · Latest · Following · My Threads. Persist choice in localStorage. Signed-out = Latest only.
- **Unread affordances:** dot on category cards (count of unread posts), bold-title + "N new" pill on post rows with unseen replies.
- **Catch-up strip** (replaces/augments the live-activity strip at `Community.tsx:430`): for returning users, "Since your last visit: 3 replies to your threads, 1 mention, 2 new posts in Rio Grande bioregion", each phrase deep-linking. Pure SQL from reads + notifications.
- **Why-am-I-seeing-this:** small `ⓘ` on For You cards → tooltip listing the fired boosts ("In your bioregion · You follow Maya"). Constants shared, so it is honest and debuggable. Trust matters in a community product.
- **Follow buttons:** on user profiles, category headers, bioregion pages, tag pages. One component, `FollowButton`, polymorphic.
- Digest job upgrade: the weekly email's forum section uses each recipient's `for_you` top-5 instead of global top posts (personalized digests fall out of this for free).

## 2.6 Acceptance criteria (Phase 2)

- [ ] Two users with different histories see measurably different For You orderings; signed-out sees Latest.
- [ ] Reading a thread clears its unread state everywhere within one refetch.
- [ ] Affinity job runs nightly, is idempotent, completes < 60s at current data scale.
- [ ] Latest tab exactly preserves today's behavior (regression guard).
- [ ] Feed query is one round trip, indexed, p95 < 300ms.
- [ ] Newcomer account sees seed + bioregion content, never an empty For You.

---

# PHASE 2B — Profile Unification (merge `userProfiles` into `playerProfiles`)

*Greenlit by Rye. Its own phase because it is a data-reconciliation migration touching every profile reader, not a UX tweak. Sequenced before the Phase 3 UX pass so the new post card / profile pages build on one model. Needs its own ADR.*

## The drift, precisely
- `userProfiles` (`schema.ts:1755-1779`) holds forum data: `bio, location, website, preferredLanguage, reputation, postCount, replyCount, path, onboardingComplete, displayName, avatarUrl, bannerUrl, lastActiveAt`.
- `playerProfiles` already holds `displayName, bio, avatarUrl, bannerUrl` **plus** all game state.
- So `displayName / bio / avatarUrl / bannerUrl` exist in **both** and can disagree. And `path` is a **third** copy of data that also lives in `playerPaths` (per-path table, the canonical one).

## Migration strategy (reversible, staged)
1. **Add** the forum-only columns to `playerProfiles`: `reputation, forumPostCount, forumReplyCount, website, forumLocation, preferredLanguage, onboardingComplete, lastActiveAt`. (Rename `postCount`→`forumPostCount` to avoid ambiguity with game stats.)
2. **Backfill + reconcile** in the same migration: copy forum-only fields straight over. For the four duplicated display fields, pick `playerProfiles` as canonical; where it is null/empty and `userProfiles` has a value, backfill from `userProfiles`. Log any *conflict* (both non-empty and different) to a `profile_merge_conflicts` audit table for manual review rather than silently picking one.
3. **Drop** `userProfiles.path` usage; repoint the one place forum reads `path` to `playerPaths`.
4. **Repoint readers/writers:** `UserForumProfile.tsx`, `forum.userProfile` / `forum.updateProfile`, reputation increments, `MemberDirectory`, and post/reply enrichment (already partly on `playerProfiles` per `forum.ts:131-194`) all read/write `playerProfiles`.
5. **Verify, then drop `userProfiles`** in a *separate* later migration once grep confirms zero references (ship-gate grep).

## Acceptance criteria
- [ ] Every forum surface reads name/avatar/tier/bio from `playerProfiles` only.
- [ ] Reputation and post/reply counts survive the merge (spot-check known users).
- [ ] Conflict audit table populated where both tables disagreed; zero silent data loss.
- [ ] `userProfiles` has zero code references before it is dropped.
- [ ] ADR appended documenting the merge and the reconciliation rule.

---

# PHASE 3 — World-Class UX + Design Pass

*Full audit findings → a shippable punch list. Keep the forest identity (Righteous/Nunito, greens, element cards); tighten everything around it.*

## 3.1 Information architecture

- **Desktop left rail** on `/community/*` (≥ lg): sections (Earth/Water/Fire/Air/General) with unread counts, followed items, My Threads, Notifications, Guidelines. The 5-element card grid stays as the mobile/home experience; the rail makes deep navigation persistent instead of one hub page. Collapsible; remember state.
- Kill the multi-delay scroll hack (`Community.tsx:130-146`, four staggered `scrollIntoView` calls) — with tabs + rail, returning users land on their feed, no scripted scrolling.
- Breadcrumbs are good; add prev/next-in-category navigation at the bottom of a post ("Continue exploring {category}").

## 3.2 Thread page (`CommunityPost.tsx`)

- **Reply permalinks:** hover a reply → link icon copies `/community/post/:id#reply-:rid`. Timestamp is the anchor link, like every mature forum.
- **Quote-reply:** select text in a post/reply → floating "Quote" chip inserts a blockquote + attribution link into the composer.
- **Edit replies:** new `forum.updateReply` — **author-anytime with a visible "edited" label** (Rye's call). Add `editedAt TIMESTAMP NULL` to **both** `forumReplies` and `forumPosts` (posts can be edited today but show no edited state); render "edited {relativeTime}" when set. Re-run mention parse on edit (Phase 1 edit semantics).
- **Reply sorting:** Newest / Oldest / Most appreciated (reaction-weight sum). Default Oldest (conversation order).
- **Collapse long threads:** nested branches > 3 replies collapse with "Show 4 more replies"; top-level list virtualizes past 50 replies (they currently all render at once).
- **Sticky composer** (mobile): reply box docks to the bottom with safe-area padding; "replying to {name}" chip stays visible.
- **Elder + AI provenance styling (currently none!):** comments from `bot:*` users get a distinct treatment — soft canopy-green left border, small "AI Elder" leaf badge next to the name, slightly warmer card background, and a one-line footer "AI companion of the ReGen community" per AI-AUTOMATION-RISKS provenance rules. Elders should feel like elders, visually.
- **OP badge** exists; add "Steward" chip for forum moderators on their replies.

## 3.3 Composer (`CommunityNewPost.tsx` + `RichEditor`)

- **@mention autocomplete inside TipTap** (the missing UI for Phase 1): TipTap Mention extension wired to `players.searchMentions` + elder handles (elders pinned at top with leaf icon). Renders as a styled chip, serializes to `@handle`.
- **Similar threads while typing the title:** debounced call to existing `forum.search` with the title text; show top 3 as "Related conversations" so people join threads instead of duplicating them. Deterministic, reuses what exists.
- **Drafts:** autosave title+content+category to localStorage every 5s, restore banner on return ("Pick up where you left off?"). Server drafts are overkill at current scale; `draftCleanupJob` hints server drafts exist elsewhere — check and reuse if a table already fits.
- **Fix image upload:** `FileUploadInput` is display-only (TODO `CommunityNewPost.tsx:131`). Wire to the existing R2 upload path used by avatars, insert into the editor as markdown image, proxy via `/api/img`.
- **Post-type cards instead of radios:** three visual cards (Discussion / Case Study / Seeking Team) with one-line descriptions; template auto-fill behavior stays.
- **Capital picker on seeking-support posts:** when the `seeking-support` tag is checked, show an optional "What kind of support?" selector over the 9 Roots of Capital (Intellectual, Social, Material, Financial, Living, Cultural, Spiritual, Experiential, Health), writing `forumPosts.capital`. This is what unlocks the Phase 2 capitals-matching feed boost (gated until this ships) and lets the feed route asks to the people strongest in that capital. Plain language labels, one tap, skippable.

## 3.4 Search

- New `/community/search` page (dropdown stays for quick-jump): results with filters (category, tag, author, date range), excerpt highlighting.
- Ranking upgrade in `forum.search`: blend FULLTEXT relevance with `ln(1+replyCount)` and freshness decay (same constants module as the feed). Still one SQL query.
- Index `forumReplies.content` with FULLTEXT too, so answers are findable, not just questions; results group reply hits under their thread.

## 3.5 Design-system tightening

- **One post-card component.** `Community.tsx`, `CommunityCategory.tsx`, tag pages, and trending each hand-roll their own card. Extract `ForumPostCard` (variants: compact / standard / hero) so density, badges, unread dots, and hover states are consistent everywhere.
- **Reading typography on thread pages:** post body at `max-w-prose`, `text-base` (currently `text-sm`), relaxed leading. Long-form regenerative writing deserves reading comfort.
- **Consistent time display:** relative under 7 days, absolute date after; full timestamp on hover, everywhere.
- **Empty states with a next action** (mostly good already): audit each for the writing rules and add one CTA per state.
- **A11y sweep:** focus-visible rings on all interactive cards (cards-as-links need `focus-within` treatment), `aria-live="polite"` region for new-reply announcements, reaction buttons get `aria-pressed` + labels ("Appreciate: 4 people"), color-contrast check on `#7dd87d` text usages (it fails on white; only use it on dark), reduced-motion respect for the pulse/breathing animations.
- **Mobile pass:** bottom action bar on thread pages (react / reply / gratitude / share), 44px minimum touch targets on the reply action row, section grid stays 2-col.
- **Performance:** virtualize long reply lists, `loading="lazy"` on generated banners, keep skeletons.

## 3.6 Profile unification — done in Phase 2B

The full `userProfiles` → `playerProfiles` merge now happens in **Phase 2B** (greenlit), before this UX pass, so `UserForumProfile.tsx`, the new `ForumPostCard`, and `MemberDirectory` are built directly against the unified model. Nothing profile-related is deferred here.

## 3.7 Acceptance criteria (Phase 3)

- [ ] Every reply has a copyable permalink and an edited label when edited.
- [ ] Elder comments are visually unmistakable and provenance-labeled.
- [ ] @mention autocomplete works in both new-post and reply composers.
- [ ] Similar-threads suggestion appears while titling a post.
- [ ] Image upload persists to R2 and renders in the post.
- [ ] 200-reply thread scrolls at 60fps (virtualized).
- [ ] Keyboard-only user can read a thread, react, and reply.
- [ ] Screenshot set (mobile + desktop, home/category/thread/composer) attached as evidence per ship gate.

---

# PHASE 4 — The ReGen Guide at the Door (conversational AI concierge)

*A guide you can talk to the moment you arrive, that walks you to the most relevant conversations. This is the **same ReGen Guide** that already replies to `@regen-guide` forum mentions and posts devil's-advocate comments (`server/lib/regenGuide.ts`) — one identity, one voice, one disclosure. We are giving the existing persona a conversational front door on the forum, not inventing a new character. Builds on the ReGen Guide persona + elder chat plumbing; nothing here is greenfield LLM infra.*

## 4.1 Product shape

- **Who sees it:** everyone on `/community`, including signed-out visitors (the newest new user has no account yet). First-visit (and first 3 visits): an inline **welcome panel** under the hero — guide avatar, one greeting line, and 4-6 **suggested question chips**. After that: a quiet floating leaf button, bottom-right, on all `/community/*` pages. Dismissible forever ("Don't show this again") — respect it.
- **Visitor tier (zero LLM, zero abuse surface):** signed-out visitors get the panel with generic chips ("What is this community for?", "How do the quests work?", "Who are the AI Elders?", "How do I join?") whose answers are **canned, hand-written responses with deep links** served deterministically from a config file, no model call. The freeform chat input shows "Sign in to talk with the Guide" and routes to OAuth with returnTo. Anonymous users guided, token spend and prompt-injection surface reserved for accounts.
- **Zero-token entry:** the panel and chips are fully deterministic. Chips are chosen by rule from the user's state, e.g.:
  - No posts yet → "Where should I introduce myself?" / "What is this community for?"
  - Has bioregion → "What's happening in {bioregion}?"
  - Path = land_project → "How do land projects use this forum?"
  - Quest active → "Is anyone else working on {quest}?"
  - Anyone → "How do I earn $ReGen here?" / "Who are the AI Elders?"
  The first LLM token is spent only when the user actually sends a message.
- **What it does well:** answers "where do I find / how does this work / what's relevant to me" with **deep links** — to categories, specific threads, quests, guidelines, the glossary, Ask an Elder. It is a concierge, not an oracle. When a question is really for an elder ("what would Anastasia say about grief"), it says so and hands off with a link.
- **Voice:** the existing ReGen Guide voice block (`server/lib/regenGuide.ts`) — direct, grounded, warm, writing rules enforced in the system prompt (already the pattern).

## 4.2 Retrieval (deterministic context assembly)

New `server/lib/regenGuide-concierge.ts` (extends `server/lib/regenGuide.ts`, reuses its voice block):
1. **Forum retrieval:** the user's message → existing FULLTEXT search over posts (+ replies after 3.4) → top 6 threads (title, category, excerpt, replyCount, URL).
2. **Site knowledge:** a small curated corpus — reuse the `elderCorpusChunks` mechanics with a new `elder='guide'` corpus (or a `guide_corpus` table, same shape): community guidelines, how-tokens-work, citizenship tiers, quest system, elder intro, category map. Built by a script like `scripts/build-elder-corpus.ts` from markdown files checked into the repo, so the guide's knowledge is versioned and auditable.
3. **Player context (public-only, per AI-AUTOMATION-RISKS):** display name, citizenship tier, path, bioregion name, quest titles in progress, whether they've posted. **Never** email, tokens balances, or location coordinates.
4. Assemble system prompt: voice + "you may only reference the threads and pages provided; give links using these exact URLs; if you don't know, point to search or an elder" + retrieved context. This link-allowlist instruction is the anti-hallucination guard: the model cannot invent URLs because the client only renders links that match the provided set (validate client-side too — strip any link not in the served allowlist).

## 4.3 Transport + storage

- Streaming via existing `streamLLM` and the elder-chat tRPC streaming pattern (`server/routes/elderChat.ts`). New `regenGuideRouter`: `ask({ sessionId, message })`, `suggestedChips()` (deterministic, public), `enabled()`.
- Log to a `guide_chat_messages` table (same shape as `elderChatMessages`: sessionId, role, content, retrievedRefs JSON). Sessions ephemeral client-side; log is for safety review.
- Max ~700 output tokens per turn; short answers with links beat essays.

## 4.4 Safety + limits (all reused patterns)

- `detectCrisis()` from `server/lib/elder-safety.ts` runs on every user message → canned `CRISIS_RESPONSE`, no model call.
- Rate limits: 20 messages / 15 min / session + global IP limiter (identical to elder chat).
- Sanitize user message before prompt; sanitize model output through `sanitizeInput` (`server/_core/security.ts`); render markdown with the link allowlist above.
- Provenance: panel header says "ReGen Guide · AI companion"; first message of every session includes the disclosure line. Matches the provenance the same Guide already uses on its forum replies, so users meet one consistent AI presence.
- `REGEN_GUIDE_CHAT_ENABLED` env kill switch (distinct from the existing Guide forum-posting toggle, so chat and auto-reply can be controlled separately). Site-wide daily message cap (e.g. 500/day) as a cost fuse, logged when hit.
- Update `.ai/docs/security/AI-AUTOMATION-RISKS.md` LLM-surface table + append an ADR ("ReGen Guide conversational concierge on the forum, deterministic-first entry") when shipping.

## 4.5 Acceptance criteria (Phase 4)

- [ ] New user sees the welcome panel with personalized chips; no LLM call happens until they send a message.
- [ ] Signed-out visitor sees the panel, gets canned chip answers with working links, and hits the sign-in gate on freeform input; zero LLM calls in the entire visitor path.
- [ ] "Where do I introduce myself?" answers with a real deep link into the right category, streamed.
- [ ] Every link in guide output resolves 200 (allowlist enforced client + server).
- [ ] Crisis phrasing returns the canned response with zero model call (test fixture).
- [ ] Kill switch env hides the whole surface.
- [ ] Rate limit fires at message 21 with a kind, writing-rules-compliant message.

---

# PHASE 5 — Measurement + polish loop

- **Deterministic metrics job** (extend `communityPulse` / nightly job) writing a small `forum_metrics_daily` table: DAU posting/replying, median time-to-first-reply on new posts, % new posts receiving ≥1 reply in 48h, notification CTR (clicks need a `clickedAt` stamp on `markRead` when navigated), guide sessions → first-post-within-7-days conversion, For You vs Latest engagement split.
- **North-star:** median time-to-first-reply and % of new members who post within 7 days. A world-class community forum is one where nobody speaks into the void.
- Admin dashboard card (existing admin area) rendering the last 30 days of these.
- Two weeks post-launch: re-run this doc's acceptance lists, file a `FIXES_TO_MAKE_FORUM.md` from real usage, archive this doc per STEERING §8.

---

## Cross-cutting concerns (apply to every phase)

- **Idempotency everywhere autonomous.** Every notification insert uses `dedupeKey` + INSERT IGNORE. Every fire-and-forget hook must be safe to run twice (Railway restarts mid-request; the token ledger already carries this scar). Push sends and emails check `pushedAt`/`emailedAt` before firing.
- **Testing is where these bugs live.** The valuable logic here is pure and deterministic — mention parser, affinity scorer, feed ranker, chip selector, cursor encoder, link allowlist. Each gets unit tests (`pnpm test`); server fan-out gets an integration test (`pnpm test:integration`) proving one event → correct notification rows with no dupes. Ship gate stays mandatory, but real tests catch the logic errors the gate cannot.
- **i18n-aware.** The forum already has `preferredLanguage` + `translate.content`. Keep notification/guide copy in templated strings (not inline concatenation) so translation is a later config change, not a rewrite. Not blocking; just don't paint it into a corner.
- **Abuse surfaces to watch:** mention-to-email as a spam vector (guarded by the 10-cap, the 20/day email cap, and person-mutes); guide chat as a token-drain (session + IP + site-wide caps); push endpoint churn (prune on failure). All already specced above; call them out in `/security-review`.
- **Accessibility is not a Phase 3 silo.** Streaming guide output needs `aria-live`; the notification bell needs keyboard operation and screen-reader labels; push permission prompts must be dismissible without a mouse. Build a11y in per phase, audit in Phase 3.

## Build order + dependency notes for the executing instance

1. **Order:** Phase 1 → 1B → 2 → 2B → 3 → 4 → 5. Parallelizable in worktrees (`docs/GOLDEN_RULE.md`): 1B depends only on 1; 2 and 2B are independent of each other and can run in parallel sessions; 3 depends on 1 (deep-link landing), 2 (unread affordances), and 2B (unified profile model); 4 depends softly on 3.4 (reply FULLTEXT) and can ship with post-only retrieval.
2. Each phase = its own migration file(s) via the runner, its own commit series, its own ship-gate run, deploy to green per the standard deploy flow in `CLAUDE.md` (Claude owns test → migrate → /ship → push → verify Railway).
3. **Golden Rule applies:** `/plan-ceo-review` the phase, `npx skills find` before building (feed ranking, mention parsing, TipTap mention, web-push are all well-trodden — don't rebuild), `/design-review` on Phase 3, `/security-review` on Phases 1 (email + notification fan-out), 1B (push), 2B (data migration), and 4 (LLM surface).
4. New game-variable knobs (feed weights, guide caps, digest thresholds, push quiet-hours) go into `game_variables` like `claim_threshold_*` do, so tuning never needs a deploy.
5. Every user-facing string in this doc is a suggestion; final copy passes STEERING §1 + `avoid-ai-writing` review.
6. Where this plan touches token earning (none currently — deliberate: **no tokens for posts/replies**, engagement rewards invite spam; gratitude already covers appreciation) — if that changes, STEERING §5 rules apply and it needs its own ADR.
7. **ADRs to append when shipping:** Phase 1 (notification-table consolidation), Phase 2 (deterministic For You feed), Phase 2B (profile unification), Phase 4 (ReGen Guide concierge). Each supersedes nothing but records the choice per `CLAUDE.md`'s update rules.

## Open questions for Rye

All five original questions are now answered and folded in (see "Decisions locked" at top). New, smaller ones surfaced by the second pass — none block Phase 1:

1. **Person-mute vs full block:** the plan specs *mute* (you stop seeing/hearing them; they can still see you). Do you also want a hard *block* (they can't reply to your threads)? Mute is shipped; block is a small add if wanted.
2. **Push permission timing:** plan prompts after a positive moment (your first post gets its first reply) rather than on load. Comfortable with that, or prefer an explicit opt-in only from settings?
3. **Profile-merge conflict handling:** where `userProfiles` and `playerProfiles` disagree on name/bio/avatar, plan keeps `playerProfiles` and logs the conflict for review. Fine, or should conflicts pause the migration for manual resolution first?
