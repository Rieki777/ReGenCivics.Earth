# Execution Prompt: Team Page Roles Overhaul

## Context
The Team page at `/team` needs a full redesign of the roles section. The current 8 generic org-chart roles are being replaced with 13 game-like sociocratic roles that reflect what the project actually needs. Each role gets a character illustration, an expandable portal card (similar to quest cards), and detailed powers/rights/responsibilities.

Two new sections are also being added: Seasonal Rhythm (explaining the 4 seasons of the Infinite Game) and How to Apply (the pitch and voting process).

**File:** `client/src/pages/Team.tsx`

**Design reference:** Quest cards in `client/src/pages/Quest.tsx` and `client/src/components/HeroQuestCard.tsx`. Use similar hover effects, shimmer animations, and dark-theme card patterns.

**Design guideline (site-wide):** All visual emphasis should feel warm and inviting, never alarming. Use green and gold tones for highlights, badges, and glows. No red pulses, no "urgent" or "alarm" energy anywhere. Even high-need roles get a "golden ticket" glow, not a warning siren. The whole site should feel like an invitation, not a dashboard with alerts.

---

## Part A: Replace the `openRoles` data array

Replace the entire `openRoles` array (lines 135-200) with this new `gameRoles` array. Each role has sociocratic fields: purpose, circle, powers, rights, responsibilities, domains, tokenAward, season (which seasons this role is most active), assignment status, emoji for the character, and a characterImage path.

