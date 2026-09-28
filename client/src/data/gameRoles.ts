/**
 * Game Roles and Seasons data for the Team page.
 * 13 sociocratic roles of the Infinite Game + 4 seasonal rhythms.
 */

import { spring, amber, forest } from "@/lib/design-tokens";
import { getCurrentSeason, SEASON_THEMES } from "@/lib/seasons";

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
   *  - "game" (default): coordinates the Infinite Game; role awards paid in $ReGen.
   *  - "fund": a cooperative role. Carries the design work for the ReGen Network
   *    Cooperative, which is in design (shared/fund.ts COOP). The value stays
   *    "fund" because the roles table enum and roleHolders key on it. How these
   *    roles are rewarded will be set with counsel.
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
      "Hold the whole wheel of the year. Sit in on every recap and passoff, help each Season Organizer take the wheel and hand it on, keep the season record, and carry what one season learns into the next.",
    circle: "Seasons Circle",
    powers: [
      "Set the year's turning dates with the four Season Organizers",
      "Stretch or shorten a season when the year needs it",
      "Approve resource requests under $500",
      "Call a check-in with any Season Organizer",
    ],
    rights: [
      "A seat at every recap and passoff, and at the Handoff Festival",
      "First look at incoming land project applications",
      "Access to every season's records and scorecards",
    ],
    responsibilities: [
      "Sit in on all four recaps and passoffs and help each handoff land",
      "Check in with each Season Organizer through their season",
      "Keep the season record and the Season Festival scorecard",
      "Write the year's wrap-up report for the Handoff Festival",
    ],
    domains:
      "The wheel of the year, the recaps and passoffs, the season record",
    band: 5,
    tokenAward: "700,000 $ReGen",
    maxTokenAward: "910,000 $ReGen",
    hoursPerWeek: 4,
    deliverables: [
      "Sit in on all four recaps and passoffs",
      "A check-in with each Season Organizer every few weeks of their season",
      "Keep the season record and the Season Festival scorecard up to date",
      "Write the year's wrap-up report for the Handoff Festival",
    ],
    seed: "All four recaps and passoffs happen, each with its recap shared",
    harvest: "Each organizer says their passoff set them up well (survey at the Handoff Festival, target: 4+/5 average)",
    // Holds the whole wheel. The weekly incubator sessions moved to the Design
    // Season Organizer, the Lantern-Keeper (Rye, 2026-09-24).
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Filled",
    color: spring.base,
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
      "Build and tend the web of relationships with allies, funders, partner organizations, and land project referral networks that keep the ecosystem alive.",
    circle: "Alliance Circle",
    powers: [
      "Initiate partnership conversations on behalf of ReGen Civics",
      "Draft alliance agreements for community review",
      "Represent the project at conferences and events",
      "Recommend alliance tier classifications",
    ],
    rights: [
      "Access to the partner contact list and CRM data",
      "Use of ReGen Civics brand assets for outreach",
      "Budget allocation for relationship-building activities",
    ],
    responsibilities: [
      "Maintain active contact with 10+ alliance partners per season",
      "Report on partnership health monthly",
      "Coordinate funder and partner communications with the Treasury Steward",
      "Facilitate alliance partner onboarding",
    ],
    domains:
      "Alliance partnerships, funder relations, conference representation",
    band: 4,
    tokenAward: "600,000 $ReGen",
    maxTokenAward: "780,000 $ReGen",
    hoursPerWeek: 10,
    deliverables: [
      "Maintain active contact with 10+ alliance partners per season",
      "Report on partnership health monthly",
      "Coordinate funder and partner communications with the Treasury Steward",
      "Facilitate alliance partner onboarding",
    ],
    seed: "New partnership conversations opened (target: 3+ per season)",
    harvest: "At least one partnership that resulted in tangible support for a land project",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: amber.tan,
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
    tokenAward: "500,000 $ReGen",
    maxTokenAward: "650,000 $ReGen",
    hoursPerWeek: 10,
    deliverables: [
      "Guide 3-4 land projects per season",
      "Check in with each project weekly",
      "Document project progress and lessons learned",
      "Connect projects with relevant tools from the Tools Library",
    ],
    seed: "Weekly check-ins with every guided project completed through the season",
    harvest: "Guided projects hitting their own self-set milestones (target: 70%+ on track)",
    seasons: ["winter", "spring"],
    assignment: "Open, 2 positions",
    color: forest.sage,
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
    tokenAward: "300,000 $ReGen",
    maxTokenAward: "390,000 $ReGen",
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
    color: spring.base,
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
    tokenAward: "800,000 $ReGen",
    maxTokenAward: "1,040,000 $ReGen",
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
    color: amber.tan,
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
      "Track all money coming in and going out",
      "Coordinate with the Alliance Weaver on how partner and funder support is used",
    ],
    domains:
      "Treasury operations, financial reporting, payment processing, budget tracking",
    band: 4,
    tokenAward: "600,000 $ReGen",
    maxTokenAward: "780,000 $ReGen",
    hoursPerWeek: 8,
    deliverables: [
      "Process payments within 48 hours of approval",
      "Publish monthly treasury reports",
      "Track all money coming in and going out",
      "Coordinate with the Alliance Weaver on how partner and funder support is used",
    ],
    seed: "Monthly reports published on time and visible to the community",
    harvest: "Community reports zero confusion about where money went (Season Festival survey, target: 4+/5)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Partially filled, seeking support",
    color: forest.sage,
  },
  {
    title: "Storyteller",
    characterName: "The Storyteller",
    tagline: "Turns what happened into what matters",
    emoji: "\u{1F4D6}",
    characterImage: "/images/roles/storyteller-card.webp",
    sceneImage: "/images/roles/storyteller-scene.webp",
    purpose:
      "Write the story of the ReGenerative Renaissance as it happens. Blog posts, social media, newsletters, and the narrative thread that ties everything together.",
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
    tokenAward: "500,000 $ReGen",
    maxTokenAward: "650,000 $ReGen",
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
    color: amber.tan,
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
    tokenAward: "900,000 $ReGen",
    maxTokenAward: "1,170,000 $ReGen",
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
    color: spring.base,
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
    tokenAward: "800,000 $ReGen",
    maxTokenAward: "1,040,000 $ReGen",
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
    color: amber.tan,
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
    tokenAward: "500,000 $ReGen",
    maxTokenAward: "650,000 $ReGen",
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
    color: amber.tan,
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
    tokenAward: "400,000 $ReGen",
    maxTokenAward: "520,000 $ReGen",
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
    color: spring.base,
  },
  {
    title: "Outreach Writer",
    characterName: "The Herald",
    tagline: "Carries the signal outward",
    emoji: "\u2709\uFE0F",
    characterImage: "/images/roles/outreach-writer-card.webp",
    sceneImage: "/images/roles/outreach-writer-scene.webp",
    purpose:
      "Write the emails, messages, and campaigns that bring land projects, funders, and allies into the ecosystem. Each season needs fresh copy for fresh audiences.",
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
      "Collaborate with the Alliance Weaver on funder and partner messaging",
    ],
    domains:
      "Email campaigns, outreach sequences, audience messaging, campaign metrics",
    band: 2,
    tokenAward: "400,000 $ReGen",
    maxTokenAward: "520,000 $ReGen",
    hoursPerWeek: 8,
    deliverables: [
      "Write 2+ outreach sequences per season",
      "Maintain email templates and adapt for each campaign",
      "Track open rates and conversion metrics",
      "Collaborate with the Alliance Weaver on funder and partner messaging",
    ],
    seed: "Sequences written and sent on schedule (target: 2+)",
    harvest: "People who responded or applied (actual human engagement)",
    seasons: ["spring", "summer"],
    assignment: "Open",
    color: amber.tan,
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
    tokenAward: "700,000 $ReGen",
    maxTokenAward: "910,000 $ReGen",
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
    color: amber.tan,
    specialContent: {
      title: "Build Tools, Get Rewarded",
      body: "You can build tools on your own Claude account and submit them independently. Get a free week of Claude Cowork to start building: https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps. If the tools you build end up helping our community, they can earn you revenue for use. Build helpful tools, get rewarded. You choose how to take or distribute the pay. If you apply for and fill the official role, the tools you build become community-owned infrastructure that benefits everyone, just like every other part of this public site. The Game runs for free as a public resource. The core team covers infrastructure and hosting costs. There are no fees on this site unless the community votes to create them.",
      prompt:
        "Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. I want to build a new Claude skill for ReGen Civics. Show me the existing skills, the skill-creator skill documentation, and help me design a new skill that fills a gap. Follow the project's writing rules and conventions.",
    },
  },
  /* ═══════════════════════════════════════════════════════════════
     SEASON ORGANIZERS (Season 2, Rye 2026-09-24)
     One organizer per season of the ReGen Civics Year. Each receives
     the wheel at the turn that opens their season and passes it on at
     the next recap and passoff. Top band: they make the year happen.
     ═══════════════════════════════════════════════════════════════ */
  {
    title: "Design Season Organizer",
    characterName: "The Lantern-Keeper",
    tagline: "Keeps the light on through the design months",
    emoji: "🏮",
    characterImage: "/images/roles/design-season-organizer-card.webp",
    sceneImage: "/images/roles/design-season-organizer-scene.webp",
    purpose:
      "Organize and facilitate the Design Season: receive the wheel at the Handoff Festival, facilitate the 13 weekly incubator sessions, gather the season's design work into the public record, and pass the wheel to the Resource Season at the December solstice.",
    circle: "Seasons Circle",
    powers: [
      "Set the Design Season calendar and the weekly session schedule",
      "Invite guest mentors and designers to sessions",
      "Pause a project's timeline if they need breathing room",
      "Ask the Tech Circle for tool time on cohort needs",
      "Call the December solstice recap and passoff",
    ],
    rights: [
      "Access to the cohort workspace, the recordings, and every project's progress",
      "A seat at both passoffs that bracket the season",
      "Input on next year's Design Season curriculum",
    ],
    responsibilities: [
      "Receive the wheel at the Handoff Festival and run Selection Day with the Season Facilitator",
      "Facilitate the 13 weekly incubator sessions and keep them on track: calendar, room, recordings, reminders, notes",
      "Track each project's milestones and flag blockers",
      "Gather each week's design work (Game Guides, governance drafts, token models) into the public record",
      "Host the December solstice recap and pass off to the Resource Season Organizer",
    ],
    domains: "The weekly incubator sessions, session design, the Design Season calendar, the December recap and passoff",
    band: 7,
    tokenAward: "900,000 $ReGen",
    maxTokenAward: "1,170,000 $ReGen",
    hoursPerWeek: 15,
    deliverables: [
      "Receive the wheel at the Handoff Festival and run Selection Day with the Season Facilitator",
      "Facilitate the 13 weekly incubator sessions and keep them on track: calendar, room, recordings, reminders, notes",
      "Track each project's milestones and flag blockers",
      "Gather each week's design work (Game Guides, governance drafts, token models) into the public record",
      "Host the December solstice recap and pass off to the Resource Season Organizer",
    ],
    seed: "Every incubator session is held on time, with its recording and notes published",
    harvest: "The cohort reaches week 13 with complete Game Guides (target: at least 9 of 13 graduate)",
    seasons: ["winter"],
    // Full for Season 2, with no co-facilitators needed (Rye, 2026-09-24).
    assignment: "Filled",
    color: "#8fd8e8",
  },
  {
    title: "Resource Season Organizer",
    characterName: "The Rainmaker",
    tagline: "Calls the resources in",
    emoji: "🌧️",
    characterImage: "/images/roles/resource-season-organizer-card.webp",
    sceneImage: "/images/roles/resource-season-organizer-scene.webp",
    purpose:
      "Organize the Resource Season: receive the wheel at the December solstice, run the shared crowdpool launch with the cohort and every community project that's ready, keep the campaign calendar moving, help people find and claim what each project needs, and pass the wheel to the Build Season at the March equinox.",
    circle: "Seasons Circle",
    powers: [
      "Set the Resource Season calendar",
      "Feature campaigns across the site and letters",
      "Coordinate the Storyteller and Outreach Writer on the push",
      "Call the March equinox recap and passoff",
    ],
    rights: [
      "Access to campaign dashboards and the needs registry",
      "A seat at both passoffs that bracket the season",
      "Input on how crowdpool campaigns are presented",
    ],
    responsibilities: [
      "Receive the wheel at the December solstice and run the shared crowdpool launch with the cohort and every community project that's ready",
      "Keep the campaign calendar: stories, live moments, matching pushes, partner and funder conversations",
      "Help people find and claim needs and roles on every campaign; publish a weekly crowdpool recap",
      "Host the March equinox recap and pass off to the Build Season Organizer",
    ],
    domains: "Resource Season calendar, the shared crowdpool, the March recap and passoff",
    band: 7,
    tokenAward: "900,000 $ReGen",
    maxTokenAward: "1,170,000 $ReGen",
    hoursPerWeek: 15,
    deliverables: [
      "Receive the wheel at the December solstice and run the shared crowdpool launch with the cohort and every community project that's ready",
      "Keep the campaign calendar: stories, live moments, matching pushes, partner and funder conversations",
      "Help people find and claim needs and roles on every campaign; publish a weekly crowdpool recap",
      "Host the March equinox recap and pass off to the Build Season Organizer",
    ],
    seed: "The shared launch goes live at the solstice with every graduating project and every community project that's ready",
    harvest: "Graduating projects reach their in-kind asks by close (target: most at 100% of the in-kind ask)",
    seasons: ["spring"],
    assignment: "Open",
    color: SEASON_THEMES.spring.accent,
  },
  {
    title: "Build Season Organizer",
    characterName: "The Barn-Raiser",
    tagline: "Gathers the hands and raises the village",
    emoji: "🔨",
    characterImage: "/images/roles/build-season-organizer-card.webp",
    sceneImage: "/images/roles/build-season-organizer-scene.webp",
    purpose:
      "Organize the Build Season: receive the wheel at the March equinox, publish the season's work parties and festivals across the network, match volunteers, travelers and the ReGen Ship to the land projects that need hands, and pass the wheel to the Rest Season at the June solstice. Southern and equatorial projects build on their own land's timing, so this role keeps the year-round festival route in view.",
    circle: "Seasons Circle",
    powers: [
      "Set the Build Season calendar",
      "Route volunteers and the ship's voyages",
      "Approve work party and festival listings",
      "Call the June solstice recap and passoff",
    ],
    rights: [
      "Access to project needs and volunteer sign-ups",
      "A seat at both passoffs that bracket the season",
      "Input on the hosting and safety guides",
    ],
    responsibilities: [
      "Receive the wheel at the March equinox and publish the season's work parties and festivals across the network",
      "Match volunteers, travelers and the ReGen Ship to land projects that need hands",
      "Keep the year-round festival route current: northern festivals March to June, southern ones September to February",
      "Host the June solstice recap and pass off to the Rest Season Organizer",
    ],
    domains: "Build Season calendar, work parties and festivals, the year-round festival route, the June recap and passoff",
    band: 7,
    tokenAward: "900,000 $ReGen",
    maxTokenAward: "1,170,000 $ReGen",
    hoursPerWeek: 15,
    deliverables: [
      "Receive the wheel at the March equinox and publish the season's work parties and festivals across the network",
      "Match volunteers, travelers and the ReGen Ship to land projects that need hands",
      "Keep the year-round festival route current: northern festivals March to June, southern ones September to February",
      "Host the June solstice recap and pass off to the Rest Season Organizer",
    ],
    seed: "Every cohort project hosts at least one work party or festival",
    harvest: "Hours and materials delivered on the land, counted through crowdpool claims",
    seasons: ["summer"],
    assignment: "Open",
    color: SEASON_THEMES.summer.accent,
  },
  {
    title: "Rest Season Organizer",
    characterName: "The Hearth-Keeper",
    tagline: "Tends the fire while we rest",
    emoji: "🔥",
    characterImage: "/images/roles/rest-season-organizer-card.webp",
    sceneImage: "/images/roles/rest-season-organizer-scene.webp",
    purpose:
      "Organize the Rest Season: receive the wheel at the June solstice, publish the harvest gatherings, protect the rest, gather the season's stories and lessons into the scorecard, and host the Handoff Festival at the September equinox, where the north brings the harvest and the south brings the seeds.",
    circle: "Seasons Circle",
    powers: [
      "Set the Rest Season calendar",
      "Hold back non-essential asks and letters during the season",
      "Convene the Season Festival and its scorecard",
      "Host the Handoff Festival with the incoming Design Season Organizer",
    ],
    rights: [
      "Access to the season's records and scorecard",
      "A seat at both passoffs that bracket the season",
      "Input on how the Handoff Festival is held",
    ],
    responsibilities: [
      "Receive the wheel at the June solstice and publish the harvest gatherings across the network",
      "Protect the rest: pause non-essential asks and letters, keep a gentle rhythm",
      "Gather the season's stories and lessons into the Season Festival scorecard",
      "Organize the Handoff Festival at the September equinox with the incoming Design Season Organizer",
    ],
    domains: "Rest Season calendar, harvest gatherings, the Season Festival, the Handoff Festival",
    band: 7,
    tokenAward: "900,000 $ReGen",
    maxTokenAward: "1,170,000 $ReGen",
    hoursPerWeek: 15,
    deliverables: [
      "Receive the wheel at the June solstice and publish the harvest gatherings across the network",
      "Protect the rest: pause non-essential asks and letters, keep a gentle rhythm",
      "Gather the season's stories and lessons into the Season Festival scorecard",
      "Organize the Handoff Festival at the September equinox with the incoming Design Season Organizer",
    ],
    seed: "The Handoff Festival happens, with the outgoing cohort's harvest shared",
    harvest: "Role holders report the season let them rest (Season Festival survey, target: 4+/5)",
    seasons: ["fall"],
    assignment: "Open",
    color: SEASON_THEMES.fall.accent,
  },
  // Role 14 in the Season 1 record, added there when the Assembly shipped
  // (2026-07-03) but never added here or to the roles table until 2026-09-24.
  {
    title: "Assembly Steward",
    characterName: "The Convener",
    tagline: "Tends the pipeline where the game evolves",
    emoji: "🗳️",
    characterImage: "/images/roles/assembly-steward-card.webp",
    sceneImage: "/images/roles/assembly-steward-scene.webp",
    purpose:
      "Tend the Assembly, the pipeline where the Game evolves: help raisers shape clear proposals, keep them moving through signals and votes, and make sure every ratified decision leaves a complete Record.",
    circle: "Community Circle",
    powers: [
      "Revive resting proposals and flag stale ones for the community",
      "Coach raisers on aim lines, lanes, and the consent bar",
      "Request impact updates from proposal owners after execution",
    ],
    rights: [
      "A standing voice in governance-variable tuning conversations",
      "Input on Assembly copy and empty-state teaching text",
    ],
    responsibilities: [
      "Nudge resting proposals back to life or help them close with dignity",
      "Help first-time raisers write a clear aim line and pick the right lane",
      "Close Record loops: confirm outcomes, chase impact updates, keep the provenance trail whole",
      "Watch the last-call strip and make sure objections get a fair hearing",
      "After a proposer launches their vote on Hypha, check that the Hypha proposal link is pasted back into the Assembly so the outcome applies itself when the vote closes",
    ],
    domains: "The Assembly (/assembly), proposal lifecycle, Record integrity, governance onboarding",
    band: 2,
    tokenAward: "400,000 $ReGen",
    maxTokenAward: "520,000 $ReGen",
    hoursPerWeek: 5,
    deliverables: [
      "Nudge resting proposals back to life or help them close with dignity",
      "Help first-time raisers write a clear aim line and pick the right lane",
      "Close Record loops: confirm outcomes, chase impact updates, keep the provenance trail whole",
      "Watch the last-call strip and make sure objections get a fair hearing",
      "After a proposer launches their vote on Hypha, check that the Hypha proposal link is pasted back into the Assembly so the outcome applies itself when the vote closes",
    ],
    seed: "Proposals shepherded through the pipeline (target: every forming proposal has a synthesis and a signal count above the readiness floor)",
    harvest: "Ratified decisions with complete Record trails and impact updates",
    seasons: ["winter", "spring", "summer"],
    assignment: "Open",
    color: forest.sage,
  },

  /* ═══════════════════════════════════════════════════════════════
     COOPERATIVE ROLES (kind: "fund")
     7 roles that carry the design work for the ReGen Network
     Cooperative, which is in design, holds nothing, and accepts no
     money (shared/fund.ts COOP).
     Titles are unchanged on purpose: seed-roles.ts and
     coordinationFlywheel.ts derive each slug from its title, and live
     holders key on those slugs (roleHolders.roleSlug). Renames wait for
     an explicit slug migration.
     Rewritten 2026-09-27: the earlier $RCivics awards (with dollar
     equivalents) and the fee pool are gone. How these roles are
     rewarded will be set with counsel.
     ═══════════════════════════════════════════════════════════════ */
  {
    title: "Fund Steward",
    characterName: "The Keeper of the Design",
    tagline: "Keeps the cooperative's design moving",
    emoji: "\u{1F3DB}\uFE0F",
    characterImage: "/images/roles/fund-steward-card.webp",
    sceneImage: "/images/roles/fund-steward-scene.webp",
    purpose:
      "Keep the design of the ReGen Network Cooperative moving with counsel, land projects and future members. Hold the design principles, carry questions to counsel and bring the answers back to the community, and draft the proposals that record each design decision. From Season 3 onwards, grow a shared design circle that holds this seat together.",
    circle: "Cooperative Design Circle",
    powers: [
      "Draft design proposals for community review",
      "Convene design sessions with land projects, future members and counsel",
      "Set the rhythm of the design work each season",
      "Form and convene a shared design circle from Season 3 onwards",
      "Represent the cooperative's design to alliance partners and allies",
    ],
    rights: [
      "Access to every design document and counsel note",
      "Pause a design decision that conflicts with the design principles until the community reviews it",
      "Final say on how design updates are written up for the community",
      "First look at feedback from land projects and people interested in the cooperative",
    ],
    responsibilities: [
      "Keep the design principles alive and evolving with the community",
      "Carry design questions to counsel and bring the answers back",
      "Hold design sessions each season with land projects and future members",
      "Grow a shared design circle through Season 2 and hand over shared stewardship in Season 3",
      "Report where the design stands at each Season Festival",
    ],
    domains:
      "The cooperative's design principles, design proposals, counsel liaison, design updates",
    band: 7,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 20,
    deliverables: [
      "A living design principles document, updated each season",
      "A written proposal for every design decision",
      "Notes from every design session",
      "A seasonal design update for the community, co-written with the Capital Weaver",
      "A charter for the shared design circle by the end of Season 2",
    ],
    seed: "Design principles published and referenced in every design decision",
    harvest: "Shared design circle seated by Season 3 launch, with land projects and future members taking part in design sessions",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Filled by Rye through Season 2, moving to a shared design circle in Season 3",
    color: amber.tan,
    kind: "fund",
  },
  {
    title: "Capital Weaver",
    characterName: "The Cultivator of Relations",
    tagline: "Tends relationships with land projects, allies and funders",
    emoji: "\u{1F91D}",
    characterImage: "/images/roles/capital-weaver-card.webp",
    sceneImage: "/images/roles/capital-weaver-scene.webp",
    purpose:
      "Weave relationships between land projects, allies and the funders who support land projects. Keep in touch with people and organizations who want to take part in the cooperative's design, host gatherings and site visits, and share how the design is going. Money for land projects goes through outside partners each project holds, never through ReGen Civics.",
    circle: "Relations Circle",
    powers: [
      "Open conversations with land projects, allies and funders on behalf of the design work",
      "Schedule and host gatherings and site visits",
      "Represent the design work at conferences and gatherings",
      "Draft the seasonal design update with the Fund Steward",
      "Recommend how people who told us they're interested join the design conversations",
    ],
    rights: [
      "Access to the relationship tracker and contact notes",
      "Use of ReGen Civics brand assets and design materials for outreach",
      "Budget for hosted gatherings and site visits",
      "Brings what people say directly into design discussions",
    ],
    responsibilities: [
      "Keep relationships with land projects, allies and funders warm week to week",
      "Invite people who told us they're interested into design conversations",
      "Host or co-host at least two gatherings per season",
      "Co-author the seasonal design update",
      "Connect funders with the outside partners each land project holds",
    ],
    domains:
      "Relationships with land projects, allies and funders, gatherings, the seasonal design update",
    band: 6,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 15,
    deliverables: [
      "Weekly relationship update to the Fund Steward",
      "Two gatherings per season (dinners, site visits, or webinars)",
      "Co-authored seasonal design update",
      "Updated one-pager on the cooperative's design each season",
      "A record of every design conversation and what came out of it",
    ],
    seed: "At least 20 warm conversations with land projects, allies and funders per season",
    harvest: "Land projects and future members taking part in the design conversations each season (Season Festival check)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open, hiring now",
    color: amber.tan,
    kind: "fund",
  },
  {
    title: "Due Diligence Lead",
    characterName: "The Witness of Soil and Soul",
    tagline: "Reads the land and the team before anything is decided",
    emoji: "\u{1F50D}",
    characterImage: "/images/roles/diligence-lead-card.webp",
    sceneImage: "/images/roles/diligence-lead-scene.webp",
    purpose:
      "Design how the cooperative would assess land and teams before any purchase. Visit land projects taking part in the design, read the land and the team, and build the regen viability rubric that future members could use. The role that says yes this land is alive and this team can hold it, or not yet.",
    circle: "Diligence Circle",
    powers: [
      "Visit land projects taking part in the design",
      "Build the regen viability rubric",
      "Write site visit reports that feed the cooperative's design",
      "Recommend how land and teams should be assessed",
      "Commission third-party soil, water, or legal assessments as needed",
    ],
    rights: [
      "Access to the land and team documents each project chooses to share",
      "Direct line to alliance experts for technical review",
      "Travel budget for site visits",
      "Authority to ask for more evidence before making a recommendation",
    ],
    responsibilities: [
      "Visit land projects in person where possible",
      "Write a site visit report within 30 days of each visit",
      "Maintain the regen viability rubric",
      "Present findings at design sessions alongside the Fund Steward",
      "Archive site visit reports so the network keeps learning",
    ],
    domains:
      "Land and team assessment design, regen viability rubric, site visit reports",
    band: 6,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 18,
    deliverables: [
      "Site visit report for every land project visited",
      "Updated regen viability rubric each season",
      "A proposed land assessment process for the cooperative's design",
      "Seasonal learning summary for the design sessions",
    ],
    seed: "Every visited land project has a site visit report",
    harvest: "The land assessment process is ready for the founding members to review (Season Festival check)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Open, hiring now",
    color: amber.tan,
    kind: "fund",
  },
  {
    title: "Portfolio Tender",
    characterName: "The Companion of the Land",
    tagline: "Walks with land projects, month to month",
    emoji: "\u{1F33E}",
    characterImage: "/images/roles/portfolio-tender-card.webp",
    sceneImage: "/images/roles/portfolio-tender-scene.webp",
    purpose:
      "Walk beside the land projects shaping the cooperative's design. Check in monthly, flag blockers early, coordinate with the Alliance Weaver on the Game side when a project needs ecosystem resources, and convene a peer circle where land projects meet each other and share what they are learning.",
    circle: "Land Project Circle",
    powers: [
      "Schedule monthly check-ins with land projects in the design cohort",
      "Flag land projects that need support to the design sessions",
      "Coordinate alliance support for land projects",
      "Convene the seasonal peer circle",
    ],
    rights: [
      "Access to the updates each land project chooses to share",
      "Direct line to the Alliance Weaver for Game-side resource connections",
      "Travel budget for site visits",
      "First look at early signs a project needs help",
    ],
    responsibilities: [
      "Monthly check-in with each land project in the design cohort",
      "A seasonal note on how land projects are doing, shared with the design sessions",
      "Host the seasonal peer circle",
      "Flag projects that need help at the earliest honest moment",
      "Write the land project chapter of the annual Impact Report with the Impact Witness",
    ],
    domains:
      "Land project support, peer circle convening, carrying land projects' needs into the design",
    band: 5,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 12,
    deliverables: [
      "Monthly check-in notes for each land project",
      "Seasonal land project health note",
      "Seasonal peer circle hosted",
      "Land project chapter of the annual Impact Report",
    ],
    seed: "Every land project in the design cohort receives a monthly check-in on time",
    harvest: "Land projects say they feel heard in the design (Season Festival survey, target: 4+/5)",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q3 2026",
    color: amber.tan,
    kind: "fund",
  },
  {
    title: "Fund Treasurer",
    characterName: "The Keeper of Records",
    tagline: "Keeps the design records straight",
    emoji: "\u{2696}\uFE0F",
    characterImage: "/images/roles/fund-treasurer-card.webp",
    sceneImage: "/images/roles/fund-treasurer-scene.webp",
    purpose:
      "Keep the cooperative's design records: decisions, counsel notes, and the list of land projects and people who have told us they're interested. Work out with counsel how the member registry and capital accounts would be kept once the cooperative forms. No treasury is held today.",
    circle: "Operations Circle",
    powers: [
      "Keep the design records and decide how they are filed",
      "Keep the interest list accurate and private",
      "Propose how the member registry would work, for counsel to review",
      "Answer community questions about where the design records stand",
    ],
    rights: [
      "Access to all design records and counsel correspondence",
      "Direct line to counsel on record-keeping questions",
      "Budget for record-keeping tools",
      "Authority to keep personal data from anyone without a reason to see it",
    ],
    responsibilities: [
      "Keep the design records current every month",
      "Look after the interest list and answer people's questions about their data",
      "Draft the member registry and capital account design with counsel",
      "Publish a seasonal note on where the records stand",
    ],
    domains:
      "Design records, the interest list, member registry design, record-keeping with counsel",
    band: 6,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 15,
    deliverables: [
      "Design records kept current each month",
      "An accurate, private interest list",
      "A member registry design ready for counsel to review",
      "A seasonal records note for the community",
    ],
    seed: "Design records updated on time, every month",
    harvest: "The member registry design is ready for the founding members to adopt, after counsel's review",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q3 2026",
    color: amber.tan,
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
      "Design how the network will measure what happens on the ground: soil health panels, biodiversity surveys, water retention, community wellbeing check-ins, and carbon accounting where it applies. Build baselines with land projects in the design cohort and revisit them each season. Co-author the annual Impact Report with the Portfolio Tender and the Storyteller on the Game side.",
    circle: "Impact Circle",
    powers: [
      "Set the impact measurement protocol with land projects",
      "Commission third-party soil, water, or biodiversity assessments",
      "Flag land projects where impact is heading the wrong way",
      "Publish the annual Impact Report",
      "Recommend impact measures for the cooperative's design",
    ],
    rights: [
      "Site visit access to land projects that invite it",
      "Budget for measurement equipment and third-party assessments",
      "Direct line to land project teams",
      "Authority to publish impact data even when inconvenient",
    ],
    responsibilities: [
      "Establish baseline measurements with land projects in the design cohort",
      "Revisit each of those projects at least once per season",
      "Seasonal impact data summary for the design sessions",
      "Co-author the annual Impact Report",
      "Maintain the impact measurement protocol as a living document",
    ],
    domains:
      "Impact measurement, soil and biodiversity assessment, carbon accounting, annual Impact Report",
    band: 5,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 12,
    deliverables: [
      "Baseline impact measurement for each land project in the design cohort",
      "Seasonal revisit report for each of those projects",
      "Seasonal impact data summary",
      "Annual Impact Report co-authored with Portfolio Tender and Storyteller",
    ],
    seed: "Every land project in the design cohort has a baseline and at least one seasonal revisit",
    harvest: "Annual Impact Report published on time and shared with the whole community",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q4 2026",
    color: amber.tan,
    kind: "fund",
  },
  {
    title: "Structure Keeper",
    characterName: "The Holder of Form",
    tagline: "Keeps the cooperative's legal design with counsel",
    emoji: "\u{1F4DC}",
    characterImage: "/images/roles/structure-keeper-card.webp",
    sceneImage: "/images/roles/structure-keeper-scene.webp",
    purpose:
      "Keep the cooperative's legal design and documents with counsel: the choice of legal form, the draft bylaws, the land-holding design, and the bridge between Hypha proposals and legal action. The cooperative is in design and is not yet a legal entity, so this role works with counsel on what the founding members will adopt.",
    circle: "Structure Circle",
    powers: [
      "Draft the cooperative's legal documents with counsel for the community to review",
      "Coordinate with external counsel on the legal design",
      "Keep the legal design calendar",
      "Flag any step that would get ahead of counsel",
      "Hold the bridge between Hypha proposals and legal action",
    ],
    rights: [
      "Access to all legal documents and counsel correspondence",
      "Budget for external counsel",
      "Authority to delay any action that creates legal risk until resolved",
      "Direct line to every design decision that has legal implications",
    ],
    responsibilities: [
      "Keep the legal design moving with counsel",
      "Keep the draft bylaws and design documents current",
      "Publish the legal design calendar and track every deadline",
      "Make sure no public page gets ahead of what counsel has confirmed",
      "Onboard external counsel as needs evolve",
    ],
    domains:
      "The cooperative's legal design, draft bylaws, counsel liaison, DAO-to-legal bridge",
    band: 6,
    tokenAward: "Set with counsel",
    maxTokenAward: "Set with counsel",
    hoursPerWeek: 10,
    deliverables: [
      "A legal design summary the community can read",
      "Current draft bylaws and design documents",
      "Published legal design calendar with every deadline met",
      "A clear list of open questions for counsel each season",
    ],
    seed: "Legal design documents current and every open question logged with counsel",
    harvest: "The legal form, bylaws and terms are ready for the founding members to adopt",
    seasons: ["winter", "spring", "summer", "fall"],
    assignment: "Applications open, activates Q2 2026",
    color: amber.tan,
    kind: "fund",
  },
];

