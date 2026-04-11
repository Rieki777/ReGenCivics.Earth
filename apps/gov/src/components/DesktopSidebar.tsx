"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Vote, Globe, BarChart3, UserCircle, BookOpen, Lightbulb, ChevronLeft, ChevronRight, Gamepad2, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useCurrentUser } from "@/lib/useCurrentUser";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/game", label: "Game", Icon: Gamepad2 },
  { href: "/proposals", label: "Proposals", Icon: Vote },
  { href: "/bioregion", label: "Bioregion", Icon: Globe },
  { href: "/economy", label: "Economy", Icon: BarChart3 },
  { href: "/passport", label: "Passport", Icon: UserCircle },
];

const SECONDARY = [
  { href: "/handbook", label: "Handbook", Icon: BookOpen },
  { href: "/propose-upgrade", label: "Propose Upgrade", Icon: Lightbulb },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useCurrentUser();
  const secondary = isAdmin
    ? [...SECONDARY, { href: "/game/admin/review", label: "Claim Review", Icon: Shield }]
    : SECONDARY;

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-[#1a472a]/80 backdrop-blur border-r border-[rgba(125,216,125,0.12)] transition-all duration-300",
      collapsed ? "w-16" : "w-[280px]",
    )}>
      {/* Logo + collapse */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-[rgba(125,216,125,0.12)]">
        {!collapsed && (
          <span className="text-[#7dd87d] font-bold text-lg" style={{ fontFamily: "var(--font-display, system-ui)" }}>
            ReGen Gov
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-white/55 hover:text-white p-1"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-colors",
                active ? "bg-[#7dd87d]/15 text-[#7dd87d]" : "text-white/65 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}

        <div className="border-t border-[rgba(125,216,125,0.1)] mx-4 my-3" />

        {secondary.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 mx-2 rounded-xl transition-colors",
                active ? "bg-[#7dd87d]/15 text-[#7dd87d]" : "text-white/55 hover:bg-white/5 hover:text-white/80",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-xs">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