```typescript
const gameRoles = [
  {
    title: "Season Facilitator",
    emoji: "🌿",
    characterName: "The Gardener",
    tagline: "Keeps the seasons turning",
    characterImage: "/images/roles/season-facilitator-card.webp",
    sceneImage: "/images/roles/season-facilitator-scene.webp",
    purpose: "Walk beside the 13 land projects through each incubation season, holding the rhythm of weekly sessions and making sure resources flow where they're needed.",
    circle: "Incubation Circle",
    powers: [
      "Set the incubation session schedule",
      "Approve resource requests under $500",
      "Invite guest mentors to sessions",
      "Pause a project's timeline if they need breathing room"
    ],
    rights: [
      "Access to all project dashboards and progress data",
      "Direct line to alliance partners for project support",
      "First look at incoming land project applications"
    ],
    responsibilities: [
      "Facilitate weekly incubation sessions",
      "Track project milestones and flag blockers",
      "Write season wrap-up reports",
      "Onboard incoming projects at season start"
    ],
    domains: "Season incubation process, project support protocols, session design",
    tokenAward: "1,200 $ReGen per season + completion bonuses based on project outcomes",
    seasons: ["spring"],
    assignment: "Filled, seeking 1-2 co-facilitators",
    color: "#7dd87d"
  },
  {
    title: "Alliance Weaver",
    emoji: "🕸️",
    characterName: "The Weaver",
    tagline: "Connects what wants to be connected",
    characterImage: "/images/roles/alliance-weaver-card.webp",
    sceneImage: "/images/roles/alliance-weaver-scene.webp",
    purpose: "Build and tend the web of relationships with investors, partner organizations, and land project referral networks that keep the ecosystem alive.",
    circle: "Alliance Circle",
    powers: [
      "Initiate partnership conversations on behalf of ReGen Civics",
      "Draft alliance agreements for community review",
      "Represent the project at conferences and events",
      "Recommend alliance tier classifications"
    ],
    rights: [
      "Access to investor pipeline and CRM data",
      "Use of ReGen Civics brand assets for outreach",
      "Budget allocation for relationship-building activities"
    ],
    responsibilities: [
      "Maintain active contact with 10+ alliance partners per season",
      "Report on partnership health monthly",
      "Coordinate investor communications with Treasury Steward",
      "Facilitate alliance partner onboarding"
    ],
    domains: "Alliance partnerships, investor relations, conference representation",
    tokenAward: "1,000 $ReGen per season + commission on partnerships that convert to fund contributions",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: "#d4a574"
  },
  {
    title: "Incubator Guide",
    emoji: "🗺️",
    characterName: "The Guide",
    tagline: "Walks beside new roots",
    characterImage: "/images/roles/incubator-guide-card.webp",
    sceneImage: "/images/roles/incubator-guide-scene.webp",
    purpose: "Walk land projects through the application, the season, and the milestones. You're the person they call when they're stuck or lost.",
    circle: "Projects Circle",
    powers: [
      "Approve land project applications for community review",
      "Assign mentors from the alliance network",
      "Adjust project milestones based on ground conditions",
      "Escalate issues to the Season Facilitator"
    ],
    rights: [
      "Direct access to all land project contacts and data",
      "Authority to schedule emergency support sessions",
      "Input on project evaluation criteria"
    ],
    responsibilities: [
      "Guide 3-4 land projects per season",
      "Check in with each project weekly",
      "Document project progress and lessons learned",
      "Connect projects with relevant tools from the Tools Library"
    ],
    domains: "Project intake, milestone tracking, mentor matching, project support",
    tokenAward: "800 $ReGen per season per project guided",
    seasons: ["spring", "summer"],
    assignment: "Open, 2 positions",
    color: "#4a9f4a"
  },
  {
    title: "Forum Gardener",
    emoji: "🌱",
    characterName: "The Tender",
    tagline: "Grows conversations into community",
    characterImage: "/images/roles/forum-gardener-card.webp",
    sceneImage: "/images/roles/forum-gardener-scene.webp",
    purpose: "Tend the community forum like a garden. Seed discussions, welcome newcomers, pull weeds, and make sure the tone stays rooted and real.",
    circle: "Community Circle",
    powers: [
      "Pin and unpin forum threads",
      "Move posts between categories",
      "Issue gentle moderation actions (warnings, thread locks)",
      "Feature community posts on the homepage"
    ],
    rights: [
      "Access to moderation tools and flagged content queue",
      "Ability to create forum categories and tags",
      "Input on community guidelines updates"
    ],
    responsibilities: [
      "Post 2-3 seed discussions per week",
      "Respond to new member introductions within 24 hours",
      "Review flagged content daily",
      "Write monthly community health reports"
    ],
    domains: "Forum moderation, community tone, new member welcome, seed content",
    tokenAward: "600 $ReGen per season + bonuses for community growth metrics",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open",
    color: "#7dd87d"
  },
  {
    title: "Game Designer",
    emoji: "🎲",
    characterName: "The Architect",
    tagline: "Designs the rules we play by",
    characterImage: "/images/roles/game-designer-card.webp",
    sceneImage: "/images/roles/game-designer-scene.webp",
    purpose: "Design and evolve the game mechanics, contribution scoring, citizenship tiers, seasonal events, and quest progression that make the Infinite Game playable and meaningful.",
    circle: "Anchor Circle",
    powers: [
      "Propose changes to game variables and scoring formulas",
      "Design new quest types and progression chains",
      "Draft seasonal event structures",
      "Recommend citizenship tier adjustments"
    ],
    rights: [
      "Access to all game data, player analytics, and scoring systems",
      "Authority to run game experiments with community consent",
      "Seat on the seasonal council for game-related decisions"
    ],
    responsibilities: [
      "Maintain the game spec (REGEN_GAMES_SPEC_V1.md)",
      "Balance contribution scoring each season",
      "Design 2+ new quests per season",
      "Document all game mechanic changes and reasoning"
    ],
    domains: "Game mechanics, contribution scoring, quest design, citizenship tiers, seasonal events",
    tokenAward: "1,000 $ReGen per season + design bonuses for adopted mechanics",
    seasons: ["winter", "spring"],
    assignment: "Partially filled, support needed",
    color: "#fbbf24"
  },
  {
    title: "Treasury Steward",
    emoji: "⚖️",
    characterName: "The Keeper",
    tagline: "Balances seeds and coins",
    characterImage: "/images/roles/treasury-steward-card.webp",
    sceneImage: "/images/roles/treasury-steward-scene.webp",
    purpose: "Keep the community's resources flowing transparently. Track funds, process payments, and report on treasury health so everyone can see where the money goes.",
    circle: "Finance Circle",
    powers: [
      "Process approved payments up to $1,000",
      "Generate financial reports",
      "Flag suspicious transactions for community review",
      "Recommend budget allocations for seasonal planning"
    ],
    rights: [
      "Full access to treasury accounts and transaction history",
      "Authority to request supporting documentation for expenses",
      "Seat on seasonal budget planning sessions"
    ],
    responsibilities: [
      "Process payments within 48 hours of approval",
      "Publish monthly treasury reports",
      "Track all fund inflows and outflows",
      "Coordinate with Alliance Weaver on investor fund allocations"
    ],
    domains: "Treasury operations, financial reporting, payment processing, budget tracking",
    tokenAward: "800 $ReGen per season",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, seeking support",
    color: "#4a9f4a"
  },
  {
    title: "Storyteller",
    emoji: "📖",
    characterName: "The Storyteller",
    tagline: "Turns what happened into what matters",
    characterImage: "/images/roles/storyteller-card.webp",
    sceneImage: "/images/roles/storyteller-scene.webp",
    purpose: "Write the story of the regenerative renaissance as it happens. Blog posts, social media, newsletters, and the narrative thread that ties everything together.",
    circle: "Communications Circle",
    powers: [
      "Publish to the ReGen Civics blog and social channels",
      "Approve content submissions from contributors",
      "Set the editorial calendar",
      "Commission content from community writers"
    ],
    rights: [
      "Access to all content skills and brand assets",
      "Authority to represent ReGen Civics voice publicly",
      "Input on all public-facing copy"
    ],
    responsibilities: [
      "Publish 2+ blog posts per month",
      "Maintain social media presence (3+ posts per week)",
      "Write or edit the monthly newsletter",
      "Run content through the avoid-ai-writing skill before publishing"
    ],
    domains: "Blog, social media, newsletter, brand voice, public narrative",
    tokenAward: "800 $ReGen per season + bonuses for content that drives signups",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: "#d4a574"
  },
  {
    title: "Grand Builder",
    emoji: "🔨",
    characterName: "The Tinkerer",
    tagline: "Builds the world one tool at a time",
    characterImage: "/images/roles/grand-builder-card.webp",
    sceneImage: "/images/roles/grand-builder-scene.webp",
    purpose: "Maintain the codebase, review community PRs, and keep the technical systems running. The person who makes sure the tools work.",
    circle: "Tech Circle",
    powers: [
      "Merge or reject pull requests",
      "Set technical architecture decisions",
      "Approve database migrations",
      "Grant contributor access to the repo"
    ],
    rights: [
      "Admin access to GitHub repo and hosting infrastructure",
      "Authority to set code standards and review criteria",
      "Budget allocation for infrastructure costs"
    ],
    responsibilities: [
      "Review all community PRs weekly",
      "Maintain CI/CD pipeline and deployment process",
      "Write execution prompts for major features",
      "Mentor new code contributors"
    ],
    domains: "Codebase architecture, PR review, deployment, technical documentation",
    tokenAward: "1,200 $ReGen per season",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, builders needed",
    color: "#7dd87d"
  },
  {
    title: "Security Reviewer",
    emoji: "🛡️",
    characterName: "The Ranger",
    tagline: "Keeps our digital commons safe",
    characterImage: "/images/roles/security-reviewer-card.webp",
    sceneImage: "/images/roles/security-reviewer-scene.webp",
    purpose: "Review every community PR for vulnerabilities before it merges. Maintain security scanning workflows and help the project build secure development habits.",
    circle: "Tech Circle",
    powers: [
      "Block any PR on security grounds",
      "Require security-related code changes before merge",
      "Run security audits on any part of the codebase",
      "Recommend security tool adoption"
    ],
    rights: [
      "Access to all security scanning tools and results",
      "Authority to set security review requirements",
      "Input on infrastructure security decisions"
    ],
    responsibilities: [
      "Review all PRs for security vulnerabilities weekly",
      "Maintain and improve security scanning workflows",
      "Document security practices and known risks",
      "Run quarterly security audits"
    ],
    domains: "Security review, vulnerability scanning, secure development practices",
    tokenAward: "1,000 $ReGen per season",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Golden opportunity",
    color: "#fbbf24"
  },
  {
    title: "Tool Curator",
    emoji: "🧰",
    characterName: "The Librarian",
    tagline: "Organizes what the builders make",
    characterImage: "/images/roles/tool-curator-card.webp",
    sceneImage: "/images/roles/tool-curator-scene.webp",
    purpose: "Manage the Tools Library. Review submissions, write clear descriptions, keep categories organized, and connect the right tools to the right land projects.",
    circle: "Community Circle",
    powers: [
      "Approve or reject tool submissions",
      "Edit tool descriptions and categories",
      "Feature tools on the homepage and in quests",
      "Recommend tools to specific land projects"
    ],
    rights: [
      "Admin access to the Tools Library",
      "Authority to create and modify tool categories",
      "Input on tool-related quest design"
    ],
    responsibilities: [
      "Review tool submissions within 72 hours",
      "Write or improve 5+ tool descriptions per month",
      "Connect tools to relevant quests and seasons",
      "Track tool usage metrics and report quarterly"
    ],
    domains: "Tools Library curation, tool submissions, tool-quest integration",
    tokenAward: "600 $ReGen per season + bonuses for library growth",
    seasons: ["winter", "spring"],
    assignment: "Open",
    color: "#fbbf24"
  },
  {
    title: "Quest Steward",
    emoji: "✍️",
    characterName: "The Cartographer",
    tagline: "Maps the paths players walk",
    characterImage: "/images/roles/quest-steward-card.webp",
    sceneImage: "/images/roles/quest-steward-scene.webp",
    purpose: "Design quests from start to finish: the card content, forum post, seed comments, progression placement, and the real-world action each quest asks players to take.",
    circle: "Community Circle",
    powers: [
      "Draft new quests for community review",
      "Set quest difficulty and reward amounts",
      "Write seed comments that model good responses",
      "Recommend quest ordering in the progression chain"
    ],
    rights: [
      "Access to the quest builder skill and templates",
      "Authority to propose quest progression changes",
      "Input on seasonal quest themes"
    ],
    responsibilities: [
      "Design 3+ new quests per season",
      "Write forum seed posts for each quest",
      "Track quest completion rates and adjust difficulty",
      "Collaborate with Game Designer on progression balance"
    ],
    domains: "Quest design, forum seed content, progression chain, quest rewards",
    tokenAward: "400 $ReGen per quest accepted + seasonal base of 400 $ReGen",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: "#7dd87d"
  },
  {
    title: "Outreach Writer",
    emoji: "✉️",
    characterName: "The Herald",
    tagline: "Carries the signal outward",
    characterImage: "/images/roles/outreach-writer-card.webp",
    sceneImage: "/images/roles/outreach-writer-scene.webp",
    purpose: "Write the emails, messages, and campaigns that bring land projects, investors, and allies into the ecosystem. Each season needs fresh copy for fresh audiences.",
    circle: "Communications Circle",
    powers: [
      "Draft outreach sequences for community review",
      "A/B test subject lines and messaging",
      "Recommend audience segmentation",
      "Commission testimonials from land projects"
    ],
    rights: [
      "Access to outreach skills and email tools",
      "Authority to send approved campaigns",
      "Input on audience targeting and messaging strategy"
    ],
    responsibilities: [
      "Write 2+ outreach sequences per season",
      "Maintain email templates and adapt for each campaign",
      "Track open rates and conversion metrics",
      "Collaborate with Alliance Weaver on investor messaging"
    ],
    domains: "Email campaigns, outreach sequences, audience messaging, campaign metrics",
    tokenAward: "600 $ReGen per season + bonuses for conversion results",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: "#d4a574"
  },
  {
    title: "Skills Builder",
    emoji: "⚡",
    characterName: "The Alchemist",
    tagline: "Turns code into community tools",
    characterImage: "/images/roles/skills-builder-card.webp",
    sceneImage: "/images/roles/skills-builder-scene.webp",
    purpose: "Create and maintain the Claude skills that power the whole contributor ecosystem. The quality of the skills determines the quality of everyone's output. You can also build tools independently on your own Claude account and earn revenue when those tools help the community.",
    circle: "Tech Circle",
    powers: [
      "Create new skills and submit to the repo",
      "Modify existing skills based on contributor feedback",
      "Set skill documentation standards",
      "Recommend skill adoption for specific workflows"
    ],
    rights: [
      "Access to the skill-creator skill and testing framework",
      "Authority to set skill quality standards",
      "Input on which skills get prioritized"
    ],
    responsibilities: [
      "Build 2+ new skills per season",
      "Maintain and improve existing skills based on usage feedback",
      "Document skill usage patterns and best practices",
      "Test skills across different Claude interfaces"
    ],
    domains: "Skill creation, skill testing, skill documentation, contributor tooling",
    tokenAward: "800 $ReGen per season + bonuses for skill adoption rates",
    seasons: ["winter"],
    assignment: "Open",
    color: "#fbbf24",
    // Special: this role card gets an extra "Build on Your Own" section in the portal modal
    specialContent: {
      title: "Build Tools, Get Rewarded",
      body: "You can build tools on your own Claude account and submit them independently. If the tools you build end up helping our community, they can earn you revenue for use. Build helpful tools, get rewarded. You choose how to take or distribute the pay. If you apply for and fill the official role, the tools you build become community-owned infrastructure that benefits everyone, just like every other part of this public site. The Game runs for free as a public resource. The core team covers infrastructure and hosting costs. There are no fees on this site unless the community votes to create them.",
      coworkLink: "https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps",
      coworkCta: "Get a free week of Claude Cowork to start building tools today.",
      prompt: "Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. I want to build a new Claude skill for ReGen Civics. Show me the existing skills, the skill-creator skill documentation, and help me design a new skill that fills a gap. Follow the project's writing rules and conventions."
    }
  }
];
```

