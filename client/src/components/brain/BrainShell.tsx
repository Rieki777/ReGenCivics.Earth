/**
 * The command center shell: five tabs, one column, thumb-reachable.
 *
 * Mounted only behind `?v=2` (or a sticky `brain-v2` key). The plain
 * `/admin-create` renders exactly what it rendered before this file existed
 * (17.15): nothing here is imported into that path, and nothing here changes a
 * Harvest procedure.
 *
 * Two things this file owns that iOS punishes you for forgetting (17.12):
 *
 *  - The tab bar and the capture button both pad by `env(safe-area-inset-bottom)`.
 *    Without it they sit under the home indicator, where the swipe-up gesture
 *    eats the tap. The bar reuses `index.css`'s `.safe-area-pb`, which is what
 *    the site's own `SmartBottomNav` uses; the FAB needs `calc()` on top of the
 *    inset, so it is a Tailwind arbitrary value. Either way it is a class, not
 *    an inline style, so the declaration lives in the stylesheet where a CSS
 *    engine parses it, and always with a `0px` fallback: some iPhone Safari
 *    cases (PWA mode, embedded web views, landscape) report the inset as 0 or
 *    not at all, and a bare `env()` with no fallback makes the whole
 *    declaration invalid there. Both notes are `WizardRadialMenu.tsx`'s,
 *    learned the hard way.
 *  - `/admin-create` bypasses site chrome (`App.tsx:69`, `isAdminRoute`), so
 *    `SmartBottomNav` and the radial menu are not there to collide with. The
 *    same bypass ALSO means `HarvestCaptureModal` is not mounted
 *    (`App.tsx:574` is `{!adminMode && <HarvestCaptureModal />}`), so this
 *    shell mounts its own. Dispatching `open-harvest-capture` from here with
 *    nothing listening would have been a button that looks like capture and
 *    silently drops what Rye says into it.
 */
import { useEffect, useState } from "react";
import { Compass, Hammer, ListChecks, Plus, Sprout, Sunrise } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { HarvestCaptureModal, HARVEST_CAPTURE_EVENT } from "@/components/HarvestCaptureModal";
import { BrainList } from "./BrainList";
import { BrainItemSheet } from "./BrainItemSheet";
import { BrainToday } from "./BrainToday";

/** Set by hand (or by a future toggle); `?v=2` alone does not make it sticky. */
export const BRAIN_V2_KEY = "brain-v2";
const BRAIN_TAB_KEY = "brain-tab";

/**
 * Whether `/admin-create` should render the command center instead of The
 * Harvest. `?v=1` is the documented way back, and it also clears the sticky key
 * so a one-time experiment can never lock Rye out of the page he uses today.
 */
export function brainV2Enabled(): boolean {
  if (typeof window === "undefined") return false;
  let param: string | null = null;
  try {
    param = new URLSearchParams(window.location.search).get("v");
  } catch {
    param = null;
  }
  if (param === "1") {
    try {
      localStorage.removeItem(BRAIN_V2_KEY);
    } catch {
      // Private mode throws on write. Nothing to clean up, nothing to report.
    }
    return false;
  }
  if (param === "2") return true;
  try {
    return localStorage.getItem(BRAIN_V2_KEY) === "1";
  } catch {
    return false;
  }
}

export const BRAIN_TABS = [
  { key: "today", label: "Today", Icon: Sunrise },
  { key: "create", label: "Create", Icon: Sprout },
  { key: "build", label: "Build", Icon: Hammer },
  { key: "todo", label: "To-do", Icon: ListChecks },
  { key: "explore", label: "Explore", Icon: Compass },
] as const;

export type BrainTab = (typeof BRAIN_TABS)[number]["key"];

function isTab(v: string | null): v is BrainTab {
  return !!v && BRAIN_TABS.some((t) => t.key === v);
}

export interface BrainShellProps {
  /**
   * The Create tab is The Harvest exactly as it is today. It arrives as a prop
   * rather than an import so this file and `AdminCreate.tsx` do not import each
   * other, and so the shell can be rendered in a test without the whole Harvest
   * feed behind it.
   */
  renderCreate?: () => React.ReactNode;
}

export function BrainShell({ renderCreate }: BrainShellProps) {
  const [tab, setTab] = useState<BrainTab>(() => {
    if (typeof window === "undefined") return "today";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("tab");
      if (isTab(fromUrl)) return fromUrl;
      const stored = localStorage.getItem(BRAIN_TAB_KEY);
      if (isTab(stored)) return stored;
    } catch {
      // No storage, no URL. Today is the right default either way.
    }
    return "today";
  });

  // One sheet owner per screen. The list tabs hand an id up rather than each
  // mounting their own copy, which also keeps `BrainList` free of any import of
  // the sheet (see the note on `onOpenItem`).
  const [openId, setOpenId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    try {
      localStorage.setItem(BRAIN_TAB_KEY, tab);
    } catch {
      // Losing the last tab is not worth a crash.
    }
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {tab === "create" ? (
        <>
          {renderCreate ? renderCreate() : null}
          {/* The Harvest page ends in pb-24, which is not quite the tab bar plus
              the home indicator. This makes up the difference. */}
          <div aria-hidden="true" className="h-[calc(2rem_+_env(safe-area-inset-bottom,0px))]" />
        </>
      ) : (
        <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
          {tab === "today" ? <BrainToday onGoToCreate={() => setTab("create")} /> : null}
          {tab === "build" ? (
            <BrainList
              kinds={["build"]}
              heading="Build"
              emptyHint="Nothing to build in this filter. Items become build when a session is what moves them next."
              onOpenItem={setOpenId}
            />
          ) : null}
          {tab === "todo" ? (
            <BrainList
              kinds={["todo", "decide"]}
              heading="To-do and decide"
              emptyHint="Nothing here. To-do is what your hands move; decide is what a conversation moves."
              onOpenItem={setOpenId}
            />
          ) : null}
          {tab === "explore" ? (
            <BrainList
              kinds={["material", "ask"]}
              heading="Explore"
              emptyHint="Nothing here. Material is what you saved to read; ask is a question waiting on an answer."
              onOpenItem={setOpenId}
            />
          ) : null}
        </div>
      )}

      {openId !== null ? (
        <BrainItemSheet
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void utils.brain.invalidate()}
        />
      ) : null}

      <button
        type="button"
        aria-label="Capture a note"
        data-testid="brain-capture-fab"
        onClick={() => window.dispatchEvent(new CustomEvent(HARVEST_CAPTURE_EVENT))}
        className="fixed right-4 bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a472a] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      <nav
        aria-label="Command center sections"
        data-testid="brain-tabbar"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1a472a]/15 bg-white safe-area-pb"
      >
        <div className="mx-auto flex max-w-3xl">
          {BRAIN_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? "page" : undefined}
              data-testid={`brain-tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                tab === key ? "text-[#1a472a]" : "text-[#4a7c59]"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <HarvestCaptureModal />
    </div>
  );
}

export default BrainShell;
