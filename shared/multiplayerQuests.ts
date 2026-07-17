/**
 * Multiplayer Mode quest definitions (Phase A, improvement 1).
 *
 * Quests in ReGen Civics are file-based (client/src/data/questData.ts), keyed by
 * a varchar questId that quest_completions stores. Multiplayer quests follow the
 * same pattern: this module is the single source of truth for both the server
 * (crew assembly job, signup validation) and the client (/multiplayer page,
 * quest cards). There is no quest table to migrate; crewSizeMin/crewSizeMax live
 * here instead of in SQL, verified against drizzle/schema.ts on 2026-07-16.
 *
 * status "draft" quests never render and never accept signups. Rye ratifies the
 * copy and rewards (writing rules in STEERING.md section 1 apply to every field
 * a player reads), then flips status to "live".
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 * SDT rubric: every multiplayer quest is scored 1 to 5 for autonomy, competence,
 * and relatedness before shipping (see .claude/skills/regen-quest-builder).
 */

export type CrewRole = {
  name: string;
  description: string;
};

export type MultiplayerQuest = {
  /** Stable key written to quest_completions.questId and quest_crews.questId. */
  questId: string;
  slug: string;
  title: string;
  subtitle: string;
  /** 1 to 3 sentences of card copy. */
  description: string;
  /** 3 to 4 narrative sentences for the detail view. */
  storyCard: string;
  crewSizeMin: number;
  crewSizeMax: number;
  /** The distinct parts that make this structurally a crew quest. */
  crewRoles: CrewRole[];
  reward: { regen: number; rvoice: number };
  deliverable: string;
  estimatedTime: string;
  steps: { title: string; description: string }[];
  /** What the crew thread's welcome post names as done. */
  definitionOfDone: string;
  /** Lucide icon name, resolved on the client only. */
  icon: string;
  /** Drafts are invisible everywhere until Rye ratifies and flips to live. */
  status: "draft" | "live";
  /** Self-determination theory scores, 1 to 5 each. */
  sdt: { autonomy: number; competence: number; relatedness: number; notes: string };
};

