/**
 * Game Roles and Seasons data for the Team page.
 * 13 sociocratic roles of the Infinite Game + 4 seasonal rhythms.
 */

export interface GameRole {
  title: string;
  characterName: string;
  tagline: string;
  emoji: string;
  characterImage: string;
  sceneImage: string;
  purpose: string;
  circle: string;
  powers: string[];
  rights: string[];
  responsibilities: string[];
  domains: string;
  band: number;
  tokenAward: string;
  maxTokenAward: string;
  hoursPerWeek: number;
  deliverables: string[];
  seed: string;
  harvest: string;
  seasons: string[];
  assignment: string;
  color: string;
  cardImagePosition?: string;
  /**
   * Which side of the bridge this role serves.
   *  - "game" (default): coordinates the Infinite Game; compensated in $ReGen.
   *  - "fund": coordinates the ReGen Civics Fund; compensated in $RCivics.
   */
  kind?: "game" | "fund";
  specialContent?: {
    title: string;
    body: string;
    prompt: string;
  };
}

export interface Season {
  name: string;
  emoji: string;
  months: string;
  theme: string;
  description: string;
  activeRoles: string[];
  color: string;
  current: boolean;
}

export const gameRoles: GameRole[] = [
  {
    title: "Season Facilitator",
    characterName: "The Gardener",
    tagline: "Keeps the seasons turning",
    emoji: "\u{1F33F}",
    characterImage: "/images/roles/season-facilitator-card.webp",
    sceneImage: "/images/roles/season-facilitator-scene.webp",
    purpose:
      "Walk beside the 13 land projects through each incubation season, holding the rhythm of weekly sessions and making sure resources flow where they're needed.",
    circle: "Incubation Circle",
    powers: [
      "Set the incubation session schedule",
      "Approve resource requests under $500",
      "Invite guest mentors to sessions",
      "Pause a project's timeline if they need breathing room",
    ],
    rights: [
      "Access to all project dashboards and progress data",
      "Direct line to alliance partners for project support",
      "First look at incoming land project applications",
    ],
    responsibilities: [
      "Facilitate weekly incubation sessions",
      "Track project milestones and flag blockers",
      "Write season wrap-up reports",
      "Onboard incoming projects at season start",
    ],
    domains:
      "Season incubation process, project support protocols, session design",
    band: 5,
    tokenAward: "700,000 $ReGen ($7,000)",
    maxTokenAward: "910,000 $ReGen ($9,100)",
    hoursPerWeek: 12,
    deliverables: [
      "Facilitate weekly incubation sessions",
      "Track project milestones and flag blockers",
      "Write season wrap-up report",
      "Onboard incoming projects at season start",
    ],
    seed: "All scheduled sessions held on time through the season",
    harvest: "Land projects report feeling supported (Season Festival survey, target: 4+/5 average)",
    seasons: ["spring"],
    assignment: "Filled, seeking 1-2 co-facilitators",
    color: "#7dd87d",
  },
  {
    title: "Alliance Weaver",
    characterName: "The Weaver",
    tagline: "Connects what wants to be connected",
    emoji: "\u{1F578}\uFE0F",
    characterImage: "/images/roles/alliance-weaver-card.webp",
    cardImagePosition: "center top",
    sceneImage: "/images/roles/alliance-weaver-scene.webp",
    purpose:
      "Build and tend the web of relationships with investors, partner organizations, and land project referral networks that keep the ecosystem alive.",
    circle: "Alliance Circle",
    powers: [
      "Initiate partnership conversations on behalf of ReGen Civics",
      "Draft alliance agreements for community review",
      "Represent the project at conferences and events",
      "Recommend alliance tier classifications",
    ],
    rights: [
      "Access to investor pipeline and CRM data",
      "Use of ReGen Civics brand assets for outreach",
      "Budget allocation for relationship-building activities",
    ],
    responsibilities: [
      "Maintain active contact with 10+ alliance partners per season",
      "Report on partnership health monthly",
      "Coordinate investor communications with Treasury Steward",
      "Facilitate alliance partner onboarding",
    ],
    domains:
      "Alliance partnerships, investor relations, conference representation",
    band: 4,
    tokenAward: "600,000 $ReGen ($6,000)",
    maxTokenAward: "780,000 $ReGen ($7,800)",
    hoursPerWeek: 10,
    deliverables: [
      "Maintain active contact with 10+ alliance partners per season",
      "Report on partnership health monthly",
      "Coordinate investor communications with Treasury Steward",
      "Facilitate alliance partner onboarding",
    ],
    seed: "New partnership conversations opened (target: 3+ per season)",
    harvest: "At least one partnership that resulted in tangible support for a land project",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: "#d4a574",
  },
  {
    title: "Incubator Guide",
    characterName: "The Guide",
    tagline: "Walks beside new roots",
    emoji: "\u{1F5FA}\uFE0F",
    characterImage: "/images/roles/incubator-guide-card.webp",
    sceneImage: "/images/roles/incubator-guide-scene.webp",
    purpose:
      "Walk land projects through the application, the season, and the milestones. You're the person they call when they're stuck or lost.",
    circle: "Projects Circle",
    powers: [
      "Approve land project applications for community review",
      "Assign mentors from the alliance network",
      "Adjust project milestones based on ground conditions",
      "Escalate issues to the Season Facilitator",
    ],
    rights: [
      "Direct access to all land project contacts and data",
      "Authority to schedule emergency support sessions",
      "Input on project evaluation criteria",
    ],
    responsibilities: [
      "Guide 3-4 land projects per season",
      "Check in with each project weekly",
      "Document project progress and lessons learned",
      "Connect projects with relevant tools from the Tools Library",
    ],
    domains:
      "Project intake, milestone tracking, mentor matching, project support",
    band: 3,
    tokenAward: "500,000 $ReGen ($5,000)",
    maxTokenAward: "650,000 $ReGen ($6,500)",
    hoursPerWeek: 10,
    deliverables: [
      "Guide 3-4 land projects per season",
      "Check in with each project weekly",
      "Document project progress and lessons learned",
      "Connect projects with relevant tools from the Tools Library",
    ],
    seed: "Weekly check-ins with every guided project completed through the season",
    harvest: "Guided projects hitting their own self-set milestones (target: 70%+ on track)",
    seasons: ["spring", "summer"],
    assignment: "Open, 2 positions",
    color: "#4a9f4a",
  },
  {
    title: "Forum Gardener",
    characterName: "The Tender",
    tagline: "Grows conversations into community",
    emoji: "\u{1F331}",
    characterImage: "/images/roles/forum-gardener-card.webp",
    sceneImage: "/images/roles/forum-gardener-scene.webp",
    purpose:
      "Tend the community forum like a garden. Seed discussions, welcome newcomers, pull weeds, and make sure the tone stays rooted and real.",
    circle: "Community Circle",
    powers: [
      "Pin and unpin forum threads",
      "Move posts between categories",
      "Issue gentle moderation actions (warnings, thread locks)",
      "Feature community posts on the homepage",
    ],
    rights: [
      "Access to moderation tools and flagged content queue",
      "Ability to create forum categories and tags",
      "Input on community guidelines updates",
    ],
    responsibilities: [
      "Post 2-3 seed discussions per week",
      "Respond to new member introductions within 24 hours",
      "Review flagged content daily",
      "Write monthly community health reports",
    ],
    domains:
      "Forum moderation, community tone, new member welcome, seed content",
    band: 1,
    tokenAward: "300,000 $ReGen ($3,000)",
    maxTokenAward: "390,000 $ReGen ($3,900)",
    hoursPerWeek: 6,
    deliverables: [
      "Post 2-3 seed discussions per week",
      "Respond to new member introductions within 24 hours",
      "Review flagged content daily",
      "Write monthly community health report",
    ],
    seed: "Seed discussions posted each week throughout the season",
    harvest: "New members who came back and posted more than once (community retention)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open",
    color: "#7dd87d",
  },
  {
    title: "Game Designer",
    characterName: "The Architect",
    tagline: "Designs the rules we play by",
    emoji: "\u{1F3B2}",
    characterImage: "/images/roles/game-designer-card.webp",
    cardImagePosition: "center top",
    sceneImage: "/images/roles/game-designer-scene.webp",
    purpose:
      "Design and evolve the game mechanics, contribution scoring, citizenship tiers, seasonal events, and quest progression that make the Infinite Game playable and meaningful.",
    circle: "Anchor Circle",
    powers: [
      "Propose changes to game variables and scoring formulas",
      "Design new quest types and progression chains",
      "Draft seasonal event structures",
      "Recommend citizenship tier adjustments",
    ],
    rights: [
      "Access to all game data, player analytics, and scoring systems",
      "Authority to run game experiments with community consent",
      "Seat on the seasonal council for game-related decisions",
    ],
    responsibilities: [
      "Maintain the game spec (REGEN_GAMES_SPEC_V1.md)",
      "Balance contribution scoring each season",
      "Design 2+ new quests per season",
      "Document all game mechanic changes and reasoning",
    ],
    domains:
      "Game mechanics, contribution scoring, quest design, citizenship tiers, seasonal events",
    band: 6,
    tokenAward: "800,000 $ReGen ($8,000)",
    maxTokenAward: "1,040,000 $ReGen ($10,400)",
    hoursPerWeek: 12,
    deliverables: [
      "Maintain the game spec",
      "Balance contribution scoring each season",
      "Design 2+ new quests per season",
      "Document all game mechanic changes and reasoning",
    ],
    seed: "New quests or mechanics designed and live on the site (target: 2+)",
    harvest: "Players completing those quests (measured by quest completion count)",
    seasons: ["winter", "spring"],
    assignment: "Partially filled, support needed",
    color: "#fbbf24",
  },
  {
    title: "Treasury Steward",
    characterName: "The Keeper",
    tagline: "Balances seeds and coins",
    emoji: "\u2696\uFE0F",
    characterImage: "/images/roles/treasury-steward-card.webp",
    sceneImage: "/images/roles/treasury-steward-scene.webp",
    purpose:
      "Keep the community's resources flowing transparently. Track funds, process payments, and report on treasury health so everyone can see where the money goes.",
    circle: "Finance Circle",
    powers: [
      "Process approved payments up to $1,000",
      "Generate financial reports",
      "Flag suspicious transactions for community review",
      "Recommend budget allocations for seasonal planning",
    ],
    rights: [
      "Full access to treasury accounts and transaction history",
      "Authority to request supporting documentation for expenses",
      "Seat on seasonal budget planning sessions",
    ],
    responsibilities: [
      "Process payments within 48 hours of approval",
      "Publish monthly treasury reports",
      "Track all fund inflows and outflows",
      "Coordinate with Alliance Weaver on investor fund allocations",
    ],
    domains:
      "Treasury operations, financial reporting, payment processing, budget tracking",
    band: 4,
    tokenAward: "600,000 $ReGen ($6,000)",
    maxTokenAward: "780,000 $ReGen ($7,800)",
    hoursPerWeek: 8,
    deliverables: [
      "Process payments within 48 hours of approval",
      "Publish monthly treasury reports",
      "Track all fund inflows and outflows",
      "Coordinate with Alliance Weaver on investor fund allocations",
    ],
    seed: "Monthly reports published on time and visible to the community",
    harvest: "Community reports zero confusion about where money went (Season Festival survey, target: 4+/5)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, seeking support",
    color: "#4a9f4a",
  },
  {
    title: "Storyteller",
    characterName: "The Storyteller",
    tagline: "Turns what happened into what matters",
    emoji: "\u{1F4D6}",
    characterImage: "/images/roles/storyteller-card.webp",
    sceneImage: "/images/roles/storyteller-scene.webp",
    purpose:
      "Write the story of the regenerative renaissance as it happens. Blog posts, social media, newsletters, and the narrative thread that ties everything together.",
    circle: "Communications Circle",
    powers: [
      "Publish to the ReGen Civics blog and social channels",
      "Approve content submissions from contributors",
      "Set the editorial calendar",
      "Commission content from community writers",
    ],
    rights: [
      "Access to all content skills and brand assets",
      "Authority to represent ReGen Civics voice publicly",
      "Input on all public-facing copy",
    ],
    responsibilities: [
      "Publish 2+ blog posts per month",
      "Maintain social media presence (3+ posts per week)",
      "Write or edit the monthly newsletter",
      "Run content through the avoid-ai-writing skill before publishing",
    ],
    domains:
      "Blog, social media, newsletter, brand voice, public narrative",
    band: 3,
    tokenAward: "500,000 $ReGen ($5,000)",
    maxTokenAward: "650,000 $ReGen ($6,500)",
    hoursPerWeek: 10,
    deliverables: [
      "Publish 2+ blog posts per month",
      "Maintain social media presence (3+ posts per week)",
      "Write or edit the monthly newsletter",
      "Run content through the avoid-ai-writing skill before publishing",
    ],
    seed: "Content published on cadence (blog, social, newsletter targets met)",
    harvest: "New community members who say content brought them here (signup source tracking, target: 10+/season)",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: "#d4a574",
  },
  {
    title: "Grand Builder",
    characterName: "The Tinkerer",
    tagline: "Builds the world one tool at a time",
    emoji: "\u{1F528}",
    characterImage: "/images/roles/grand-builder-card.webp",
    cardImagePosition: "center top",
    sceneImage: "/images/roles/grand-builder-scene.webp",
    purpose:
      "Maintain the codebase, review community PRs, and keep the technical systems running. The person who makes sure the tools work.",
    circle: "Tech Circle",
    powers: [
      "Merge or reject pull requests",
      "Set technical architecture decisions",
      "Approve database migrations",
      "Grant contributor access to the repo",
    ],
    rights: [
      "Admin access to GitHub repo and hosting infrastructure",
      "Authority to set code standards and review criteria",
      "Budget allocation for infrastructure costs",
    ],
    responsibilities: [
      "Review all community PRs weekly",
      "Maintain CI/CD pipeline and deployment process",
      "Write execution prompts for major features",
      "Mentor new code contributors",
    ],
    domains:
      "Codebase architecture, PR review, deployment, technical documentation",
    band: 7,
    tokenAward: "900,000 $ReGen ($9,000)",
    maxTokenAward: "1,170,000 $ReGen ($11,700)",
    hoursPerWeek: 15,
    deliverables: [
      "Review all community PRs weekly",
      "Maintain CI/CD pipeline and deployment process",
      "Write execution prompts for major features",
      "Mentor new code contributors",
    ],
    seed: "Features and fixes shipped to production through the season",
    harvest: "Community contributors who merged their first PR (people you enabled)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, builders needed",
    color: "#7dd87d",
  },
  {
    title: "Security Reviewer",
    characterName: "The Ranger",
    tagline: "Keeps our digital commons safe",
    emoji: "\u{1F6E1}\uFE0F",
    characterImage: "/images/roles/security-reviewer-card.webp",
    sceneImage: "/images/roles/security-reviewer-scene.webp",
    purpose:
      "Review every community PR for vulnerabilities before it merges. Maintain security scanning workflows and help the project build secure development habits.",
    circle: "Tech Circle",
    powers: [
      "Block any PR on security grounds",
      "Require security-related code changes before merge",
      "Run security audits on any part of the codebase",
      "Recommend security tool adoption",
    ],
    rights: [
      "Access to all security scanning tools and results",
      "Authority to set security review requirements",
      "Input on infrastructure security decisions",
    ],
    responsibilities: [
      "Review all PRs for security vulnerabilities weekly",
      "Maintain and improve security scanning workflows",
      "Document security practices and known risks",
      "Run quarterly security audits",
    ],
    domains:
      "Security review, vulnerability scanning, secure development practices",
    band: 6,
    tokenAward: "800,000 $ReGen ($8,000)",
    maxTokenAward: "1,040,000 $ReGen ($10,400)",
    hoursPerWeek: 10,
    deliverables: [
      "Review all PRs for security vulnerabilities weekly",
      "Maintain and improve security scanning workflows",
      "Document security practices and known risks",
      "Run quarterly security audits",
    ],
    seed: "Security reviews completed for every community PR through the season",
    harvest: "Zero critical vulnerabilities reaching production",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Golden opportunity",
    color: "#fbbf24",
  },
  {
    title: "Tool Curator",
    characterName: "The Librarian",
    tagline: "Organizes what the builders make",
    emoji: "\u{1F9F0}",
    characterImage: "/images/roles/tool-curator-card.webp",
    sceneImage: "/images/roles/tool-curator-scene.webp",
    purpose:
      "Manage the Tools Library. Review submissions, write clear descriptions, keep categories organized, and connect the right tools to the right land projects.",
    circle: "Community Circle",
    powers: [
      "Approve or reject tool submissions",
      "Edit tool descriptions and categories",
      "Feature tools on the homepage and in quests",
      "Recommend tools to specific land projects",
    ],
    rights: [
      "Admin access to the Tools Library",
      "Authority to create and modify tool categories",
      "Input on tool-related quest design",
    ],
    responsibilities: [
      "Review tool submissions within 72 hours",
      "Write or improve 5+ tool descriptions per month",
      "Connect tools to relevant quests and seasons",
      "Track tool usage metrics and report quarterly",
    ],
    domains:
      "Tools Library curation, tool submissions, tool-quest integration",
    band: 3,
    tokenAward: "500,000 $ReGen ($5,000)",
    maxTokenAward: "650,000 $ReGen ($6,500)",
    hoursPerWeek: 6,
    deliverables: [
      "Review tool submissions within 72 hours",
      "Write or improve 5+ tool descriptions per month",
      "Connect tools to relevant quests and seasons",
      "Track tool usage metrics and report quarterly",
    ],
    seed: "Submissions reviewed and cataloged within the season (target: 72hr turnaround)",
    harvest: "Tools actually getting used by land projects (usage tracking)",
    seasons: ["winter", "spring"],
    assignment: "Open",
    color: "#fbbf24",
  },
  {
    title: "Quest Steward",
    characterName: "The Cartographer",
    tagline: "Maps the paths players walk",
    emoji: "\u270D\uFE0F",
    characterImage: "/images/roles/quest-steward-card.webp",
    sceneImage: "/images/roles/quest-steward-scene.webp",
    purpose:
      "Design quests from start to finish: the card content, forum post, seed comments, progression placement, and the real-world action each quest asks players to take.",
    circle: "Community Circle",
    powers: [
      "Draft new quests for community review",
      "Set quest difficulty and reward amounts",
      "Write seed comments that model good responses",
      "Recommend quest ordering in the progression chain",
    ],
    rights: [
      "Access to the quest builder skill and templates",
      "Authority to propose quest progression changes",
      "Input on seasonal quest themes",
    ],
    responsibilities: [
      "Design 3+ new quests per season",
      "Write forum seed posts for each quest",
      "Track quest completion rates and adjust difficulty",
      "Collaborate with Game Designer on progression balance",
    ],
    domains:
      "Quest design, forum seed content, progression chain, quest rewards",
    band: 2,
    tokenAward: "400,000 $ReGen ($4,000)",
    maxTokenAward: "520,000 $ReGen ($5,200)",
    hoursPerWeek: 8,
    deliverables: [
      "Design 3+ new quests per season",
      "Write forum seed posts for each quest",
      "Track quest completion rates and adjust difficulty",
      "Collaborate with Game Designer on progression balance",
    ],
    seed: "Quests designed, written, and live with forum seed posts (target: 3+)",
    harvest: "Players completing those specific quests (completion count)",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: "#7dd87d",
  },
  {
    title: "Outreach Writer",
    characterName: "The Herald",
    tagline: "Carries the signal outward",
    emoji: "\u2709\uFE0F",
    characterImage: "/images/roles/outreach-writer-card.webp",
    sceneImage: "/images/roles/outreach-writer-scene.webp",
    purpose:
      "Write the emails, messages, and campaigns that bring land projects, investors, and allies into the ecosystem. Each season needs fresh copy for fresh audiences.",
    circle: "Communications Circle",
    powers: [
      "Draft outreach sequences for community review",
      "A/B test subject lines and messaging",
      "Recommend audience segmentation",
      "Commission testimonials from land projects",
    ],
    rights: [
      "Access to outreach skills and email tools",
      "Authority to send approved campaigns",
      "Input on audience targeting and messaging strategy",
    ],
    responsibilities: [
      "Write 2+ outreach sequences per season",
      "Maintain email templates and adapt for each campaign",
      "Track open rates and conversion metrics",
      "Collaborate with Alliance Weaver on investor messaging",
    ],
    domains:
      "Email campaigns, outreach sequences, audience messaging, campaign metrics",
    band: 2,
    tokenAward: "400,000 $ReGen ($4,000)",
    maxTokenAward: "520,000 $ReGen ($5,200)",
    hoursPerWeek: 8,
    deliverables: [
      "Write 2+ outreach sequences per season",
      "Maintain email templates and adapt for each campaign",
      "Track open rates and conversion metrics",
      "Collaborate with Alliance Weaver on investor messaging",
    ],
    seed: "Sequences written and sent on schedule (target: 2+)",
    harvest: "People who responded or applied (actual human engagement, not open rates)",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: "#d4a574",
  },
  {
    title: "Skills Builder",
    characterName: "The Alchemist",
    tagline: "Turns code into community tools",
    emoji: "\u26A1",
    characterImage: "/images/roles/skills-builder-card.webp",
    sceneImage: "/images/roles/skills-builder-scene.webp",
    purpose:
      "Create and maintain the Claude skills that power the whole contributor ecosystem. The quality of the skills determines the quality of everyone's output. You can also build tools independently on your own Claude account and earn revenue when those tools help the community.",
    circle: "Tech Circle",
    powers: [
      "Create new skills and submit to the repo",
      "Modify existing skills based on contributor feedback",
      "Set skill documentation standards",
      "Recommend skill adoption for specific workflows",
    ],
    rights: [
      "Access to the skill-creator skill and testing framework",
      "Authority to set skill quality standards",
      "Input on which skills get prioritized",
    ],
    responsibilities: [
      "Build 2+ new skills per season",
      "Maintain and improve existing skills based on usage feedback",
      "Document skill usage patterns and best practices",
      "Test skills across different Claude interfaces",
    ],
    domains:
      "Skill creation, skill testing, skill documentation, contributor tooling",
    band: 5,
    tokenAward: "700,000 $ReGen ($7,000)",
    maxTokenAward: "910,000 $ReGen ($9,100)",
    hoursPerWeek: 10,
    deliverables: [
      "Build 2+ new skills per season",
      "Maintain and improve existing skills based on usage feedback",
      "Document skill usage patterns and best practices",
      "Test skills across different Claude interfaces",
    ],
    seed: "New skills shipped to the repo (target: 2+)",
    harvest: "Other contributors actively using those skills (adoption tracking)",
    seasons: ["winter"],
    assignment: "Open",
    color: "#fbbf24",
    specialContent: {
      title: "Build Tools, Get Rewarded",
      body: "You can build tools on your own Claude account and submit them independently. Get a free week of Claude Cowork to start building: https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps. If the tools you build end up helping our community, they can earn you revenue for use. Build helpful tools, get rewarded. You choose how to take or distribute the pay. If you apply for and fill the official role, the tools you build become community-owned infrastructure that benefits everyone, just like every other part of this public site. The Game runs for free as a public resource. The core team covers infrastructure and hosting costs. There are no fees on this site unless the community votes to create them.",
      prompt:
        "Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. I want to build a new Claude skill for ReGen Civics. Show me the existing skills, the skill-creator skill documentation, and help me design a new skill that fills a gap. Follow the project's writing rules and conventions.",
    },
  },

  /* ═══════════════════════════════════════════════════════════════
     FUND ROLES. ReGen Civics Fund ($RCivics)
     7 roles that coordinate the capital side of the bridge.
     Governance flows through Hypha DAO + committee review.
     Primary compensation: $RCivics tokens. Optional fiat draw from
     a 2% management fee pool once the fund crosses $1M AUM.
     ═══════════════════════════════════════════════════════════════ */
  {
    title: "Fund Steward",
    characterName: "The Tender of Capital",
    tagline: "Holds the thesis, drafts the proposals",
    emoji: "\u{1F3DB}\uFE0F",
    characterImage: "/images/roles/fund-steward-card.webp",
    sceneImage: "/images/roles/fund-steward-scene.webp",
    purpose:
      "Hold the fund thesis and theory of change. Draft every investment proposal that reaches the Hypha DAO, chair the review committee, set the seasonal capital deployment rhythm, and voice the fund to investors. From Season 3 onwards, form the Council of Domain Experts, a standing committee that collectively plays this role so the Fund Steward becomes a shared seat rather than a single person.",
    circle: "Fund Stewardship Circle",
    powers: [
      "Draft investment proposals to the Hypha DAO",
      "Chair the investment review committee",
      "Set seasonal capital deployment rhythm",
      "Form and convene the Council of Domain Experts from Season 3 onwards",
      "Represent the fund to major LPs and alliance partners",
    ],
    rights: [
      "Access to the full deal pipeline and diligence memos",
      "Veto on proposals that violate the fund thesis",
      "Final say on quarterly LP letter framing",
      "First look at every land project the diligence lead surfaces",
    ],
    responsibilities: [
      "Keep the fund thesis alive and evolving",
      "Draft and submit every Hypha DAO investment proposal",
      "Chair weekly committee reviews during deployment windows",
      "Build the Council of Domain Experts through Season 2 and hand over collective stewardship in Season 3",
      "Report fund health to the community at each Season Festival",
    ],
    domains:
      "Fund thesis, investment committee chair, Hypha DAO proposal authorship, LP voice",
    band: 7,
    tokenAward: "1,200,000 $RCivics ($12,000)",
    maxTokenAward: "1,560,000 $RCivics ($15,600)",
    hoursPerWeek: 20,
    deliverables: [
      "Living fund thesis document, updated each season",
      "Authored Hypha DAO proposal for every investment",
      "Weekly committee meeting agendas and notes during deployment",
      "Quarterly LP letter co-authored with the Capital Weaver",
      "Council of Domain Experts charter and member onboarding by end of Season 2",
    ],
    seed: "Fund thesis published and referenced in every committee decision",
    harvest: "Council of Domain Experts seated and operating by Season 3 launch, with at least 5 domain experts participating in committee reviews",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Filled by Rye through Season 2, transitioning to shared Council stewardship in Season 3",
    color: "#d4a574",
    kind: "fund",
  },
  {
    title: "Capital Weaver",
    characterName: "The Cultivator of Relations",
    tagline: "Tends the investor pipeline from first touch to signed check",
    emoji: "\u{1F91D}",
    characterImage: "/images/roles/capital-weaver-card.webp",
    sceneImage: "/images/roles/capital-weaver-scene.webp",
    purpose:
      "Cultivate the investor pipeline from first conversation through signed subscription. Run the outreach cadence, maintain the CRM, represent the fund at values-aligned investor gatherings, and narrate the full investment cycle back to LPs through the quarterly letter. The primary interface between investors and everything else the fund does.",
    circle: "Investor Relations Circle",
    powers: [
      "Initiate LP conversations on behalf of the fund",
      "Schedule and host investor meetings and site visits",
      "Represent the fund at conferences and investor gatherings",
      "Draft the quarterly LP letter with the Fund Steward",
      "Recommend LP tier structures and minimum check sizes",
    ],
    rights: [
      "Access to the full investor CRM and pipeline data",
      "Use of fund brand assets and pitch materials for outreach",
      "Budget allocation for investor dinners, trips, and hosted gatherings",
      "Reports LP sentiment directly into committee discussions",
    ],
    responsibilities: [
      "Hold the investor pipeline and keep it warm week to week",
      "Run the outreach cadence across cold, warm, and committed LPs",
      "Host or co-host at least two investor events per season",
      "Co-author the quarterly LP letter",
      "Onboard new LPs through the subscription process end to end",
    ],
    domains:
      "Investor relations, LP pipeline, fundraising cadence, quarterly letter",
    band: 6,
    tokenAward: "900,000 $RCivics ($9,000)",
    maxTokenAward: "1,170,000 $RCivics ($11,700)",
    hoursPerWeek: 15,
    deliverables: [
      "Weekly LP pipeline update to the Fund Steward",
      "Two investor events per season (dinners, site visits, or webinars)",
      "Co-authored quarterly LP letter",
      "Updated pitch deck and one-pager each season",
      "Onboarded LPs through signed subscription docs",
    ],
    seed: "Investor pipeline stays active with at least 20 warm conversations per season",
    harvest: "Fund reaches its seasonal capital target (Season Festival check, target: 100% or hand-off to next season with clear forward pipeline)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open, hiring now",
    color: "#d4a574",
    kind: "fund",
  },
  {
    title: "Due Diligence Lead",
    characterName: "The Witness of Soil and Soul",
    tagline: "Reads every land before the fund ever writes a check",
    emoji: "\u{1F50D}",
    characterImage: "/images/roles/diligence-lead-card.webp",
    sceneImage: "/images/roles/diligence-lead-scene.webp",
    purpose:
      "Evaluate every land project that enters the funnel. Conduct site visits, read the land and the team, model the regenerative thesis, underwrite the financials, score regen viability, and write the diligence memo that seeds every Hypha DAO proposal. The role that says yes this land is alive and this team can hold it, or not yet.",
    circle: "Diligence Circle",
    powers: [
      "Conduct site visits to every candidate land project",
      "Build the financial model and regen viability score",
      "Write the diligence memo that seeds every proposal",
      "Recommend approve, revise, or decline to the committee",
      "Commission third-party soil, water, or legal assessments as needed",
    ],
    rights: [
      "Access to every applicant's financials and land documents",
      "Direct line to alliance experts for technical review",
      "Travel budget for site visits",
      "Authority to pause a proposal while gathering more evidence",
    ],
    responsibilities: [
      "Visit every serious candidate project in person where possible",
      "Write a full diligence memo within 30 days of site visit",
      "Maintain the regen viability scoring rubric",
      "Co-present every proposal to the committee alongside the Fund Steward",
      "Archive diligence memos for post-investment learning",
    ],
    domains:
      "Land and team evaluation, regen viability scoring, financial underwriting, diligence memos",
    band: 6,
    tokenAward: "900,000 $RCivics ($9,000)",
    maxTokenAward: "1,170,000 $RCivics ($11,700)",
    hoursPerWeek: 18,
    deliverables: [
      "Full diligence memo for every proposal that reaches committee",
      "Updated regen viability scoring rubric each season",
      "Site visit report for every funded project",
      "Quarterly diligence learning summary to the committee",
    ],
    seed: "Every proposal reaching committee has a complete diligence memo and site visit report",
    harvest: "Funded projects show positive 12-month regen trajectory on the scoring rubric (Impact Witness verification, target: 80% of portfolio)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open, hiring now",
    color: "#d4a574",
    kind: "fund",
  },
  {
    title: "Portfolio Tender",
    characterName: "The Keeper of Held Ground",
    tagline: "Walks with every funded project, month to month",
    emoji: "\u{1F33E}",
    characterImage: "/images/roles/portfolio-tender-card.webp",
    sceneImage: "/images/roles/portfolio-tender-scene.webp",
    purpose:
      "Walk beside every portfolio land project after the check clears. Flag blockers early, coordinate with the Alliance Weaver on the Game side when a project needs ecosystem resources, write the quarterly portfolio health dashboard, and convene the quarterly portfolio circle where all held projects meet each other and share what they are learning.",
    circle: "Portfolio Circle",
    powers: [
      "Schedule monthly check-ins with every portfolio project",
      "Flag at-risk projects to the committee",
      "Coordinate alliance support for portfolio projects",
      "Raise exit or restructure proposals to the Hypha DAO",
      "Convene the quarterly portfolio peer circle",
    ],
    rights: [
      "Access to every portfolio project's operational data",
      "Direct line to the Alliance Weaver for Game-side resource connections",
      "Travel budget for portfolio site visits",
      "First look at portfolio early-warning signals",
    ],
    responsibilities: [
      "Monthly check-in with every portfolio project",
      "Quarterly portfolio health dashboard to the committee",
      "Host the quarterly portfolio peer circle",
      "Flag at-risk projects at the earliest honest moment",
      "Write the portfolio chapter of the annual Impact Report with the Impact Witness",
    ],
    domains:
      "Post-investment project support, portfolio health tracking, peer circle convening",
    band: 5,
    tokenAward: "700,000 $RCivics ($7,000)",
    maxTokenAward: "910,000 $RCivics ($9,100)",
    hoursPerWeek: 12,
    deliverables: [
      "Monthly check-in notes for every portfolio project",
      "Quarterly portfolio health dashboard",
      "Quarterly portfolio peer circle hosted",
      "Portfolio chapter of the annual Impact Report",
    ],
    seed: "Every portfolio project receives a monthly check-in on time",
    harvest: "Portfolio project health scores trend upward quarter over quarter (target: 75% of projects in green or improving status)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q3 2026",
    color: "#d4a574",
    kind: "fund",
  },
  {
    title: "Fund Treasurer",
    characterName: "The Weigher of Coin",
    tagline: "Holds the ledgers so the fund can survive an audit",
    emoji: "\u{2696}\uFE0F",
    characterImage: "/images/roles/fund-treasurer-card.webp",
    sceneImage: "/images/roles/fund-treasurer-scene.webp",
    purpose:
      "Run the operational backbone of the fund. Treasury management, accounts and audit prep, LP subscription tracking, monthly burn reports, quarterly financial statements, and the reconciliation between traditional fund accounting and Hypha DAO on-chain records. The role that makes sure the fund can survive an audit and that every $RCivics in circulation is backed by verifiable value.",
    circle: "Operations Circle",
    powers: [
      "Hold the fund treasury and move capital under committee approval",
      "Approve or reject expense reimbursements",
      "Reconcile on-chain and off-chain fund records",
      "Commission the annual audit",
      "Pause spending if burn exceeds committee-approved rate",
    ],
    rights: [
      "Read access to every fund bank and wallet",
      "Direct line to external auditors and accountants",
      "Authority to publish verified financials each proposal relies on",
      "Budget for accounting software and audit fees",
    ],
    responsibilities: [
      "Publish monthly burn reports to the committee",
      "Publish quarterly financial statements to LPs",
      "Reconcile on-chain and off-chain records weekly",
      "Commission and pass the annual audit",
      "Track every LP subscription and cap table change",
    ],
    domains:
      "Treasury, accounting, audit, LP subscription tracking, on-chain reconciliation",
    band: 6,
    tokenAward: "900,000 $RCivics ($9,000)",
    maxTokenAward: "1,170,000 $RCivics ($11,700)",
    hoursPerWeek: 15,
    deliverables: [
      "Monthly burn report to the committee",
      "Quarterly financial statements to LPs",
      "Weekly on-chain / off-chain reconciliation",
      "Annual audit completed and published",
      "Accurate cap table at all times",
    ],
    seed: "Monthly burn reports delivered on time, every month",
    harvest: "Fund passes its annual audit with zero material findings",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q3 2026",
    color: "#d4a574",
    kind: "fund",
  },
  {
    title: "Impact Witness",
    characterName: "The Reader of the Land",
    tagline: "Measures what actually happens on the ground",
    emoji: "\u{1F33F}",
    characterImage: "/images/roles/impact-witness-card.webp",
    sceneImage: "/images/roles/impact-witness-scene.webp",
    purpose:
      "Measure what actually happens on the ground. Soil health panels, biodiversity surveys, water retention, community wellbeing check-ins, carbon accounting where it applies. Build the per-project baseline at acquisition and the return visit at season end. Co-author the annual Impact Report with the Portfolio Tender and the Storyteller on the Game side.",
    circle: "Impact Circle",
    powers: [
      "Set the per-project impact measurement protocol at acquisition",
      "Commission third-party soil, water, or biodiversity assessments",
      "Flag projects where impact trajectory is diverging from the thesis",
      "Publish the annual Impact Report",
      "Recommend impact scoring weights for the committee",
    ],
    rights: [
      "Site visit access to every portfolio project",
      "Budget for measurement equipment and third-party assessments",
      "Direct line to portfolio projects' land teams",
      "Authority to publish impact data even when inconvenient",
    ],
    responsibilities: [
      "Establish baseline measurements at every acquisition",
      "Return visits at least once per season to every portfolio project",
      "Quarterly impact data summary to the committee",
      "Co-author the annual Impact Report",
      "Maintain the impact measurement protocol as living document",
    ],
    domains:
      "Impact measurement, soil and biodiversity assessment, carbon accounting, annual Impact Report",
    band: 5,
    tokenAward: "700,000 $RCivics ($7,000)",
    maxTokenAward: "910,000 $RCivics ($9,100)",
    hoursPerWeek: 12,
    deliverables: [
      "Baseline impact measurement for every new portfolio project",
      "Seasonal return visit report for every project",
      "Quarterly impact data summary",
      "Annual Impact Report co-authored with Portfolio Tender and Storyteller",
    ],
    seed: "Every portfolio project has a baseline and at least one seasonal return measurement",
    harvest: "Annual Impact Report published on time and referenced in the next LP letter",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q4 2026",
    color: "#d4a574",
    kind: "fund",
  },
  {
    title: "Structure Keeper",
    characterName: "The Holder of Form",
    tagline: "Holds the legal vessel the fund lives inside",
    emoji: "\u{1F4DC}",
    characterImage: "/images/roles/structure-keeper-card.webp",
    sceneImage: "/images/roles/structure-keeper-scene.webp",
    purpose:
      "Hold the legal and structural container the fund lives inside. Fund entity, subscription docs, LP agreements, regulatory filings, Hypha DAO on-chain-to-legal bridge, and the compliance calendar. Work with external counsel where needed. The role that lets everything else happen inside a real legal vessel investors can trust.",
    circle: "Structure Circle",
    powers: [
      "Draft and maintain LP subscription and operating agreements",
      "Coordinate with external counsel on filings and compliance",
      "Maintain the regulatory compliance calendar",
      "Authorize or block actions that would violate fund structure",
      "Hold the bridge between Hypha DAO proposals and legal execution",
    ],
    rights: [
      "Access to all legal documents and counsel correspondence",
      "Budget for external counsel and filing fees",
      "Authority to delay any action that creates legal risk until resolved",
      "Direct line to every committee decision that has legal implications",
    ],
    responsibilities: [
      "Keep the fund entity in good standing and compliant",
      "Maintain all LP agreements and subscription docs",
      "Publish the compliance calendar and track every deadline",
      "Bridge every Hypha DAO proposal into executable legal form",
      "Onboard external counsel as needs evolve",
    ],
    domains:
      "Fund legal structure, LP agreements, regulatory compliance, DAO-to-legal bridge",
    band: 6,
    tokenAward: "900,000 $RCivics ($9,000)",
    maxTokenAward: "1,170,000 $RCivics ($11,700)",
    hoursPerWeek: 10,
    deliverables: [
      "Fund entity kept in good standing",
      "Complete LP subscription and agreement archive",
      "Published compliance calendar with every deadline met",
      "Legal execution of every approved Hypha DAO proposal",
    ],
    seed: "Fund entity compliant and every LP subscription on file",
    harvest: "Zero compliance misses across the year and every approved proposal executed in legal form within 30 days",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q2 2026",
    color: "#d4a574",
    kind: "fund",
  },
];

