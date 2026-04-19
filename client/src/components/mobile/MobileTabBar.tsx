/**
 * MobileTabBar: adaptive 5-slot bottom nav ("command center").
 *
 * Slots 1 through 4: adaptive, learned from user behavior plus path affinity,
 * never show the current page, never show anchors owned by the FAB
 * (Quests, Community, Profile) since those are always one tap away there.
 * Slot 5 is always "More" which opens MobileMoreMenu via the
 * "open-mobile-more" event.
 *
 * Mobile only. Desktop keeps SmartBottomNav.
 */
import { Link, useLocation } from "wouter";
import { LayoutGrid } from "lucide-react";
import { useSeasonTint } from "@/hooks/useSeasonTint";
import { useSmartNav } from "@/hooks/useSmartNav";
import { NavIcon } from "@/components/SmartBottomNav";

// Routes the FAB radial menu pins. The adaptive TabBar never ranks these,
// so the bar and the FAB never show the same destination at the same time.
const FAB_ANCHOR_PATHS = ["/quest", "/community", "/profile"];

export default function MobileTabBar() {
  const [location] = useLocation();
  const tint = useSeasonTint();
  const currentPath = location.split("?")[0].replace(/\/$/, "") || "/";

  // 4 adaptive slots, nothing pinned (Quests lives in the FAB now),
  // anchors excluded, current page replaced by next-best.
  const { slots } = useSmartNav({
    excludePaths: FAB_ANCHOR_PATHS,
    slotCount: 4,
    pinQuestsSlot: false,
  });

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a472a]/95 backdrop-blur-md border-t border-[#7dd87d]/20"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Bottom navigation"
    >
      {/* Thin season-tinted accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-70"
        style={{ background: `linear-gradient(to right, transparent, ${tint.primary}, transparent)` }}
      />
      <div className="grid grid-cols-5 h-16 items-stretch max-w-2xl mx-auto">
        {slots.map((slot) => {
          const active = slot.path === "/"
            ? currentPath === "/"
            : currentPath === slot.path || currentPath.startsWith(slot.path + "/");

          return (
            <Link
              key={slot.path}
              href={slot.path}
              aria-label={slot.label}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                active ? "text-[#7dd87d]" : "text-white/65 hover:text-white/85"
              }`}
            >
              <div className="relative">
                <NavIcon name={slot.icon} className="w-5 h-5" />
                {slot.isContextual && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ffd700] rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium">{slot.label}</span>
            </Link>
          );
        })}

        {/* Slot 5: More (always pinned, opens MobileMoreMenu) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-more"))}
          aria-label="More"
          className="flex flex-col items-center justify-center gap-0.5 transition-colors text-white/65 hover:text-white/85"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
