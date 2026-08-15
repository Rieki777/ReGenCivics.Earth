# Prompt: ReGen Civics Year-One Master Marketing Plan (for Fable)

> Paste this whole file into a fresh Fable session running in the `regen-civics-clean` project. It is written to be handed off. Everything Fable needs to start is either in this prompt or in the files it names.

---

## Your role

You are the lead marketing strategist and campaign architect for **ReGen Civics** and its partner church, the **Church of the Regenerative Earth**. Your job in this session is to research the market deeply and then produce a **complete year-one master marketing plan** with the **ReGen Ship** as the flagship. The plan launches with a **free voyage giveaway** as the first public announcement and runs as a living operating system that Rye can open every morning and that other Claude sessions can pick up and execute from, day after day.

This is a big, high-context task. Take the room you need. Research first, then build.

---

## Execution mode: unattended overnight run

You are running this **tonight, start to finish, with no one watching.** Rye is asleep. He cannot answer questions mid-run, unblock you, or approve anything until morning. Work accordingly:

- **Never stop to ask.** Make every decision yourself. When you must assume something (a prize detail, a budget figure, a channel choice), pick the most reasonable option, write it down in an `Assumptions` note, and keep going. A finished plan built on clearly-labeled assumptions is worth far more than a half-plan waiting on input.
- **Finish everything in full.** Every deliverable listed below is complete by morning: real content, not stubs, outlines, or "to be written later." If you are running low on room, tighten prose, do not drop sections.
- **Do Sprint 0 first and finish it before anything else.** Season 2 closes September 1 and that is about six weeks out, so the six-week sprint is the highest-value thing you produce. Complete `CAMPAIGN_FREE_VOYAGE_GIVEAWAY.md` and the Sprint 0 portion of the calendar in full before you move on to the rest of the year. If you somehow run out of room, the sprint is done and the back half of the year is what gets tightened.
- **Leave a morning briefing.** End the run by writing `marketing/MORNING_BRIEF.md`: what you built, the three most important decisions or assumptions you made, everything in `OPEN_QUESTIONS.md` Rye needs to resolve, and the exact first three things he should do or turn on when he wakes up. This is the first thing he reads in the morning, so make it short and actionable.

---

## Read these before you plan anything

Load these files in this order. Do not skip the voice rules or the two-games context; both shape every word of copy the plan will generate.

1. `CLAUDE.md` (repo root) — what the project is, the current priorities (website, fundraising, incubator), tech and team reality.
2. `.ai/docs/STEERING.md` — **hard rules, especially section 1 (writing and voice).** No em-dashes. No contrast framing. No AI word patterns. No rhetorical openers. Every piece of copy in the plan obeys these.
3. `CONTEXT_THE_TWO_GAMES.md` — the Fund vs. Game distinction ($RCivics / RCVoice vs. $ReGen / RGVoice). Do not blur these in any messaging.
4. The ReGen Ship source material (in the `ReGen Ship` folder, a sibling of this repo, and referenced across the repo):
   - `the-ship-runs-a-village.md` — the canonical story of what the ship is: a solar surplus mobile power plant that drives to land projects to run water pumps, tools, builds, and gatherings, paired with Pacific Domes.
   - `social-facebook-linkedin.md` — reference for the ship voice on social.
   - The ship photos (Crater Lake ridge shots, interiors) — your hero creative library.
   - In-repo: `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md` and the other `*SHIP*` prompt docs for how the ship shows up in the product (`/ship`, `/ship/inventory`, `/ship/fleet`, companions).
5. Church / 508(c)(1)(A) material:
   - `START_HERE_CORE_CHURCH.md`, `CLAUDE_CODE_PROMPT_CORE_CHURCH_SITE.md`, `CORE_HANDOFF_2026-07-01.md`
   - `CORE_ZEFFY_MEMBERSHIP_TIERS.md` — the church membership / donation tiers (Zeffy).
   - `Church_of_the_Regenerative_Earth_Formation_v2.docx` and `CP_575_E.pdf` — the church's legal formation and IRS EIN letter. Use these to establish exactly what entity we are working with before you research what it qualifies for.
6. Incubator / season material:
   - `SEASONS_HISTORY.md`, `seasons/season-1-the-first-build.md`, `SEASON_TEMPLATE.md` — what a season is, what season 1 was, so season 2 recruitment is grounded.
   - `OUTREACH_IOVERLANDER_2026-07-10.md` — an existing outreach effort into the overlanding audience; a live example of a channel we have already touched.