export const seasons: Season[] = [
  {
    name: "Winter",
    emoji: "\u2744\uFE0F",
    months: "Sep to Dec",
    theme: "Design",
    description:
      "We build the tools, write the code, upgrade our systems and processes, and a new cohort of land projects designs their games in the incubator. This is the season of deep work: architecture, game design, governance, skill creation, infrastructure. The builders and designers are in their element.",
    // "Lead Builder" and "Quest Author" never matched a role title, so the
    // Team scorecard greyed out the Grand Builder and Quest Steward all winter.
    activeRoles: [
      "Grand Builder",
      "Security Reviewer",
      "Game Designer",
      "Skills Builder",
      "Tool Curator",
      "Quest Steward",
      "Season Facilitator",
      "Incubator Guide",
      "Design Season Organizer",
      "Assembly Steward",
    ],
    color: spring.base,
    current: getCurrentSeason() === "winter",
  },
  {
    name: "Spring",
    emoji: "\u{1F338}",
    months: "Dec to Mar",
    theme: "Resource",
    description:
      "The designs are done and the doors open. Land projects launch their crowdpools, people step into roles, and allies come to the table. The community is buzzing with new energy, new faces, new ideas. Outreach is at full volume.",
    activeRoles: [
      "Season Facilitator",
      "Incubator Guide",
      "Alliance Weaver",
      "Outreach Writer",
      "Forum Gardener",
      "Storyteller",
      "Resource Season Organizer",
      "Assembly Steward",
    ],
    color: spring.base,
    current: getCurrentSeason() === "spring",
  },
  {
    name: "Summer",
    emoji: "\u2600\uFE0F",
    months: "Mar to Jun",
    theme: "Build",
    description:
      "We go on the ground. Planting, building, village festivals, in-person gatherings, land project visits, community celebrations. The digital work meets the physical world. This is where the theory becomes soil under your feet.",
    activeRoles: ["Season Facilitator", "Alliance Weaver", "Storyteller", "Build Season Organizer", "Assembly Steward"],
    color: amber.tan,
    current: getCurrentSeason() === "summer",
  },
  {
    name: "Fall",
    emoji: "\u{1F342}",
    months: "Jun to Sep",
    theme: "Rest",
    description:
      "We step out of our Infinite Game roles and focus on family, in-person village life, personal projects. The community rests. The treasury and forum roles keep a gentle rhythm, but the pace slows intentionally. We compost what we learned.",
    activeRoles: ["Season Facilitator", "Treasury Steward", "Forum Gardener", "Rest Season Organizer"],
    color: amber.tan,
    current: getCurrentSeason() === "fall",
  },
];
