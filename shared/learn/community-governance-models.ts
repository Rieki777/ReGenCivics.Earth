import type { LearnArticle } from "../learnContent";

export const communityGovernanceModels: LearnArticle = {
  slug: "community-governance-models",
  title: "Community governance models, compared",
  metaTitle: "Community Governance Models Compared: Consensus, Sociocracy, DAO",
  metaDescription:
    "Consensus, consent, sociocracy, holacracy, majority vote, and token-weighted DAO governance compared side by side: how a decision passes, what each is strong at, where each one breaks, and where it came from.",
  answer:
    "Community governance models differ on one question: what makes a decision final. Consensus needs everyone to agree. Consent needs nobody to have a reasoned objection. Majority vote needs half plus one. Token voting weighs by holdings. Pick by how your group behaves under disagreement, not by which model sounds fairest.",
  author: "Rye (Rieki Cordon)",
  authorTitle: "Founder, ReGen Civics",
  published: "2026-08-01",
  updated: "2026-08-01",
  sections: [
    {
      heading: "The models, side by side",
      paragraphs: [
        "Every model below is in live use somewhere, and every one of them fails in a specific, predictable way. The failure mode is the useful column. Groups adopt a model for its strength and then meet its failure mode alone, at the worst moment, assuming they broke it.",
      ],
      table: {
        caption: "Community governance models compared",
        columns: [
          "Model",
          "How a decision passes",
          "Strong at",
          "Where it breaks",
          "Origin",
        ],
        rows: [
          [
            "Full consensus",
            "Everyone agrees",
            "Small groups with high trust and real time to talk",
            "One person can hold the whole group. Decisions get avoided rather than made, and the quiet majority stops speaking",
            "Quaker meeting practice, carried into movement organizing in the 1970s",
          ],
          [
            "Consent, as in sociocracy",
            "Nobody has a reasoned objection based on the group's aims",
            "Moving quickly while still hearing dissent, and delegating to circles",
            "Requires a trained facilitator. Without one it collapses back into consensus",
            "Gerard Endenburg, Netherlands, 1970s, building on Kees Boeke's work",
          ],
          [
            "Holacracy",
            "A defined role holds the authority, tensions get processed in governance meetings",
            "Clarity about who decides what in operational work",
            "Heavy process for a residential community. Roles multiply and people burn out on the meetings",
            "Brian Robertson, 2007",
          ],
          [
            "Majority vote",
            "More than half agree",
            "Speed, scale, and being obvious to newcomers",
            "A stable minority loses every time and eventually leaves",
            "Robert's Rules of Order, first published 1876",
          ],
          [
            "Supermajority plus council",
            "Two thirds or more, with a standing council for daily calls",
            "Larger communities that still want a high bar on big decisions",
            "The council quietly becomes the government unless its remit is written tightly",
            "Common in cooperatives and condominium associations",
          ],
          [
            "Benevolent founder",
            "The founder decides",
            "The first two years, when speed matters more than legitimacy",
            "It does not transfer. The community cannot outlive the founder's attention",
            "Default state of most new projects, chosen or not",
          ],
          [
            "Token-weighted DAO voting",
            "Token holders vote, weighted by holdings",
            "Transparency, remote participation, an auditable record",
            "Whoever holds the most tokens governs. Buying influence is a feature of the design",
            "Ethereum-based organizations from 2016 onward",
          ],
          [
            "Contribution-weighted voice",
            "Voice is earned through verified contribution, then voted",
            "Tying decision power to the people doing the work",
            "Someone has to verify contribution, and that verification becomes the thing to capture",
            "ReGen Civics, RGVoice and Fund Voice",
          ],
        ],
        source:
          "ReGen Civics governance research and incubator curriculum, compiled from the primary sources named in the origin column",
        sourceUrl: "/governance",
      },
    },
    {
      heading: "Sociocracy compared to DAO governance",
      paragraphs: [
        "These two get set against each other often, and they answer different questions. Sociocracy is a method for how a room reaches a decision. DAO governance is a mechanism for recording and executing a decision without a trusted intermediary. A group can run consent-based decision making in its circles and record the outcome on chain, and several do.",
        "The real difference is what carries weight. Sociocracy weights a reasoned objection, so one person with a solid argument can stop a proposal. Token-weighted DAO voting weights holdings, so the largest holder wins by design. If a community adopts token voting without noticing that, it has quietly chosen plutocracy while believing it chose democracy.",
        "Our own answer is contribution-weighted: voice accrues from verified work rather than from capital. That moves the hard problem to verification, which is where we would rather have it. How that runs in practice is on [the governance page](/governance).",
      ],
    },
    {
      heading: "Choosing one for a land project",
      bullets: [
        "Under 12 people, high trust, meeting weekly: consent works well and needs the least machinery.",
        "12 to 50 people: consent inside circles, with a clear written remit for each circle and a supermajority for anything touching land, money, or membership.",
        "Over 50: representative council plus supermajority for constitutional matters, or the meetings will consume the community.",
        "Distributed and mostly remote: an on-chain record helps, and the weighting question becomes the whole design.",
        "Whatever you pick, write down the decisions that are exempt: selling land, changing membership terms, and amending the decision method itself should each need a higher bar.",
      ],
    },
    {
      heading: "The agreement nobody writes",
      paragraphs: [
        "Groups write how decisions get made and skip how decisions get unmade. Name in advance who can reopen a settled decision, on what grounds, and how often. Without it, every meeting can be relitigated by whoever lost last time, and that alone has ended communities that had everything else right.",
        "The next pages: [intentional community structures](/learn/intentional-community-structures) covers the entity your governance gets written into, and [I have land and want to start a community](/learn/start-a-community-on-your-land) covers the order to settle these in.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is the difference between consensus and consent?",
      answer:
        "Consensus asks whether everyone agrees. Consent asks whether anyone has a reasoned objection tied to the group's aims. Consent moves faster because preference is not enough to block, and it makes dissent specific and answerable rather than a mood in the room.",
    },
    {
      question: "Is sociocracy better than a DAO for community governance?",
      answer:
        "They solve different problems. Sociocracy is a method for reaching decisions in a room. A DAO is a mechanism for recording and executing decisions without a trusted intermediary. Many groups use both. The question worth asking is what your voting weight is tied to, because token weighting hands governance to the largest holder.",
    },
    {
      question: "What governance model do most intentional communities use?",
      answer:
        "Consensus is still the most common inherited default, and consent-based sociocracy is the most common thing groups move to after consensus stalls them. Larger communities typically end up with circles or committees holding delegated authority plus a supermajority bar for decisions about land, money, and membership.",
    },
    {
      question: "How do you stop one person blocking everything?",
      answer:
        "Move from consensus to consent, so an objection has to be reasoned and tied to the group's stated aims rather than to preference. Then write down what happens when an objection cannot be resolved: escalation to a wider circle, a time limit, and a fallback vote. Most groups have the first half and not the second.",
    },
    {
      question: "Should a land project put governance on chain?",
      answer:
        "Only if the record needs to survive the current members and be verifiable by outsiders such as funders or partner projects. On-chain governance gives you an auditable log and remote participation. It does not give you a decision method, and it will faithfully record a bad one.",
    },
    {
      question: "How often should governance agreements be reviewed?",
      answer:
        "Once a year, on a fixed date, whether or not anything hurts. Scheduled review is what keeps amendments from being read as an attack on whoever proposes them, and it catches the drift between what the bylaws say and what the community actually does.",
    },
  ],
  nextSteps: [
    {
      label: "See how our governance runs",
      href: "/governance",
      blurb:
        "Contribution-weighted voice, two governance tokens, proposals deliberated in the open and executed through a ratification pipeline.",
    },
    {
      label: "Apply to the incubator",
      href: "/apply",
      blurb:
        "Weeks 1 to 4 of the program are governance and economic design, built with your project rather than handed to it.",
    },
  ],
  related: [
    "start-a-community-on-your-land",
    "intentional-community-structures",
    "how-to-start-an-ecovillage",
  ],
};
