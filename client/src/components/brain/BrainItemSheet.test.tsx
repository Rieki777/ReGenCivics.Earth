/**
 * The ready gate has no interface except this sheet's refusal line.
 *
 * `brain.promote` throws PRECONDITION_FAILED with its reasons joined into one
 * string ("missing ask; missing done_when"). If this component paraphrases,
 * truncates, or swallows that string, the gate becomes a button that fails for
 * reasons Rye cannot see, and the honest answer to "why won't this promote?"
 * becomes a guess. So the assertion is on the exact text.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrainItemSheet, assetUrl } from "./BrainItemSheet";
import type { BrainItemView } from "./BrainList";

const getUseQuery = vi.fn();
const listUseQuery = vi.fn();
const refetch = vi.fn();
const updateMutateAsync = vi.fn();
const setStateMutateAsync = vi.fn();
const promoteMutateAsync = vi.fn();
const splitMutateAsync = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    brain: {
      get: { useQuery: (input: unknown, opts: unknown) => getUseQuery(input, opts) },
      list: { useQuery: (input: unknown, opts: unknown) => listUseQuery(input, opts) },
      update: { useMutation: () => ({ mutateAsync: updateMutateAsync, isPending: false }) },
      setState: { useMutation: () => ({ mutateAsync: setStateMutateAsync, isPending: false }) },
      promote: { useMutation: () => ({ mutateAsync: promoteMutateAsync, isPending: false }) },
      split: { useMutation: () => ({ mutateAsync: splitMutateAsync, isPending: false }) },
    },
  },
}));

function item(over: Partial<BrainItemView> = {}): BrainItemView {
  return {
    id: 7,
    ownerId: 1,
    kind: "build",
    state: "raw",
    title: "overlapping dialogue boxes",
    body: "Need to deal with the overlapping dialogue boxes look at the bottom 3",
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
    source: "telegram:113934",
    trust: "owner",
    batchId: null,
    readyBy: null,
    readyAt: null,
    readyHash: null,
    closedBy: null,
    evidence: null,
    capturedAt: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...over,
  } as unknown as BrainItemView;
}

function loaded(row: BrainItemView) {
  return { data: row, isLoading: false, isError: false, error: null, refetch };
}

describe("BrainItemSheet", () => {
  beforeEach(() => {
    for (const fn of [
      getUseQuery,
      listUseQuery,
      refetch,
      updateMutateAsync,
      setStateMutateAsync,
      promoteMutateAsync,
      splitMutateAsync,
    ]) {
      fn.mockReset();
    }
    refetch.mockResolvedValue(undefined);
    listUseQuery.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    getUseQuery.mockReturnValue(loaded(item()));
  });
  afterEach(() => vi.clearAllMocks());

  it("shows the gate's blockers word for word when promote refuses", async () => {
    promoteMutateAsync.mockRejectedValue(new Error("missing ask; missing done_when"));
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await userEvent.setup().click(screen.getByTestId("brain-promote"));

    await waitFor(() => {
      expect(screen.getByTestId("brain-refusal").textContent).toBe("missing ask; missing done_when");
    });
  });

  it("shows an external item's refusal too, rather than hiding the trust rule", async () => {
    getUseQuery.mockReturnValue(loaded(item({ trust: "external" })));
    promoteMutateAsync.mockRejectedValue(
      new Error("external source: rewrite the ask in your own words first"),
    );
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    expect(screen.getByText("external source")).toBeDefined();
    await userEvent.setup().click(screen.getByTestId("brain-promote"));

    await waitFor(() => {
      expect(screen.getByTestId("brain-refusal").textContent).toBe(
        "external source: rewrite the ask in your own words first",
      );
    });
  });

  it("shows the state machine's refusal verbatim as well", async () => {
    setStateMutateAsync.mockRejectedValue(new Error("Cannot move raw to done"));
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await userEvent.setup().click(screen.getByTestId("brain-done"));

    await waitFor(() => {
      expect(screen.getByTestId("brain-refusal").textContent).toBe("Cannot move raw to done");
    });
  });

  it("clears a stale refusal when the next action succeeds", async () => {
    promoteMutateAsync.mockRejectedValueOnce(new Error("missing ask; missing done_when"));
    promoteMutateAsync.mockResolvedValueOnce(item({ state: "ready" }));
    const user = userEvent.setup();
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await user.click(screen.getByTestId("brain-promote"));
    await waitFor(() => expect(screen.getByTestId("brain-refusal")).toBeDefined());

    await user.click(screen.getByTestId("brain-promote"));
    await waitFor(() => expect(screen.queryByTestId("brain-refusal")).toBeNull());
    expect(screen.getByTestId("brain-notice").textContent).toContain("Promoted to ready");
  });

  it("Save is dead until something changed, then sends ONLY what changed", async () => {
    updateMutateAsync.mockResolvedValue(item());
    const user = userEvent.setup();
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    expect((screen.getByTestId("brain-save") as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByTestId("brain-field-ask"), "Fix the stacked dialogs on mobile");
    expect((screen.getByTestId("brain-save") as HTMLButtonElement).disabled).toBe(false);

    await user.click(screen.getByTestId("brain-save"));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());

    // `updateItem` moves a raw item to `shaped` when the payload carries a
    // `kind`. Sending the untouched kind on every save would report items as
    // shaped that nobody shaped, so the payload is exactly the diff.
    expect(updateMutateAsync.mock.calls[0][0]).toEqual({
      id: 7,
      ask: "Fix the stacked dialogs on mobile",
    });
  });

  it("clearing a field sends null, so the column is cleared rather than set to empty", async () => {
    getUseQuery.mockReturnValue(loaded(item({ repo: "regen-civics", ask: "a" })));
    updateMutateAsync.mockResolvedValue(item());
    const user = userEvent.setup();
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await user.clear(screen.getByTestId("brain-field-repo"));
    await user.click(screen.getByTestId("brain-save"));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 7, repo: null }));
  });

  it("renders an attachment from the authed asset route and degrades to its key", async () => {
    getUseQuery.mockReturnValue(loaded(item({ attachments: ["harvest/shots/1/photo 12.jpg"] })));
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    const img = screen.getByAltText("Attachment harvest/shots/1/photo 12.jpg") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/api/brain/assets/harvest/shots/1/photo%2012.jpg");

    // Lane B's route may not exist yet, and a broken image icon is worse than
    // the key it could not fetch.
    fireEvent.error(img);
    await waitFor(() => {
      expect(screen.queryByAltText("Attachment harvest/shots/1/photo 12.jpg")).toBeNull();
    });
    expect(screen.getByText("harvest/shots/1/photo 12.jpg")).toBeDefined();
  });

  it("splits into a second item with the body typed here", async () => {
    splitMutateAsync.mockResolvedValue({ first: item(), second: item({ id: 8 }) });
    const user = userEvent.setup();
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await user.click(screen.getByTestId("brain-split-open"));
    await user.type(screen.getByTestId("brain-split-body"), "and the videos lag");
    await user.click(screen.getByTestId("brain-split-confirm"));

    await waitFor(() => {
      expect(splitMutateAsync).toHaveBeenCalledWith({ id: 7, secondBody: "and the videos lag" });
    });
  });

  it("says why the item could not load instead of showing an empty form", () => {
    getUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "No item #7" },
      refetch,
    });
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    expect(screen.getByText(/No item #7/)).toBeDefined();
    expect(screen.queryByTestId("brain-field-ask")).toBeNull();
  });
});

describe("assetUrl", () => {
  it("encodes each segment and keeps the key's slashes", () => {
    expect(assetUrl("harvest/shots/12/photo_1@2026-08-30.jpg")).toBe(
      "/api/brain/assets/harvest/shots/12/photo_1%402026-08-30.jpg",
    );
  });

  it("escapes characters that would otherwise end the path", () => {
    // A '?' or '#' in a filename would silently turn the rest of the key into a
    // query string or a fragment, and the server would look up a shorter key.
    expect(assetUrl("harvest/voice/3/note?draft#2.oga")).toBe(
      "/api/brain/assets/harvest/voice/3/note%3Fdraft%232.oga",
    );
  });
});

/**
 * The realm control is the only thing in this sheet that saves on tap, and the
 * only thing that checks its own result. Both are because of a specific hazard:
 * `brain.update` does not accept `realm` yet, and a zod object STRIPS an
 * unknown key rather than rejecting it. Routed through Save, moving an item to
 * Personal would have printed "Saved." and moved nothing, which is worse than
 * an error because it looks like success.
 *
 * So there are two tests here that must both keep passing, in this order: the
 * control sends the field, and the control refuses out loud when the field does
 * not take. When Lane E's input schema gains realm, the second one starts
 * describing a bug that can no longer happen, and it should stay anyway.
 */
