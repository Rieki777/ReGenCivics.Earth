/**
 * MobileTabBar: 5-slot bottom nav per MEGA_BUILD_SPEC Part 3.
 *
 * Slots: Home / Quests / Community / Profile / More
 * - Quests is visually primary (larger, accent color, family-of-wizards icon)
 * - More opens MobileMoreMenu via the "open-mobile-more" custom event
 *
 * Mobile only. Hidden on md+ where SmartBottomNav still ships the
 * desktop nav + music controls.
 */
import { Link, useLocation } from "wouter";
import { Home, MessageCircle, User, LayoutGrid } from "lucide-react";
import { WizardsFamilyIcon } from "@/components/icons/WizardsFamilyIcon";
import { useSeasonTint } from "@/hooks/useSeasonTint";

type TabSlot = {
  label: string;
  href?: string;
  icon: "home" | "wizards" | "community" | "profile" | "more";
  primary?: boolean;
  /** Custom event to dispatch instead of navigating. */
  event?: string;
};

const SLOTS: TabSlot[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Quests", href: "/quest", icon: "wizards", primary: true },
  { label: "Community", href: "/community", icon: "community" },
  { label: "Profile", href: "/profile", icon: "profile" },
  { label: "More", icon: "more", event: "open-mobile-more" },
];

function SlotIcon({ icon, active, primary }: { icon: TabSlot["icon"]; active: boolean; primary?: boolean }) {
  const size = primary ? 28 : 22;
  const baseClass = primary
    ? "text-[#1a472a]"
    : active
      ? "text-[#7dd87d]"
      : "text-white/65";
  if (icon === "wizards") return <WizardsFamilyIcon size={size} className={baseClass} />;
  if (icon === "home") return <Home className={`w-5 h-5 ${baseClass}`} />;
  if (icon === "community") return <MessageCircle className={`w-5 h-5 ${baseClass}`} />;
  if (icon === "profile") return <User className={`w-5 h-5 ${baseClass}`} />;
  if (icon === "more") return <LayoutGrid className={`w-5 h-5 ${baseClass}`} />;
  return null;
}

export default function MobileTabBar() {
  const [location] = useLocation();
  const tint = useSeasonTint();
  const currentPath = (location.split("?")[0].replace(/\/$/, "") || "/");

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
        {SLOTS.map((slot) => {
          const active = !!slot.href && (slot.href === "/" ? currentPath === "/" : currentPath.startsWith(slot.href));
          const handleClick = (e: React.MouseEvent) => {
            if (slot.event) {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent(slot.event));
            }
          };

          // Visually elevated Quests tab with accent background
          if (slot.primary) {
            return (
              <Link
                key={slot.label}
                href={slot.href ?? "/"}
                className="flex items-center justify-center -mt-4"
                aria-label={slot.label}
              >
                <div
                  className="w-14 h-14 rounded-full shadow-lg flex flex-col items-center justify-center"
                  style={{ backgroundColor: tint.primary }}
                >
                  <SlotIcon icon={slot.icon} active={active} primary />
                </div>
              </Link>
            );
          }

          const inner = (
            <div className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
              active ? "text-[#7dd87d]" : "text-white/65 hover:text-white/85"
            }`}>
              <SlotIcon icon={slot.icon} active={active} />
              <span className="text-[10px] font-medium">{slot.label}</span>
            </div>
          );

          if (slot.href) {
            return (
              <Link key={slot.label} href={slot.href} onClick={handleClick} aria-label={slot.label}>
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={slot.label}
              type="button"
              onClick={handleClick}
              aria-label={slot.label}
              className="w-full h-full"
            >
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
