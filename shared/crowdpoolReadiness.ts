/**
 * Ready to crowdpool: what a land project shows before its campaign is
 * approved for the crowdpooling round. One definition, read by the public
 * checklist on /crowd-pooling, the steward's "Send for review" step, and the
 * review dialog the team approves from.
 *
 * Rye, 2026-09-24: "a concise and complete checklist projects need to check
 * in order to be approved for crowdpooling", drawn from what Season 2 offers
 * and the Governance Canvas. Rye named three: a legal structure; a way to
 * send and receive equity or other value that acknowledges contributions to
 * the land and the people, so crowdpool participants know what they get; and
 * a clear game that everyone can follow, including its governance and its
 * financial and economic system. The rest completes the /season2 graduation
 * list (governance, legal structure, economic model, financial plan, a
 * campaign ready to run) and the canvas pieces a newcomer needs.
 *
 * The same list applies to the Season 2 cohort and to community projects
 * joining the round. Every item asks that something is in place and clear,
 * never how good it is: the canvas's rule is that nothing adds up to a score.
 *
 * `weeks` are shared/season2Curriculum.ts. `canvas` names the Governance
 * Canvas blocks and foundations planned for Village-OS (block names only, per
 * the canvas's licence note).
 */

export type ReadinessItem = {
  /**
   * Permanent. Campaigns record a steward's ticks by key (the crowdpooling
   * lane, 2026-09-24), so renaming one orphans every stored tick. Change the
   * words freely; to replace an item, add a new key and retire the old one.
   */
  key: string;
  title: string;
  /** What it means, in a sentence or two. */
  need: string;
  /** What the project shows the review. */
  show: string;
  /** Season 2 weeks that work on it. */
  weeks: number[];
  /** Governance Canvas blocks and foundations it draws on. */
  canvas: string[];
};

export const READINESS_TITLE = "Ready to crowdpool";

/** Where the public checklist lives. */
export const READINESS_HREF = "/crowd-pooling#ready";

export const READINESS_INTRO =
  "Every project joining the crowdpooling round shows these eight before its campaign is approved, from the Season 2 cohort and from the wider community alike. Season 2 works through each one, and the Governance Canvas holds the governance pieces. The review checks that each is in place and clear, and nobody scores how good it is.";

export const CROWDPOOL_READINESS: ReadinessItem[] = [
  {
    key: "legal",
    title: "A legal structure",
    need: "A legal entity, or a fiscal host, that can sign agreements, receive money and in-kind contributions, and give back what you promise.",
    show: "Its name, type and country, or your fiscal host's.",
    weeks: [10, 11],
    canvas: ["Legal", "Legal Framework"],
  },
  {
    key: "land",
    title: "Secure access to the land",
    need: "Title, a lease, or a written agreement with the owner that runs long enough for what you're building.",
    show: "The document, or a summary of its terms and how long it runs.",
    weeks: [11],
    canvas: ["Legal"],
  },
  {
    key: "value",
    title: "A way to send and receive value",
    need: "Equity or other forms of value that acknowledge what people give to the land and to your project, so everyone who puts resources in knows what they get: shares, membership, your project's own tokens, stays, produce, or other returns.",
    show: "What each kind of contributor gets, how you record it, and that your legal structure can issue it where you raise.",
    weeks: [8, 9],
    canvas: ["Resourcing"],
  },
  {
    key: "game",
    title: "A clear game for everyone",
    need: "Anyone can see how to take part: members, contributors, neighbours, partners and the land itself, with the roles and quests open to each, and what each gives and gets.",
    show: "Your Game Guide.",
    weeks: [3, 4, 5],
    canvas: ["Purpose", "Team", "Roles", "Stakeholders"],
  },
  {
    key: "governance",
    title: "The game's governance",
    need: "Who decides what, how contributors get a voice, and how the rules themselves can change.",
    show: "Your decision matrix or written decision rules.",
    weeks: [3, 4],
    canvas: ["Power", "Decision Matrix", "Internal Rules"],
  },
  {
    key: "economy",
    title: "The game's economy and financial plan",
    need: "How money, tokens and other value move through the project, what this campaign pays for, and how the project keeps going after it.",
    show: "Your economic model and the budget for this campaign.",
    weeks: [5, 8, 9, 12],
    canvas: ["Resourcing", "Impact"],
  },
  {
    key: "care",
    title: "Care and conflict",
    need: "A written agreement for how tensions get raised and repaired, with a named person people can go to.",
    show: "The agreement, who holds it, and when you'll next review it.",
    weeks: [4, 6, 11],
    canvas: ["Conflict", "Internal Rules"],
  },
  {
    key: "campaign",
    title: "A campaign ready to run",
    need: "Your story with photos or video, every need with an amount (money, time, tools, materials, land and roles), stewards named to answer contributors, and a plan to report back on what came in and how you used it.",
    show: "Your campaign page, sent for review.",
    weeks: [13],
    canvas: ["Stakeholders", "Resourcing", "Learning"],
  },
];

/**
 * Keys that were once on the list and have been replaced. A campaign may
 * still hold a stored tick for one (campaign_readiness_ticks, migration
 * 0258), so a retired key stays readable and can be unticked, but never
 * newly ticked. Empty today. When an item is replaced, add its old key here
 * in the same change that adds the new item.
 */
export const RETIRED_READINESS_KEYS: string[] = [];

/** A current key: one a steward can tick today. */
export function isCurrentReadinessKey(key: string): boolean {
  return CROWDPOOL_READINESS.some((item) => item.key === key);
}

/** A key a stored tick may carry: current or retired. */
export function isReadinessKey(key: string): boolean {
  return isCurrentReadinessKey(key) || RETIRED_READINESS_KEYS.includes(key);
}

/** "Week 13", "Weeks 10 and 11", "Weeks 3 to 5", "Weeks 5, 8, 9 and 12". */
export function weeksLabel(weeks: number[]): string {
  const w = [...weeks].sort((a, b) => a - b);
  if (w.length === 1) return `Week ${w[0]}`;
  const consecutive = w.every((n, i) => i === 0 || n === w[i - 1] + 1);
  if (consecutive && w.length > 2) return `Weeks ${w[0]} to ${w[w.length - 1]}`;
  return `Weeks ${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}`;
}
