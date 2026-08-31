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
import { BrainList, dueLabel, realmOf, type BrainItemView } from "./BrainList";

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

/**
 * The realm filter is the one control here that does NOT change the query, and
 * that is the thing worth pinning down. `brain.list` has no realm input, so the
 * cut happens on rows the server already returned, which means two claims the
 * list makes could quietly become false: "nothing here" when the work is simply
 * in the other half, and "showing the N most recent" when N was counted before
 * the cut. Both are asserted below.
 */
describe("BrainList realm filter", () => {
  beforeEach(() => {
    localStorage.clear();
    listUseQuery.mockReset();
    listUseQuery.mockReturnValue(result());
  });
  afterEach(() => vi.clearAllMocks());

  const both = [
    item({ id: 1, title: "ship the RSVP admin", kind: "todo" }),
    item({ id: 2, title: "renew the car insurance", kind: "todo", realm: "personal" }),
  ];

  it("is absent unless the tab asks for it", () => {
    render(<BrainList kinds={["build"]} heading="Build" emptyHint="none" onOpenItem={() => {}} />);
    expect(screen.queryByTestId("brain-realm-filter")).toBeNull();
  });

  it("opens on ReGen and hides personal life admin from the build list", () => {
    listUseQuery.mockReturnValue(result({ data: both }));
    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" realmFilter onOpenItem={() => {}} />);

    expect(screen.getByTestId("brain-realm-regen").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("brain-row-1")).toBeDefined();
    expect(screen.queryByTestId("brain-row-2")).toBeNull();
  });

  it("switches to the personal half and back", async () => {
    const user = userEvent.setup();
    listUseQuery.mockReturnValue(result({ data: both }));
    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" realmFilter onOpenItem={() => {}} />);

    await user.click(screen.getByTestId("brain-realm-personal"));
    expect(screen.getByTestId("brain-row-2")).toBeDefined();
    expect(screen.queryByTestId("brain-row-1")).toBeNull();

    await user.click(screen.getByTestId("brain-realm-regen"));
    expect(screen.getByTestId("brain-row-1")).toBeDefined();
  });

  it("labels a personal row wherever it shows, since Today has no filter", () => {
    listUseQuery.mockReturnValue(result({ data: [both[1]] }));
    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" onOpenItem={() => {}} />);
    expect(screen.getByTestId("brain-row-2").textContent).toContain("personal");
  });

  it("does not label the 749 ReGen rows, which would be noise on every row", () => {
    listUseQuery.mockReturnValue(result({ data: [both[0]] }));
    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" onOpenItem={() => {}} />);
    expect(screen.getByTestId("brain-row-1").textContent).not.toContain("personal");
  });

  it("says the work is in the other half instead of claiming there is none", async () => {
    listUseQuery.mockReturnValue(result({ data: [both[0]] }));
    render(
      <BrainList
        kinds={["todo"]}
        heading="To-do"
        emptyHint="Nothing here at all."
        realmFilter
        onOpenItem={() => {}}
      />,
    );

    await userEvent.setup().click(screen.getByTestId("brain-realm-personal"));
    const text = screen.getByTestId("brain-list-empty").textContent ?? "";
    expect(text).toContain("Nothing in Personal");
    expect(text).toContain("1 item is in the other half");
    expect(text).not.toContain("Nothing here at all.");
  });

  it("keeps the tab's own empty hint when the server really returned nothing", () => {
    render(
      <BrainList
        kinds={["todo"]}
        heading="To-do"
        emptyHint="Nothing here at all."
        realmFilter
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByTestId("brain-list-empty").textContent).toContain("Nothing here at all.");
  });

  it("admits the cap is counted before the realm cut, not after", () => {
    // Otherwise "the 5 most recently touched" reads as five ReGen to-dos when
    // it is five rows of both halves with some of them then hidden.
    listUseQuery.mockReturnValue(
      result({ data: Array.from({ length: 5 }, (_, i) => item({ id: i + 10, title: `n${i}` })) }),
    );
    render(
      <BrainList
        kinds={["todo"]}
        heading="To-do"
        emptyHint="none"
        limit={5}
        realmFilter
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByTestId("brain-list-capped").textContent).toContain("across both halves");
  });

  it("does not ask the server for a realm it cannot filter on", () => {
    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" realmFilter onOpenItem={() => {}} />);
    expect(lastInput()).not.toHaveProperty("realm");
  });

  it("reopens on the half he was last working in", async () => {
    listUseQuery.mockReturnValue(result({ data: both }));
    const first = render(
      <BrainList kinds={["todo"]} heading="To-do" emptyHint="none" realmFilter onOpenItem={() => {}} />,
    );
    await userEvent.setup().click(screen.getByTestId("brain-realm-personal"));
    first.unmount();

    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" realmFilter onOpenItem={() => {}} />);
    expect(screen.getByTestId("brain-realm-personal").getAttribute("aria-pressed")).toBe("true");
  });

  it("opens on ReGen when storage throws, never filing the backlog under Personal", () => {
    const boom = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    listUseQuery.mockReturnValue(result({ data: both }));
    render(<BrainList kinds={["todo"]} heading="To-do" emptyHint="none" realmFilter onOpenItem={() => {}} />);

    expect(screen.getByTestId("brain-realm-regen").getAttribute("aria-pressed")).toBe("true");
    boom.mockRestore();
  });
});

describe("realmOf", () => {
  it("treats a row from a server that predates the column as ReGen work", () => {
    // Migration 0232 defaults every existing row to regen. A client ahead of
    // the server reads undefined, and answering "personal" there would file all
    // 749 items in the lane that is walled off from every downstream corpus.
    expect(realmOf({})).toBe("regen");
    expect(realmOf({ realm: null })).toBe("regen");
    expect(realmOf({ realm: "regen" })).toBe("regen");
    expect(realmOf({ realm: "personal" })).toBe("personal");
  });
});
