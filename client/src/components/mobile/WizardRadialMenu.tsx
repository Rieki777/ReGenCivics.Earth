/**
 * WizardRadialMenu: floating wizard button bottom-right that opens a small
 * radial menu with five shortcuts. Playful escape hatch from anywhere.
 *
 * Hidden on desktop. The button sits above the existing bottom nav.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { MessageCircle, User, LayoutGrid, Music, Pause } from "lucide-react";
import { TreeOfLifeIcon } from "@/components/icons/TreeOfLifeIcon";
import { FlowerOfLifeIcon } from "@/components/FlowerOfLifeIcon";
import { useSeasonTint } from "@/hooks/useSeasonTint";
import { useAudio } from "@/contexts/AudioContext";

type Action = {
  label: string;
  href?: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Custom event name to dispatch instead of navigating. */
  event?: string;
  /** Run a callback instead of navigating. */
  onClick?: () => void;
  /** Visual accent for the button when active (e.g. music playing). */
  active?: boolean;
};

export function WizardRadialMenu() {
  const [open, setOpen] = useState(false);
  const tint = useSeasonTint();
  const { isPlaying, togglePlay } = useAudio();

  // Triple-tap easter egg on trigger button
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleTriggerClick = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      // Apply easter egg pulse
      const btn = triggerRef.current;
      if (btn) {
        btn.classList.add("easter-egg-pulse");
        setTimeout(() => btn.classList.remove("easter-egg-pulse"), 600);
      }
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }

    setOpen((s) => !s);
  }, []);

  // Tap outside to close
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const ACTIONS: Action[] = [
    { label: "More menu", event: "open-mobile-more", Icon: LayoutGrid },
    { label: "Next quest", href: "/quest", Icon: TreeOfLifeIcon },
    {
      label: isPlaying ? "Pause music" : "Play music",
      onClick: togglePlay,
      Icon: isPlaying ? Pause : Music,
      active: isPlaying,
    },
    { label: "Forum", href: "/community", Icon: MessageCircle },
    { label: "Profile", href: "/profile", Icon: User },
  ];

  return (
    <div className="fixed bottom-24 right-4 z-40 md:hidden" onClick={(e) => e.stopPropagation()}>
      {/* Radial action buttons (visible when open) */}
      {open && (
        <div className="absolute bottom-14 right-0 w-52 h-52 pointer-events-none">
          {ACTIONS.map((a, i) => {
            // Fan 5 buttons in a 135-degree arc (180 to 315 deg) at radius 110.
            // Arc length between centers ~65px, giving ~21px gap for 44px buttons.
            const angle = (180 + (i / (ACTIONS.length - 1)) * 135) * (Math.PI / 180);
            const radius = 110;
            const cx = 104; // half of 208px (w-52)
            const x = Math.cos(angle) * radius + cx;
            const y = Math.sin(angle) * radius + cx;
            const activeClass = a.active
              ? "bg-[#7dd87d] border-[#7dd87d] text-[#1a472a]"
              : "bg-[#1a472a] border-[#7dd87d]/50 text-[#7dd87d]";
            const sharedClass = `pointer-events-auto absolute w-11 h-11 rounded-full border flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${activeClass}`;
            const style = { left: x - 22, top: y - 22 };
            const onClick = () => {
              setOpen(false);
              if (a.onClick) {
                a.onClick();
                return;
              }
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

      {/* Floating trigger button (Flower of Life sacred geometry) */}
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: tint.primary, color: "#1a472a" }}
        aria-label={open ? "Close shortcuts" : "Open shortcuts"}
        aria-expanded={open}
      >
        <FlowerOfLifeIcon size={26} className="text-[#1a472a]" />
      </button>
    </div>
  );
}