---

## Part B: Seasonal Rhythm data

Add this array after `gameRoles`:

```typescript
const seasons = [
  {
    name: "Winter",
    emoji: "❄️",
    months: "Dec - Feb",
    theme: "Building & Preparing",
    description: "We build the tools, write the code, upgrade our systems and processes. This is the season of deep work: architecture, game design, skill creation, infrastructure. The builders and designers are in their element.",
    activeRoles: ["Grand Builder", "Security Reviewer", "Game Designer", "Skills Builder", "Tool Curator", "Quest Steward"],
    color: "#93c5fd",
    current: true
  },
  {
    name: "Spring",
    emoji: "🌸",
    months: "Mar - May",
    theme: "Incubation & Growth",
    description: "The incubator opens. Land projects apply, get matched with guides, and begin their journey. The community is buzzing with new energy, new faces, new ideas. Outreach is at full volume.",
    activeRoles: ["Season Facilitator", "Incubator Guide", "Alliance Weaver", "Outreach Writer", "Forum Gardener", "Storyteller"],
    color: "#7dd87d",
    current: false
  },
  {
    name: "Summer",
    emoji: "☀️",
    months: "Jun - Aug",
    theme: "Festivals & Village Building",
    description: "We go on the ground. Village building festivals, in-person gatherings, land project visits, community celebrations. The digital work meets the physical world. This is where the theory becomes soil under your feet.",
    activeRoles: ["Season Facilitator", "Alliance Weaver", "Storyteller", "Incubator Guide"],
    color: "#fbbf24",
    current: false
  },
  {
    name: "Fall",
    emoji: "🍂",
    months: "Sep - Nov",
    theme: "Rest & Reflection",
    description: "We step out of our Infinite Game roles and focus on family, in-person village life, personal projects. The community rests. The treasury and forum roles keep a gentle rhythm, but the pace slows intentionally. We compost what we learned.",
    activeRoles: ["Treasury Steward", "Forum Gardener"],
    color: "#d4a574",
    current: false
  }
];
```

