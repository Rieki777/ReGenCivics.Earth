/**
 * The list is how Rye finds one of 749 items with a thumb, so what is asserted
 * here is what the SERVER gets asked, not what the DOM happens to look like:
 * a section that quietly drops its kind filter, or a chip that changes the
 * highlight without changing the query, is a list that lies about what it is
 * showing and cannot be caught by eye.
 *
 * Mocking follows `client/src/components/HarvestNoteComposer.test.tsx`: the
 * factory returns arrow functions so the `vi.fn()`s above are read at call
 * time, after their `const` has run, rather than while the factory evaluates.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrainList, dueLabel, type BrainItemView } from "./BrainList";

const listUseQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    brain: {
      list: { useQuery: (input: unknown, opts: unknown) => listUseQuery(input, opts) },
    },
  },
}));

/** Enough of a row for the list. The component reads a handful of columns. */
function item(over: Partial<BrainItemView> & { id: number; title: string }): BrainItemView {
  return {
    kind: "build",
    state: "raw",
    body: "",
    ask: null,
    doneWhen: null,
    blockedOn: null,
    due: null,
    effort: null,
    priority: "soon",
    repo: null,
    surface: null,
    attachments: null,
    proposed: null,
    followsId: null,
    supersedesId: null,
    source: "manual:1",
    trust: "owner",
    batchId: null,
    readyBy: null,
    readyAt: null,
    readyHash: null,
    closedBy: null,
    evidence: null,
    capturedAt: null,
    ownerId: 1,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...over,
  } as unknown as BrainItemView;
}

function result(over: Record<string, unknown> = {}) {
  return { data: [], isLoading: false, isError: false, error: null, ...over };
}

/** The input the component last handed `trpc.brain.list`. */
function lastInput(): Record<string, unknown> {
  return listUseQuery.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

describe("BrainList", () => {
  beforeEach(() => {
    listUseQuery.mockReset();
    listUseQuery.mockReturnValue(result());
  });
  afterEach(() => vi.clearAllMocks());

  it("renders a row per item with its kind, state and screenshot count", () => {
    listUseQuery.mockReturnValue(
      result({
        data: [
          item({ id: 11, title: "overlapping dialogue boxes", attachments: ["harvest/shots/1/a.jpg"] }),
          item({ id: 12, title: "the map should have working links", state: "shaped", repo: "game-amora" }),
        ],
      }),
    );

    render(<BrainList kinds={["build"]} heading="Build" emptyHint="none" onOpenItem={() => {}} />);

    expect(screen.getByTestId("brain-row-11").textContent).toContain("overlapping dialogue boxes");
    expect(screen.getByTestId("brain-row-11").textContent).toContain("build");
    expect(screen.getByTestId("brain-row-11").textContent).toContain("raw");
    // The screenshot IS the item for 61% of the backlog, so the row has to say
    // one is there before you open it.
    expect(screen.getByTestId("brain-row-11").textContent).toContain("1");
    expect(screen.getByTestId("brain-row-12").textContent).toContain("game-amora");
    expect(screen.getByTestId("brain-row-12").textContent).toContain("shaped");
  });

  it("sends the tab's kind filter to the server", () => {
    render(
      <BrainList kinds={["todo", "decide"]} heading="To-do" emptyHint="none" onOpenItem={() => {}} />,
    );
    expect(lastInput()).toMatchObject({ kinds: ["todo", "decide"], limit: 200 });
    expect(lastInput()).not.toHaveProperty("states");
  });

  it("a state chip changes the query input, not just the highlight", async () => {
    const user = userEvent.setup();
    render(<BrainList kinds={["build"]} heading="Build" emptyHint="none" onOpenItem={() => {}} />);

    expect(screen.getByTestId("brain-chip-all").getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByTestId("brain-chip-ready"));
    await waitFor(() => expect(lastInput()).toMatchObject({ states: ["ready"] }));
    expect(screen.getByTestId("brain-chip-ready").getAttribute("aria-pressed")).toBe("true");

    // "In flight" covers claimed-done too: a session that says it finished has
    // not been confirmed, and hiding it in "done" is how 17.5 loses items.
    await user.click(screen.getByTestId("brain-chip-in_flight"));
    await waitFor(() => expect(lastInput()).toMatchObject({ states: ["in_flight", "done_claimed"] }));

    await user.click(screen.getByTestId("brain-chip-all"));
    await waitFor(() => expect(lastInput()).not.toHaveProperty("states"));
  });

  it("puts the search box text into the query after it settles", async () => {
    const user = userEvent.setup();
    render(<BrainList kinds={["build"]} heading="Build" emptyHint="none" onOpenItem={() => {}} />);

    await user.type(screen.getByTestId("brain-search"), "map");
    await waitFor(() => expect(lastInput()).toMatchObject({ q: "map" }), { timeout: 2000 });
  });

  it("tapping a row hands the id up rather than opening its own sheet", async () => {
    const onOpenItem = vi.fn();
    listUseQuery.mockReturnValue(result({ data: [item({ id: 42, title: "revert this icon" })] }));
    render(<BrainList kinds={["build"]} heading="Build" emptyHint="none" onOpenItem={onOpenItem} />);

    await userEvent.setup().click(screen.getByTestId("brain-row-42"));
    expect(onOpenItem).toHaveBeenCalledWith(42);
  });

  it("says why the list is empty instead of showing a blank column", () => {
    render(
      <BrainList
        kinds={["build"]}
        heading="Build"
        emptyHint="Nothing to build in this filter."
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByTestId("brain-list-empty").textContent).toContain(
      "Nothing to build in this filter.",
    );
  });

  it("shows the server's own failure text, not a blank list", () => {
    // brain_items does not exist in production yet. An empty list here would
    // read as "you have no work", which is the most expensive possible lie.
    listUseQuery.mockReturnValue(
      result({ isError: true, error: { message: "Table 'brain_items' doesn't exist" } }),
    );
    render(<BrainList kinds={["build"]} heading="Build" emptyHint="none" onOpenItem={() => {}} />);

    expect(screen.getByTestId("brain-list-error").textContent).toContain(
      "Table 'brain_items' doesn't exist",
    );
    expect(screen.queryByTestId("brain-list-empty")).toBeNull();
  });

  it("admits when the result is capped rather than implying it is everything", () => {
    listUseQuery.mockReturnValue(
      result({ data: Array.from({ length: 5 }, (_, i) => item({ id: i + 1, title: `n${i}` })) }),
    );
    render(
      <BrainList kinds={["build"]} heading="Build" emptyHint="none" limit={5} onOpenItem={() => {}} />,
    );
    expect(screen.getByTestId("brain-list-capped").textContent).toContain("5 most recently touched");
  });
});

describe("dueLabel", () => {
  const now = new Date("2026-08-30T12:00:00");

  it("counts in local calendar days, so 'today' is today where Rye is standing", () => {
    expect(dueLabel(new Date("2026-08-30T23:00:00"), now)).toBe("due today");
    expect(dueLabel(new Date("2026-08-31T01:00:00"), now)).toBe("due tomorrow");
    expect(dueLabel(new Date("2026-09-02T09:00:00"), now)).toBe("due in 3d");
    expect(dueLabel(new Date("2026-08-27T09:00:00"), now)).toBe("3d overdue");
  });

  it("has nothing to say about an item with no date", () => {
    expect(dueLabel(null, now)).toBeNull();
    expect(dueLabel(undefined, now)).toBeNull();
  });
});
