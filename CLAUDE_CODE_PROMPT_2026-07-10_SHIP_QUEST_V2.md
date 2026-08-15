# CLAUDE CODE PROMPT: Quest v2, Points Threshold + Nominations + Crew Profiles (2026-07-10)

**Status:** Ready to build. Changes the quest entry system from "complete all 7" to a points threshold, lets approved nominations into the draw, and adds sponsorable crew profiles.
**Supersedes:** the all-7-actions completion rule in prior ship docs. Update every page and copy touchpoint.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_SHIP_QUEST_V2.md at the repo root and execute it: the points-threshold entry system with weighted drawings, nomination entries, crew profiles with sponsorship, and the full copy sweep across quest, rules, and ship pages. Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

## Defaults chosen (Rye can veto any; flag them in the report)

| Setting | Default | Why |
|---|---|---|
| Entry threshold X | **150 points** | Reachable without the 100-pt shortlisted-referral action (250 pts exist outside it), still real effort: at least 3 to 4 actions |
| Drawing weight | **Your points are your raffle tickets** | Legible in one sentence; the realistic spread (150 to 350) keeps the edge near 2x, a gentle tilt not a runaway |
| Nominated entrants | Enter at **150 tickets** | Same footing as a threshold entrant |
| Maiden voyage | First member to reach 150 verified points (7-day pacing rule stays) | Continuity with "first to finish" |
| Sponsorship goal | **$2,100 per crew** (the full voyage ask), partial contributions allowed | One number, matches the published voyage total |

---

## 1. Points threshold entry

- Entry rule: **anyone with at least 150 verified points is in every future drawing.** No action is mandatory; the shortlisted-project referral (100 pts) becomes the big accelerator instead of a gate
- Win odds: drawings select weighted-random by points (auditable: log eligible set, weights, seed in `ship_giveaway_drawings`)
- Copy sweep: checklist header becomes "Seven ways to earn your voyage" with "reach 150 points and you're in every draw; every point above raises your odds"; update "How the free voyages work" ("Complete the quest" language becomes "Reach 150 points"), `/ship/quest/rules` (entry, weighting, nominations, ties), the `/ship` quest blurb, the FreeVoyageLadder component, and the published article's quest paragraph
- The leaderboard shows points with a threshold line at 150 ("aboard the draw") and the maiden-voyage race until first crossing
- Previous-winner exclusion default stands

## 2. Nominations enter the draw

- Approved nominations are added to the drawing **without completing the quest.** Approval is a joint review by the ReGen Civics and CORE teams (admin: nomination status gains `approved_for_draw`; approval creates a draw entry at 150 tickets)
- Copy on `/ship/nominate` and the rules: "If you're nominated and approved by the ReGen Civics and CORE teams, you're in the draw, no quest required"
- Nominees without accounts: on approval, send an invite email; the entry activates when they create their profile (they must be reachable to win)

## 3. Crew profiles and sponsorship

- **On entering the draw** (threshold reached or nomination approved), prompt a quick **Crew Profile**: display name, photo, short bio, what you intend to do on your voyage, optional video URL (who you are and what you'll bring to the Renaissance). Skippable; editable later from the profile
- **The Crews section** on `/ship/quest` shows published crew profiles as cards (replaces the current empty "Everyone who completes the quest is in the draw" band; the empty state invites: "Reach 150 points and your crew card sails here")
- **Sponsor button on every crew card:** anyone can pay toward that crew's voyage so they can book their week. Goal $2,100 with a progress bar; partial contributions allowed; flows through the churchDonations infrastructure with program tag `regen_ship_gift` and a `crewProfileId` ref so Transparency segments it. When the goal is met, admin books the crew's week (church covers the platform booking like winner voyages, `isGifted`)
- Schema: `ship_crew_profiles` (id, userId nullable, nominationId nullable, displayName, photoUrl, bio, intent, videoUrl, isPublic, sponsorGoalCents default 210000, sponsoredCents, status enum(draft, published, sponsored, sailed), createdAt, updatedAt); donation rows reference it. Videos are URLs (YouTube/Loom), no upload pipeline
- Emails: entered-the-draw + profile invite, sponsorship received (to crew), goal reached (to crew + Rye)
- The video is the pitch: profile form copy encourages a 60-second "who we are and what we intend to do" to attract sponsors

## 4. Tests

Threshold entry (149 no, 150 yes), weighted draw math + audit log, nomination approval creates an entry, sponsorship accumulation + goal flip, profile publish gating (no draw entry = no public card), copy greps: no leftover "complete all 7" or "complete the quest to enter" strings.

## Handoff Breakdown

### YOU (Rye)
| # | Task | Why |
|---|------|-----|
| 1 | Veto or bless the five defaults above (especially X=150 and points-as-tickets) | Owner calls |
| 2 | Add drawing weighting + nomination entries + crew sponsorship to the counsel review packet (contest rules change) | Legal judgment |

### CLAUDE CODE
Everything in Sections 1 through 4, autonomously, through a green deploy.