---

## Part C: Build the new RolePortalCard component

Replace the existing simple role cards (lines 579-622) with a new `RolePortalCard` component. This card should:

1. **Front state (card in the grid):**
   - Rounded-2xl with the quest-card-green shimmer class
   - Card portrait image (`characterImage`) at top (140px height, object-cover, with gradient overlay fading to card background at bottom)
   - Role emoji overlaid on the character image (bottom-left, 36px, with dark bg circle)
   - `characterName` as the primary display name in display font, white (e.g., "The Gardener")
   - `title` as a smaller subtitle below in green, small uppercase (e.g., "SEASON FACILITATOR")
   - `tagline` in white/60, small italic text
   - Bottom bar with: season badges (small colored dots for each active season) and a token award badge
   - Assignment status badge (top-right): "Open" in green, "Golden Opportunity" in gold with subtle glow, "Partial" in amber, "Filled" in muted green
   - Hover: lift (-translate-y-2), brighter border, shimmer speeds up

2. **Expanded state (modal/portal):**
   When clicked, open a full modal (similar to existing RoleModal but much richer):
   - Scene image banner (`sceneImage`) at top (200px, with gradient fade). Falls back to `characterImage` if sceneImage not available.
   - `characterName` large + `title` as subtitle + emoji + circle
   - 4 sections with green uppercase headers:
     - **Powers** (what you can do): bulleted list with ⚡ icons
     - **Rights** (what you get access to): bulleted list with 🔑 icons
     - **Responsibilities** (what you commit to): bulleted list with ✅ icons
     - **Domains of Creation** (what you own): paragraph text
   - Token award section with $ReGen badge
   - Active seasons shown as a horizontal bar with colored segments
   - "Apply for This Role" button that links to `/connect?path=role&role=...`
   - "Pitch for This Role" button that scrolls to the pitch section
   - **Special:** If the role has `specialContent`, render an additional section after Domains:
     - A highlighted box (bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-xl p-5)
     - Title from specialContent.title in golden text
     - Body text from specialContent.body in white/70
     - If specialContent.coworkLink exists: render a CTA link with specialContent.coworkCta text, styled as an inline link in golden text, opening in new tab
     - A code block with the copy-paste Claude prompt from specialContent.prompt
     - A small copy button to copy the prompt to clipboard

**Card grid:** Use `lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2` for the role cards. On mobile, show as a horizontal scroll carousel (reuse the QuestCarousel snap-scroll pattern).

---

## Part D: Replace the "Open Roles" section heading and intro

Replace the current heading (lines 568-577) with:

```tsx
<div className="text-center mb-12">
  <div className="inline-flex items-center gap-2 bg-[#fbbf24]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#fbbf24]/30">
    <span className="text-lg">🎮</span>
    <span className="text-[#fbbf24] font-medium text-sm uppercase tracking-wide">Choose Your Role</span>
  </div>
  <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
    Roles of the <span className="text-[#7dd87d]">Infinite Game</span>
  </h2>
  <p className="text-lg text-white/70 max-w-3xl mx-auto">
    Every role is a way to play. Each one has specific powers, rights, responsibilities, and token rewards. Roles belong to the Game, filled by players each season through community vote. The Game runs for free as a public resource. The core team covers infrastructure and hosting. There are no fees unless the community votes to create them. Click any role to enter its portal.
  </p>
</div>
```

---

## Part E: Add Seasonal Rhythm section

After the roles grid and before the "Ready to Join" CTA, add a new section:

