/**
 * Two things are worth testing here and they pull in opposite directions.
 *
 * One: the answer has to reach the server with the exact word Lane E's contract
 * uses. "Still open" on the button is `open` on the wire, and a button that
 * sends the label instead would fail server-side validation on a screen whose
 * entire job is to be answerable without thinking.
 *
 * Two: this component is deliberately written against procedures that do not
 * exist in this checkout, so the not-yet-wired case is a real state and not a
 * hypothetical. A red "could not load" box on Today for a procedure nobody has
 * shipped yet would train Rye to ignore red boxes on Today.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TriageQueue, isMissingProcedure } from "./TriageQueue";
import type { BrainItemView } from "./BrainList";

const nextUseQuery = vi.fn();
const pendingUseQuery = vi.fn();
const answerMutateAsync = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    brain: {
      triageNext: { useQuery: (input: unknown, opts: unknown) => nextUseQuery(input, opts) },
      triagePending: { useQuery: (input: unknown, opts: unknown) => pendingUseQuery(input, opts) },
      triageAnswer: { useMutation: () => ({ mutateAsync: answerMutateAsync }) },
    },
  },
}));

function item(over: Partial<BrainItemView> & { id: number; title: string }): BrainItemView {
  return {
    kind: "build",
    state: "raw",
    body: "",
    repo: null,
    source: "telegram-vault:2026-06-02.md",
    attachments: null,
    ...over,
  } as unknown as BrainItemView;
}

function result(over: Record<string, unknown> = {}) {
  return { data: [], isLoading: false, isError: false, error: null, ...over };
}

describe("TriageQueue", () => {
  beforeEach(() => {
    nextUseQuery.mockReset();
    pendingUseQuery.mockReset();
    pendingUseQuery.mockReturnValue({ data: undefined, isError: false });
    answerMutateAsync.mockReset();
    answerMutateAsync.mockResolvedValue(undefined);
    nextUseQuery.mockReturnValue(result());
  });
  afterEach(() => vi.clearAllMocks());

  it("asks for the morning's five", () => {
    render(<TriageQueue />);
    expect(nextUseQuery.mock.calls.at(-1)?.[0]).toMatchObject({ limit: 5 });
  });

  it("offers all three answers on every item, thumb-sized", () => {
    nextUseQuery.mockReturnValue(
      result({ data: [item({ id: 31, title: "fix the map links", repo: "game-amora" })] }),
    );
    render(<TriageQueue />);

    for (const [key, label] of [
      ["done", "Done"],
      ["open", "Still open"],
      ["unsure", "Not sure"],
    ]) {
      const btn = screen.getByTestId(`brain-triage-31-${key}`);
      expect(btn.textContent).toBe(label);
      expect(btn.className).toContain("min-h-11");
    }
    expect(screen.getByTestId("brain-triage-31").textContent).toContain("fix the map links");
    expect(screen.getByTestId("brain-triage-31").textContent).toContain("game-amora");
  });

  it("sends the contract's word, not the button's label", async () => {
    const onAnswered = vi.fn();
    nextUseQuery.mockReturnValue(result({ data: [item({ id: 31, title: "fix the map links" })] }));
    render(<TriageQueue onAnswered={onAnswered} />);

    await userEvent.setup().click(screen.getByTestId("brain-triage-31-open"));

    await waitFor(() => expect(answerMutateAsync).toHaveBeenCalledWith({ id: 31, answer: "open" }));
    expect(onAnswered).toHaveBeenCalled();
  });

  it("marks done with the answer that actually closes an item", async () => {
    nextUseQuery.mockReturnValue(result({ data: [item({ id: 44, title: "already shipped" })] }));
    render(<TriageQueue />);

    await userEvent.setup().click(screen.getByTestId("brain-triage-44-done"));
    await waitFor(() => expect(answerMutateAsync).toHaveBeenCalledWith({ id: 44, answer: "done" }));
  });

  it("shows the server's refusal verbatim rather than dropping the answer", async () => {
    nextUseQuery.mockReturnValue(result({ data: [item({ id: 44, title: "already shipped" })] }));
    answerMutateAsync.mockRejectedValue(new Error("Cannot move parked to done"));
    render(<TriageQueue />);

    await userEvent.setup().click(screen.getByTestId("brain-triage-44-done"));
    await waitFor(() =>
      expect(screen.getByTestId("brain-triage-refusal").textContent).toContain(
        "Cannot move parked to done",
      ),
    );
  });

  it("says the queue is not wired yet instead of showing a failure", () => {
    nextUseQuery.mockReturnValue(
      result({
        isError: true,
        error: { message: 'No procedure found on path "brain.triageNext"', data: { code: "NOT_FOUND" } },
      }),
    );
    render(<TriageQueue />);

    const text = screen.getByTestId("brain-triage-error").textContent ?? "";
    expect(text).toContain("not wired on the server yet");
    expect(text).not.toContain("could not load");
  });

  it("but repeats a real failure word for word", () => {
    nextUseQuery.mockReturnValue(
      result({ isError: true, error: { message: "Table 'brain_items' doesn't exist", data: null } }),
    );
    render(<TriageQueue />);
    expect(screen.getByTestId("brain-triage-error").textContent).toContain(
      "Table 'brain_items' doesn't exist",
    );
  });

  it("says why it is empty rather than showing a bare heading", () => {
    render(<TriageQueue />);
    expect(screen.getByTestId("brain-triage-empty").textContent).toContain("Nothing waiting");
  });
});

describe("isMissingProcedure", () => {
  it("reads the code when tRPC sends one", () => {
    expect(isMissingProcedure({ message: "x", data: { code: "NOT_FOUND" } })).toBe(true);
    expect(isMissingProcedure({ message: "x", data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(false);
  });

  it("falls back to the message, because links strip the shape in some setups", () => {
    expect(isMissingProcedure({ message: 'No procedure found on path "brain.triageNext"' })).toBe(true);
    expect(isMissingProcedure({ message: "Table 'brain_items' doesn't exist" })).toBe(false);
    expect(isMissingProcedure(null)).toBe(false);
  });
});

describe("TriageQueue pending count", () => {
  beforeEach(() => {
    nextUseQuery.mockReset();
    pendingUseQuery.mockReset();
    answerMutateAsync.mockReset();
    nextUseQuery.mockReturnValue(
      result({ data: [item({ id: 1, title: "a" }), item({ id: 2, title: "b" })] }),
    );
    pendingUseQuery.mockReturnValue({ data: undefined, isError: false });
  });
  afterEach(() => vi.clearAllMocks());

  it("says five of thirty-seven, not five, when there is a queue behind them", () => {
    pendingUseQuery.mockReturnValue({ data: 37, isError: false });
    render(<TriageQueue />);
    expect(screen.getByTestId("brain-triage").textContent).toContain("Probably done (2 of 37)");
  });

  it("drops the total rather than the section when the count is unavailable", () => {
    pendingUseQuery.mockReturnValue({ data: undefined, isError: true });
    render(<TriageQueue />);
    expect(screen.getByTestId("brain-triage").textContent).toContain("Probably done (2)");
    expect(screen.getByTestId("brain-triage-1")).toBeDefined();
  });

  it("does not say two of two, which reads as a coincidence rather than a total", () => {
    pendingUseQuery.mockReturnValue({ data: 2, isError: false });
    render(<TriageQueue />);
    expect(screen.getByTestId("brain-triage").textContent).toContain("Probably done (2)");
  });
});
