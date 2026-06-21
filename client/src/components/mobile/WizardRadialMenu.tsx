/**
 * WizardRadialMenu: floating FAB bottom-right that opens a collapsible
 * vertical menu of labeled shortcuts. Each row is a single large tap target:
 * a text label on the left and a round icon button on the right, aligned to
 * the Flower-of-Life trigger. The column springs upward from the trigger,
 * nearest-row-first, behind a soft focus scrim.
 *
 * Actions (top -> bottom, so the last sits closest to the thumb):
 * Playlist - Profile - Community - Context - Quests.
 *
 * The FAB owns three anchor routes (Quests, Community, Profile) so the
 * MobileTabBar is free to surface deeper, context-aware suggestions.
 *
 * Anchor self-awareness: when the user is already on an anchor route, that
 * button swaps to a useful in-place action (Community -> New post,
 * Quest -> Watch how-to, Profile -> Edit) instead of routing to itself.
 *
 * Context slot: pulls the first usePageTools() action for the current route,
 * falling back to Search (opens the command palette).
 *
 * Hidden on desktop. Sits above the MobileTabBar via a `max()` of
 * env(safe-area-inset-bottom) + 8rem and a hard 9rem floor. The floor exists
 * because some iPhone Safari edge cases (PWA mode, embedded web views,
 * landscape orientation) report env(safe-area-inset-bottom) as 0, which
 * collapsed the FAB into the tab bar. Uses z-[60] so it renders above the
 * z-50 MobileTabBar; the focus scrim sits at z-[55] between them.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  MessageCircle, User, Music, Pause, Search, PenLine, Edit3, Play, Scroll, Wrench,
} from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
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

/** Tiny haptic tap on supported devices; silently ignored elsewhere. */
function haptic(ms = 8) {
  try { (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(ms); } catch { /* unsupported */ }
}

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
  // Land-steward and investor routes get a Tools shortcut in the command
  // center, since the tools library is most useful to those two journeys.
  const onLandOrInvestor = ["/land", "/fund", "/investor", "/apply", "/loi", "/tools", "/crowd-pooling", "/crowd-pooling-projects", "/bionomics", "/tokenomics"]
    .some((p) => currentPath === p || currentPath.startsWith(p + "/"));

  const handleTriggerClick = useCallback(() => {
    haptic(10);
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

  // Music slot: open the Hymns playlist page and start playback. Tapping the
  // note should always land the user on the full player with every track
  // visible (not silently toggle audio in the background).
  const musicAction: Action = {
    key: "music",
    label: isPlaying ? "Playing…" : "Playlist",
    href: "/hymn-book",
    onClick: () => { if (!isPlaying) togglePlay(); },
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

  // Tools shortcut, surfaced for land-steward and investor journeys.
  const toolsAction: Action = { key: "tools", label: "Tools", href: "/tools", Icon: Wrench };

  // Vertical stack order, top -> bottom. The list is rendered as a column
  // that grows upward from the trigger, so the LAST item sits closest to the
  // thumb. Quests is the primary anchor, so it lands nearest the trigger.
  const ACTIONS: Action[] = [
    musicAction,
    profileAction,
    communityAction,
    contextAction,
    ...(onLandOrInvestor ? [toolsAction] : []),
    questsAction,
  ];

  // Springy easing so the rows feel like they pop up from the Flower.
  const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

  return (
    <>
      {/* Focus scrim. Sits below the FAB (z-[60]) but above the tab bar
          (z-50) so the menu reads clearly over any page. Tapping it closes
          via the document click handler. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[55] md:hidden bg-[#06140c]/45 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ backdropFilter: open ? "blur(2px)" : undefined }}
      />

      {/* The trigger sits at the bottom-right, deliberately overlapping the
          top-right corner of the tab bar by roughly 10%, so it reads as the
          command center docked into the menu. The tab bar is h-16 (4rem) plus
          env(safe-area-inset-bottom); placing the FAB bottom at safe-area +
          3.5rem dips its lower edge a few px into the bar. Tabs render z-50;
          we render z-[60] so the trigger stays on top. */}
      <div
        className="fixed right-4 z-[60] md:hidden flex flex-col items-end"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 3.5rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vertical labeled menu. Each row is one large tap target: a text
            label and a round icon button, aligned to the trigger. The column
            grows upward; when closed it collapses, fades, and ignores taps. */}
        <div
          role="menu"
          aria-label="Shortcuts"
          aria-hidden={!open}
          className={`flex flex-col items-end gap-2.5 mb-3 transition-all duration-200 ${
            open ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {ACTIONS.map((a, i) => {
            const iconCircle = a.active
              ? "bg-[#7dd87d] border-[#7dd87d] text-[#0d2818]"
              : "bg-[#1a472a] border-[#7dd87d]/55 text-[#7dd87d] group-hover/row:border-[#7dd87d] group-hover/row:bg-[#235c39]";

            // Nearest the trigger reveals first when opening, so the stack
            // springs up from the Flower; reverse when closing.
            const delay = open ? `${(ACTIONS.length - 1 - i) * 38}ms` : `${i * 18}ms`;
            const controlClass =
              `group/row flex items-center gap-2.5 outline-none transition-all duration-300 ` +
              `focus-visible:opacity-100 ${
                open
                  ? "opacity-100 translate-x-0 scale-100"
                  : "opacity-0 translate-x-5 scale-90"
              }`;
            const controlStyle: React.CSSProperties = {
              transitionDelay: delay,
              transitionTimingFunction: SPRING,
            };

            const inner = (
              <>
                <span
                  className={`select-none whitespace-nowrap rounded-xl border border-white/10 bg-[#0d2818]/90 px-3 py-1.5 text-[13px] font-semibold text-[#eafbe7] shadow-lg backdrop-blur-sm transition-colors group-hover/row:bg-[#15331f] group-hover/row:text-white ${
                    a.active ? "text-[#7dd87d]" : ""
                  }`}
                >
                  {a.label}
                </span>
                <span
                  className={`w-12 h-12 flex-shrink-0 rounded-full border flex items-center justify-center shadow-lg transition-transform duration-200 group-hover/row:scale-105 group-active/row:scale-95 ${iconCircle}`}
                >
                  <a.Icon className="w-[18px] h-[18px]" />
                </span>
              </>
            );

            const closeThenRun = () => {
              haptic(6);
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
                  className={controlClass}
                  style={controlStyle}
                  role="menuitem"
                  aria-label={a.label}
                  tabIndex={open ? 0 : -1}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={a.key}
                type="button"
                onClick={closeThenRun}
                className={controlClass}
                style={controlStyle}
                role="menuitem"
                aria-label={a.label}
                tabIndex={open ? 0 : -1}
              >
                {inner}
              </button>
            );
          })}
        </div>

        {/* Floating trigger (Flower of Life). Spins and lifts onto a glowing
            ring when the menu is open so the state is unmistakable. */}
        <button
          ref={triggerRef}
          onClick={handleTriggerClick}
          className={`relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
            open ? "scale-105" : ""
          }`}
          style={{
            backgroundColor: tint.primary,
            color: "#0d2818",
            boxShadow: open
              ? `0 0 0 4px ${tint.primary}40, 0 12px 32px rgba(0,0,0,0.4)`
              : "0 10px 24px rgba(0,0,0,0.3)",
          }}
          aria-label={open ? "Close shortcuts" : "Open shortcuts"}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span
            className="transition-transform duration-300"
            style={{ transform: open ? "rotate(135deg)" : "rotate(0deg)" }}
          >
            <SeedOfLifeIcon size={28} className="text-[#0d2818]" />
          </span>
        </button>
      </div>
    </>
  );
}