```tsx
{/* Seasonal Rhythm */}
<section className="py-20 px-4 bg-[#0d2818]">
  <div className="container mx-auto max-w-5xl">
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        The Seasonal <span className="text-[#7dd87d]">Rhythm</span>
      </h2>
      <p className="text-lg text-white/70 max-w-3xl mx-auto">
        The Infinite Game moves in seasons. Each season has different roles and needs. As players, we choose which seasons are right for us, when it's right for us.
      </p>
    </div>

    {/* Season cards - horizontal on desktop, stacked on mobile */}
    <div className="grid md:grid-cols-4 gap-4 mb-12">
      {seasons.map((season) => (
        <div
          key={season.name}
          className={`rounded-2xl p-6 border ${season.current ? 'ring-2 ring-offset-2 ring-offset-[#0d2818]' : ''}`}
          style={{
            borderColor: season.color + '40',
            background: `linear-gradient(135deg, ${season.color}15 0%, ${season.color}05 100%)`,
            ...(season.current ? { ringColor: season.color } : {})
          }}
        >
          <div className="text-3xl mb-3">{season.emoji}</div>
          <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            {season.name}
          </h3>
          <p className="text-xs uppercase tracking-wide mb-3" style={{ color: season.color }}>
            {season.months} · {season.theme}
          </p>
          <p className="text-white/60 text-sm mb-4">{season.description}</p>
          <div className="flex flex-wrap gap-1">
            {season.activeRoles.map((role) => (
              <span key={role} className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                {role}
              </span>
            ))}
          </div>
          {season.current && (
            <div className="mt-3 text-xs font-bold uppercase tracking-wide" style={{ color: season.color }}>
              ← Current Season
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Season festival explanation */}
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20 mb-8">
      <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        How Seasons Work
      </h3>
      <div className="space-y-4 text-white/70">
        <p>
          Each season starts with a <span className="text-[#7dd87d] font-semibold">Season Festival</span>: a community gathering where we reflect on the previous season, share updates, run Q&A, co-create ideas for what's next, and collectively align on the shared purpose going forward.
        </p>
        <p>
          From there, we craft the roles the next season needs. Community members submit applications for the roles they want to fill, and all Voice Holders vote on who fills what. This is how we staff the ReGen Game side of things.
        </p>
        <p>
          The Fund side ($RCivics) works differently and is mostly about investor relations and land project valuation. That team stays small. The ReGen Civics Game team ($ReGen) is massive and growing. That's where the future is.
        </p>
      </div>
    </div>

    {/* Lunar cycle rhythm */}
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20">
      <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        The Lunar <span className="text-[#fbbf24]">Rhythm</span>
      </h3>
      <div className="space-y-4 text-white/70">
        <p>
          Within each season, we coordinate on the moon cycle. This is rooted in biology: humans tend to have more outward energy during the full moon and more inward energy during the new moon. We organize the Game around cycles we can literally see happen in the sky.
        </p>
      </div>

      {/* Visual moon cycle bar */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-center">
              <div className="text-2xl mb-1">🌑</div>
              <span className="text-white/50 text-xs">New Moon</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🌓</div>
              <span className="text-white/50 text-xs">Waxing</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🌕</div>
              <span className="text-white/50 text-xs">Full Moon</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🌗</div>
              <span className="text-white/50 text-xs">Waning</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🌑</div>
              <span className="text-white/50 text-xs">New Moon</span>
            </div>
          </div>
          {/* Gradient bar showing energy direction */}
          <div className="h-3 rounded-full bg-gradient-to-r from-[#1a472a] via-[#fbbf24] to-[#1a472a] border border-white/10" />
          <div className="flex justify-between mt-2">
            <span className="text-white/40 text-[10px] uppercase tracking-wide">Inward Creation</span>
            <span className="text-[#fbbf24] text-[10px] uppercase tracking-wide font-semibold">Community Gatherings</span>
            <span className="text-white/40 text-[10px] uppercase tracking-wide">Inward Creation</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌕</span>
            <h4 className="text-white font-semibold text-sm">Full Moon Energy</h4>
          </div>
          <p className="text-white/60 text-sm">Community calls, team meetings, outward-facing work. This is when we connect, share, coordinate, and make decisions together.</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌑</span>
            <h4 className="text-white font-semibold text-sm">New Moon Energy</h4>
          </div>
          <p className="text-white/60 text-sm">Deep individual work. Building the tool, writing the blog, coding the feature, designing the quest, engaging in the forum. The doing of the role.</p>
        </div>
      </div>

      <p className="text-white/50 text-sm mt-4">
        Both energies run throughout the whole cycle. The rhythm fluctuates, not switches. Some weeks you're in meetings. Some weeks you're heads-down building. The moon gives us a shared pulse.
      </p>
    </div>
  </div>
</section>
```

---

## Part F: Add "How to Apply" section

After the Seasonal Rhythm section, before the existing CTA:

```tsx
{/* How to Apply */}
<section className="py-20 px-4">
  <div className="container mx-auto max-w-4xl">
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        How to <span className="text-[#7dd87d]">Apply</span>
      </h2>
      <p className="text-lg text-white/70 max-w-2xl mx-auto">
        You pitch for a role for a season. Here's the process.
      </p>
    </div>

    <div className="space-y-6">
      {/* Step 1: Prepare */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center text-[#7dd87d] font-bold flex-shrink-0">1</div>
        <div>
          <h3 className="font-bold text-white mb-2">Choose a role and prepare your pitch</h3>
          <p className="text-white/60 text-sm">Pick a role from the list above. Read its powers, responsibilities, and seasonal activity. Think about what you'd bring to it this coming season and what specific outcomes you'd commit to delivering.</p>
        </div>
      </div>

      {/* Step 2: Record */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center text-[#7dd87d] font-bold flex-shrink-0">2</div>
        <div>
          <h3 className="font-bold text-white mb-2">Record a 3-minute video introduction</h3>
          <p className="text-white/60 text-sm">Tell us who you are, why this role calls to you, what relevant experience you bring, and what you'd deliver this season. Keep it real. We care about the person behind the pitch, not the polish.</p>
        </div>
      </div>

      {/* Step 3: Submit */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center text-[#7dd87d] font-bold flex-shrink-0">3</div>
        <div>
          <h3 className="font-bold text-white mb-2">Submit your application</h3>
          <p className="text-white/60 text-sm">Applications open at the Season Festival. Submit your video pitch and a written summary through the application form. The team reviews applications monthly during active seasons, and seasonally during quieter ones.</p>
        </div>
      </div>

      {/* Step 4: Vote */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center text-[#7dd87d] font-bold flex-shrink-0">4</div>
        <div>
          <h3 className="font-bold text-white mb-2">Community vote</h3>
          <p className="text-white/60 text-sm">All Voice Holders vote on role assignments. Voting happens on Hypha, where every proposal is transparent and every vote is recorded. The community decides who plays what role.</p>
        </div>
      </div>

      {/* Step 5: Play */}
      <div className="bg-gradient-to-r from-[#7dd87d]/20 via-[#7dd87d]/10 to-[#7dd87d]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#7dd87d] rounded-full flex items-center justify-center text-[#1a472a] font-bold flex-shrink-0">5</div>
        <div>
          <h3 className="font-bold text-white mb-2">Play your role</h3>
          <p className="text-white/60 text-sm">Once approved, you hold the role for the season. Your contributions are tracked, your $ReGen tokens accumulate, and at the end of the season the community evaluates outcomes during the next Season Festival.</p>
        </div>
      </div>
    </div>

    <div className="mt-8 text-center">
      <Link href="/connect?path=role">
        <Button
          size="lg"
          className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] rounded-xl"
          style={{ fontFamily: 'var(--font-accent)' }}
        >
          Apply for a Role <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
    </div>
  </div>
</section>
```

