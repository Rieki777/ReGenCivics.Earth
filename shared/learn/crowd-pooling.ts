import type { LearnArticle } from "../learnContent";

export const crowdPooling: LearnArticle = {
  slug: "crowd-pooling",
  title: "Crowd pooling: community investment in land, beyond cash",
  metaTitle: "Crowd Pooling: Community Investment in Land Beyond Cash",
  metaDescription:
    "Crowd pooling is crowdfunding for hours, tools, materials, equipment loans, skills, and knowledge. How the ReGen Civics needs registry, claim lifecycle, and nine-capital tracking work, and where the money actually goes.",
  answer:
    "Crowd pooling is crowdfunding for everything money is not: hours, tools, materials, equipment loans, skills, and knowledge. A land project lists exact needs with counts and deadlines, people claim the pieces they can bring, and nothing counts until it is delivered. ReGen Civics tracks that capital and routes cash to partners.",
  author: "Rye (Rieki Cordon)",
  authorTitle: "Founder, ReGen Civics",
  published: "2026-08-01",
  updated: "2026-08-01",
  sections: [
    {
      heading: "A barn raising with a public ledger",
      paragraphs: [
        "Crowdfunding platforms pool one thing, which is cash. A land project coming alive needs nine kinds of capital, and most of what a community can actually give is time, skill, tools, and materials. That side has never been tracked well anywhere, so communities full of willing people conclude they are broke.",
        "A crowd pooling campaign is a land project's whole public ask in one place. It lists everything the project needs to come alive, people claim the pieces they can bring, and the platform follows each contribution from pledge to delivery to thank-you.",
      ],
    },
    {
      heading: "A need is a slot, not a wish",
      paragraphs: [
        "Requests without a count, a deadline, and a state quietly die. That is the failure mode of every volunteer board and mutual aid thread. So on a campaign, every need says exactly what, how many, and by when.",
      ],
      bullets: [
        "Items: 40 cedar posts, 12 of 40 claimed",
        "Roles: tool librarian for August, 0 of 1 filled",
        "Shifts: Saturday work party, 9am to 1pm, 8 of 12 spots",
        "Tool loans: wood chipper for June, condition checked at handoff and at return",
        "Knowledge: a two-hour pond design consult",
        "Money: a link to the project's partner funding page",
      ],
      table: {
        caption: "The claim lifecycle. Every contribution moves through these four states",
        columns: ["Stage", "What it means", "What it triggers"],
        rows: [
          [
            "Pledged",
            "Someone claims a need. No account required, just a name and an email",
            "The slot shows as promised, drawn as a light overlay on the progress bar",
          ],
          [
            "Accepted",
            "The campaign steward confirms the fit",
            "The contributor's name goes on the slot and reminders start",
          ],
          [
            "Delivered",
            "The thing actually arrived. The shift happened, the lumber showed up, the consult was given",
            "Progress moves for real, contribution score is earned, and the capital lands on the contributor's Living Tree",
          ],
          [
            "Thanked",
            "The steward closes the loop with a note or a photo of the contribution in use",
            "Required, not optional. It is the single strongest driver of people coming back",
          ],
        ],
        source: "ReGen Civics crowd pooling platform, needs registry and claim lifecycle",
        sourceUrl: "/crowd-pooling",
      },
    },
    {
      heading: "Nothing of value moves on a promise",
      paragraphs: [
        "Delivery is the moment that counts. A pledge earns nobody anything, moves no solid progress bar, and creates no obligation. Claims that do not land simply expire and the slot reopens for someone else.",
        "This is the rule that keeps the ledger honest, and it is why a crowd pooling page can be read as a factual record of what a community actually built rather than as a record of what it meant to.",
      ],
    },
    {
      heading: "What contributors receive",
      bullets: [
        "Their Living Tree grows. Every delivered contribution is recorded under its form of capital on the player profile.",
        "Contribution score, which moves a player through the citizenship tiers in the game.",
        "Gratitude from anyone in the community, which carries real weight in the game economy.",
        "Project tokens, where a project chooses to formalize a significant contribution through its own Hypha organization on Base.",
        "Their name on the slot and the thank-you photo of their lumber in the wall.",
      ],
      paragraphs: [
        "There are no platform tokens issued for pooling. You are putting resources into a specific project, and the recognition follows the work. The capitals each contribution lands on come from the same nine we use everywhere else, described in [the nine forms of capital](/learn/nine-forms-of-capital). A campaign shows a live balance meter reading how many of the nine it has covered, because a campaign asking only for money and hours is a campaign that has not thought about what it needs.",
      ],
    },
    {
      heading: "Where the money goes, and why we never touch it",
      paragraphs: [
        "We do not process payments, hold funds, or take a cut. Financial needs on a campaign are links to partners who already run those rails well.",
        "Ma Earth takes donations and matches them with grants from a shared pool, weighted so that many small donors multiply the match more than a few large ones do. GoSteward arranges loans for established regenerative businesses, where investors fund the loan and earn a return, and helps projects design a full capital stack across grants, loans, equity, and community support.",
        "A campaign page reads live totals from both, so the whole capital stack sits on one page: given in kind through us, donated and matched through Ma Earth, loaned through GoSteward. That combined view does not exist anywhere else that we know of.",
      ],
    },
    {
      heading: "Running one, if you steward a land project",
      bullets: [
        "List specific needs, never vague asks. Volunteers wanted dies. Three of five carpenters found recruits.",
        "Spread the sizes. A third small asks, a third medium, a third large, so everyone finds an entry point.",
        "Line up your first claims before going public. Pools that open at zero stay at zero.",
        "Accept or release claims quickly, and mark delivery the day it happens.",
        "Thank every delivered contribution with a note or photo.",
        "Plan something for the middle of the campaign. The mid-campaign lull happens to everyone.",
      ],
      paragraphs: [
        "Campaigns grow out of a project's incubator application, so most of the work is already done by the time you get here. Campaigns marked Example on the site show how it works ahead of the first season of live campaigns.",
      ],
    },
    {
      heading: "Principles we hold to",
      bullets: [
        "Nothing of value moves on a promise. Delivery is the moment that counts.",
        "Real numbers or no numbers. No invented avatars, no padded counts, examples always labeled.",
        "Names on contributions by default, anonymity always available.",
        "We celebrate people and we never rank them. No leaderboards.",
        "Money belongs with partners who do it well.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is crowd pooling?",
      answer:
        "Pooling everything a project needs, not only money. A land project lists exact needs with counts and deadlines, covering hours, roles, tools, equipment loans, materials, and knowledge. People claim the pieces they can bring, and each contribution is tracked from pledge through delivery to a thank-you.",
    },
    {
      question: "How is crowd pooling different from crowdfunding?",
      answer:
        "Crowdfunding pools cash and counts a pledge as success. Crowd pooling pools nine forms of capital and counts nothing until it is delivered. We also do not process payments at all. Cash needs link out to partner platforms while we track the capital money cannot buy.",
    },
    {
      question: "Do I need an account to contribute?",
      answer:
        "No. Claiming a need takes a name and an email. Creating an account afterward links your delivered contributions to a player profile, so they land on your Living Tree and count toward contribution score, but the claim itself does not require one.",
    },
    {
      question: "Does ReGen Civics take a percentage?",
      answer:
        "No. We do not process payments, hold funds, or take a cut of anything. Financial needs are links to Ma Earth for donations with matching grants and GoSteward for loans. What we run is the registry of non-financial needs and the record of what was delivered.",
    },
    {
      question: "What happens if someone pledges and never delivers?",
      answer:
        "The claim expires and the slot reopens automatically for someone else. No score, no capital, and no record of contribution is created, because nothing of value moves on a promise. Stewards get a weekly digest of unfilled needs and expiring claims so nothing sits silently.",
    },
    {
      question: "Can a project raise actual investment through crowd pooling?",
      answer:
        "Investment runs through the fund and through partner platforms, not through the pooling registry. A well-run campaign is often what makes a project investable, because it demonstrates a community that shows up. Start at [the fund page](/fund) for the investment side.",
    },
  ],
  nextSteps: [
    {
      label: "See crowd pooling campaigns",
      href: "/crowd-pooling-projects",
      blurb:
        "Browse live and example campaigns, their needs registries, and what has been delivered.",
    },
    {
      label: "Apply to the incubator",
      href: "/apply",
      blurb:
        "Campaigns grow out of incubator applications. Season 2 starts September 2026.",
    },
  ],
  related: [
    "nine-forms-of-capital",
    "intentional-community-structures",
    "start-a-community-on-your-land",
  ],
};
