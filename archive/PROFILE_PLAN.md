# Player Profile & Onboarding — Planning Document

## The Problem We're Solving

Right now a new user logs in with Google and lands on the homepage. Nothing changes — no welcome, no guidance, no identity. The platform has four distinct paths (Investor, Land Project, Alliance Partner, Player) but new users are never asked which one applies to them. The result is a generic experience that under-serves everyone.

## Proposed Approach: Path-Aware Onboarding

Rather than a generic "complete your profile" wizard, we tie onboarding directly to the four existing paths. Onboarding is lightweight, optional after the first step, and immediately useful.

---

## Step 1: First-Login Path Selection (Required, 30 seconds)

Immediately after first login, before reaching the homepage, show a full-screen interstitial:

> **"Which best describes you?"**
> - Investor — I want to fund regenerative land projects
> - Land Project — I have land and want to build a regenerative community
> - Alliance Partner — I'm an organization that supports regenerative projects
> - Player — I want to do Quests and participate in co-creating the Infinite Game

User picks one. That's it. They continue to the site.

**What this unlocks:**
- The homepage "Who Are You?" section highlights their path
- The navigation subtly prioritizes their relevant sections
- The ReGen Guide chatbot opens with a path-specific welcome message
- Email notifications default to their relevant content
- A check list of steps for each persona to complete to advance on their path. Steps could earn tokens for users progressing through each step, turned into a engaging game-like experience
/
---

## Step 2: Soft Profile Completion (Optional, on user's own time)

After onboarding, a dismissible prompt appears in their profile page:

> "Complete your profile to connect with the community"

Fields vary by path:

| Field | Investor | Land Project | Ally | Player |
|-------|----------|--------------|------|--------|
| Display name | ✓ | ✓ | ✓ | ✓ |
| Bio / About | ✓ | ✓ | ✓ | ✓ |
| Location | ✓ | ✓ | ✓ | ✓ |
| Investment range | ✓ | — | — | — |
| Project name + URL | — | ✓ | — | — |
| Organization name | — | — | ✓ | — |
| Quest interests | — | — | — | ✓ |
| Avatar / Photo | ✓ | ✓ | ✓ | ✓ |

No completion bar, no gamification pressure. Just a clean form they can fill when they're ready.

---

## Step 3: Public Profile Page (Already partially exists)

The `/profile` and `/community/u/:username` pages already exist. We extend them to display path-specific info:
- Investor: "Interested in regenerative land investment" and to add what types of projects they're interested in funding, create some criteria 
- Land Project: links to their project
- Ally: organization name and description
- Player: quest badges, contribution score, leaderboard position

---

## What We Are NOT Doing

- No "completion percentage" gamification bar (it creates anxiety, not engagement)
- No feature-gating behind profile completion (walls create abandonment)
- No mandatory fields beyond path selection
- No multi-step wizard with progress steps (too much friction)

---

## Database Changes Needed

The `userProfiles` table already exists. We need to add:
- `path` column: `enum('investor', 'land_project', 'ally', 'player') nullable`
- `onboardingComplete` boolean: tracks whether the path-selection screen was shown
- `investmentRange` string (nullable)
- `projectName` + `projectUrl` (nullable)
- `organizationName` (nullable)

---

## Components to Build

1. **`PathSelectionScreen`** — Full-page interstitial shown once after first login. Stores selection in DB and marks `onboardingComplete = true`.
2. **`ProfileEditForm`** — Path-aware form on `/profile/edit`. Shows relevant fields based on `user.path`.
3. Update **`ReGenGuide`** — Pass `user.path` in system prompt context so Claude greets them relevantly.
4. Update **`Home.tsx`** — Show the matching path card highlighted when the user is logged in with a known path.

---

## Ready to build?

Say "build the profile onboarding" and I'll implement all four components + DB migration + route wiring.
