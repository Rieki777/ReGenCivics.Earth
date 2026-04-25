/**
 * useSmartNav - Computes the 4 nav slots using blend formula
 * Slot 1: Always /quest
 * Slots 2-3: Adaptive (path affinity + visit frequency blend)
 * Slot 4: Contextual CTA or 4th highest-scoring page
 */

import { useMemo } from "react";
import { useLocation } from "wouter";
import { useNavVisits } from "./useNavVisits";
import { useContextualCTA, type CtaSlot } from "./useContextualCTA";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export interface NavSlot {
  path: string;
  icon: string;
  label: string;
  isContextual?: boolean;
}

// Page metadata for nav display
const PAGE_META: Record<string, { icon: string; label: string }> = {
  "/quest": { icon: "Scroll", label: "Quests" },
  "/play": { icon: "Sprout", label: "Play" },
  "/game": { icon: "Leaf", label: "Game" },
  "/seasons": { icon: "Sun", label: "Seasons" },
  "/opportunity": { icon: "FileText", label: "Opportunity" },
  "/fund": { icon: "TrendingUp", label: "Fund" },
  "/loi": { icon: "PenLine", label: "Submit LOI" },
  "/apply": { icon: "Clipboard", label: "Apply" },
  "/ally": { icon: "Handshake", label: "Alliance" },
  // Connect uses Sparkles to differentiate from Forum/Community which
  // also lives in the bar and uses MessageCircle / Users. Was MessageCircle
  // and read as a duplicate of the Forum tab on mobile.
  "/connect": { icon: "Sparkles", label: "Connect" },
  "/community": { icon: "Users", label: "Community" },
  "/": { icon: "Compass", label: "Explore" },
  "/profile/edit": { icon: "UserCircle", label: "Profile" },
  "/blog": { icon: "BookOpen", label: "Blog" },
  "/governance": { icon: "Vote", label: "Governance" },
  "/land": { icon: "Mountain", label: "Land" },
  "/team": { icon: "Users", label: "Team" },
  "/map": { icon: "Globe", label: "Map" },
  "/schedule": { icon: "Calendar", label: "Schedule" },
  "/tokenomics": { icon: "Coins", label: "Tokens" },
};

// Path affinity scores (higher = more relevant to that path)
const PATH_AFFINITY: Record<string, Record<string, number>> = {
  investor: {
    "/opportunity": 10, "/fund": 9, "/loi": 8, "/risk-disclosure": 7,
    "/community": 5, "/blog": 4, "/governance": 3,
  },
  land_project: {
    "/apply": 10, "/seasons": 9, "/community": 8, "/land": 7,
    "/ally": 6, "/connect": 5, "/blog": 4,
  },
  ally: {
    "/ally": 10, "/connect": 9, "/community": 8, "/seasons": 7,
    "/apply": 6, "/fund": 5,
  },
  player: {
    "/play": 10, "/connect": 9, "/community": 7, "/game": 6,
    "/blog": 5, "/seasons": 4,
  },
};

// Default nav for each path (before adaptive kicks in)
const PATH_DEFAULTS: Record<string, NavSlot[]> = {
  investor: [
    { path: "/quest", icon: "Scroll", label: "Quests" },
    { path: "/opportunity", icon: "FileText", label: "Opportunity" },
    { path: "/fund", icon: "TrendingUp", label: "Fund" },
    { path: "/loi", icon: "PenLine", label: "Submit LOI" },
  ],
  land_project: [
    { path: "/quest", icon: "Scroll", label: "Quests" },
    { path: "/seasons", icon: "Sun", label: "Seasons" },
    { path: "/community", icon: "Users", label: "Community" },
    { path: "/apply", icon: "Clipboard", label: "Apply" },
  ],
  ally: [
    { path: "/quest", icon: "Scroll", label: "Quests" },
    { path: "/ally", icon: "Handshake", label: "Alliance" },
    { path: "/connect", icon: "Sparkles", label: "Connect" },
    { path: "/apply", icon: "Clipboard", label: "Apply" },
  ],
  player: [
    { path: "/quest", icon: "Scroll", label: "Quests" },
    { path: "/play", icon: "Sprout", label: "Play" },
    { path: "/connect", icon: "Sparkles", label: "Connect" },
    { path: "/community", icon: "Users", label: "Community" },
  ],
  default: [
    { path: "/quest", icon: "Scroll", label: "Quests" },
    { path: "/play", icon: "Sprout", label: "Play" },
    { path: "/fund", icon: "TrendingUp", label: "Fund" },
    { path: "/", icon: "Compass", label: "Explore" },
  ],
};