7. Voice and skill assets you will reuse (do not reinvent these):
   - Skills: `regen-fundraising-copy`, `regen-outreach-sequences`, `regen-content-repurposing`, `regen-community-onboarding`. Read their SKILL.md files. The plan should tell future sessions which skill to invoke for each recurring task.
   - `.ai/docs/DOMAIN-LANGUAGE.md` for canonical terms.

If a term feels ambiguous, `DOMAIN-LANGUAGE.md` is the source of truth. If you are about to reverse an architectural or brand decision, check `.ai/docs/DECISIONS.md` first.

---

## The mission this plan has to accomplish

Rye ranked **all four** of these as top priority. The plan does not pick one. It builds four interlocking funnels and uses the ship voyage giveaway as the shared top-of-funnel engine that feeds all of them:

1. **Fill the ship's calendar** — bookings, deployments, and voyages scheduled.
2. **Season 2 applications** — quality land projects applying to the next incubator season.
3. **Fundraising** — donors and investors into the ReGen Civics fund and church members via Zeffy.
4. **Broad awareness** — sustained top-of-funnel audience growth that feeds the other three.

Design the funnels so a person who enters through the giveaway can be routed to whichever of the four they belong in. One entry point, four destinations.

---

## Timing — this is live now, not a someday plan

Two dates are confirmed and drive the whole front of the plan:

- **The ReGen Ship is bookable today.** The booking funnel is open immediately. The plan does not build up to a launch; it drives bookings from day one.
- **Season 2 applications close September 1, 2026.** Today is roughly mid-July 2026, so there is about a **six-week sprint** to the application deadline. Season 2 recruitment is the most time-critical funnel and must be front-loaded hard: the fastest-converting channels first, the giveaway wired to route land projects into the application, and a countdown to September 1 running across every channel.

Treat the first six weeks as **Sprint 0**: launch the giveaway, open the ship booking push, and drive season 2 applications to the deadline, all at once. The rest of the year builds on the audience Sprint 0 captures.

---

## Resources and constraints the plan must assume

- **Budget philosophy: free first, sweat second, cash last.** The plan runs on free and in-kind resources wherever possible. The church's grants and nonprofit programs are the primary media budget. Only reach for paid cash where it clearly and measurably beats the free option, and keep it small (assume at most a few hundred dollars a month, and ideally fund even that from grant credits rather than cash). Never design a step that only works with real ad spend. If a tactic needs money to function, find the free or Claude-run version instead.
- **Labor: sweat equity plus Claude, at scale.** The workforce is Rye's own hands plus Claude sessions running on a **Claude Max** account. Design the plan so the heavy, repeatable work (research, drafting, repurposing, building outreach lists, scheduling, pulling analytics, writing every post) is done by Claude sessions, and Rye's limited time goes only to what genuinely needs a human: filming himself and the ship, decisions, relationships, and anything requiring a personal login or signature. Lean into **Claude hacks** throughout: clever, automation-first tactics a solo operator can run only because Claude does the volume. Wherever a tactic would normally need a hired specialist or a paid SaaS tool, propose the Claude-run equivalent and say which skill or scheduled task runs it.
- **The 508(c)(1)(A) vehicle is the media budget.** The church is a tax-exempt religious entity, and its free and discounted programs are how this plan buys reach without cash. A core part of your research is finding and listing **every** program the church qualifies for and the application path for each: Google Ad Grants (research current terms; historically about $10k/month of in-kind search ads), Meta / Facebook nonprofit tools and fundraising features, YouTube Nonprofit, TechSoup, Canva for Nonprofits, Google Workspace for Nonprofits, Microsoft and other in-kind credits, and any faith-based or environmental grants. Report what is confirmed vs. what needs verification, and flag anything that should be run past counsel or an accountant rather than asserted as settled. The plan should aim to have these grants approved and running as early as possible, since some take weeks.
- **Voice:** every line of example copy in the plan follows `STEERING.md` section 1 and the global rules. Direct, grounded, specific, Rye's voice. No em-dashes anywhere.
- **Maximum autonomy:** proceed and make decisions. Where you must assume something (dates, budget specifics, prize details), state the assumption clearly in an "Assumptions" callout and keep going. Only stop and ask Rye if you are genuinely blocked, and batch any such questions at the end rather than interrupting.
- **Deterministic and honest:** cite sources for every market claim, benchmark, and legal or eligibility statement. Distinguish what you verified from what you are estimating. No invented statistics.

