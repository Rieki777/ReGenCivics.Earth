# Copy Edits: /profile page (Player Profile)

Each section below matches visible UI in order. Edit here and hand back to Claude to push changes into the code.

---

## Page SEO

**Title tag:** Player Profile | ReGen Civics
**Meta description:** Create your player profile and connect your Base blockchain account to track your contributions and tokens.

---

## Hero Section

**Eyebrow pill:** Game Profile
**Heading:**
```
Your Player Profile
```
**Subtext:** Track your contributions, earn tokens, and connect your Base blockchain account to verify your on-chain identity.

---

## Not Logged In State

(shown when visitor is not signed in)

**Heading:** Join the ReGen Civics Game
**Subtext:** Create your player profile to track your contributions, earn tokens, and connect with the regenerative movement.
**Button:** Sign In to Continue →

---

## Create Your Profile (no profile yet)

**Card heading:** Create Your Player Profile
**Card description:** Your profile here and in Hypha is how you earn tokens and track contributions

### Profile Creation Steps

**Progress bar label:** Step [N] of 3

**Step 1 — Who Are You?**

Field labels and helper text:

- Label: Your Name *
- Placeholder: Your player name

- Label: What's your role in this renaissance?
- Helper: e.g. Land steward, investor, builder, artist…
- Placeholder: Land steward, investor, builder, artist…

- Label: What's your soul's mission?
- Helper: The deeper calling that brought you here…
- Placeholder: The deeper calling that brought you here…

- Label: What are you looking to get from this ecosystem?
- Helper: What would make this worth your time and energy?
- Placeholder: What would make this worth your time and energy?

- Label: What would you like to offer the ecosystem?
- Helper: Skills, resources, wisdom, connections…
- Placeholder: Skills, resources, wisdom, connections…
- Footer note: Your gifts and needs will be added to the Gifts + Needs Marketplace, where others in the network can find and connect with you.

- Label: What are you dreaming of building or becoming? (optional)
- Placeholder: A food forest in the highlands, a new kind of school, a way of living that heals rather than harms...

- Label: What bioregion(s) do you call home? (optional)
- Placeholder: Search bioregions…

- Button: Continue →

**Step 2 — Link Base Account (optional)**

- Section title: Link Your Base Blockchain Account
- Badge: Optional
- Body: Connect your Base blockchain account to verify your on-chain identity and track your RVOICE/RGEN tokens.
- Field label: Base Blockchain Account
- Placeholder: e.g., 0xaAaF…354e
- Tooltip heading: Where do I find this?
- Tooltip steps:
  1. Go to app.hypha.earth/en/dho/regen-games/
  2. Look at the top right of the page
  3. Find your account address (e.g., 0xaAaF…354e)
  4. Click the copy icon next to your address
  5. Paste it here!
- External link text: Create a Hypha account →
- Button: Continue →
- Skip link: Skip for now →

**Step 3 — Review & Create**

- Preview label: Your Profile Preview
- Field preview labels (as shown): Role / Soul's Mission / Seeking / Gifts to Offer / Dreaming of / Bioregion / Base Account
- Button (submitting): Creating…
- Button (ready): Looks good, create my profile

**Profile creation success animation:**
- Line 1: Profile created!
- Line 2: Your regenerative journey begins…

---

## Tab Navigation

Tabs (in order):
- Overview
- My Submissions
- Quests
- Contributions
- Settings

---

## Overview Tab

### Profile Card

**Badge labels:**
- Verified Player (green badge)
- Unverified (gray badge)
- Seeking collaborators (amber badge)
- Looking to join (light green badge)

**Bio section field labels (structured):**
- Role
- Soul's Mission
- Seeking
- Gifts to Offer

**Token balance labels:**
- RGVoice Tokens
- ReGen Tokens

**Wallet section:**
- Section heading: Blockchain Connection
- Linked state label: Base Blockchain Account
- Not-linked message: No blockchain account linked
- Button: Link Base Account
- Sync button: Refresh balances / Syncing...
- Stale wallet note: Add your wallet address in Settings to sync balances.

**Total Contribution Value label:** Total Contribution Value

**Badges section heading:** Badges Earned

**Badge definitions (name / description):**
- Season 1 Pioneer — Participated in ReGen Civics Season 1
- Season 2 Player — Active participant in Season 2
- Land Steward — Connected to a land project
- Impact Investor — Committed investment to the alliance
- Builder — Contributed to building the infrastructure
- Connector — Brought new members to the community
- Verified Player — Identity verified on-chain

### Quest Journal

**Heading:** Quest Journal
**Button:** + Log a completion

**Log form placeholders:**
- Quest ID (e.g. quest-0, food-foresting)
- Quest title (optional)
- Artifact URL (optional - photo, video, article)

**Submit button:** Log completion / Logging...

**Empty state:** No quest completions yet. Explore quests →
**Footer note:** Complete quests on the /quest page to add entries here.

---

## My Submissions Tab

**Sections (with icons):**
- Land Project Applications (MapPin)
- Incubator Season Campaigns (Layers)
- Organisation & Land Project Claims (Building2)

