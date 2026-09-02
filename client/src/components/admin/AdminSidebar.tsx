import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NAV_GROUPS, writeAdminContinue, type NavItem } from "@/lib/adminNav";

export type { NavItem };
export { NAV_GROUPS };

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Mobile drawer state, owned by Admin.tsx (the hamburger lives in its header). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

/** Shared nav list. `large` renders 44px touch rows for the mobile drawer. */
function NavList({
  activeTab,
  onSelect,
  collapsed,
  large,
}: {
  activeTab: string;
  onSelect: (item: NavItem) => void;
  collapsed: boolean;
  large?: boolean;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          {!collapsed && (
            <div className="px-3 py-1 text-xs font-semibold text-white/80 uppercase tracking-wider">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full flex items-center gap-3 px-3 text-sm transition-colors ${large ? "min-h-11 py-2.5" : "py-2"} ${
                  active
                    ? "bg-green-600/20 text-green-400 border-r-2 border-green-400"
                    : "text-white/85 hover:text-white hover:bg-white/5"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={large ? 18 : 16} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  mobileOpen = false,
  onMobileOpenChange,
}: AdminSidebarProps) {
  const [, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin_sidebar_collapsed", String(collapsed));
    } catch {
      /* storage blocked */
    }
  }, [collapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "[" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const select = (item: NavItem) => {
    writeAdminContinue(item);
    if (item.route) {
      navigate(item.route);
    } else {
      onTabChange(item.id);
    }
    onMobileOpenChange?.(false);
  };

  return (
    <>
      {/* Desktop: static, collapsible aside. Hidden on phones, where the same
          nav renders as an overlay drawer so content gets the full width. */}
      <aside
        className={`hidden md:flex flex-shrink-0 flex-col bg-[#0a1f14] border-r border-white/10 transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          {!collapsed && (
            <span className="text-sm font-semibold text-white/85 uppercase tracking-wider">Admin</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-auto"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title="Toggle sidebar [ "
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <NavList activeTab={activeTab} onSelect={select} collapsed={collapsed} />
      </aside>

      {/* Mobile: left drawer via the base Sheet (portal, focus trap, Esc, swipe
          scrim). 44px rows, safe-area padding, closes on select. */}
      <Sheet open={mobileOpen} onOpenChange={(open) => onMobileOpenChange?.(open)}>
        <SheetContent
          side="left"
          className="md:hidden w-72 max-w-[85vw] p-0 flex flex-col bg-[#0a1f14] border-white/10 text-white [&>button]:text-white/80 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="p-3 border-b border-white/10 text-left">
            <SheetTitle className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              Admin
            </SheetTitle>
            <SheetDescription className="sr-only">Admin navigation</SheetDescription>
          </SheetHeader>
          <NavList activeTab={activeTab} onSelect={select} collapsed={false} large />
        </SheetContent>
      </Sheet>
    </>
  );
}