---

## Part G: Character image generation

**See `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` for the full image generation spec.** That prompt handles generating all 26 images (13 card portraits + 13 full scenes) with detailed per-character descriptions and prompt templates.

Run that prompt first (or in parallel) to generate all character art. The images should land in `client/public/images/roles/` as WebP files.

**Fallback (if images are not yet generated):** For each role card, use a gradient background with the role emoji centered at 64px size instead of a character image. The gradient should use the role's `color` field:
```tsx
<div className="h-36 rounded-t-2xl flex items-center justify-center"
  style={{ background: `linear-gradient(135deg, ${role.color}30 0%, ${role.color}10 100%)` }}>
  <span className="text-6xl">{role.emoji}</span>
</div>
```

The component should check if the image file exists and fall back to the gradient+emoji if not.

---

## Part H: CSS additions

Add these to `client/src/index.css` after the existing quest card shimmer animations:

```css
/* Role card shimmer */
.role-card-shimmer {
  position: relative;
  overflow: hidden;
}

.role-card-shimmer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    105deg,
    transparent 20%,
    rgba(125, 216, 125, 0.08) 38%,
    rgba(251, 191, 36, 0.15) 50%,
    rgba(125, 216, 125, 0.08) 62%,
    transparent 80%
  );
  background-size: 300% 100%;
  animation: role-shimmer 20s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes role-shimmer {
  0%   { background-position: -300% 0; }
  100% { background-position: 300% 0; }
}

.role-card-shimmer:hover::before {
  animation-duration: 4s;
}

/* Golden opportunity glow for high-need roles */
.role-golden-opportunity {
  animation: golden-glow 4s ease-in-out infinite;
}

@keyframes golden-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  50% { box-shadow: 0 0 24px 6px rgba(251, 191, 36, 0.15); }
}
```

---

## Part I: Seasons Page - "The Rhythm of the Infinite Game" section

**File:** `client/src/pages/Seasons.tsx`

Insert a NEW major section **BEFORE** the existing "Regenerative Journey" section (which starts around line 617 with the comment `{/* The Regenerative Journey - Seasonal Cycle */}`). This new section explains how the community actually coordinates in time. The existing "Regenerative Journey" section stays as-is because it describes project maturity phases, which is a different concept.

### Section content:

