/**
 * WizardRadialMenu: floating FAB bottom-right that blooms a 5-button radial
 * menu into the upper-left quadrant around the trigger.
 *
 * Actions (from farthest-left to straight-up, matching thumb ergonomics for a
 * right-handed user): Music - Profile - Community - Context - Quests.
 *
 * The FAB owns three anchor routes (Quests, Community, Profile) so the
 * MobileTabBar is free to surface deeper, context-aware suggestions.
 *
 * Anchor self-awareness: when the user is already on an anchor route, that
 * button swaps to a useful in-place action (Community -> New post,
 * Quest -> Resume, Profile -> Edit) instead of routing to itself.
 *
 * Context slot: pulls the first usePageTools() action for the current route,
 * falling back to Search (opens the command palette).
 *
 * Hidden on desktop. Sits above the MobileTabBar via a `max()` of
 * env(safe-area-inset-bottom) + 8rem and a hard 9rem floor. The floor exists
 * because some iPhone Safari edge cases (PWA mode, embedded web views,
 * landscape orientation) report env(safe-area-inset-bottom) as 0, which
 * collapsed the FAB into the tab bar. Uses z-[60] so it renders above the
 * z-50 MobileTabBar.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  MessageCircle, User, Music, Pause, Search, PenLine, Edit3, Play, Sparkles, Scroll,
} from "lucide-react";
import { FlowerOfLifeIcon } from "@/components/FlowerOfLifeIcon";
import { useSeasonTint } from "@/hooks/useSeasonTint";
import { useAudio } from "@/contexts/AudioContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTools } from "@/hooks/usePageTools";
import { NavIcon } from "@/components/SmartBottomNav";

type Action = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Route to navigate to. */
  href?: string;
  /** Custom window event name to dispatch. */
  event?: string;
  /** Callback to run on click (wins over href/event). */
  onClick?: () => void;
  /** Accent when active (e.g. music playing). */
  active?: boolean;
};

// Quarter arc from due-left (180deg) to straight-up (90deg) in math degrees,
// with sin flipped for CSS (positive y goes down).
//
// As of 2026-04-27 the menu uses TWO concentric arcs instead of one:
//   - Outer arc (3 buttons): the anchor actions (Music, Community, Quests).
//   - Inner arc (2 buttons): the secondary actions (Profile, Context),
//     tucked between the outer pair so the cluster reads as a single fan.
//
// Outer radius: 125 (chord ≈ 49px so 44px buttons sit with a clean 5px gap).
// Inner radius: 100 (puts the secondary buttons ~6px from each adjacent
// outer button so the fan reads as five evenly spaced buttons on one arc,
// not as a clumped triangle in the middle). Earlier the inner ring was
// 78 which pulled the secondary buttons toward the trigger and made the
// cluster look bunched on iPhone; widening to 100 evens out the fan.
const ARC_START_DEG = 180;
const ARC_END_DEG = 90;
const ARC_OUTER_RADIUS = 125;
const ARC_INNER_RADIUS = 100;

