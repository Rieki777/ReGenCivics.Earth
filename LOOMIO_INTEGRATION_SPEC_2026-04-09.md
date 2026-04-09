# Loomio-Based Collaborative Governance for ReGen Civics

**Date:** 2026-04-09 (rev 2, source-grounded)
**Status:** Design spec. No implementation in this pass.
**Builds on:** `COMMUNITY_AGREEMENTS_PLAN.md` (shipped), `forumPosts`, `communityAgreements`, `CONTEXT_THE_TWO_GAMES.md`.
**Source read:** Full Loomio Ruby/Vue codebase at `loomio Governance Tools/`. Key files read: `db/schema.rb`, `app/models/poll.rb`, `app/models/stance.rb`, `app/models/outcome.rb`, `app/models/poll_option.rb`, `app/services/poll_service.rb` (544 lines), `config/poll_types.yml` (378 lines), `config/poll_templates.yml` (359 lines), `app/models/events/*` (42 event classes), `README.md`, `LICENSE.txt`. Rev 1 of this spec was written from training knowledge; this rev replaces it with details pulled directly from the source.

---

## Credits and attribution

Any path below starts the collaborative governance section on the site with this block, placed above the interface, with links:

> The decision tools in this section are built on [Loomio](https://www.loomio.com), an open-source collaborative decision-making platform made by a worker-owned cooperative in Aotearoa New Zealand. We are using their years of work and their practice knowledge because it is excellent and because it shares our values. If these tools help you, please [support Loomio directly](https://www.loomio.com/pricing) and read about the [Loomio Co-op](https://www.loomio.com/about).

Attribution lives in the page header, the site footer, the `/about` page, and in a `GOVERNANCE_CREDITS.md` file in the repo root.

## Licensing reality (read this first)

Loomio is licensed under **GNU AGPL-3.0**. The AGPL is the GPL plus a network-use clause: if users interact with the software over a network, they are entitled to the complete corresponding source of the service they are using, including any modifications. This has concrete implications for every path below.

- **We cannot copy Loomio files into the Next.js app and call it a day.** That would make the entire ReGen Civics codebase a derivative work under AGPL, including parts that have nothing to do with governance. The Fund code, the quest system, the forum, the map. All of it. That is almost certainly not what Rye wants.
- **We can run Loomio as its own service**, alongside the Next.js app, with clear boundaries. That scopes the AGPL obligation to the Loomio service itself. We publish our modifications to Loomio on a public repo; the rest of regencivics.earth stays under whatever license it is under.
- **We can reimplement Loomio's ideas from scratch in TypeScript**. Ideas are not copyrighted. A fresh implementation owes Loomio credit and thanks, not code compliance.
- **We cannot privately fork Loomio, modify it, and run it without publishing the changes.** The network-use clause of AGPL means even a service that never ships a binary must expose source on request.

The three real options are therefore **Path A: reimplement the ideas**, **Path B: run Loomio as a sibling service**, and **Path C: fork Loomio and make it our governance layer**. Section 2 lays them out. Section 3 recommends one. Everything after section 3 assumes the recommended path; the alternatives are revisited in the appendix.

---

## 1. What we learned from Loomio (source-grounded)

Before picking a path, this is what the Loomio code actually does. These are the parts worth knowing, pulled from the models and services.

### 1.1 One polls table, many poll types

`polls.poll_type` is a string with ten possible values: `count`, `check`, `question`, `proposal`, `meeting`, `poll`, `dot_vote`, `score`, `ranked_choice`, `stv`. Each type has a config block in `config/poll_types.yml` that sets defaults, validation rules, result column layout, and which "common poll options" it supports.

The `proposal` type is the interesting one. It is one unified poll type that powers all of Loomio's deliberation templates: **classic proposal (agree/abstain/disagree), advice, consent, consensus (adds block), gradients of agreement (8 levels), majority (yes/no with 50% quorum), sense check (looks good / could be better / needs a rethink), opt-in (accept/decline)**. Each is a template that picks a subset of option keys from a shared library. One code path, many facilitation styles. This is the single most important design lesson in the codebase.

### 1.2 Templates are config, not schema

`config/poll_templates.yml` holds 15+ built-in templates. Each template is a YAML block with a `poll_type`, default title and details, default duration, translated process descriptions, and a list of poll options with `key`, `icon`, `color`, `meaning` and `prompt` strings. Groups can also define their own templates in a `poll_templates` table. Adding a new facilitation style does not need a migration; it needs a YAML block and some translations.

### 1.3 Poll options have meaning and prompts

`poll_options.meaning` and `poll_options.prompt` are per-option strings. `meaning` is the description shown next to the option ("Agree: I support this as written."). `prompt` is the text shown in the reason field placeholder when a voter picks that option ("What do you like about this proposal?"). Per-option prompts turn voting into a guided reflection. This is a small, powerful detail.

### 1.4 Options can carry pass/fail rules

`poll_options.test_operator`, `test_percent`, and `test_against` encode a pass/fail rule at the option level. The consent template uses this: the "objection" option has `test_operator: lte, test_percent: 0, test_against: score_percent`, which means "the proposal passes only if objection score percent is less than or equal to zero." Block options in the consensus template work the same way. Embedding the pass rule in the option, not in a central rules table, keeps each template self-contained.

### 1.5 Stances are versioned, with "latest" flag

Every time a voter changes their mind, Loomio writes a new `stances` row. The old row is kept with `latest: false`; the new row is `latest: true`. A unique index on `(poll_id, participant_id, latest = true)` ensures exactly one current stance per voter per poll. This gives you a free revision history for the cost of one boolean column. The `versions_count` on the stance row (using `paper_trail`) tracks how many times this voter changed their mind.

### 1.6 Cast vs undecided

`stances.cast_at` is separate from `created_at`. A stance can exist with `cast_at = null`, which means "this voter is invited, but has not yet responded." The "undecided voters" list is just `stances.latest.where(cast_at: nil)`. This makes invitation, reminding, and participation tracking one model.

### 1.7 Stance choices carry scores

Stances have many `stance_choices` (join table to poll options), each with a `score` column. This handles every poll type in a single data shape:

- Proposal: one stance_choice with score 1.
- Ranked choice: one stance_choice per option, score is the rank position.
- Score poll: one stance_choice per option, score is 1-5 or whatever range.
- Dot vote: one stance_choice per option, score is the number of dots.
- Meeting (time poll): one stance_choice per time option, score is 0 (no), 1 (maybe), or 2 (yes).

A jsonb `stances.option_scores` column caches the map of `poll_option_id → score` for fast reads. This is a very clean polymorphism of voting shapes.

### 1.8 Hide results for integrity

`polls.hide_results` is an enum: `off`, `until_vote`, `until_closed`. This is there to prevent herd-following. A voter cannot see the running tally until they have cast their own stance, or until close. Once set to `until_closed`, it cannot be relaxed (`cannot_reveal_results_early` validator).

### 1.9 Anonymous once, anonymous forever

`polls.anonymous` is a boolean that can be set true but never unset. The `cannot_deanonymize` validator enforces it. When an anonymous poll closes, `poll_service.do_closing_work` runs `poll.stances.update_all(participant_id: nil)` to strip identity. The `stance_receipts` table holds a separate record of who was invited and whether they voted, so participation can be reported without revealing what each person chose.

### 1.10 Quorum and option tests are two different things

`polls.quorum_pct` is the participation threshold ("at least 50% of invited voters must respond"). Option test rules are the decision criteria ("no objections"). A consent decision uses both: quorum ensures enough people weighed in, and the objection rule ensures no one blocks.

### 1.11 Stance reason can be required, optional, or disabled

`polls.stance_reason_required` enum: `disabled` / `optional` / `required`. For a question-round poll, `required` is the default, the chart is hidden, and there are no options at all. You cannot vote without writing a reason. It is a structured comment thread disguised as a poll.

### 1.12 Outcomes are versioned

`outcomes.latest` works the same as stances. Publishing a new outcome supersedes the old one, old versions are kept. An outcome belongs to a poll and optionally to a winning `poll_option` (the time slot chosen from a meeting poll). Outcomes can carry `review_on` dates that trigger a scheduled `outcome_review_due` event, which is how Loomio models "revisit this decision on June 1." This is a feature we want.

### 1.13 Events are a typed, polymorphic timeline

The `events` table is polymorphic on `eventable_type` / `eventable_id` and carries a `discussion_id` plus a `sequence_id` that is unique within a discussion. Every significant action gets one event row. There are 42 event classes in `app/models/events/`: `poll_created`, `poll_edited`, `poll_announced`, `poll_closing_soon`, `poll_closed_by_user`, `poll_expired`, `poll_reopened`, `poll_option_added`, `poll_reminder`, `outcome_created`, `outcome_updated`, `outcome_announced`, `outcome_review_due`, `stance_created`, `stance_updated`, `reaction_created`, plus discussion and membership events. Each event class knows how to notify: in-app, email, chatbots (Slack/Discord webhooks), mentions, subscribers, author. The notification logic is factored into concerns under `app/models/concerns/events/notify/`.

This is more than we need. The pattern is worth borrowing.

### 1.14 Reactions everywhere

`reactions` is a polymorphic table on `reactable_type` / `reactable_id`. Any poll, stance, outcome, comment, or discussion can get emoji reactions. One model, one table, one component.

### 1.15 Rich text with mentions and attachments

Poll details, stance reasons, and outcome statements use a rich text concern (`HasRichText`) with Markdown or HTML formats, `@`-mentions, link preview caching in jsonb, and attachments stored as jsonb. No separate document uploader; the field carries its own attachments.

### 1.16 Polls can stand alone or attach to discussions

`polls.discussion_id` is nullable. A poll can be created without a thread (standalone), or attached to a discussion. `PollService.add_to_thread` moves an existing poll into a discussion and rewires the event timeline. This is relevant for us: not every decision needs a forum thread around it, and some do.

### 1.17 Scheduled opening and closing

`polls.opening_at` and `polls.opened_at` are separate. `polls.closing_at` and `polls.closed_at` are separate. A poll can be drafted, scheduled to open later, open automatically, then close automatically when `closing_at` passes. Cron jobs (`open_scheduled_polls`, `expire_lapsed_polls`, `publish_closing_soon`) handle transitions.

### 1.18 Admin rights are computed, not stored

`Poll#admins` is a SQL method that joins memberships, discussion_readers, and stances with an `admin` flag, and returns everyone who can modify the poll. There is no `poll_admins` table. Permissions come from relationships. This is a good pattern but it is tied to the group + membership model, which we do not fully have.

### 1.19 Notifications are event-typed

Each event class composes in a set of notifier concerns: `Notify::InApp`, `Notify::ByEmail`, `Notify::Author`, `Notify::Mentions`, `Notify::Subscribers`, `Notify::Chatbots`. A `poll_closing_soon` event knows it should notify undecided voters in-app and by email. A `stance_created` event knows it should notify subscribers. This lets each event type declaratively say how it is delivered, instead of a big central notification router.

### 1.20 Full-text search across everything

`pg_search_documents` is a single polymorphic search index with a tsvector column and a GIN index. Polls, stances, outcomes, comments, and discussions all write into it. One query searches governance across all surfaces. Clean.

---

## 2. The three paths

### Path A: Reimplement the patterns in TypeScript

Build a Loomio-inspired decision layer in the existing `tRPC + Drizzle + MySQL` stack. No Ruby, no Postgres, no second service. Use Loomio's data model as the reference and recreate it with our conventions. This is rev 1 of the spec, improved with the source-grounded details in section 1.

**Pros.** Zero operational cost beyond the existing stack. Deep native integration with forum, quests, and community agreements. TypeScript end to end. No AGPL exposure. Full creative control.

**Cons.** We rebuild what already works. We inherit none of Loomio's accumulated bug fixes, translations (the poll_types.yml has i18n keys for 40+ languages), edge-case handling, or future improvements. Every new decision type or facilitation pattern is a sprint, not a config change. Reaching feature parity is a multi-quarter project.

**Timeline.** Phase 1 (consent + preference + temperature check, one decision per thread, close + outcome + promote to agreement): 2 to 3 weeks of focused build, already scoped in rev 1 of this spec. Phase 2 (score, dot vote, ranked choice, meeting polls, anonymous mode, stance reason required, scheduled opening, outcome review dates): another 4 to 6 weeks. Phase 3 (email / Slack / chatbot integration, templates, history, STV): indefinite.

### Path B: Run Loomio as a sibling service

Deploy Loomio itself on a subdomain (`governance.regencivics.earth`) using the official `loomio/loomio-deploy` docker setup. Run it as a standalone Rails + Postgres + Vue app. The main Next.js app links out to it. Users sign in via OIDC single sign-on so the identity is shared. The forum renders a "Decisions" tab per thread that embeds or iframes a Loomio view, or links to it with a thread-specific group/discussion ID.

**Pros.** We get every feature Loomio has, day one: all ten poll types, STV elections, ranked choice, meeting polls, anonymous mode, per-option pass rules, hide-results, versioned stances, outcome reviews, chatbot integrations, rich text, mentions, translations into 40+ languages, full-text search, a real mobile UI, years of user-tested facilitation language. Every upstream Loomio release is a pull away. Attribution is automatic; Loomio looks like Loomio. AGPL obligation is scoped to the `governance.regencivics.earth` service only, and is satisfied by linking back to the public Loomio repo and any modifications in a public fork.

**Cons.** Two stacks to operate (Next.js + MySQL + Rails + Postgres). Two deploys. SSO wiring between Next.js auth and Loomio's identity. Shared visual language takes real design work (the Loomio Vue app does not use our Tailwind tokens). The "decisions are in their own app" feeling is real; people context-switch. Theme customization is limited to what Loomio exposes. Land project and alliance onboarding flows now have a second system to wire into.

**Timeline.** Stand up a Loomio instance on a subdomain: 1 to 2 days for an experienced devops engineer. SSO wiring: 1 week. Basic visual theming and navigation to match the rest of the site: 1 to 2 weeks. Forum / land project / alliance integration via Loomio's API: 2 to 4 weeks. Total: 4 to 7 weeks for a deeply integrated instance. Loomio shipped on day 1, polish and integration across the next month.

### Path C: Fork Loomio and extend it

Fork the Loomio repo to our own org, modify it, brand it as "ReGen Civics Governance", and run it as our primary app for governance. Deeper customization than Path B. Potentially merge the forum, quests, and decision tooling into one Rails/Vue app over time, and deprecate the Next.js forum.

**Pros.** Full control. Can add RCVoice/RGVoice weighted voting, bioregional visibility tiers, citizenship-tier gating, and land-project-specific templates directly in the fork. Visual branding can go deep.

**Cons.** Every upstream change is a merge conflict. We now maintain a fork of a 544-line poll service and a 42-class event system we did not write. Our fork becomes an AGPL project that must publish every change. We become Loomio maintainers, not Loomio users. This is a serious commitment that probably only makes sense if governance is the main thing the team is building.

**Timeline.** Realistic: 2 to 4 months before the fork feels integrated, and ongoing upstream-tracking work indefinitely.

---

## 3. Recommendation

**Path B, with a phased integration plan.** Run Loomio on `governance.regencivics.earth`, wire SSO, theme it to match the rest of the site as much as Loomio allows, and build thin bridges from the Next.js forum, land project pages, and alliance pages into it. Port a handful of Loomio's best ideas (per-option prompts, versioned stances, outcome review dates, event-typed notifications) back into the forum itself over time if they prove useful outside the governance surface.

Reasons:

1. The Loomio code is excellent. Reimplementing it is months of work that delivers a worse version of something that already exists.
2. The community already cares about sociocracy, consent, and decision quality. Giving them Loomio's seven facilitation templates (consent, consensus, advice, sense check, gradients of agreement, majority, opt-in) on day one, in the language of the people who wrote the book on them, is a real gift.
3. AGPL is manageable when Loomio runs as its own service. It is a landmine if we port code into the Next.js repo.
4. The attribution story is honest and warm: we are users of Loomio, not authors of it. That is a better story than a reimplementation that looks the same.
5. Path B is reversible. If after a season we find the integration is awkward, we can start porting the core patterns back into the main app with everything we learned from running the real thing.

The rest of this document (sections 4 through 10) assumes Path B. An appendix revisits Path A for the case where Rye chooses to build native after all.

---

## 4. Architecture (Path B)

### 4.1 High-level diagram in words

- `regencivics.earth` remains the main site. Next.js, tRPC, MySQL, Cloudflare R2. Unchanged except for three integration touchpoints.
- `governance.regencivics.earth` is a new subdomain running Loomio. Ruby on Rails 7, Vue 3, PostgreSQL 15, Redis. Deployed via the official `loomio/loomio-deploy` docker-compose setup on a Railway service or a dedicated VPS.
- Identity is shared by OIDC. Next.js is the identity provider. Loomio acts as the OIDC relying party using its built-in identity adapter.
- Data stays in two databases. The main app does not read the Loomio Postgres directly. Cross-calls go through Loomio's REST API (`/api/v1/*`) with a service token.

### 4.2 Three integration touchpoints

1. **"Governance" nav link** on the main site. Routes to `governance.regencivics.earth` with the OIDC flow. Users land in a Loomio group pre-scoped to them.
2. **"Attach a decision" action on forum threads.** Opens a dialog that calls Loomio's API to create a discussion (if one does not already exist for this thread) and a poll inside it. Stores the Loomio `poll_key` and `discussion_key` in a new `forumPostDecisions` join table back in MySQL. The forum thread then renders a small "Decision open on Loomio" card that links to `governance.regencivics.earth/p/:poll_key` and shows the current stance summary fetched from Loomio's API.
3. **Community agreements promotion.** When a consent-template poll closes with no objections, a webhook from Loomio to the main site fires; the main app inserts a row into `communityAgreements` with `status = 'ratified'` and stores the Loomio poll key in a new `sourceLoomioPollKey` column for linkback.

Three touchpoints, everything else happens in Loomio.

### 4.3 What lives where

| Concern | Lives in |
|---|---|
| Forum threads and replies | Main app (MySQL) |
| Quests and quest suggestions | Main app (MySQL) |
| Land project records and map | Main app (MySQL) |
| Community agreements (ratified list) | Main app (MySQL) |
| Decision proposals, stances, outcomes, poll templates | Loomio (Postgres) |
| Decision-related notifications | Loomio's own system, plus webhook-triggered email from main app |
| Identity, sessions, password reset | Main app (OIDC provider) |
| RCVoice / RGVoice token weighting | Not Phase 1. When we add it, it happens in a custom Loomio fork or an outcome-recording webhook that weights the result. |

### 4.4 Groups, subgroups, and scoping inside Loomio

Loomio organizes everything inside groups. We model our community as a single top-level Loomio group called "ReGen Civics" with a handful of subgroups that mirror our forum taxonomy:

- **Community agreements** (subgroup) for whole-community norms decisions.
- **Land projects** (subgroup) with one subgroup per active land project. Land project stewards are coordinators of their own subgroup.
- **Alliance partners** (subgroup) for alliance acceptance and partnership decisions.
- **Fund governance** (subgroup) for RCVoice-weighted decisions, eventually.
- **Game governance** (subgroup) for RGVoice-weighted decisions, eventually.
- **Bioregions** (subgroup) with one subgroup per active bioregion, eventually.

This is exactly what Loomio's subgroup model was built for. Land project stewards become group admins of their own subgroup, can post seasonal update discussions, and can attach consent polls without needing permission from anyone above them. The main app's citizenship tiers map onto group memberships in Loomio.

### 4.5 Theming

Loomio exposes a theme configuration in `Group#theme`: logo, brand colors, custom CSS, custom terms. We use it to match the ReGen Civics look. Font choice, primary and accent colors, hero image, sidebar background. We do not try to replace the Vue components; we recolor and rename them. The subdomain is clearly Loomio, and that is fine.

### 4.6 SSO

Loomio has an existing `identities` table and an OIDC identity adapter in `app/controllers/users/omniauth_callbacks_controller.rb`. We enable OIDC against the main app's auth system. The main app gains a new `/oidc/authorize` and `/oidc/token` endpoint backed by a minimal OIDC implementation (Auth.js has an OIDC provider mode; `oidc-provider` npm is the reference library). First login creates a Loomio user tied to the main-app user id via the `identities` table. Subsequent logins are silent.

---

## 5. Phase 1 implementation plan (Path B)

Smallest shippable version. Two weeks for an experienced full-stack engineer.

### 5.1 Stand up Loomio

1. Clone `loomio/loomio-deploy`. Copy the docker-compose setup to a new Railway project or a DigitalOcean droplet.
2. Provision Postgres, Redis, and an object store bucket for attachments (R2 works via the S3-compatible API).
3. Set up `governance.regencivics.earth` DNS and a TLS certificate.
4. First-boot Loomio, create the initial admin user, create the top-level ReGen Civics group and the five starter subgroups listed in section 4.4.
5. Set the theme: upload logo, set brand colors, pick fonts, add a header link back to `regencivics.earth`.

### 5.2 Wire SSO

1. Add an `oidc-provider` endpoint to the main app under `/api/oidc/*`. Reuse the existing session cookie.
2. Configure Loomio's OIDC identity adapter to point at it.
3. Test sign-in from `regencivics.earth` to `governance.regencivics.earth` and back.
4. First-login creates a Loomio user row tied to the main-app user id via `identities.uid`. Store the mapping both ways (Loomio has `users.uid`, main app needs a `loomioUserId` column on `users`).

### 5.3 Add "Governance" to the main nav

Direct link to `governance.regencivics.earth`. Small badge that shows the count of open polls the signed-in user has not voted on. The count comes from a cached tRPC query that calls Loomio's `/api/v1/polls?closing_at_gt=now&participating=true&voted=false` endpoint with the user's Loomio token, refreshed every 5 minutes.

### 5.4 Attach-a-decision on forum threads

New tRPC router `server/routes/decisions.ts`:

- `decisions.create(forumPostId, templateKey, title, details, closesAt, minParticipantsPct?)`. Calls Loomio's `POST /api/v1/polls` with the chosen `poll_template_key` (consent, majority, proposal, check, etc.). On success, inserts a row into a new `forumPostDecisions` join table with `(forumPostId, loomioPollKey, loomioDiscussionKey, templateKey, status, closesAt, stanceSummary JSON)`.
- `decisions.getByForumPost(forumPostId)`. Reads the join table. If the decision is open, also fetches fresh stance summary from Loomio via `GET /api/v1/polls/:key` and updates the cached `stanceSummary`.
- `decisions.listOpen()`. Lists all rows in `forumPostDecisions` where the Loomio poll is still open. This drives the `/community/decisions` index page.

New table `forumPostDecisions`:

```sql
CREATE TABLE forumPostDecisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  loomioPollKey VARCHAR(40) NOT NULL,
  loomioDiscussionKey VARCHAR(40) NOT NULL,
  templateKey VARCHAR(40) NOT NULL,
  title VARCHAR(300) NOT NULL,
  status ENUM('open','closing_soon','closed','cancelled') NOT NULL DEFAULT 'open',
  closesAt TIMESTAMP NULL,
  closedAt TIMESTAMP NULL,
  stanceSummary JSON,
  outcomeStatement TEXT,
  promotedToAgreementId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX forumPostDecisions_forumPostId_idx (forumPostId),
  INDEX forumPostDecisions_status_idx (status),
  UNIQUE KEY unique_loomio_poll (loomioPollKey)
);
```

### 5.5 Decision card on forum thread view

A new component `DecisionCardFromLoomio` that renders inside the forum thread, above replies, when a `forumPostDecisions` row exists for that thread. The card shows: title, template name ("Consent round"), close countdown, a small stance summary bar fetched from Loomio, a primary "Respond on Loomio" button that opens the Loomio poll page in a new tab (or, Phase 2, inline as an iframe). After close, the card shows the recorded outcome and a "View decision" link.

### 5.6 Webhook receiver for close and outcome

Loomio can send webhooks per event kind to a URL per group. Configure webhooks on every subgroup to `POST https://regencivics.earth/api/webhooks/loomio` with a shared secret. Handle these events:

- `poll_closed_by_user` and `poll_expired`: update `forumPostDecisions.status` to `closed`, set `closedAt`, refresh `stanceSummary`.
- `outcome_created` and `outcome_updated`: update `outcomeStatement`. If the poll's template was `consent` and the outcome statement indicates no objections, render a "Promote to community agreement" button in the forum thread for the author or moderators. On click, create a row in `communityAgreements` with `status = 'ratified'` and a new `sourceLoomioPollKey` column, and update `forumPostDecisions.promotedToAgreementId`.

### 5.7 `/community/decisions` index page

New route. Reads `forumPostDecisions` directly. Three sections: **Open now**, **Closing soon**, **Recently closed (with outcomes)**. Each card is a thread title, the template name, the stance summary bar, the close countdown or outcome statement, and a link into the thread. Filter bar: category, template, "mine" toggle.

### 5.8 Additive columns on existing tables

- `forumPosts.activeDecisionId INT NULL` (FK into `forumPostDecisions`, denormalized for cheap list rendering).
- `communityAgreements.sourceLoomioPollKey VARCHAR(40) NULL`.

### 5.9 Migration SQL

Save as `drizzle/0102_forum_post_decisions.sql`.

```sql
-- Bridge between forum posts and Loomio governance decisions.
-- Assumes governance.regencivics.earth is running Loomio via Path B.

CREATE TABLE forumPostDecisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  loomioPollKey VARCHAR(40) NOT NULL,
  loomioDiscussionKey VARCHAR(40) NOT NULL,
  templateKey VARCHAR(40) NOT NULL,
  title VARCHAR(300) NOT NULL,
  status ENUM('open', 'closing_soon', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  closesAt TIMESTAMP NULL DEFAULT NULL,
  closedAt TIMESTAMP NULL DEFAULT NULL,
  stanceSummary JSON DEFAULT NULL,
  outcomeStatement TEXT DEFAULT NULL,
  promotedToAgreementId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX forumPostDecisions_forumPostId_idx (forumPostId),
  INDEX forumPostDecisions_status_idx (status),
  UNIQUE KEY unique_loomio_poll (loomioPollKey)
);

ALTER TABLE forumPosts
  ADD COLUMN activeDecisionId INT DEFAULT NULL;

ALTER TABLE communityAgreements
  ADD COLUMN sourceLoomioPollKey VARCHAR(40) DEFAULT NULL;

ALTER TABLE users
  ADD COLUMN loomioUserId INT DEFAULT NULL,
  ADD UNIQUE KEY users_loomioUserId_unique (loomioUserId);
```

### 5.10 Seed data

On first boot, create one sample consent poll in the Community Agreements subgroup so the UI has something to render. One practice proposal in the default template. Use Loomio's built-in `practice_proposal` and `try_loomio` templates.

---

## 6. UX flow (Path B)

### 6.1 Creating a forum post with a decision attached

The new post form gains an "Attach a decision" section collapsed by default. Expanded, it shows a template picker (Consent round, Majority vote, Sense check, Advice, Preference poll, Time poll), a `closes in` date picker with a 7-day default, and an optional "minimum participation" percentage.

On submit, the main app creates the forum post, then calls `POST /api/v1/polls` on Loomio with the template key and thread metadata. The poll is created in the right subgroup based on the forum category (Community Agreements category → Community Agreements subgroup, and so on). The poll opens immediately. The form inserts a `forumPostDecisions` row with the returned Loomio poll key.

The forum post page now renders the `DecisionCardFromLoomio` above replies.

### 6.2 Responding to a decision

From the forum thread, the user clicks "Respond on Loomio" and lands on the Loomio poll page. SSO is silent. They pick a stance, write an optional reason, save. On return to the forum thread, the card refreshes and shows their stance alongside the group's.

Phase 2 can embed the Loomio response controls inline via an iframe or a web component, so the user never leaves the forum. Phase 1 is a linkout.

### 6.3 Closing and recording an outcome

Loomio closes the poll automatically at `closing_at`. The `poll_expired` webhook fires, the main app updates `forumPostDecisions.status = 'closed'`. The author visits the Loomio poll page and writes an outcome. The `outcome_created` webhook fires, the main app updates `outcomeStatement`. The forum thread now shows the outcome inside the decision card. If the template was `consent` and there were no objections, a "Promote to community agreement" button appears for the author.

### 6.4 Seeing all active decisions

`/community/decisions` lists every row in `forumPostDecisions` where the Loomio poll is still open or closed within the last 30 days. Tabs for open, closing soon, recently closed. Filter by template, category, bioregion, "mine". Each card links into the forum thread.

---

## 7. Phase 2 (optional polish)

- Inline response controls via an iframe of `governance.regencivics.earth/p/:key/embed`, so the user never leaves the forum for the common case.
- Automatic template picking based on forum category. Post in "Community Agreements"? Consent template is selected by default. Post in "Land Project X"? Advice template. Post in "Alliance Partners"? Check template.
- Land project seasonal updates: a quest that automatically posts a forum thread at the start of each season with a consent poll attached, template `consent`, question "Does the community consent to continued support for [land project] this season?", closes in 14 days.
- Alliance partner onboarding: on acceptance, auto-post a thread in the Alliance Partners subgroup with a `check` (sense check) poll, 7-day close.
- Loomio outcome review dates surface as reminders in the user's main-app dashboard.
- Loomio chatbot webhooks to a Discord or Telegram channel for each subgroup.

---

## 8. What to defer

- RCVoice/RGVoice weighted voting.
- Loomio fork. Start with vanilla upstream; fork only if we actually need features they will not merge.
- STV elections.
- Porting Loomio ideas back into the main forum (per-option prompts, versioned stances, outcome review dates). Revisit after one season of use.
- Full Loomio feature parity inside the forum iframe. The forum is the forum, governance is governance. Crosslinks are enough.

---

## 9. Appendix: Path A migration SQL (if we build native instead)

Preserved from rev 1 of the spec for the case where Rye chooses to build native. See rev 1 tag in git history for the full Path A spec. Tables: `decisions`, `decisionStances`, `decisionEvents`, plus nullable columns on `forumPosts` and `communityAgreements`. Three decision types in Phase 1: consent round, preference poll, temperature check. Everything scoped to the forum, no second service. Migration file would be `drizzle/0102_decisions_native.sql`.

---

## 10. Open questions for Rye (answer before implementation session)

1. **Path A, Path B, or Path C?** Section 3 recommends Path B. If you disagree, say so and the spec should be re-scoped.
2. **Hosting target for Loomio.** Railway (same provider as the main app, easier) or a dedicated VPS (cheaper at scale, more work)?
3. **OIDC provider.** Are we comfortable standing up an OIDC endpoint in the main app, or should we use a hosted one like Clerk or Auth0 as the broker?
4. **Subdomain choice.** `governance.regencivics.earth`? `decide.regencivics.earth`? `council.regencivics.earth`?
5. **Subgroup taxonomy.** Does the five-subgroup starter in section 4.4 feel right? Missing any?
6. **Visual theming budget.** How much design time do you want to put into making Loomio look like ReGen Civics versus letting it look like Loomio with our logo?
7. **AGPL comfort level.** Running Loomio as a service is a clean AGPL story. Are you comfortable with that? If not, Path A is the only option.
8. **What to port back later.** If we like Loomio's per-option prompts and outcome review dates, should we copy those ideas into the forum itself in a future sprint, or keep governance strictly on the governance subdomain?

---

## 20 ways to evolve and improve on Loomio

Loomio is excellent. These are twenty places where the ReGen Civics context (sociocratic, movement-scale, regenerative, tied to land and to tokens, playing a long game) opens up improvements that would not make sense for a general-purpose SaaS. Each of these is additive. Most are Phase 2 or Phase 3. They are listed in rough order of how much they would move the needle for our community.

### 1. Tie stance weight to citizenship tier and role

The four-tier citizenship system (visitor → resident → citizen → elder) already exists in the main app. Loomio treats every member equally. For Phase 1 that is fine. For Phase 2, weight stances by tier on governance-critical decisions so that elders and citizens carry more weight than visitors on, say, community agreement ratifications. Role also matters: a land project steward's stance on their own seasonal update should carry extra weight. Do this via a custom Loomio fork feature that reads a `stance_weight` field computed at stance-save time from the user's tier and the poll's category.

### 2. RCVoice and RGVoice as first-class stance modifiers

Section 7.1 of CONTEXT_THE_TWO_GAMES.md says decisions belong to either the Fund track (RCVoice/$RCivics) or the Game track (RGVoice/$ReGen). Extend Loomio's stance weighting so that Fund-category polls weight by RCVoice balance and Game-category polls weight by RGVoice balance. Display both the raw count and the weighted count on the result chart. This is the real governance move; everything else is preamble.

### 3. Bioregional scoping on stance visibility

Some decisions affect a specific bioregion and should be decided by the people in that bioregion. Extend the visibility model beyond "group member" to "member of this bioregion subgroup". Loomio's subgroup model supports this; we just need to expose it in the creation form. A "Decisions in my bioregion" filter becomes a default view.

### 4. Per-option reason prompts that actually teach sociocracy

Loomio's `poll_options.prompt` field is underused. For consent polls, write prompts that coach the voter: "Consent: what condition, if any, would make this safer to try?" "Objection: what would have to change for you to consent?" Voters learn sociocratic thinking while they vote. This is a prompt-engineering pass, not a code change, but it is high-impact.

### 5. Objection triage as a first-class sub-flow

Loomio treats an objection as "the proposal does not pass" and leaves the rest to the facilitator. Sociocratic practice says the real work is integrating the objection into a better proposal. Add an explicit "objection triage" view to any consent poll that has one or more objections: the objector's reason is pinned, the author can draft an amendment inline, and a "Try this amendment?" button sends a notification to everyone who cast a stance, who can then rereview. If all objectors accept the amendment, the poll continues to close. Facilitation tooling, not voting tooling.

### 6. Sense-check to consent round promotion

A common workflow: read the room first, then if it is warm, draft a real proposal. Loomio does not link these. Add a "Promote this sense check to a consent round" action that carries over the question text, the context, and the list of participants. The new poll cites the old one. This is a small feature that rewards good process.

### 7. Decision lineage and citations

Every decision should be able to cite an earlier decision. "This updates our community agreement on X, ratified on 2026-01-12." Loomio has no structured way to express this. Add a `cites_poll_id` column and a UI that shows the chain backward and forward. A decision has a history.

### 8. Scheduled review dates as loops, not one-shots

Loomio's `outcome.review_on` field triggers a one-time reminder event. Extend it to a recurring review schedule: every season, every 13 moons, every solstice. At the scheduled time, the original proposer (or a delegate) is prompted to either reaffirm the outcome, open a new decision to update it, or mark it retired. This builds the "decisions are alive, not archived" culture that a regenerative community needs.

### 9. Consent by proxy for people who are offline

Not everyone is on the web. A land steward in the field, an elder who does not use screens. Proxies let someone else cast a stance on their behalf, with a visible proxy attribution: "Ana cast on behalf of Fidel." This is delegated voting, done narrowly and visibly. Guard against vote-buying with a proxy cap (a person can hold at most N proxies) and a public proxy ledger.

### 10. Emotional temperature check alongside every decision

Before anyone clicks consent, they rate their felt sense on a three-point scale (constricted, neutral, expansive). The aggregate is shown in a small graphic at the top of the results. This is an invitation to slow down and notice. Based on the work of Miki Kashtan and Nonviolent Communication practitioners. This is the one improvement that is most distinctively ReGen Civics.

### 11. Storytelling outcomes

Loomio's outcome field is a plain-text statement. Replace it with a small structured form: what we decided, why we decided it, who spoke, what we are watching for as we try it. Voiceover / audio outcomes are allowed (the Riverside integration is already wired). The outcome becomes a story, not a decree. New decisions can surface "three stories that led to this."

### 12. Living agreements that auto-update from their source decisions

Right now, section 5.6 of this spec promotes a ratified consent poll into a `communityAgreements` row. It is a snapshot. Go further: if the original decision is later amended through a new consent poll, the agreement updates automatically, with a visible diff. The agreement and its lineage stay linked forever.

### 13. Land project accountability loops as a fixed cadence

Every active land project gets an auto-generated consent poll at the start of each season: "Does the community consent to continued support for [project] this season?" The template pre-fills from the project's latest steward update. If no update exists, the poll stays in draft and the steward gets a nudge. This turns accountability from a thing people have to remember into a thing the system offers.

### 14. Alliance acceptance as a two-stage decision

Phase 1 treats alliance acceptance as a simple check. Make it two stages: first a sense check ("Does this partnership feel aligned?") from the whole community, then a consent round among elders and stewards ("Can we live with partnering with them?"). Each stage feeds into the next. This mirrors how small committed communities actually decide on new partners.

### 15. Gratitude-weighted reputation on deliberation quality

The main app already has a gratitude system. Add a signal to it: when someone writes a reason on a stance that changes another voter's mind (tracked by stance version history), they get a gratitude point tagged "helped me think." Over time, the people whose reasons actually move the conversation rise in visibility. We reward good deliberators, which broadens whose voices carry weight.

### 16. AI-assisted synthesis, opt-in per decision

At close, offer the author a one-click "synthesize the stances and reasons into a draft outcome statement" action. The author reviews, edits, publishes. The AI never publishes directly. Frame it as a scribe, not an oracle. This saves an hour per decision and produces better outcomes than a tired author at midnight.

### 17. Translation that is actually good

Loomio has i18n keys for many languages but relies on community translation. Wire modern machine translation (the main app already speaks to an LLM) so every decision title, details field, and outcome statement gets an optional translation button. Stances too. A Spanish-speaking steward can weigh in on an English-language proposal and be understood, and vice versa. Regenerative movement is multilingual by definition.

### 18. Public vs private deliberation modes

Some decisions need to be debated openly. Some need to be decided quietly and announced later. Add a `deliberation_mode` on each poll: `open_now_open_later` (default, transparent throughout), `closed_now_open_later` (stances and reasons hidden until close, then fully public), `closed_now_aggregated_later` (only the aggregate result is ever published, individual stances permanently private, for topics where public record of a vote would chill participation). Map clearly onto Loomio's existing `anonymous` and `hide_results` flags where possible.

### 19. Governance load dashboard

Every group has a limit to how many decisions it can make well at once. Add a "governance load" dashboard to each subgroup that shows: how many open decisions, median close window, median participation rate, how many decisions are overdue for an outcome write-up, how many are waiting on objection resolution. When load is high, the system recommends closing or deferring some. This is the kind of meta-tool that makes regenerative governance sustainable instead of exhausting.

### 20. Outcomes that carry obligations

The deepest one. An outcome statement can include one or more "commitments" (structured: who, what, by when). The main app's task system surfaces those commitments as tasks on the committer's dashboard. When a commitment is marked done, the outcome page gets a small green tick. When it is missed, a follow-up decision can be auto-proposed. Decisions become the seed of action, not the end of conversation.

---

## Credits

This spec is a design document for bringing Loomio to ReGen Civics. Loomio was designed, built, and is stewarded by the Loomio Cooperative in Aotearoa New Zealand. They have been at this work for over a decade and their practice knowledge sits inside every column name and every facilitation template in their codebase. We are grateful to them and, if this path proceeds, will support their work.