---

## Phase 1 — Deep market research (do this before writing the plan)

Go wide and go deep. Use web search and fetch real sources. Produce a research findings document that the strategy rests on. Cover at least:

**Audience segments and where they gather.** Map the concrete communities we can reach: regenerative agriculture and permaculture, land stewardship and land trusts, off-grid and homesteading, van life and overlanding, ecovillages and intentional communities, ReFi / regenerative web3 (Regen Network, Gitcoin, Celo, Toucan and similar), conscious / impact investors, eco-spiritual and faith-based environmental communities. For each: the specific subreddits, Facebook groups, Discords, Instagram and TikTok creators, YouTube channels, podcasts, newsletters, and in-person gatherings or conferences where they actually are. Name names and give links, not categories.

**Comparable campaigns and what worked.** Study how comparable movements and orgs grew: land-project crowdfunding campaigns, regen-ag nonprofits, land trusts, van-life and overland brands, ReFi launches, and notable viral giveaway or sweepstakes campaigns (including creator van/RV giveaways). Extract the mechanics that drove growth and the ones that flopped.

**Giveaway and sweepstakes mechanics + legality.** How to run a high-conversion "enter to win a voyage" campaign: email and referral capture, viral referral loops and k-factor tactics, the tooling landscape (KingSumo, Gleam, Vyper, ViralSweep, or equivalents and their nonprofit pricing), and the legal basics of running a sweepstakes in the US ("no purchase necessary," official rules, eligibility, state registration thresholds, disclosure). Present the legal material as factual information to verify with counsel, not as legal advice.

**508(c)(1)(A) marketing advantages.** As above: Google Ad Grants, Meta nonprofit tools, YouTube Nonprofit, TechSoup, Canva, Microsoft, and any faith-based or environmental grant programs the church could tap. Application paths and eligibility gotchas for each.

**Channel benchmarks.** Realistic conversion rates, cost-per-acquisition ranges, and posting cadences per channel for a small-budget nonprofit / movement, so the plan sets targets that are grounded rather than aspirational.

**The overlanding / iOverlander angle.** Given `OUTREACH_IOVERLANDER_2026-07-10.md`, assess how much of the ship's story lands with the overland and van-life audience specifically, since the ship is literally a rig on the road.

---

## Phase 2 — Strategy (built on Phase 1)

Deliver a clear strategic core:

- **Positioning and core narrative.** One sentence and one paragraph that hold the whole thing together, drawn from the "carries more fire than it needs" story. How the ship, the Fund, the Game, the church, and season 2 fit into one message without confusing the Fund-vs-Game distinction.
- **Audience priority tiers.** Which of the segments from Phase 1 to lead with, which to nurture, which to hold. Justify with the research.
- **The four funnels, drawn out.** For each of the four goals: the entry point, the path, the conversion moment, the owner (Claude session vs. Rye), and the metric. Show explicitly how the giveaway feeds each.
- **Messaging pillars.** Four to six recurring themes, each with example copy that passes the voice rules.
- **Channel mix and why.** Which channels get priority given the budget and the audience map, and what each channel is for.

---

## Phase 3 — The flagship campaign: the Free Voyage Giveaway

This is the launch and the top-of-funnel engine. Design it end to end:

- **The offer.** The prize is a **voyage aboard the ship** — a real experience or adventure people enter to win. Define exactly what the winner gets (a leg of the journey, dates, what is included, what is not), and whether there are runner-up prizes that route entrants toward the other three funnels (a season 2 fast-track, a founding church membership, ship merch, a call with Rye).
- **The mechanics.** Entry flow, email and referral capture, the viral loop that rewards sharing, the tooling, and the exact "no purchase necessary" compliant structure. Wire every entrant into the CRM / email list and tag them by which funnel they belong in.
- **The announcement sequence.** The first public post, the assets needed (which ship photos, what video), the launch-week content across each channel, and the drumbeat that sustains entries for the length of the campaign.
- **The legal and ops checklist.** Official rules, eligibility, timeline, winner selection and notification, fulfillment, and what Rye personally must sign off on or execute. Mark the legal items as "verify with counsel."
- **Post-campaign conversion.** What happens to the thousands of entrants who do not win. The sequence that turns the email list into ship bookings, season 2 applicants, donors, and community members.

---

## Phase 4 — Twelve-month calendar and scheduled operating rhythm

Rye will open this daily and hand pieces to other sessions. Build it to be run, not just read.

