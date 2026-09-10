/**
 * Admin navigation: one list drives the sidebar, continue row, speed dial,
 * and command palette. Click and tap first.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Handshake,
  UserCheck,
  Award,
  TrendingUp,
  FileText,
  Globe2,
  Coins,
  Inbox,
  Sprout,
  Landmark,
  Phone,
  Calendar,
  Video,
  ScrollText,
  Scissors,
  Shield,
  Megaphone,
  Image,
  Images,
  AppWindow,
  GitFork,
  Gamepad2,
  BarChart3,
  ClipboardList,
  Settings,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  route?: string;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Ecosystem",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "applications", label: "Applications", icon: Building2 },
      { id: "inquiries", label: "Inquiries", icon: Inbox },
      { id: "alliance", label: "Alliance", icon: Handshake },
      { id: "roles", label: "Player accounts", icon: UserCheck },
      { id: "citizenship-tiers", label: "Citizenship Tiers", icon: Award },
    ],
  },
  {
    label: "Fund",
    items: [
      { id: "investors", label: "Investors", icon: TrendingUp },
      { id: "loi", label: "LOIs", icon: FileText },
      { id: "crowdpooling", label: "Crowd Pooling", icon: Globe2 },
      { id: "seeds-claims", label: "SEEDS Claims", icon: Coins },
    ],
  },
  {
    label: "Work",
    items: [
      { id: "harvest", label: "The Harvest", icon: Sprout, route: "/admin-create" },
      { id: "funding", label: "Funding", icon: Landmark, route: "/admin/funding" },
      { id: "calls", label: "Calls", icon: Phone, route: "/admin/calls" },
    ],
  },
  {
    label: "Community",
    items: [
      { id: "events", label: "Events", icon: Calendar },
      { id: "recordings", label: "Recordings", icon: Video },
      { id: "role-holders", label: "Role Holders", icon: Handshake },
      { id: "call-tasks", label: "Tasks", icon: ScrollText },
      { id: "edited-cuts", label: "Edited Cuts", icon: Scissors },
      { id: "moderation", label: "Forum", icon: Shield, route: "/admin/moderation" },
      { id: "outbound", label: "Outbound", icon: Megaphone },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "banners", label: "Banners", icon: Image },
      { id: "images", label: "Image studio", icon: Images },
      { id: "widgets", label: "Widgets", icon: AppWindow },
      { id: "governance-forks", label: "Governance Forks", icon: GitFork, route: "/admin/governance-forks" },
      { id: "custom-games", label: "Custom Games", icon: Gamepad2 },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "audit-log", label: "Audit Log", icon: ClipboardList },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS_FLAT: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

const TAB_ID_SET = new Set(NAV_ITEMS_FLAT.map((item) => item.id));

export function navItemById(id: string): NavItem | undefined {
  return NAV_ITEMS_FLAT.find((item) => item.id === id);
}

/**
 * Inquiry form paths that are not their own tab land on the Inquiries hub.
 * Unknown paths stay on the hub so a tap always opens a real section.
 */
export function inquiryTabForPath(pathType: string | undefined | null): string {
  if (!pathType) return "inquiries";
  if (TAB_ID_SET.has(pathType) && pathType !== "live" && pathType !== "create" && pathType !== "role" && pathType !== "other" && pathType !== "kanban") {
    return pathType;
  }
  return "inquiries";
}

export const ADMIN_CONTINUE_KEY = "admin_continue";

export type AdminContinue = {
  kind: "tab" | "route";
  id: string;
  label: string;
  href?: string;
};

export function readAdminContinue(): AdminContinue | null {
  try {
    const raw = localStorage.getItem(ADMIN_CONTINUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminContinue;
    if (!parsed?.id || !parsed?.label) return null;
    if (parsed.kind !== "tab" && parsed.kind !== "route") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminContinue(item: NavItem): void {
  if (item.id === "overview") return;
  const record: AdminContinue = item.route
    ? { kind: "route", id: item.id, label: item.label, href: item.route }
    : { kind: "tab", id: item.id, label: item.label };
  try {
    localStorage.setItem(ADMIN_CONTINUE_KEY, JSON.stringify(record));
  } catch {
    /* storage blocked */
  }
}

export function writeAdminContinueFromTab(tab: string): void {
  const item = navItemById(canonicalizeAdminTab(tab).tab);
  if (item) writeAdminContinue(item);
}

export const OUTBOUND_SURFACES = ["write", "social", "people", "templates", "sent"] as const;
export type OutboundSurface = (typeof OUTBOUND_SURFACES)[number];

const OUTBOUND_SURFACE_ALIASES: Record<string, OutboundSurface> = {
  email: "write",
  write: "write",
  social: "social",
  people: "people",
  templates: "templates",
  sent: "sent",
};

/** Map a `?surface=` query (or alias like email) to an Outbound section. */
export function parseOutboundSurface(raw: string | null | undefined): OutboundSurface | undefined {
  if (!raw) return undefined;
  return OUTBOUND_SURFACE_ALIASES[raw];
}

/**
 * Old Newsletter and Broadcast tabs now live on Outbound.
 * `?tab=newsletter` opens People (the old subscriber list).
 * `?tab=broadcast` opens Social.
 */
export function canonicalizeAdminTab(tab: string): { tab: string; surface?: OutboundSurface } {
  if (tab === "newsletter") return { tab: "outbound", surface: "people" };
  if (tab === "broadcast") return { tab: "outbound", surface: "social" };
  return { tab };
}

export type AdminHrefExtras = {
  type?: string;
  open?: string;
  status?: string;
  view?: string;
  surface?: string;
};

export function adminTabHref(tab: string, extras?: AdminHrefExtras): string {
  const canon = canonicalizeAdminTab(tab);
  const item = navItemById(canon.tab);
  if (item?.route) return item.route;
  const q = new URLSearchParams();
  if (canon.tab !== "overview") q.set("tab", canon.tab);
  const surface = parseOutboundSurface(extras?.surface) ?? canon.surface;
  if (canon.tab === "outbound" && surface) q.set("surface", surface);
  if (extras?.type) q.set("type", extras.type);
  if (extras?.open) q.set("open", extras.open);
  if (extras?.status) q.set("status", extras.status);
  if (extras?.view) q.set("view", extras.view);
  const qs = q.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

export function applicationHref(id: number | string, status?: string): string {
  return adminTabHref("applications", {
    open: String(id),
    ...(status ? { status } : {}),
    view: "reviews",
  });
}
