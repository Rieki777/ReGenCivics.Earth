/**
 * Recency-weighted visit tracking for the mobile admin speed dial.
 * Lives in localStorage so it follows this browser, not the server.
 */
import { navItemById, NAV_ITEMS_FLAT, type NavItem } from "./adminNav";

export const ADMIN_USAGE_KEY = "admin_usage_v1";

export type AdminUsageEntry = {
  id: string;
  count: number;
  lastVisited: number;
};

type Store = Record<string, AdminUsageEntry>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(ADMIN_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(ADMIN_USAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage blocked */
  }
}

export function recordAdminVisit(id: string): void {
  if (!id || id === "overview") return;
  const item = navItemById(id);
  if (!item) return;
  const store = readStore();
  const prev = store[id];
  store[id] = {
    id,
    count: (prev?.count ?? 0) + 1,
    lastVisited: Date.now(),
  };
  writeStore(store);
}

/** count / (1 + days since last visit). Recent heavy use ranks first. */
export function usageScore(entry: AdminUsageEntry, now = Date.now()): number {
  const days = Math.max(0, (now - entry.lastVisited) / 86_400_000);
  return entry.count / (1 + days);
}

const SEED_IDS = ["applications", "harvest", "inquiries", "funding", "calls"] as const;

export function topAdminDestinations(limit = 5, now = Date.now()): NavItem[] {
  const store = readStore();
  const scored = Object.values(store)
    .filter((entry) => navItemById(entry.id))
    .sort((a, b) => usageScore(b, now) - usageScore(a, now) || b.lastVisited - a.lastVisited);

  const picked: NavItem[] = [];
  const seen = new Set<string>();
  for (const entry of scored) {
    const item = navItemById(entry.id);
    if (!item || seen.has(item.id)) continue;
    picked.push(item);
    seen.add(item.id);
    if (picked.length >= limit) return picked;
  }
  for (const id of SEED_IDS) {
    if (picked.length >= limit) break;
    const item = navItemById(id);
    if (!item || seen.has(item.id)) continue;
    picked.push(item);
    seen.add(item.id);
  }
  if (picked.length < limit) {
    for (const item of NAV_ITEMS_FLAT) {
      if (picked.length >= limit) break;
      if (item.id === "overview" || seen.has(item.id)) continue;
      picked.push(item);
      seen.add(item.id);
    }
  }
  return picked;
}
