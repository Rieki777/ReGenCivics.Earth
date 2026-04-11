"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Vote, Globe, BarChart3, UserCircle, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/game", label: "Game", Icon: Gamepad2 },
  { href: "/proposals", label: "Proposals", Icon: Vote },
  { href: "/bioregion", label: "Bioregion", Icon: Globe },
  { href: "/economy", label: "Economy", Icon: BarChart3 },
  { href: "/passport", label: "Passport", Icon: UserCircle },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a472a] border-t border-[rgba(125,216,125,0.15)] h-16" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-stretch h-full max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-[#7dd87d]" : "text-white/60",
              )}
            >
              {active && <span className="w-1.5 h-1.5 rounded-full bg-[#7dd87d] mb-0.5" />}
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