describe("BrainItemSheet realm", () => {
  beforeEach(() => {
    for (const fn of [getUseQuery, listUseQuery, refetch, updateMutateAsync]) fn.mockReset();
    refetch.mockResolvedValue(undefined);
    listUseQuery.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    getUseQuery.mockReturnValue(loaded(item()));
  });
  afterEach(() => vi.clearAllMocks());

  it("moves the item to the personal half on tap, no Save needed", async () => {
    getUseQuery.mockReturnValue(loaded(item({ realm: "regen" } as Partial<BrainItemView>)));
    updateMutateAsync.mockResolvedValue({ ...item(), realm: "personal" });
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await userEvent.setup().click(screen.getByTestId("brain-sheet-realm-personal"));

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({ id: 7, realm: "personal" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("brain-notice").textContent).toContain("Moved to Personal"),
    );
    expect(screen.queryByTestId("brain-refusal")).toBeNull();
  });

  it("refuses out loud when the server drops the field instead of claiming a save", async () => {
    // This is the live behaviour today: the update input has no realm key, zod
    // strips it, the mutation succeeds and the row comes back unchanged.
    getUseQuery.mockReturnValue(loaded(item({ realm: "regen" } as Partial<BrainItemView>)));
    updateMutateAsync.mockResolvedValue({ ...item(), realm: "regen" });
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    await userEvent.setup().click(screen.getByTestId("brain-sheet-realm-personal"));

    await waitFor(() =>
      expect(screen.getByTestId("brain-refusal").textContent).toContain(
        "brain.update needs realm in its input schema",
      ),
    );
    expect(screen.queryByTestId("brain-notice")).toBeNull();
  });

  it("does nothing when the item is already in that half", async () => {
    getUseQuery.mockReturnValue(loaded(item({ realm: "personal" } as Partial<BrainItemView>)));
    render(<BrainItemSheet id={7} onClose={() => {}} />);

    expect(screen.getByTestId("brain-sheet-realm-personal").getAttribute("aria-pressed")).toBe("true");
    await userEvent.setup().click(screen.getByTestId("brain-sheet-realm-personal"));
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it("shows ReGen as the half for a row from a server without the column", () => {
    getUseQuery.mockReturnValue(loaded(item()));
    render(<BrainItemSheet id={7} onClose={() => {}} />);
    expect(screen.getByTestId("brain-sheet-realm-regen").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("BrainItemSheet done_when label", () => {
  beforeEach(() => {
    for (const fn of [getUseQuery, listUseQuery, refetch, updateMutateAsync]) fn.mockReset();
    refetch.mockResolvedValue(undefined);
    listUseQuery.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    getUseQuery.mockReturnValue(loaded(item()));
  });
  afterEach(() => vi.clearAllMocks());

  it("stops implying done_when is mandatory once the kind is create", async () => {
    // brain-gate.ts:72 exempts create: the angle in `ask` is the whole brief.
    // A field that looks required and is not is a field Rye fills in to get
    // past a door that was already open.
    getUseQuery.mockReturnValue(loaded(item({ kind: "build" })));
    render(<BrainItemSheet id={7} onClose={() => {}} />);
    expect(screen.getByText("Done when (how anyone would know)")).toBeDefined();

    fireEvent.change(screen.getByTestId("brain-field-kind"), { target: { value: "create" } });
    await waitFor(() => expect(screen.getByText("Done when (optional for create)")).toBeDefined());
  });
});