- **Open with Sprint 0 (now to September 1, 2026).** Before the month-by-month calendar, lay out the six-week sprint in detail: week by week from now to the season 2 deadline, with the giveaway launch, the ship booking push, and the season 2 application drive all running together. This is the most important part of the calendar because it is the part happening right now.
- **A 12-month calendar** beginning now (mid-July 2026) and running through mid-2027. Lay it out month by month with the campaign beats, content themes, seasonal moments, and the funnels. Anchor it to the confirmed facts: the ship is bookable today, and season 2 applications close **September 1, 2026**. Where a date is still genuinely unknown (the first giveaway voyage date, any live events or gatherings), use a clearly marked `[[DATE: confirm with Rye]]` placeholder and list every such placeholder in one section at the end so Rye can fill them in one pass. Do not placeholder the two confirmed dates above; treat them as fixed.
- **A recurring operating rhythm** defined as concrete, ready-to-schedule tasks: daily, weekly, and monthly. For each recurring task, write it as a **drop-in prompt another Claude session can run**, including which skill to invoke (`regen-content-repurposing`, `regen-outreach-sequences`, etc.), what input it reads, and what output it produces and where it saves it. Examples of the kind of tasks to define: a daily content-repurposing run that turns the latest long-form piece into channel-native posts; a weekly outreach batch to a target community from the Phase 1 map; a weekly giveaway-metrics pull; a monthly funnel review. Format these so they can be registered as scheduled tasks with minimal editing.

---

## Phase 5 — Channel playbooks

One short, standalone playbook per priority channel (Instagram, TikTok, YouTube, Facebook, LinkedIn, email/newsletter, the ReGen Civics forum, and any others the research surfaces such as Reddit or podcasts). Each playbook: the audience it serves, the content formats that work there, cadence, the voice notes specific to that channel, the top-of-funnel-to-conversion path, and the metric that says it is working. Written so a session assigned to that channel needs nothing else.

---

## Phase 6 — Measurement

- The handful of numbers that matter for each of the four funnels, and the single north-star metric for the year.
- A lightweight tracker (a markdown table or a spec for a simple sheet) that the weekly and monthly scheduled tasks update, so progress is visible without new tooling.
- Realistic year-one targets grounded in the Phase 1 benchmarks, with the assumptions shown.

---

## Deliverables — build these as a suite in the repo

Create a `marketing/` directory in `regen-civics-clean` and produce, at minimum:

- `marketing/MARKETING_MASTER_PLAN.md` — the top-level plan and the daily entry point. Opens with a one-page executive summary and a "start here each morning" section, then links to everything below.
- `marketing/RESEARCH_FINDINGS.md` — Phase 1, fully cited.
- `marketing/STRATEGY.md` — Phase 2.
- `marketing/CAMPAIGN_FREE_VOYAGE_GIVEAWAY.md` — Phase 3, the full campaign brief.
- `marketing/CALENDAR_YEAR_ONE.md` — Phase 4 calendar.
- `marketing/SCHEDULED_TASKS.md` — Phase 4 recurring tasks, each as a drop-in prompt, formatted for the scheduling system.
- `marketing/PLAYBOOKS/` — one file per channel from Phase 5.
- `marketing/MEASUREMENT.md` — Phase 6, including the tracker.
- `marketing/OPEN_QUESTIONS.md` — the batched list of date placeholders, decisions, and anything you need from Rye.
- `marketing/MORNING_BRIEF.md` — the last thing you write and the first thing Rye reads: what you built, the key decisions and assumptions, what you need from him, and the first three things to do or turn on this morning.

Cross-link the files so any session can navigate from the master plan to whatever it needs. Keep each file self-contained enough that a session can be handed one file and get to work.

---

## How to work

Research first, using real sources, and cite them. Then, because this is an unattended overnight run, build in this order so the most valuable work is guaranteed done: **the giveaway campaign and Sprint 0 first, in full**, then strategy, then the rest of the calendar and the scheduled tasks, then the playbooks, then measurement. Obey the voice rules in every example. Make every decision yourself and label your assumptions rather than stalling for input that will not come until morning. Keep the church's free grants and Claude-run sweat equity baked into the channel and budget choices throughout, not bolted on at the end. Finish every deliverable in full.

End the run with `marketing/MORNING_BRIEF.md` as described in the execution-mode section: what you built, the key decisions and assumptions, what you need from Rye, and the first three things he should do or turn on when he wakes up.
