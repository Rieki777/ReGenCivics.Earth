/**
 * Progress Map data model.
 * Defines all 4 paths, their milestone nodes, SVG positions, and completion triggers.
 */

export type PathId = "land" | "ally" | "play" | "fund";
export type NodeState = "locked" | "unlocked" | "completed";

export interface MapNode {
  id: string;
  pathId: PathId;
  index: number;
  label: string;
  landmark: string;
  /** What the player does to complete this node */
  trigger: string;
  /** CTA link when the node is unlocked */
  href: string;
  /** SVG position (viewBox 1200x800) */
  x: number;
  y: number;
}

export interface MapPath {
  id: PathId;
  name: string;
  color: string;
  emoji: string;
  zone: string;
  nodes: MapNode[];
}

// Colors match QuestArcMap element coding
const COLORS = {
  land: "#7dd87d",
  ally: "#7dd87d",
  play: "#7dd87d",
  fund: "#f97316",
} as const;

export const PATHS: MapPath[] = [
  {
    id: "land",
    name: "Land",
    color: COLORS.land,
    emoji: "🌱",
    zone: "Earth",
    nodes: [
      { id: "land-1", pathId: "land", index: 0, label: "Explore the Land Page", landmark: "Trailhead", trigger: "visit:/land", href: "/land", x: 150, y: 650 },
      { id: "land-2", pathId: "land", index: 1, label: "Read a Project Profile", landmark: "Seed Vault", trigger: "visit:land-project-thread", href: "/community/c/land-projects", x: 220, y: 560 },
      { id: "land-3", pathId: "land", index: 2, label: "Join a Session", landmark: "Gathering Grove", trigger: "rsvp:session", href: "/schedule", x: 350, y: 480 },
      { id: "land-4", pathId: "land", index: 3, label: "Submit Application", landmark: "The Great Terrace", trigger: "submit:application", href: "/apply", x: 280, y: 400 },
      { id: "land-5", pathId: "land", index: 4, label: "Get Accepted", landmark: "Summit Overlook", trigger: "approved:application", href: "/profile?tab=submissions", x: 200, y: 320 },
    ],
  },
  {
    id: "ally",
    name: "Ally",
    color: COLORS.ally,
    emoji: "💧",
    zone: "Water",
    nodes: [
      { id: "ally-1", pathId: "ally", index: 0, label: "Explore the Alliance", landmark: "River Dock", trigger: "visit:/ally", href: "/ally", x: 150, y: 200 },
      { id: "ally-2", pathId: "ally", index: 1, label: "Meet the Partners", landmark: "Bridge Market", trigger: "visit:alliance-thread", href: "/community/c/alliance-partners", x: 250, y: 150 },
      { id: "ally-3", pathId: "ally", index: 2, label: "Join a Session", landmark: "Confluence Hall", trigger: "rsvp:session", href: "/schedule", x: 350, y: 200 },
      { id: "ally-4", pathId: "ally", index: 3, label: "Submit Org Claim", landmark: "Council Chamber", trigger: "submit:org-claim", href: "/profile?tab=settings", x: 450, y: 130 },
      { id: "ally-5", pathId: "ally", index: 4, label: "Get Approved", landmark: "The Great Bridge", trigger: "approved:org-claim", href: "/profile", x: 520, y: 180 },
    ],
  },
  {
    id: "play",
    name: "Play",
    color: COLORS.play,
    emoji: "🌀",
    zone: "Air",
    nodes: [
      { id: "play-1", pathId: "play", index: 0, label: "Enter the Game", landmark: "Threshold Stone", trigger: "visit:/play", href: "/play", x: 850, y: 150 },
      { id: "play-2", pathId: "play", index: 1, label: "Complete First Quest", landmark: "First Quest Stone", trigger: "quest:1", href: "/quest", x: 920, y: 220 },
      { id: "play-3", pathId: "play", index: 2, label: "Complete 5 Quests", landmark: "Midway Clearing", trigger: "quest:5", href: "/quest", x: 980, y: 300 },
      { id: "play-4", pathId: "play", index: 3, label: "Join the Forum", landmark: "Speaking Circle", trigger: "forum:post-or-reply", href: "/community", x: 900, y: 370 },
      { id: "play-5", pathId: "play", index: 4, label: "Complete 10 Quests", landmark: "The High Ring", trigger: "quest:10", href: "/quest", x: 1000, y: 200 },
      { id: "play-6", pathId: "play", index: 5, label: "Complete All Quests", landmark: "The Ancient Tree", trigger: "quest:14", href: "/quest", x: 1050, y: 130 },
      { id: "play-7", pathId: "play", index: 6, label: "Claim a Bounty", landmark: "The Bounty Board", trigger: "visit:/bounties", href: "/bounties", x: 1110, y: 250 },
    ],
  },
  {
    id: "fund",
    name: "Fund",
    color: COLORS.fund,
    emoji: "🔥",
    zone: "Fire",
    nodes: [
      { id: "fund-1", pathId: "fund", index: 0, label: "Learn the Vision", landmark: "Observatory", trigger: "visit:/opportunity", href: "/opportunity", x: 850, y: 650 },
      { id: "fund-2", pathId: "fund", index: 1, label: "Join a Session", landmark: "Forge Amphitheatre", trigger: "rsvp:session", href: "/schedule", x: 920, y: 570 },
      { id: "fund-3", pathId: "fund", index: 2, label: "Explore the Portfolio", landmark: "Exchange Garden", trigger: "visit:/map", href: "/map", x: 1000, y: 500 },
      { id: "fund-4", pathId: "fund", index: 3, label: "Express Interest", landmark: "Treasury Gate", trigger: "submit:investor-form", href: "/investor", x: 1050, y: 420 },
      { id: "fund-5", pathId: "fund", index: 4, label: "Sign LOI", landmark: "The Forge", trigger: "submit:loi", href: "/loi", x: 980, y: 360 },
      { id: "fund-6", pathId: "fund", index: 5, label: "Attend Fund Launch", landmark: "Great Hall", trigger: "attend:fund-launch", href: "/schedule", x: 1050, y: 300 },
      { id: "fund-7", pathId: "fund", index: 6, label: "Invest and Grow", landmark: "Flame Garden", trigger: "invested", href: "/fund", x: 1000, y: 240 },
    ],
  },
];

/** Shared nodes: "Join a Session" is the same physical location for Land, Ally, Fund */
export const SHARED_NODES = {
  session: ["land-3", "ally-3", "fund-2"],
  forum: ["play-4"],
};

/** The ReGen Tree center point */
export const REGEN_TREE = { x: 600, y: 400 };

/** Get all nodes across all paths as a flat array */
export function getAllNodes(): MapNode[] {
  return PATHS.flatMap(p => p.nodes);
}

/** Get a specific path by ID */
export function getPath(id: PathId): MapPath | undefined {
  return PATHS.find(p => p.id === id);
}

/** Build SVG path string (bezier curve) between consecutive nodes */
export function buildPathCurve(nodes: MapNode[]): string {
  if (nodes.length < 2) return "";
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const cx = (prev.x + curr.x) / 2;
    const cy = (prev.y + curr.y) / 2;
    // Slight curve via quadratic bezier
    d += ` Q ${cx + (i % 2 === 0 ? 20 : -20)} ${cy + (i % 2 === 0 ? -15 : 15)}, ${curr.x} ${curr.y}`;
  }
  return d;
}