export const seasons: Season[] = [
  {
    name: "Winter",
    emoji: "\u2744\uFE0F",
    months: "Dec - Feb",
    theme: "Building & Preparing",
    description:
      "We build the tools, write the code, upgrade our systems and processes. This is the season of deep work: architecture, game design, skill creation, infrastructure. The builders and designers are in their element.",
    activeRoles: [
      "Lead Builder",
      "Security Reviewer",
      "Game Designer",
      "Skills Builder",
      "Tool Curator",
      "Quest Author",
    ],
    color: "#93c5fd",
    current: true,
  },
  {
    name: "Spring",
    emoji: "\u{1F338}",
    months: "Mar - May",
    theme: "Incubation & Growth",
    description:
      "The incubator opens. Land projects apply, get matched with guides, and begin their journey. The community is buzzing with new energy, new faces, new ideas. Outreach is at full volume.",
    activeRoles: [
      "Season Facilitator",
      "Incubator Guide",
      "Alliance Weaver",
      "Outreach Writer",
      "Forum Gardener",
      "Storyteller",
    ],
    color: "#7dd87d",
    current: false,
  },
  {
    name: "Summer",
    emoji: "\u2600\uFE0F",
    months: "Jun - Aug",
    theme: "Festivals & Village Building",
    description:
      "We go on the ground. Village building festivals, in-person gatherings, land project visits, community celebrations. The digital work meets the physical world. This is where the theory becomes soil under your feet.",
    activeRoles: [
      "Season Facilitator",
      "Alliance Weaver",
      "Storyteller",
      "Incubator Guide",
    ],
    color: "#fbbf24",
    current: false,
  },
  {
    name: "Fall",
    emoji: "\u{1F342}",
    months: "Sep - Nov",
    theme: "Rest & Reflection",
    description:
      "We step out of our Infinite Game roles and focus on family, in-person village life, personal projects. The community rests. The treasury and forum roles keep a gentle rhythm, but the pace slows intentionally. We compost what we learned.",
    activeRoles: ["Treasury Steward", "Forum Gardener"],
    color: "#d4a574",
    current: false,
  },
];
