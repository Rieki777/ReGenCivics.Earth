/**
 * The Season 2 curriculum. One definition, read by everything.
 *
 * Before this file existed the thirteen weeks lived in four places that had
 * drifted apart: `weeklyTopics` in Seasons.tsx, `SEASON2_EPISODE_DEFS` in
 * seasonEvents.ts, `SEED_EVENTS` in routes/events.ts, and the rows those seeds
 * had written into MySQL months earlier. On 2026-09-07 the production site was
 * serving three different answers at once: /seasons said week 6 was "Explore
 * the ReGen Civics Ecosystem", /season2 and every calendar invite said "Intro
 * to the ReGen Civics DHO", and /schedule said "Community Building". Weeks 3
 * through 13 disagreed the same way. Anyone who had subscribed to the calendar
 * was holding titles nobody on the site could see.
 *
 * So: the curriculum is defined here, and the pages, the events table, and the
 * ICS feeds all read it. Change a title once. Nothing to keep in lockstep.
 *
 * `audience` decides who a session is written for and which feed carries it.
 * Selection Day is open to anyone; the other twelve are cohort working
 * sessions that the public follows on the SEEDS livestream.
 */

export type EpisodeAudience = "public" | "cohort";

export type Season2Episode = {
  /** 1-13. Matches `events.episodeNumber`. */
  week: number;
  /** Title without the "Week N: " prefix. Pages add their own numbering. */
  title: string;
  description: string;
  audience: EpisodeAudience;
};

export const SEASON2_CURRICULUM: Season2Episode[] = [
  {
    week: 1,
    title: "Selection Day",
    description:
      "An overview of everything we are doing this season, then every applying project gets three to five minutes to share what they are building. We choose the cohort live on the call. Open to everyone, so come and watch even if you are not applying.",
    audience: "public",
  },
  {
    week: 2,
    title: "Incubator Overview",
    description:
      "How the incubator works. What each week covers, what you bring, what you get, and how we work together. Weeks two through twelve build the scaffolding and infrastructure your project runs on. Week thirteen is when you invite people in.",
    audience: "cohort",
  },
  {
    week: 3,
    title: "Game & Organisation Co-Creation Part 1",
    description:
      "Designing the structure of your project. How to organise a community that decides together, holds resources together, and can grow without one person carrying all of it.",
    audience: "cohort",
  },
  {
    week: 4,
    title: "Game & Organisation Co-Creation Part 2",
    description:
      "Putting the structure into practice. Standing up your organisation, writing your first agreements, and deciding who decides what.",
    audience: "cohort",
  },
  {
    week: 5,
    title: "Game Guides & Economic Systems",
    description:
      "Writing your project's Game Guide and starting your economic system. How to document the plays that make your project work, so another project can run them too.",
    audience: "cohort",
  },
  {
    week: 6,
    title: "Growing Your Village",
    description:
      "Getting ready to hold people. How you onboard someone so they stay, run gatherings worth travelling for, and build the belonging that turns a core team into a village. You invite them in at week thirteen; this is the week you build the capacity to receive them.",
    audience: "cohort",
  },
  {
    week: 7,
    title: "The ReGen Civics Ecosystem & the Fund",
    description:
      "How the network supports your project. What the ReGen Civics Fund is, how the alliance works, what other projects and partners can offer you, and how to plug in.",
    audience: "cohort",
  },
  {
    week: 8,
    title: "Tokenomics Part 1",
    description:
      "The art and science of token-assisted land economies. What tokens are good for, what they are bad at, and how they carry value between a project and the people backing it.",
    audience: "cohort",
  },
  {
    week: 9,
    title: "Tokenomics Part 2",
    description:
      "Designing the token model for your own project. Supply, earning, spending, and how your model connects to the wider ReGen economy.",
    audience: "cohort",
  },
  {
    week: 10,
    title: "Legal Structures Part 1",
    description:
      "The expansive world of legal structures. How land projects relate to nation states, and what the real options are.",
    audience: "cohort",
  },
  {
    week: 11,
    title: "Legal Structures Part 2",
    description:
      "Practical legal work. Land ownership, community agreements, and staying compliant while building something new.",
    audience: "cohort",
  },
  {
    week: 12,
    title: "Coordination & Minimum Viable Economies",
    description:
      "Meeting your needs through coordination. What a minimum viable economy looks like on the ground, and how a project reaches the point where it can feed and hold its people.",
    audience: "cohort",
  },
  {
    week: 13,
    title: "Crowd Pooling & Resourcing Our Projects",
    description:
      "The season's last live session, and the week you invite people in. We launch the shared crowdpool: how projects raise together, what goes live, and how your community backs you. Project stewards share where they landed. After this the journey continues at the monthly Open Access Sessions.",
    audience: "cohort",
  },
];

/** "Week 3: Game & Organisation Co-Creation Part 1" */
export function episodeTitle(ep: Season2Episode): string {
  return `Week ${ep.week}: ${ep.title}`;
}

export function episodeByWeek(week: number): Season2Episode | undefined {
  return SEASON2_CURRICULUM.find((e) => e.week === week);
}

/** Weeks anyone may attend live. Currently Selection Day only. */
export const PUBLIC_EPISODE_WEEKS: number[] = SEASON2_CURRICULUM.filter(
  (e) => e.audience === "public",
).map((e) => e.week);
