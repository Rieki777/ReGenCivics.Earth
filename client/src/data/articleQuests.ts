/**
 * Article quests: every article can end with a quest.
 *
 * Add one entry per blog post slug and drop the [PLAY_QUEST_CTA] marker at
 * the end of the post's content. The ArticleQuestCTA component (in
 * components/blog/PlaysArticleBlocks.tsx) looks up the current post's slug
 * here and renders the quest card. No entry, no card.
 */

export interface ArticleQuest {
  eyebrow: string;
  title: string;
  tagline: string;
  steps: string[];
  rewardLine: string;
  rewardNote?: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export const articleQuests: Record<string, ArticleQuest> = {
  "what-steers-civilization": {
    eyebrow: "Quest",
    title: "Design a Play",
    tagline:
      "A Play is a vision for how a community meets its needs. Design one. The library is open, and the best plays get trialed on real land.",
    steps: [
      "Watch both episodes above. Currie shows you how the old game steers. Hamant shows you what lasting systems share.",
      "Draft your play: the needs you'd honor and how you'd measure them, the coordination design that meets them, the more-than-human world counted alongside our own, and honest receipts for where it (or its parts) has run.",
      "Run the robustness self-test: six scores, published in the open on every play in the library.",
      "Submit it as a Vision Play. Review happens against the published criteria, and approved plays enter the library for the community to study, discuss, and trial.",
    ],
    rewardLine: "2,222 $ReGen + 1 RGVoice",
    rewardNote: "credited to your balance when your play is approved into the library",
    primary: { label: "Submit your Play", href: "/plays/submit" },
    secondary: { label: "Study the library first", href: "/plays" },
  },
};