```tsx
{/* The Rhythm of the Infinite Game */}
<section className="py-20 px-4 bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
  <div className="container mx-auto max-w-5xl">
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 bg-[#fbbf24]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#fbbf24]/30">
        <span className="text-lg">🎮</span>
        <span className="text-[#fbbf24] font-medium text-sm uppercase tracking-wide">How We Coordinate</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        The Rhythm of the <span className="text-[#7dd87d]">Infinite Game</span>
      </h2>
      <p className="text-xl text-white/70 max-w-3xl mx-auto">
        We organize the Game around natural cycles. Seasons give us macro rhythm. The moon gives us micro rhythm. Both are patterns we can see in the sky and feel in our bodies. This is how we coordinate without hierarchy.
      </p>
    </div>

    {/* Two Layers intro */}
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20 mb-12">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🌍</span>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Macro: The Four Seasons
            </h3>
          </div>
          <p className="text-white/70">
            Solstice to solstice, equinox to equinox. Each season runs roughly 91 days and has a distinct energy. Roles are filled per season. Harvest distributions, reputation composting, and score recalculations all happen at season boundaries. The Season Festival marks each transition.
          </p>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🌙</span>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Micro: The Lunar Cycle
            </h3>
          </div>
          <p className="text-white/70">
            New moon to new moon, roughly 29.5 days. This is the pulse within each season. Gratitude budgets reset each lunar cycle. Community energy naturally fluctuates: more outward near the full moon, more inward near the new moon. We coordinate our meetings and deep work around this rhythm.
          </p>
        </div>
      </div>
    </div>

    {/* The Four Seasons - detailed */}
    <h3 className="text-2xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
      The Four <span className="text-[#7dd87d]">Seasons</span>
    </h3>

    <div className="grid md:grid-cols-2 gap-6 mb-12">
      {/* Winter */}
      <div className="rounded-2xl p-6 border-2 border-[#93c5fd]/30 bg-gradient-to-br from-[#93c5fd]/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">❄️</span>
          <div>
            <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Winter</h4>
            <p className="text-[#93c5fd] text-xs uppercase tracking-wide">Winter Solstice to Spring Equinox · Dec - Mar</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-[#93c5fd] mb-2">Building & Preparing</p>
        <p className="text-white/70 text-sm mb-4">
          We build the tools, write the code, upgrade our systems and processes. This is the season of deep work: architecture, game design, skill creation, infrastructure. The builders and designers are in their element. We prepare everything the Spring incubator will need.
        </p>
        <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Active roles:</p>
        <div className="flex flex-wrap gap-1">
          {["Grand Builder", "Security Reviewer", "Game Designer", "Skills Builder", "Tool Curator", "Quest Steward"].map(r => (
            <span key={r} className="text-[10px] bg-[#93c5fd]/15 text-[#93c5fd] px-2 py-0.5 rounded-full border border-[#93c5fd]/20">{r}</span>
          ))}
        </div>
        <div className="mt-3">
          <span className="text-xs font-bold text-[#93c5fd] bg-[#93c5fd]/10 px-2 py-1 rounded-full">← Current Season</span>
        </div>
      </div>

      {/* Spring */}
      <div className="rounded-2xl p-6 border-2 border-[#7dd87d]/30 bg-gradient-to-br from-[#7dd87d]/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🌸</span>
          <div>
            <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Spring</h4>
            <p className="text-[#7dd87d] text-xs uppercase tracking-wide">Spring Equinox to Summer Solstice · Mar - Jun</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-[#7dd87d] mb-2">Incubation & Growth</p>
        <p className="text-white/70 text-sm mb-4">
          The incubator opens. Land projects apply, get matched with guides, and begin their 13-week journey. The community is buzzing with new energy, new faces, new ideas. Outreach is at full volume. This is the most outward-facing season.
        </p>
        <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Active roles:</p>
        <div className="flex flex-wrap gap-1">
          {["Season Facilitator", "Incubator Guide", "Alliance Weaver", "Outreach Writer", "Forum Gardener", "Storyteller"].map(r => (
            <span key={r} className="text-[10px] bg-[#7dd87d]/15 text-[#7dd87d] px-2 py-0.5 rounded-full border border-[#7dd87d]/20">{r}</span>
          ))}
        </div>
      </div>

      {/* Summer */}
      <div className="rounded-2xl p-6 border-2 border-[#fbbf24]/30 bg-gradient-to-br from-[#fbbf24]/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">☀️</span>
          <div>
            <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Summer</h4>
            <p className="text-[#fbbf24] text-xs uppercase tracking-wide">Summer Solstice to Fall Equinox · Jun - Sep</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-[#fbbf24] mb-2">Festivals & Village Building</p>
        <p className="text-white/70 text-sm mb-4">
          We go on the ground. Village building festivals, in-person gatherings, land project visits, community celebrations. The digital work meets the physical world. This is where the theory becomes soil under your feet and food on the table.
        </p>
        <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Active roles:</p>
        <div className="flex flex-wrap gap-1">
          {["Season Facilitator", "Alliance Weaver", "Storyteller", "Incubator Guide"].map(r => (
            <span key={r} className="text-[10px] bg-[#fbbf24]/15 text-[#fbbf24] px-2 py-0.5 rounded-full border border-[#fbbf24]/20">{r}</span>
          ))}
        </div>
      </div>

      {/* Fall */}
      <div className="rounded-2xl p-6 border-2 border-[#d4a574]/30 bg-gradient-to-br from-[#d4a574]/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🍂</span>
          <div>
            <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Fall</h4>
            <p className="text-[#d4a574] text-xs uppercase tracking-wide">Fall Equinox to Winter Solstice · Sep - Dec</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-[#d4a574] mb-2">Rest & Reflection</p>
        <p className="text-white/70 text-sm mb-4">
          We step out of our Infinite Game roles and focus on family, in-person village life, personal projects. The community rests. The treasury and forum roles keep a gentle rhythm, but the pace slows intentionally. We compost what we learned and let the soil regenerate.
        </p>
        <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Active roles:</p>
        <div className="flex flex-wrap gap-1">
          {["Treasury Steward", "Forum Gardener"].map(r => (
            <span key={r} className="text-[10px] bg-[#d4a574]/15 text-[#d4a574] px-2 py-0.5 rounded-full border border-[#d4a574]/20">{r}</span>
          ))}
        </div>
      </div>
    </div>

    {/* Season Festival */}
    <div className="bg-gradient-to-r from-[#7dd87d]/15 via-[#fbbf24]/10 to-[#7dd87d]/15 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/30 mb-12">
      <div className="text-center mb-6">
        <span className="text-4xl">🎉</span>
        <h3 className="text-2xl font-bold text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          The Season Festival
        </h3>
        <p className="text-white/50 text-sm mt-1">Sunday following every solstice and equinox · 10:00 AM - 12:00 PM EST</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🔄</span>
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Reflect</h4>
          <p className="text-white/60 text-sm">We look back at the previous season. What worked? What didn't? What did we learn? Each role holder shares their season's story.</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🌱</span>
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Co-Create</h4>
          <p className="text-white/60 text-sm">We craft the roles and priorities for the next season together. Q&A, ideas, shared purpose. The community decides what the next season looks like.</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🗳️</span>
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Choose</h4>
          <p className="text-white/60 text-sm">Community members pitch for roles. All Voice Holders vote on who fills what. Applications open, pitches are heard, the community decides.</p>
        </div>
      </div>
      <div className="mt-6 text-center">
        <p className="text-white/70 text-sm">
          Harvest distributions, reputation composting, and contribution score recalculations all happen at the season boundary. The Festival is the heartbeat of the Infinite Game.
        </p>
      </div>
    </div>

    {/* Lunar Cycle */}
    <h3 className="text-2xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
      The Lunar <span className="text-[#fbbf24]">Pulse</span>
    </h3>

    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#fbbf24]/20 mb-8">
      <p className="text-white/70 mb-6">
        Within each season, we coordinate on the moon cycle. This is rooted in biology: humans tend to have more outward energy during the full moon and more inward energy during the new moon. We organize the Game around cycles we can literally see happen in the sky.
      </p>

      {/* Visual moon phase bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className="text-3xl mb-1">🌑</div>
            <span className="text-white/50 text-xs">New Moon</span>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🌓</div>
            <span className="text-white/50 text-xs">Waxing</span>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🌕</div>
            <span className="text-white/50 text-xs">Full Moon</span>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🌗</div>
            <span className="text-white/50 text-xs">Waning</span>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🌑</div>
            <span className="text-white/50 text-xs">New Moon</span>
          </div>
        </div>
        <div className="h-4 rounded-full bg-gradient-to-r from-[#1a472a] via-[#fbbf24] to-[#1a472a] border border-white/10" />
        <div className="flex justify-between mt-2">
          <span className="text-white/40 text-[10px] uppercase tracking-wide">Deep Individual Work</span>
          <span className="text-[#fbbf24] text-[10px] uppercase tracking-wide font-semibold">Community Gatherings</span>
          <span className="text-white/40 text-[10px] uppercase tracking-wide">Deep Individual Work</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#fbbf24]/5 rounded-xl p-5 border border-[#fbbf24]/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🌕</span>
            <h4 className="text-white font-bold">Full Moon: Outward Energy</h4>
          </div>
          <p className="text-white/60 text-sm mb-3">
            This is when we meet the most and are most outwardly active. Community calls, team meetings, coordination sessions, shared decisions, public-facing work. The time for connecting, sharing, and aligning.
          </p>
          <ul className="space-y-1">
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-[#fbbf24]">·</span> Season Facilitators run incubation sessions
            </li>
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-[#fbbf24]">·</span> Alliance Weavers meet with partners
            </li>
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-[#fbbf24]">·</span> Storytellers publish and share
            </li>
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-[#fbbf24]">·</span> Forum Gardeners host discussions
            </li>
          </ul>
        </div>
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🌑</span>
            <h4 className="text-white font-bold">New Moon: Inward Energy</h4>
          </div>
          <p className="text-white/60 text-sm mb-3">
            This is when we're doing our own creations and inward work. Actually making the tool if you're a builder. Writing the blog. Coding the feature. Designing the quest. Engaging deeply in the forum. The doing of the role at its most focused.
          </p>
          <ul className="space-y-1">
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-white/30">·</span> Lead Builders write code and review PRs
            </li>
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-white/30">·</span> Game Designers draft mechanics
            </li>
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-white/30">·</span> Quest Authors write quest content
            </li>
            <li className="text-white/50 text-xs flex items-center gap-2">
              <span className="text-white/30">·</span> Skills Builders craft new skills
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
        <p className="text-white/50 text-sm text-center">
          Both energies run throughout the whole cycle. The rhythm fluctuates, it doesn't switch. Some weeks you're in meetings. Some weeks you're heads-down building. The moon gives us a shared pulse we can feel and see. Gratitude budgets reset each new moon. It's a clock we all share.
        </p>
      </div>
    </div>

    {/* Game System Timing */}
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20">
      <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        How the Game <span className="text-[#7dd87d]">Follows</span> the Rhythm
      </h3>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-[#7dd87d] text-sm mt-1">●</span>
          <p className="text-white/70 text-sm"><span className="text-white font-semibold">Seasons start on solstices and equinoxes.</span> Roles are filled per season. You pitch at the Season Festival and play your role until the next one.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#fbbf24] text-sm mt-1">●</span>
          <p className="text-white/70 text-sm"><span className="text-white font-semibold">Gratitude budgets reset each lunar cycle</span> (new moon to new moon). You get a fresh allocation of gratitude tokens to send to people whose work you value.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#7dd87d] text-sm mt-1">●</span>
          <p className="text-white/70 text-sm"><span className="text-white font-semibold">Harvest distribution happens at season boundaries.</span> Your $ReGen tokens for the season are calculated and distributed based on your contribution score.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#fbbf24] text-sm mt-1">●</span>
          <p className="text-white/70 text-sm"><span className="text-white font-semibold">Reputation composting happens at season boundaries.</span> Old activity fades. What matters is what you're doing now, this season, in this cycle.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#7dd87d] text-sm mt-1">●</span>
          <p className="text-white/70 text-sm"><span className="text-white font-semibold">The UI speaks in natural time.</span> "This lunar cycle" instead of "this month." "This season" instead of "Q3." We don't use corporate time. We use real time.</p>
        </div>
      </div>
    </div>

    {/* Philosophy note */}
    <div className="mt-8 text-center">
      <p className="text-white/40 text-sm italic max-w-2xl mx-auto">
        We organize our game around biological cycles and ones we can literally see happen in the sky. The seasons change. The moon waxes and wanes. We follow that rhythm because it's honest, it's shared, and it works.
      </p>
    </div>
  </div>
</section>
```