export const MULTIPLAYER_QUESTS: MultiplayerQuest[] = [
  {
    questId: "crew-quest-1",
    slug: "river-cleanup-crew",
    title: "River Cleanup Crew",
    subtitle: "Leave the Water Cleaner",
    description:
      "Pick a stretch of river, creek, or trailhead near you and clear it with your crew. Three to seven players, one morning, one visible change to a place you love.",
    storyCard:
      "Every bioregion has a stretch of water carrying more than it should. A crew with gloves and a free morning can change that by lunch. You will scout it, clear it, weigh what you hauled, and leave the place measurably better than you found it. The river remembers who shows up.",
    crewSizeMin: 3,
    crewSizeMax: 7,
    crewRoles: [
      { name: "Scout", description: "Walks the stretch ahead of time, checks access and parking, picks the meetup point and time." },
      { name: "Hauler", description: "Brings bags, gloves, and grabbers, and carries what the crew pulls. A crew can have several haulers." },
      { name: "Sorter", description: "Splits the haul into recycling, trash, and salvage, then counts and weighs it." },
      { name: "Documenter", description: "Takes the before and after photos, records the totals, posts the report to the crew thread." },
    ],
    reward: { regen: 144, rvoice: 1 },
    deliverable: "Before and after photos plus the haul totals, posted to your crew thread.",
    estimatedTime: "One half-day outing plus planning in the crew thread",
    steps: [
      { title: "Claim your roles", description: "In the crew thread, each member claims a role: scout, hauler, sorter, documenter. Doubling up is fine on a small crew." },
      { title: "Scout the stretch", description: "The scout walks the site, confirms it is safe and legal to work, and posts the meetup point, date, and what to bring." },
      { title: "Gather the gear", description: "Gloves, bags, grabbers if you have them, water, and a scale or a good counting system for the haul." },
      { title: "Clear it together", description: "Work the stretch as one crew. Stay in sight of each other, skip anything sharp or hazardous you are not equipped for, and let the biggest finds wait for the right tools." },
      { title: "Sort and weigh", description: "The sorter splits the haul into recycling, trash, and salvage, and tallies bags and weight." },
      { title: "Post the report", description: "The documenter posts before and after photos and the totals to the crew thread. Every member then logs the quest complete from the multiplayer page." },
    ],
    definitionOfDone:
      "Before and after photos and the haul totals are posted in the crew thread, and every crew member has logged their completion.",
    icon: "Droplets",
    status: "draft",
    sdt: {
      autonomy: 4,
      competence: 4,
      relatedness: 5,
      notes: "Crew picks the site, date, and roles (autonomy). The result is visible and measurable the same day (competence). Shared physical work with one shared before and after binds the crew (relatedness).",
    },
  },
  {
    questId: "crew-quest-2",
    slug: "seed-swap-crew",
    title: "Seed Swap",
    subtitle: "Growers, Drivers, and a Host",
    description:
      "Run a seed swap for your bioregion. Growers bring seeds, a host offers the table, a driver reaches the folks who can't come. Everyone leaves with something new to plant.",
    storyCard:
      "Seeds carry the memory of a place: which tomato ripens before your first frost, which beans your neighbor's grandmother kept alive. A swap moves that memory between hands that will plant it. Your crew sets the table, spreads the word, and writes down what changed hands so the bioregion knows what it holds.",
    crewSizeMin: 3,
    crewSizeMax: 7,
    crewRoles: [
      { name: "Host", description: "Offers the space and the table: a porch, a community room, a farmers market corner. Sets the date." },
      { name: "Grower", description: "Brings saved seeds, labeled with variety and year. A swap wants at least two growers." },
      { name: "Driver", description: "Runs a pickup and drop-off circuit for growers and neighbors who can't make it in person." },
      { name: "Scribe", description: "Keeps the swap list: what arrived, what left, and with whom, so the crew can post it after." },
    ],
    reward: { regen: 144, rvoice: 1 },
    deliverable: "A photo of the swap table and the swap list, posted to your crew thread.",
    estimatedTime: "Two to three weeks of light planning, one swap day",
    steps: [
      { title: "Claim your roles", description: "Host, growers, driver, scribe. Claim them in the crew thread and set the date at least two weeks out." },
      { title: "Spread the word", description: "Each member invites growers they know. Post the swap in your local networks and the ReGen forum." },
      { title: "Prepare the seeds", description: "Growers label everything: variety, year saved, growing notes if they have them. Small envelopes beat loose jars." },
      { title: "Run the swap", description: "The host sets the table, the driver runs the circuit, the scribe writes down what moves. Leave time for people to talk; the stories are half the swap." },
      { title: "Post the list", description: "The scribe posts the swap list and a photo of the table to the crew thread. Every member then logs the quest complete." },
    ],
    definitionOfDone:
      "The swap happened, the swap list and a table photo are posted in the crew thread, and every crew member has logged their completion.",
    icon: "Sprout",
    status: "draft",
    sdt: {
      autonomy: 5,
      competence: 3,
      relatedness: 4,
      notes: "The crew designs the whole event (autonomy). Success is a held event rather than a skill test, so competence reads gentler (competence). Growers, drivers, and neighbors meet face to face over living material (relatedness).",
    },
  },
  {
    questId: "crew-quest-3",
    slug: "community-meal-crew",
    title: "Community Meal",
    subtitle: "Cooked From What the Land Gave",
    description:
      "Cook one meal together from gleaned, grown, or locally raised food, and share it. A gleaner, a cook, a host, and as many guests as the table can hold.",
    storyCard:
      "There is food falling off trees in every town, seconds at every farm, and abundance in gardens that outgrew their gardeners. Your crew gathers what would have been missed, cooks it into one meal, and fills a table with it. Each dish gets its story told: where it came from, who grew it, who said yes when you asked.",
    crewSizeMin: 3,
    crewSizeMax: 7,
    crewRoles: [
      { name: "Gleaner", description: "Finds the food with consent: gleaning networks, farm seconds, home gardens, the neighbor's overloaded fruit tree. Always asked for, never taken." },
      { name: "Cook", description: "Turns the gathered food into the meal. Plans the menu around what actually shows up." },
      { name: "Host", description: "Offers the kitchen and the table, sets the date, and holds the room." },
      { name: "Inviter", description: "Fills the seats: crew, neighbors, someone who has never heard of ReGen Civics. Tells the story of each dish at the table." },
    ],
    reward: { regen: 144, rvoice: 1 },
    deliverable: "A photo of the table and a short account of where each dish came from, posted to your crew thread.",
    estimatedTime: "One to two weeks of sourcing, one shared evening",
    steps: [
      { title: "Claim your roles", description: "Gleaner, cook, host, inviter. Claim them in the crew thread and pick the date." },
      { title: "Source with consent", description: "The gleaner lines up the food. Every source said yes: the farmer, the gardener, the tree's owner. Note where each thing came from." },
      { title: "Plan the menu around the harvest", description: "The cook waits to see what arrives, then builds the meal from it. Imperfect produce cooks the same." },
      { title: "Cook together", description: "Whoever can, comes early and cooks. The kitchen is half the gathering." },
      { title: "Share the meal and the stories", description: "At the table, the inviter tells where each dish came from. Take one photo of the full table." },
      { title: "Post the account", description: "Post the photo and the source stories to the crew thread. Every member then logs the quest complete." },
    ],
    definitionOfDone:
      "The meal was shared, the table photo and the source account are posted in the crew thread, and every crew member has logged their completion.",
    icon: "Apple",
    status: "draft",
    sdt: {
      autonomy: 4,
      competence: 4,
      relatedness: 5,
      notes: "Menu, sourcing, and guest list are the crew's to shape (autonomy). Cooking a real meal from found food is a satisfying skill arc (competence). Eating together is the oldest relatedness technology there is (relatedness).",
    },
  },
  {
    questId: "crew-quest-4",
    slug: "work-party-crew",
    title: "Land Project Work Party",
    subtitle: "One Day, Many Hands",
    description:
      "Give a regenerative land project one full crew day. The project names the work; your crew brings the hands, the tools, and lunch.",
    storyCard:
      "Every land project has a list that never gets shorter: fence lines, swales, plantings, the barn that needs clearing before winter. A crew of four to seven can move a week of that list in a day. Your liaison asks the stewards what would help most, and the crew shows up ready. The land keeps the work long after the day ends.",
    crewSizeMin: 4,
    crewSizeMax: 7,
    crewRoles: [
      { name: "Liaison", description: "Reaches the land project's stewards, gets the task list, and agrees on the date, tools, and ground rules." },
      { name: "Tool Keeper", description: "Collects what the crew needs from the project and each member's shed, and gets it all there and back." },
      { name: "Crew Hands", description: "The muscle and the care. Most of the crew is hands; that is the point." },
      { name: "Documenter", description: "Photographs the work, keeps the tally of what got done, and posts the report." },
    ],
    reward: { regen: 144, rvoice: 1 },
    deliverable: "A report of what got built, planted, or cleared, with photos, posted to your crew thread.",
    estimatedTime: "One to two weeks of coordination, one full work day",
    steps: [
      { title: "Claim your roles", description: "Liaison, tool keeper, documenter, hands. Claim them in the crew thread." },
      { title: "Find the project", description: "The liaison reaches a regenerative land project in your bioregion: an incubator project, a farm the crew knows, a community garden with real needs." },
      { title: "Agree on the work", description: "The stewards name the tasks and any skills or tools they need. The liaison posts the plan: date, tasks, tool list, lunch plan, and safety notes." },
      { title: "Work the day", description: "Show up on time, work the list, take breaks together, and let the stewards direct. Their land, their call." },
      { title: "Close the loop", description: "The documenter posts photos and the done list to the crew thread. Thank the stewards where they can see it." },
      { title: "Log completion", description: "Every member logs the quest complete from the multiplayer page." },
    ],
    definitionOfDone:
      "The work day happened, the stewards confirmed the tasks were done, the report with photos is posted in the crew thread, and every crew member has logged their completion.",
    icon: "TreeDeciduous",
    status: "draft",
    sdt: {
      autonomy: 3,
      competence: 5,
      relatedness: 5,
      notes: "The stewards direct the work, so the crew trades some autonomy for service (autonomy). Real physical results on real land is the strongest competence signal in the game (competence). A shared day of labor plus lunch builds crew bonds and a bond to the project (relatedness).",
    },
  },
  {
    questId: "crew-quest-5",
    slug: "story-harvest-crew",
    title: "Bioregion Story Harvest",
    subtitle: "The Elders Remember",
    description:
      "Sit with the elders of your place and record what they remember. One interviewer, one recorder, one writer, and a story your bioregion keeps.",
    storyCard:
      "Every bioregion holds people who remember what it was: where the salmon ran, what grew before the parking lot, which families kept which land alive. Those memories leave when they do, unless someone sits down and listens. Your crew finds an elder willing to share, records the conversation with full consent, and writes it into a story the elder approves before anyone else reads it.",
    crewSizeMin: 3,
    crewSizeMax: 5,
    crewRoles: [
      { name: "Interviewer", description: "Finds the elder, builds the relationship, prepares the questions, and holds the conversation." },
      { name: "Recorder", description: "Handles consent in writing, runs the audio, and keeps the backups safe." },
      { name: "Writer", description: "Turns the conversation into a written story, and brings it back to the elder for approval before it is shared anywhere." },
    ],
    reward: { regen: 144, rvoice: 1 },
    deliverable: "One elder-approved written story, posted to the forum with the elder's consent on record.",
    estimatedTime: "Three to six weeks: finding, sitting, writing, approving",
    steps: [
      { title: "Claim your roles", description: "Interviewer, recorder, writer. Claim them in the crew thread. On a crew of five, two can share the interviewing and two the writing." },
      { title: "Find the elder", description: "Someone who has lived your bioregion long enough to remember it differently. Family, neighbors, a local historical society, a longtime farmer. The interviewer asks, plainly, whether they would share their memories of the place." },
      { title: "Get consent first", description: "The recorder puts consent in writing before anything records: what is being made, where it will be shared, and that the elder approves the final story or it goes nowhere." },
      { title: "Hold the conversation", description: "One sitting, maybe two. The interviewer asks about the place, then listens. The recorder runs the audio and takes pressure off the conversation." },
      { title: "Write the story", description: "The writer shapes the conversation into a story in the elder's own words wherever possible. No embellishment; the memory is the treasure." },
      { title: "Bring it back", description: "The elder reads or hears the draft and changes whatever they want. Only their approved version exists." },
      { title: "Share it", description: "Post the approved story to the forum, tagged to your bioregion. Every member then logs the quest complete." },
    ],
    definitionOfDone:
      "An elder-approved story is posted to the forum with written consent on record, and every crew member has logged their completion.",
    icon: "MessageSquare",
    status: "draft",
    sdt: {
      autonomy: 4,
      competence: 4,
      relatedness: 5,
      notes: "The crew chooses the elder, the questions, and the story's shape within a firm consent rail (autonomy). Interviewing and writing are real crafts with a finished artifact (competence). The quest builds a bond inside the crew and a second one across generations (relatedness).",
    },
  },
];

/** Quests players can see and sign up for. Drafts are invisible everywhere. */
export function liveMultiplayerQuests(): MultiplayerQuest[] {
  return MULTIPLAYER_QUESTS.filter((q) => q.status === "live");
}

export function getMultiplayerQuest(questId: string): MultiplayerQuest | undefined {
  return MULTIPLAYER_QUESTS.find((q) => q.questId === questId);
}

export function getLiveMultiplayerQuest(questId: string): MultiplayerQuest | undefined {
  return liveMultiplayerQuests().find((q) => q.questId === questId);
}
