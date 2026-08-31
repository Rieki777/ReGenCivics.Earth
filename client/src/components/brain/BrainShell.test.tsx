/**
 * The flag is the hard constraint of this whole slice: `/admin-create` with no
 * query string must render exactly what it rendered before the command center
 * existed (response doc 17.15). `brainV2Enabled()` is the single decision that
 * guarantees it, so it is tested as a decision rather than as a screen.
 *
 * The children are mocked. What is being asserted is the shell's own wiring:
 * which tab is showing, that the capture button dispatches the event the modal
 * it mounts is listening for, and that the two fixed-position surfaces pad by
 * the safe-area inset (17.12) instead of sitting under the iOS home indicator.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrainShell, brainV2Enabled, BRAIN_V2_KEY } from "./BrainShell";

vi.mock("@/lib/trpc", () => ({
  trpc: { useUtils: () => ({ brain: { invalidate: vi.fn() } }) },
}));

const captureMounted = vi.fn();
vi.mock("@/components/HarvestCaptureModal", () => ({
  HARVEST_CAPTURE_EVENT: "open-harvest-capture",
  HarvestCaptureModal: () => {
    captureMounted();
    return <div data-testid="capture-modal" />;
  },
}));

vi.mock("./BrainToday", () => ({
  BrainToday: ({ onGoToCreate }: { onGoToCreate: () => void }) => (
    <button type="button" data-testid="today" onClick={onGoToCreate}>
      today
    </button>
  ),
}));

vi.mock("./BrainList", () => ({
  BrainList: ({
    heading,
    kinds,
    realmFilter,
  }: {
    heading: string;
    kinds?: string[];
    realmFilter?: boolean;
  }) => (
    <div data-testid="list" data-realm-filter={realmFilter ? "on" : "off"}>
      {heading}:{(kinds ?? []).join(",")}
    </div>
  ),
}));

vi.mock("./BrainItemSheet", () => ({
  BrainItemSheet: ({ id }: { id: number }) => <div data-testid="sheet">{id}</div>,
}));

function goTo(search: string) {
  window.history.replaceState({}, "", `/admin-create${search}`);
}

describe("brainV2Enabled", () => {
  beforeEach(() => goTo(""));
  afterEach(() => vi.clearAllMocks());

  it("is false with no query string and no stored key, which is the whole guarantee", () => {
    expect(brainV2Enabled()).toBe(false);
  });

  it("is true for ?v=2", () => {
    goTo("?v=2");
    expect(brainV2Enabled()).toBe(true);
  });

  it("is true for the sticky key alone", () => {
    localStorage.setItem(BRAIN_V2_KEY, "1");
    expect(brainV2Enabled()).toBe(true);
  });

  it("?v=1 returns the classic page AND clears the sticky key", () => {
    localStorage.setItem(BRAIN_V2_KEY, "1");
    goTo("?v=1");

    expect(brainV2Enabled()).toBe(false);
    // Without this, turning the flag on by hand once would leave no way back to
    // the page Rye actually uses today.
    expect(localStorage.getItem(BRAIN_V2_KEY)).toBeNull();
    goTo("");
    expect(brainV2Enabled()).toBe(false);
  });

  it("survives storage that throws, the way Safari private mode does", () => {
    const boom = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(brainV2Enabled()).toBe(false);
    boom.mockRestore();
  });
});

describe("BrainShell", () => {
  beforeEach(() => goTo(""));
  afterEach(() => vi.clearAllMocks());

  it("opens on Today with all five sections reachable", () => {
    render(<BrainShell />);

    expect(screen.getByTestId("today")).toBeDefined();
    for (const key of ["today", "create", "build", "todo", "explore"]) {
      expect(screen.getByTestId(`brain-tab-${key}`)).toBeDefined();
    }
    expect(screen.getByTestId("brain-tab-today").getAttribute("aria-current")).toBe("page");
  });

  it("gives each section its own kind filter", async () => {
    const user = userEvent.setup();
    render(<BrainShell />);

    await user.click(screen.getByTestId("brain-tab-build"));
    expect(screen.getByTestId("list").textContent).toBe("Build:build");

    await user.click(screen.getByTestId("brain-tab-todo"));
    expect(screen.getByTestId("list").textContent).toBe("To-do and decide:todo,decide");

    await user.click(screen.getByTestId("brain-tab-explore"));
    expect(screen.getByTestId("list").textContent).toBe("Explore:material,ask");
  });

  it("gives To-do the realm filter, and only To-do", async () => {
    // ADDENDUM-1 item 1. Personal life admin is a to-do, so To-do is the one
    // list where it would otherwise sit interleaved with ReGen build work.
    const user = userEvent.setup();
    render(<BrainShell />);

    await user.click(screen.getByTestId("brain-tab-todo"));
    expect(screen.getByTestId("list").getAttribute("data-realm-filter")).toBe("on");

    await user.click(screen.getByTestId("brain-tab-build"));
    expect(screen.getByTestId("list").getAttribute("data-realm-filter")).toBe("off");

    await user.click(screen.getByTestId("brain-tab-explore"));
    expect(screen.getByTestId("list").getAttribute("data-realm-filter")).toBe("off");
  });

  it("renders The Harvest, unmodified, as the Create tab", async () => {
    render(<BrainShell renderCreate={() => <div data-testid="harvest">the harvest</div>} />);

    await userEvent.setup().click(screen.getByTestId("brain-tab-create"));
    expect(screen.getByTestId("harvest").textContent).toBe("the harvest");
  });

  it("Today's ripest card can hand the reader to Create", async () => {
    render(<BrainShell renderCreate={() => <div data-testid="harvest">the harvest</div>} />);

    await userEvent.setup().click(screen.getByTestId("today"));
    expect(screen.getByTestId("harvest")).toBeDefined();
  });

  it("mounts its own capture modal, because the admin route strips the site's", async () => {
    // App.tsx renders HarvestCaptureModal only when !adminMode, and
    // /admin-create IS an admin route. A FAB dispatching into nothing would
    // look like capture and drop what Rye said into it.
    render(<BrainShell />);
    expect(captureMounted).toHaveBeenCalled();

    const heard = vi.fn();
    window.addEventListener("open-harvest-capture", heard);
    await userEvent.setup().click(screen.getByTestId("brain-capture-fab"));
    window.removeEventListener("open-harvest-capture", heard);
    expect(heard).toHaveBeenCalled();
  });

  it("keeps the tab bar and the capture button off the iOS home indicator", () => {
    render(<BrainShell />);

    // Asserted on className, not on `.style`: jsdom's CSSOM cannot parse
    // `env()` and silently drops an inline style that uses it, so the inline
    // form was untestable here. That is also the reason it is a Tailwind
    // arbitrary value in the source: the declaration lives in the stylesheet,
    // where a real CSS engine parses it, rather than passing through a setter
    // that can reject it.
    // `.safe-area-pb` is index.css:490, the same utility SmartBottomNav uses.
    expect(screen.getByTestId("brain-tabbar").className).toContain("safe-area-pb");
    expect(screen.getByTestId("brain-capture-fab").className).toContain(
      "bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))]",
    );
  });

  it("remembers the last section, so reopening lands where he left off", async () => {
    const user = userEvent.setup();
    const first = render(<BrainShell />);
    await user.click(screen.getByTestId("brain-tab-explore"));
    first.unmount();

    render(<BrainShell />);
    expect(screen.getByTestId("brain-tab-explore").getAttribute("aria-current")).toBe("page");
  });
});