### Add required imports to Seasons.tsx

The section uses lucide icons already imported. No new imports needed. The section is pure TSX with inline data (no new data arrays required, since the role lists are hardcoded strings in the JSX for simplicity).

### Rename the existing "Regenerative Journey" section

Update the existing section heading (around line 621-627) to clarify it's about project phases:

Change:
```tsx
The Regenerative{" "}
<span className="text-[#7dd87d]">Journey</span>
```
To:
```tsx
The Project{" "}
<span className="text-[#7dd87d]">Growth Cycle</span>
```

And change the subtitle from:
```
From potential to abundance: Together through the seasons of regeneration
```
To:
```
Land projects move through these phases at their own pace, from first formation to thriving abundance
```

And update the footnote (around line 714) from:
```
Seasons represent phases of growth, not calendar seasons. *Projects who have completed their own "Winter Season" are invited to apply for the "Spring Season Incubator"
```
To:
```
These phases describe a project's growth, not the community's seasonal rhythm above. Projects who have completed their own "Assessment" phase are invited to apply for the Spring Season Incubator.
```

---

## Verification

1. Run `npx tsc --noEmit` to check for type errors
2. Navigate to `/team` in the browser
3. Verify all 13 role cards render with character images
4. Click each card and verify the portal modal opens with all sections
5. Verify the seasonal rhythm section shows 4 seasons with correct role mappings
6. Verify the "How to Apply" section has all 5 steps
7. Test mobile layout: cards should be in a horizontal scroll carousel
8. Check that the "Security Reviewer" card has the golden opportunity glow animation (warm gold, inviting, no red)
9. Navigate to `/seasons` in the browser
10. Verify the new "Rhythm of the Infinite Game" section appears before the existing project growth cycle
11. Verify the four season cards render with correct colors and role badges
12. Verify the Season Festival section shows three steps (Reflect, Co-Create, Choose)
13. Verify the lunar cycle section shows the gradient bar and both energy cards
14. Verify the "How the Game Follows the Rhythm" section has all 5 bullet points
15. Verify the existing project growth cycle section is renamed and footnote updated
16. Verify no em-dashes in any text
17. Run the avoid-ai-writing skill on all new copy

---

## Writing Rules (apply to ALL text)
- No em-dashes (zero)
- No contrast-framing
- No AI words (delve, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration
- Direct, grounded, Rye's voice
