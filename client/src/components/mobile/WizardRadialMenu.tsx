/**
 * WizardRadialMenu: floating wizard button bottom-right that opens a small
 * radial menu with four shortcuts. Playful escape hatch from anywhere.
 *
 * Hidden on desktop. The button sits above the existing bottom nav.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Compass, MessageCircle, User, Sparkles, LayoutGrid } from "lucide-react";
import { TreeOfLifeIcon } from "@/components/icons/TreeOfLifeIcon";
import { useSeasonTint } from "@/hooks/useSeasonTint";

type Action = {
  label: string;
  href?: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Custom event name to dispatch instead of navigating. */
  event?: string;
};

const ACTIONS: Action[] = [
  { label: "More menu", event: "open-mobile-more", Icon: LayoutGrid },
  { label: "Next quest", href: "/quest", Icon: Sparkles },
  { label: "Forum", href: "/community", Icon: MessageCircle },
  { label: "Profile", href: "/profile", Icon: User },
];

export function WizardRadialMenu() {
  const [open, setOpen] = useState(false);
  const tint = useSeasonTint();

  // Tap outside to close
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="fixed bottom-24 right-4 z-40 md:hidden" onClick={(e) => e.stopPropagation()}>
      {/* Radial action buttons (visible when open) */}
      {open && (
        <div className="absolute bottom-14 right-0 w-32 h-32 pointer-events-none">
          {ACTIONS.map((a, i) => {
            // Place buttons in a quarter-arc from 180deg to 270deg (upper-left of the button)
            const angle = (180 + (i / (ACTIONS.length - 1)) * 90) * (Math.PI / 180);
            const radius = 80;
            const x = Math.cos(angle) * radius + 64;
            const y = Math.sin(angle) * radius + 64;
            const sharedClass = "pointer-events-auto absolute w-11 h-11 rounded-full bg-[#1a472a] border border-[#7dd87d]/50 flex items-center justify-center text-[#7dd87d] shadow-lg hover:scale-110 transition-transform";
            const style = { left: x - 22, top: y - 22 };
            const onClick = () => {
              setOpen(false);
              if (a.event) window.dispatchEvent(new CustomEvent(a.event));
            };
            if (a.href) {
              return (
                <Link key={a.label} href={a.href} onClick={onClick} className={sharedClass} style={style} aria-label={a.label} title={a.label}>
                  <a.Icon className="w-4 h-4" />
                </Link>
              );
            }
            return (
              <button key={a.label} type="button" onClick={onClick} className={sharedClass} style={style} aria-label={a.label} title={a.label}>
                <a.Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Floating wizard button */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: tint.primary, color: "#1a472a" }}
        aria-label={open ? "Close shortcuts" : "Open shortcuts"}
        aria-expanded={open}
      >
        <TreeOfLifeIcon size={26} color="#1a472a" />
      </button>
    </div>
  );
}