export function WizardRadialMenu() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const tint = useSeasonTint();
  const { isPlaying, togglePlay } = useAudio();
  const { isAuthenticated } = useAuth();
  const pageTools = usePageTools();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPath = location.split("?")[0].replace(/\/$/, "") || "/";
  const onCommunity = currentPath === "/community" || currentPath.startsWith("/community/");
  const onQuest = currentPath === "/quest" || currentPath.startsWith("/quest/");
  const onProfile = currentPath === "/profile" || currentPath.startsWith("/profile/");

  const handleTriggerClick = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Anchor slot: Community. When already on /community, swap to "New post".
  const communityAction: Action = onCommunity
    ? isAuthenticated
      ? { key: "new-post", label: "New post", href: "/community/new", Icon: PenLine }
      : { key: "forum-search", label: "Search forum", event: "open-command-palette", Icon: Search }
    : { key: "community", label: "Community", href: "/community", Icon: MessageCircle };

  // Anchor slot: Quests. When on /quest, swap to "Watch how-to" so the
  // Play icon does something useful instead of routing to the page the
  // user is already on. Quest.tsx listens for the open-quest-how-to
  // event and opens a video modal; the modal gracefully falls back to
  // a "video coming soon" message until /videos/quest-how-to.mp4 is
  // uploaded.
  const questsAction: Action = onQuest
    ? { key: "how-to", label: "Watch how-to", event: "open-quest-how-to", Icon: Play }
    : { key: "quests", label: "Quests", href: "/quest", Icon: Scroll };

  // Anchor slot: Profile. When on /profile, swap to "Edit".
  const profileAction: Action = onProfile
    ? { key: "profile-edit", label: "Edit profile", href: "/profile/edit", Icon: Edit3 }
    : { key: "profile", label: "Profile", href: "/profile", Icon: User };

  // Music slot
  const musicAction: Action = {
    key: "music",
    label: isPlaying ? "Pause" : "Play music",
    onClick: togglePlay,
    Icon: isPlaying ? Pause : Music,
    active: isPlaying,
  };

  // Context slot: first page tool, fallback to site Search.
  const contextAction: Action = pageTools.length > 0
    ? {
        key: `ctx-${pageTools[0].label}`,
        label: pageTools[0].label,
        Icon: (props: { className?: string }) => <NavIcon name={pageTools[0].icon} className={props.className} />,
        onClick: () => pageTools[0].action(),
      }
    : {
        key: "search",
        label: "Search",
        event: "open-command-palette",
        Icon: Search,
      };

  // Arc order: outer-left to straight-up. Quests is closest to the thumb.
  // Each entry includes which arc it lives on:
  //   - "outer" buttons sit on the wider 120px ring (3 anchors)
  //   - "inner" buttons sit on the narrower 78px ring (2 secondaries)
  // Angles still walk evenly from 180 deg to 90 deg so the buttons feel like
  // they bloom in a single fan even though their radii differ.
  const ACTIONS: Array<Action & { ring: "outer" | "inner" }> = [
    { ...musicAction, ring: "outer" },     // 180 deg, outer
    { ...profileAction, ring: "inner" },   // 157.5 deg, inner
    { ...communityAction, ring: "outer" }, // 135 deg, outer
    { ...contextAction, ring: "inner" },   // 112.5 deg, inner
    { ...questsAction, ring: "outer" },    // 90 deg, outer
  ];

  return (
    // MobileTabBar is h-16 (64px) plus env(safe-area-inset-bottom) padding.
    // FAB needs to clear that stack with real breathing room so the flower
    // and the radial-menu buttons never kiss the tab bar on iPhone.
    //
    // The previous 7rem + safe-area calc still produced overlap on Rye's
    // device. Two suspected causes: (1) env(safe-area-inset-bottom) is 0
    // in some iOS Safari modes (PWA, embedded WebView, landscape), and
    // (2) the radial-menu's left-most button sits at FAB-center vertically
    // and was landing close to the tab bar even when the trigger cleared.
    //
    // Fix: max() of safe-area + 8rem and a hard 9rem floor. The floor
    // guarantees the FAB bottom is always >= 9rem (144px) regardless of
    // env() value, which puts the flower roughly 80px above the tab bar
    // top on any device. Tabs render z-50; we render z-[60].
    <div
      className="fixed right-4 z-[60] md:hidden"
      style={{
        bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 8rem), 9rem)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Relative wrapper sized to the trigger. Buttons position absolutely
          around the trigger's center. */}
      <div className="relative w-12 h-12">
        {/* Radial action buttons. Animate scale + opacity so they feel like
            they bloom from the trigger. */}
        {ACTIONS.map((a, i) => {
          const fraction = i / (ACTIONS.length - 1);
          const angleDeg = ARC_START_DEG + (ARC_END_DEG - ARC_START_DEG) * fraction;
          const angleRad = (angleDeg * Math.PI) / 180;
          const radius = a.ring === "outer" ? ARC_OUTER_RADIUS : ARC_INNER_RADIUS;
          const dx = Math.cos(angleRad) * radius;
          // Math y is positive-up, CSS is positive-down, so flip.
          const dy = -Math.sin(angleRad) * radius;

          // Trigger center sits at (24, 24) within the 48px wrapper.
          const left = 24 + dx - 22;
          const top = 24 + dy - 22;

          const accent = a.active
            ? "bg-[#7dd87d] border-[#7dd87d] text-[#1a472a]"
            : "bg-[#1a472a] border-[#7dd87d]/55 text-[#7dd87d]";
          const sharedClass = `absolute w-11 h-11 rounded-full border flex items-center justify-center shadow-lg transition-all duration-200 ${accent} ${
            open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none"
          }`;
          // Stagger bloom: each button waits a touch longer than the last.
          const style: React.CSSProperties = {
            left,
            top,
            transitionDelay: open ? `${i * 30}ms` : "0ms",
          };

          const closeThenRun = () => {
            setOpen(false);
            if (a.onClick) {
              a.onClick();
              return;
            }
            if (a.event) {
              window.dispatchEvent(new CustomEvent(a.event));
            }
          };

          if (a.href) {
            return (
              <Link
                key={a.key}
                href={a.href}
                onClick={closeThenRun}
                className={sharedClass}
                style={style}
                aria-label={a.label}
                title={a.label}
                tabIndex={open ? 0 : -1}
              >
                <a.Icon className="w-4 h-4" />
              </Link>
            );
          }
          return (
            <button
              key={a.key}
              type="button"
              onClick={closeThenRun}
              className={sharedClass}
              style={style}
              aria-label={a.label}
              title={a.label}
              tabIndex={open ? 0 : -1}
            >
              <a.Icon className="w-4 h-4" />
            </button>
          );
        })}

        {/* Floating trigger (Flower of Life) */}
        <button
          ref={triggerRef}
          onClick={handleTriggerClick}
          className="absolute inset-0 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
          style={{ backgroundColor: tint.primary, color: "#1a472a" }}
          aria-label={open ? "Close shortcuts" : "Open shortcuts"}
          aria-expanded={open}
        >
          <FlowerOfLifeIcon size={26} className="text-[#1a472a]" />
        </button>
      </div>
    </div>
  );
}