**Claim form:**
- Heading: Claim stewardship of an existing project or org
- Toggle buttons: Land Project / Alliance Org
- Select placeholder: Select a land project… / Select an alliance org…
- Search placeholder: Search by project or organisation name...
- Body: Search for a land project or organisation listed on ReGen Civics that you steward or represent. After submission, an admin will verify and approve your claim.
- Submit button: Submit Claim / Submitting...
- Cancel: Cancel
- Empty state: No claims yet. If you steward a listed project or organisation, you can claim it above.

---

## Quests Tab

**Completed quests heading:** Completed Quests

**Empty state (no quests):**
- Text: No quests completed yet.
- Link: Browse quests →

**Completed quests count label:** [N] quest(s) completed

---

## Contributions Tab

**Heading:** Contribution Log
**Subtext:** Record contributions across the 8 forms of capital. Self-reported values can be verified by admins.

### On-Chain Tracking section

**Label:** On-Chain Tracking

**Hypha DAO card:**
- Name: Hypha DAO
- Body: Governance votes, proposals, role assignments, and payouts are recorded here.

**Base Blockchain card:**
- Name: Base Blockchain
- Body: $ReGen and $RCivics transactions, token mints, and verifiable contributions live here.

**Linked prompt:** Hypha account linked: [address]
**Link prompt:** Link your Hypha account to track on-chain contributions

### Token Stats

- Label 1: 💚 $ReGen Balance / Currency
- Label 2: 🗳 RGVoice / Voice Weight

### Calculator Hub

**Heading:** 🧮 Your Calculations

**Card 1:**
- Title: Contribution Calculator
- Body: Estimate your contribution using the 8 forms of capital - save your contributions here
- Link: Open →

**Card 2:**
- Title: Crowd Pooling Tool
- Body: Create your FULL VALUE proposal for a Land Project - save your proposals here
- Link: Open →

**Saved calculations label:** Saved Calculations

### Self-Reported Contributions (collapsible)

**Toggle label:** Self-Reported Contributions
**Collapsed note:** Contributions logged here can be verified by admins. For more quantified contributions, use the calculator above.

**Summary stats:**
- Total Logged Value
- Entries
- Capital types
- Verified

**Add button:** + Log a Contribution

**Log form:**
- Field: Form of Capital *
- Field: What did you contribute? *
- Placeholder: e.g. Designed brand identity for ReGen Civics
- Field: Details (optional)
- Placeholder: More context about this contribution...
- Field: Est. Value USD (optional)
- Field: Project / Org (optional)
- Placeholder: e.g. ReGen Civics
- Field: Evidence link (optional)
- Submit button: Log Contribution / Logging…
- Cancel: Cancel

**Empty contributions state:**
- Text: No contributions logged yet.
- Sub-text: Use the button above to record your first contribution.

**Capital type labels (form picker):**
- Financial
- Material
- Living
- Social
- Intellectual
- Experiential
- Spiritual
- Cultural

---

## Settings Tab

### Edit Profile

**Heading:** Edit Profile

### Digest Preferences

(rendered by DigestPreferences component)

### Collaboration Settings

**Heading:** Collaboration

**Collaboration status options:**
- Not set
- Seeking collaborators
- Looking to join

**Field:** What are you dreaming of creating or becoming?
**Placeholder:** A food forest in the highlands, a new form of school, a way of living that heals rather than harms...

**Field:** What bioregion(s) do you call home? (may select multiple)
**Placeholder:** Add a bioregion…

**Field:** Location

**Save button:** Save / Saving...

### Gifts + Needs Panel

**Heading:** Gifts + Needs
**Subtext:** Share what you offer and what you are looking for. Shown in the community marketplace.
**View marketplace link:** View marketplace

**Offering section label:** Offering
**Add button:** + Add gift
**Gift form placeholder:** Describe what you can offer...

**Looking for section label:** Looking for
**Add button:** + Add need
**Need form placeholder:** Describe what you are looking for...

**Gift/Need type options:** Skill / Resource / Time / Knowledge / Land / Capital

### Steward Dashboard

**Heading:** Steward Dashboard
**Subtext:** Claim stewardship of a land project or alliance org
**Button:** + Claim Org

**Claim form subheading:** Claim stewardship of an existing project or org

**Land project form placeholders:**
- Your role (e.g. co-founder, steward, project lead)

### Stay in the Loop (newsletter)

**Heading:** Stay in the Loop
**Body:** Get the ReGen Civics digest: news, quests, and community updates in your inbox.

---

## How the Game Works Section (below profile)

**Heading:** How the **Game** Works

**Card 1:**
- Title: 1. Create Profile
- Body: Sign up and create your player profile to join the ReGen Civics game

**Card 2:**
- Title: 2. Link Base Account
- Body: Connect your Hypha/Base account to verify your identity and track tokens

**Card 3:**
- Title: 3. Earn Tokens
- Body: Complete quests, contribute to projects, and earn tokens for your contributions

**Card 4:**
- Title: 4. Co-Create
- Body: Be part of designing the financial and economic systems of our present and future

---

## Error Boundary Fallback

**Message:** Something went quiet here. Try refreshing.
