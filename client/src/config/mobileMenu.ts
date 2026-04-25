/**
 * Mobile More menu sections + cards. Edit this file to change the menu.
 *
 * Cards follow the format from MEGA_BUILD_SPEC Part 3 idea 10:
 * icon + one-line label + single sub-line description so first-time
 * visitors understand what each page is before tapping.
 */

export type MenuCard = {
  label: string;
  sub: string;
  href: string;
  icon: string; // lucide icon name OR "wizards" for the WizardsFamilyIcon
  /** When true, render with the accent color (Quests). */
  primary?: boolean;
};

export type MenuSection = {
  id: "play" | "learn" | "invest" | "footer";
  heading: string;
  /** When true the section is collapsed by default. */
  collapsed?: boolean;
  cards: MenuCard[];
};

export const MOBILE_MENU_SECTIONS: MenuSection[] = [
  {
    id: "play",
    heading: "Play",
    cards: [
      { label: "Quests", sub: "The questing journey", href: "/quest", icon: "wizards", primary: true },
      { label: "Community", sub: "Forum, voices, gathering grove", href: "/community", icon: "MessageCircle" },
      { label: "Schedule", sub: "Upcoming and past sessions", href: "/schedule", icon: "Calendar" },
      // Label correction (2026-04-24): swapped sub-lines so each label
      // matches what the destination page actually does. /governance is
      // the explainer page; /community/decisions is the operational
      // pipeline mission control.
      { label: "Governance", sub: "How decisions get made", href: "/governance", icon: "Vote" },
      { label: "Decisions", sub: "Decisions, proposals, and the pipeline", href: "/community/decisions", icon: "Vote" },
      { label: "The Game", sub: "Bionomics: how it all fits together", href: "/bionomics", icon: "wizards" },
      { label: "Game Mechanics", sub: "Tune the simulator", href: "/game-mechanics", icon: "SlidersHorizontal" },
      { label: "Tools", sub: "Things we use and recommend", href: "/tools", icon: "Wrench" },
      { label: "Map", sub: "Land projects and partners", href: "/map", icon: "Map" },
    ],
  },
  {
    id: "learn",
    heading: "Learn",
    collapsed: true,
    cards: [
      { label: "Bionomics", sub: "The Game side of the bridge", href: "/bionomics", icon: "Sprout" },
      { label: "Tokenomics", sub: "The Fund side of the bridge", href: "/tokenomics", icon: "Coins" },
      { label: "Governance", sub: "How decisions get made", href: "/governance", icon: "Globe" },
      { label: "Team", sub: "Who's holding this", href: "/team", icon: "Users" },
      { label: "Glossary", sub: "Terms and definitions", href: "/glossary", icon: "BookOpen" },
      { label: "Blog", sub: "Read the long-form pieces", href: "/blog", icon: "BookOpen" },
    ],
  },
  {
    id: "invest",
    heading: "Invest & Apply",
    collapsed: true,
    cards: [
      { label: "Fund overview", sub: "The investment thesis", href: "/fund", icon: "Coins" },
      { label: "Investor form", sub: "Express investor interest", href: "/investor", icon: "FileText" },
      { label: "Apply", sub: "Land projects and alliance partners", href: "/apply", icon: "Sprout" },
      { label: "Letter of Intent", sub: "Reserve your spot", href: "/loi", icon: "FileText" },
    ],
  },
];

export const MOBILE_MENU_FOOTER = [
  { label: "Forum", href: "/community", icon: "MessageCircle" },
  { label: "Privacy", href: "/privacy-policy", icon: "Shield" },
  { label: "Contact", href: "/contact", icon: "Mail" },
];
