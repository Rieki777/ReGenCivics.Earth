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
  Search,
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
      { id: "newsletter", label: "Newsletter", icon: Megaphone },
      { id: "broadcast", label: "Broadcast", icon: Search },
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
  const item = navItemById(tab);
  if (item) writeAdminContinue(item);
}

export type AdminHrefExtras = {
  type?: string;
  open?: string;
  status?: string;
  view?: string;
};

export function adminTabHref(tab: string, extras?: AdminHrefExtras): string {
  const item = navItemById(tab);
  if (item?.route) return item.route;
  const q = new URLSearchParams();
  if (tab !== "overview") q.set("tab", tab);
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