// Custom slot overrides from localStorage
const CUSTOM_KEY = "regen_nav_custom";

function getCustomSlots(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveCustomSlot(slotKey: string, path: string) {
  try {
    const current = getCustomSlots();
    current[slotKey] = path;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(current));
  } catch { /* storage full */ }
}

export function clearCustomSlots() {
  try { localStorage.removeItem(CUSTOM_KEY); } catch {}
}

export interface SmartNavOptions {
  /**
   * Routes to drop from ranking entirely. Used by MobileTabBar so the adaptive
   * slots never suggest the anchor routes (Quests, Community, Profile) that
   * the FAB already pins.
   */
  excludePaths?: string[];
  /**
   * Total nav slots to return, including slot 1 (Quests) and slot 4 (contextual CTA).
   * Default 4. MobileTabBar passes 4.
   */
  slotCount?: number;
  /**
   * Whether slot 1 is pinned to /quest. When false (MobileTabBar with FAB that
   * already owns Quests), every slot is adaptive.
   */
  pinQuestsSlot?: boolean;
}

export function useSmartNav(options: SmartNavOptions = {}): { slots: NavSlot[] } {
  const { excludePaths = [], slotCount = 4, pinQuestsSlot = true } = options;
  const [location] = useLocation();
  const { counts, totalVisits } = useNavVisits();
  const { user } = useAuth();

  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
  });

  const userPath = profile?.path || null;
  const cta = useContextualCTA({ user, userPath });

  const slots = useMemo(() => {
    const currentPath = location.split("?")[0].replace(/\/$/, "") || "/";
    const customSlots = getCustomSlots();
    const effectivePath = userPath || "default";
    const excluded = new Set(excludePaths);

    // If very few visits, use pure defaults
    if (totalVisits <= 1) {
      const defaults = PATH_DEFAULTS[effectivePath] || PATH_DEFAULTS.default;
      const filtered = defaults.filter((s) =>
        (pinQuestsSlot && s.path === "/quest") || !excluded.has(s.path)
      );
      const sized = filtered.slice(0, slotCount);
      // Backfill from fallback if we dropped any
      while (sized.length < slotCount) {
        const fb = ["/", "/play", "/fund", "/blog", "/seasons", "/map", "/schedule"].find(
          (p) => !sized.some((x) => x.path === p) && !excluded.has(p)
        );
        if (!fb) break;
        const meta = PAGE_META[fb];
        if (meta) sized.push({ path: fb, icon: meta.icon, label: meta.label });
      }
      return applyCurrentPageAwareness(sized, currentPath, cta, excluded);
    }

    // Compute blend weights
    let affinityWeight: number;
    let visitWeight: number;
    if (totalVisits < 10) {
      affinityWeight = 0.7;
      visitWeight = 0.3;
    } else {
      affinityWeight = 0.4;
      visitWeight = 0.6;
    }

    // Normalize visit counts
    const maxVisits = Math.max(1, ...Object.values(counts));
    const affinity = PATH_AFFINITY[effectivePath] || {};

    // Score all pages
    const scores: Array<{ path: string; score: number }> = [];
    const allPages = Array.from(new Set([...Object.keys(affinity), ...Object.keys(counts)]));

    for (const page of allPages) {
      if (pinQuestsSlot && page === "/quest") continue; // slot 1 is hardcoded when pinned
      if (excluded.has(page)) continue;
      const affinityScore = (affinity[page] || 0) / 10;
      const visitScore = (counts[page] || 0) / maxVisits;
      const blended = affinityWeight * affinityScore + visitWeight * visitScore;
      scores.push({ path: page, score: blended });
    }

    scores.sort((a, b) => b.score - a.score);

    // Build slots
    const result: NavSlot[] = [];
    const used = new Set<string>();

    // Slot 1: quests (only if pinned)
    if (pinQuestsSlot) {
      result.push({ path: "/quest", icon: "Scroll", label: "Quests" });
      used.add("/quest");
    }

    // Determine final slot (contextual CTA) first
    let ctaSlot: NavSlot | null = null;
    if (cta && !excluded.has(cta.path)) {
      ctaSlot = { path: cta.path, icon: cta.icon, label: cta.label, isContextual: true };
      used.add(cta.path);
    }

    // Fill middle slots from ranked scores, leaving room for the CTA slot at the end
    const middleTarget = ctaSlot ? slotCount - 1 : slotCount;
    for (const { path } of scores) {
      if (used.has(path)) continue;
      const meta = PAGE_META[path];
      if (!meta) continue;
      // Apply custom override
      const slotKey = `slot${result.length + 1}`;
      const customPath = customSlots[slotKey];
      if (customPath && PAGE_META[customPath] && !excluded.has(customPath)) {
        const cm = PAGE_META[customPath];
        result.push({ path: customPath, icon: cm.icon, label: cm.label });
        used.add(customPath);
      } else {
        result.push({ path, icon: meta.icon, label: meta.label });
        used.add(path);
      }
      if (result.length >= middleTarget) break;
    }

    // Fill remaining middle slots from fallback list
    const fallbackPages = ["/play", "/fund", "/community", "/connect", "/blog", "/seasons", "/map", "/schedule", "/opportunity"];
    while (result.length < middleTarget) {
      const fb = fallbackPages.find((p) => !used.has(p) && !excluded.has(p));
      if (!fb) break;
      const meta = PAGE_META[fb]!;
      result.push({ path: fb, icon: meta.icon, label: meta.label });
      used.add(fb);
    }

    // Final slot: CTA or next-best
    if (ctaSlot) {
      const custom4 = customSlots[`slot${slotCount}`];
      if (custom4 && PAGE_META[custom4] && !excluded.has(custom4)) {
        const cm = PAGE_META[custom4];
        result.push({ path: custom4, icon: cm.icon, label: cm.label });
      } else {
        result.push(ctaSlot);
      }
    } else if (result.length < slotCount) {
      const nextBest = scores.find((s) => !used.has(s.path) && PAGE_META[s.path] && !excluded.has(s.path));
      if (nextBest) {
        const meta = PAGE_META[nextBest.path]!;
        result.push({ path: nextBest.path, icon: meta.icon, label: meta.label });
      } else {
        const fb = fallbackPages.find((p) => !used.has(p) && !excluded.has(p));
        if (fb) {
          const meta = PAGE_META[fb]!;
          result.push({ path: fb, icon: meta.icon, label: meta.label });
        } else {
          result.push({ path: "/", icon: "Compass", label: "Explore" });
        }
      }
    }

    return applyCurrentPageAwareness(result, currentPath, cta, excluded);
  }, [location, counts, totalVisits, userPath, cta, excludePaths.join(","), slotCount, pinQuestsSlot]);

  return { slots };
}

// Replace current page with next-best option
function applyCurrentPageAwareness(
  slots: NavSlot[],
  currentPath: string,
  cta: CtaSlot | null,
  excluded: Set<string> = new Set()
): NavSlot[] {
  const fallbackPages = ["/community", "/blog", "/connect", "/play", "/fund", "/governance", "/map", "/seasons", "/schedule", "/opportunity", "/"];

  return slots.map((slot) => {
    if (slot.path === currentPath) {
      // Find a replacement not already in the slot list
      const usedPaths = new Set(slots.map((s) => s.path));
      const replacement = fallbackPages.find(
        (p) => !usedPaths.has(p) && p !== currentPath && !excluded.has(p)
      );
      if (replacement && PAGE_META[replacement]) {
        return { path: replacement, icon: PAGE_META[replacement].icon, label: PAGE_META[replacement].label };
      }
    }
    return slot;
  });
}
