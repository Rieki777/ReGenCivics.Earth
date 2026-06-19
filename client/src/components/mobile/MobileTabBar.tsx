/**
 * MobileTabBar: adaptive 5-slot bottom nav ("command center").
 *
 * Slots 1 through 4: adaptive, learned from user behavior plus path affinity,
 * never show the current page, never show anchors owned by the FAB
 * (Quests, Community, Profile) since those are always one tap away there.
 * Slot 5 is "Home": the hub that opens MobileMoreMenu via the
 * "open-mobile-more" event.
 *
 * Design pass (2026-06-19), five visual upgrades:
 *   1. A lifted surface: vertical gradient + heavier blur + a soft top shadow
 *      so the bar reads as a floating shelf, not a flat strip.
 *   2. An active "pill": the live tab's icon sits in a soft season-tinted
 *      capsule that lifts slightly, a far clearer active state than a color
 *      swap alone.
 *   3. A season-tinted active indicator bar above the live tab.
 *   4. Bigger, more legible labels (11px, semibold when active).
 *   5. Tactile press feedback (active:scale) on every slot.
 *
 * Mobile only. Desktop keeps SmartBottomNav.
 */
import { Link, useLocation } from "wouter";
import { Home } from "lucide-react";
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

  const { slots } = useSmartNav({
    excludePaths: FAB_ANCHOR_PATHS,
    slotCount: 4,
    pinQuestsSlot: false,
  });

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a1f0f] to-[#1a472a]/95 backdrop-blur-xl border-t border-[#7dd87d]/20 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.45)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Bottom navigation"
    >
      {/* Thin season-tinted accent line along the very top edge */}
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
              aria-current={active ? "page" : undefined}
              className={`group relative flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 ${
                active ? "text-[#7dd87d]" : "text-white/65 hover:text-white/90"
              }`}
            >
              {/* Active indicator bar */}
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
                style={{ backgroundColor: tint.primary }}
              />
              <div
                className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  active ? "px-4 py-1 -translate-y-0.5 bg-[#7dd87d]/15" : "px-3 py-1"
                }`}
              >
                <NavIcon name={slot.icon} className="w-[22px] h-[22px]" />
                {slot.isContextual && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ffd700] rounded-full ring-2 ring-[#1a472a]" />
                )}
              </div>
              <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{slot.label}</span>
            </Link>
          );
        })}

        {/* Slot 5: Home (the hub; opens MobileMoreMenu) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-more"))}
          aria-label="Home menu"
          className="group relative flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 text-white/65 hover:text-white/90"
        >
          <div className="relative flex items-center justify-center rounded-2xl px-3 py-1 transition-all duration-300 group-hover:bg-white/5">
            <Home className="w-[22px] h-[22px]" />
          </div>
          <span className="text-[11px] leading-none font-medium">Home</span>
        </button>
      </div>
    </nav>
  );
}
