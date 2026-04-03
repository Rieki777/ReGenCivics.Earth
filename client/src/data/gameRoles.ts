/**
 * Game Roles and Seasons data for the Team page.
 * 13 sociocratic roles of the Infinite Game + 4 seasonal rhythms.
 */

export interface GameRole {
  title: string;
  emoji: string;
  characterImage: string;
  purpose: string;
  circle: string;
  powers: string[];
  rights: string[];
  responsibilities: string[];
  domains: string;
  tokenAward: string;
  seasons: string[];
  assignment: string;
  color: string;
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
    emoji: "\u{1F33F}",
    characterImage: "/images/roles/season-facilitator.png",
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
    tokenAward:
      "1,200 $ReGen per season + completion bonuses based on project outcomes",
    seasons: ["spring"],
    assignment: "Filled, seeking 1-2 co-facilitators",
    color: "#7dd87d",
  },
  {
    title: "Alliance Weaver",
    emoji: "\u{1F578}\uFE0F",
    characterImage: "/images/roles/alliance-weaver.png",
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
    tokenAward:
      "1,000 $ReGen per season + commission on partnerships that convert to fund contributions",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: "#d4a574",
  },
  {
    title: "Incubator Guide",
    emoji: "\u{1F5FA}\uFE0F",
    characterImage: "/images/roles/incubator-guide.png",
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
    tokenAward: "800 $ReGen per season per project guided",
    seasons: ["spring", "summer"],
    assignment: "Open, 2 positions",
    color: "#4a9f4a",
  },
  {
    title: "Forum Gardener",
    emoji: "\u{1F331}",
    characterImage: "/images/roles/forum-gardener.png",
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
    tokenAward: "600 $ReGen per season + bonuses for community growth metrics",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open",
    color: "#7dd87d",
  },
  {
    title: "Game Designer",
    emoji: "\u{1F3B2}",
    characterImage: "/images/roles/game-designer.png",
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
    tokenAward:
      "1,000 $ReGen per season + design bonuses for adopted mechanics",
    seasons: ["winter", "spring"],
    assignment: "Partially filled, support needed",
    color: "#fbbf24",
  },
  {
    title: "Treasury Steward",
    emoji: "\u2696\uFE0F",
    characterImage: "/images/roles/treasury-steward.png",
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
    tokenAward: "800 $ReGen per season",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, seeking support",
    color: "#4a9f4a",
  },
  {
    title: "Storyteller",
    emoji: "\u{1F4D6}",
    characterImage: "/images/roles/storyteller.png",
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
    tokenAward:
      "800 $ReGen per season + bonuses for content that drives signups",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: "#d4a574",
  },
  {
    title: "Lead Builder",
    emoji: "\u{1F528}",
    characterImage: "/images/roles/lead-builder.png",
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
    tokenAward: "1,200 $ReGen per season",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, builders needed",
    color: "#7dd87d",
  },
  {
    title: "Security Reviewer",
    emoji: "\u{1F6E1}\uFE0F",
    characterImage: "/images/roles/security-reviewer.png",
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
    tokenAward: "1,000 $ReGen per season",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Golden opportunity",
    color: "#fbbf24",
  },
  {
    title: "Tool Curator",
    emoji: "\u{1F9F0}",
    characterImage: "/images/roles/tool-curator.png",
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
    tokenAward: "600 $ReGen per season + bonuses for library growth",
    seasons: ["winter", "spring"],
    assignment: "Open",
    color: "#fbbf24",
  },
  {
    title: "Quest Author",
    emoji: "\u270D\uFE0F",
    characterImage: "/images/roles/quest-author.png",
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
    tokenAward: "400 $ReGen per quest accepted + seasonal base of 400 $ReGen",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: "#7dd87d",
  },
  {
    title: "Outreach Writer",
    emoji: "\u2709\uFE0F",
    characterImage: "/images/roles/outreach-writer.png",
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
    tokenAward: "600 $ReGen per season + bonuses for conversion results",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: "#d4a574",
  },
  {
    title: "Skills Builder",
    emoji: "\u26A1",
    characterImage: "/images/roles/skills-builder.png",
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
    tokenAward: "800 $ReGen per season + bonuses for skill adoption rates",
    seasons: ["winter"],
    assignment: "Open",
    color: "#fbbf24",
    specialContent: {
      title: "Build Tools, Get Rewarded",
      body: "You can build tools on your own Claude account and submit them independently. If the tools you build end up helping our community, they can earn you revenue for use. Build helpful tools, get rewarded. You choose how to take or distribute the pay. If you apply for and fill the official role, the tools you build become community-owned infrastructure that benefits everyone, just like every other part of this public site. The Game runs for free as a public resource. The core team covers infrastructure and hosting costs. There are no fees on this site unless the community votes to create them.",
      prompt:
        "Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. I want to build a new Claude skill for ReGen Civics. Show me the existing skills, the skill-creator skill documentation, and help me design a new skill that fills a gap. Follow the project's writing rules and conventions.",
    },
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
