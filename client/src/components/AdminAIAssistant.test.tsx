/**
 * The FAB capture gesture. Moved from double-click to long-press because two
 * fast taps are unreliable on iOS Safari. What matters here: a normal tap still
 * opens the assistant (that path was always reliable and must stay untouched), a
 * deliberate hold opens the composer, a hold that turns into a scroll is
 * cancelled, and a non-admin sees no trace of the gesture.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { AdminAIAssistant } from "./AdminAIAssistant";

const mockUser = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), loading: false, isAuthenticated: true }),
}));

vi.mock("./HarvestNoteComposer", () => ({
  HarvestNoteComposer: () => <div data-testid="harvest-composer" />,
}));

const noopMutation = () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    adminAI: { chat: { useMutation: () => noopMutation() } },
    adminActions: {
      execute: { useMutation: () => noopMutation() },
      undo: { useMutation: () => noopMutation() },
    },
    quickNotes: {
      status: { useQuery: () => ({ data: { ready: true, voice: true } }) },
    },
  },
}));

const HOLD = 550;

function fab() {
  return screen.getByTestId("admin-fab");
}

/** A quick tap: down then up well under the hold threshold, then the click. */
function tap() {
  const el = fab();
  act(() => {
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerType: "touch", button: 0 });
  });
  act(() => {
    vi.advanceTimersByTime(80);
    fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerType: "touch" });
    fireEvent.click(el);
  });
}

/** A deliberate hold past the threshold. */
function hold(ms = HOLD + 50) {
  const el = fab();
  act(() => {
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerType: "touch", button: 0 });
  });
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("AdminAIAssistant FAB capture gesture", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUser.mockReturnValue({ id: "u1", role: "admin" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows no capture gesture or hint to a non-admin", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    render(<AdminAIAssistant />);

    expect(screen.queryByTestId("admin-fab-hint")).toBeNull();
    expect(fab().getAttribute("title")).toBe("Open AI Assistant");
  });

  it("opens the assistant on a normal tap for a non-admin (no hold path)", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    render(<AdminAIAssistant />);

    // A held press must NOT open a composer for a non-admin.
    hold();
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
    tap();
    expect(screen.getByText("ReGen AI Assistant")).toBeDefined();
  });

  it("opens the assistant on a tap for an admin, not the composer", () => {
    render(<AdminAIAssistant />);
    tap();

    expect(screen.getByText("ReGen AI Assistant")).toBeDefined();
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("opens the composer on a long hold, and suppresses the trailing click", () => {
    render(<AdminAIAssistant />);
    const el = fab();

    act(() => {
      fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerType: "mouse", button: 0 });
    });
    act(() => {
      vi.advanceTimersByTime(HOLD + 50);
    });
    // The composer is open...
    expect(screen.getByTestId("harvest-composer")).toBeDefined();
    expect(screen.getByText("Add note")).toBeDefined();

    // ...and the click a mouse release synthesizes must not flip back to the
    // assistant.
    act(() => {
      fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerType: "mouse" });
      fireEvent.click(el);
    });
    expect(screen.queryByText("ReGen AI Assistant")).toBeNull();
    expect(screen.getByText("Add note")).toBeDefined();
  });

  it("does not open the composer if the press is released before the threshold", () => {
    render(<AdminAIAssistant />);
    const el = fab();
    act(() => {
      fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerType: "touch", button: 0 });
    });
    act(() => {
      vi.advanceTimersByTime(HOLD - 100);
      fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerType: "touch" });
    });
    // Even if the timer would have fired later, releasing cancelled it.
    act(() => {
      vi.advanceTimersByTime(HOLD);
    });
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("cancels the hold when the finger scrolls away", () => {
    render(<AdminAIAssistant />);
    const el = fab();
    act(() => {
      fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerType: "touch", button: 0 });
    });
    act(() => {
      // Moves well past the tolerance: this is a scroll, not a hold.
      fireEvent.pointerMove(el, { clientX: 10, clientY: 60, pointerType: "touch" });
      vi.advanceTimersByTime(HOLD + 100);
    });
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("offers the hold hint to admins", () => {
    render(<AdminAIAssistant />);
    expect(screen.getByTestId("admin-fab-hint").textContent).toContain("Hold to add a note");
    expect(fab().getAttribute("title")).toContain("hold");
  });

  it("disables the double-tap zoom and text selection on the gesture target", () => {
    render(<AdminAIAssistant />);
    const el = fab();
    // touch-action:manipulation removes the double-tap-zoom + 300ms delay;
    // user-select:none stops a long hold from selecting. (-webkit-touch-callout
    // is also set on the element to suppress the iOS callout, but jsdom drops
    // unknown -webkit- properties, so it can't be asserted here — verified in
    // WebKit via scripts/mobile-tap-audit.mjs instead.)
    expect(el.style.touchAction).toBe("manipulation");
    expect(el.style.getPropertyValue("user-select")).toBe("none");
  });

  it("treats superadmin as capture-capable", () => {
    mockUser.mockReturnValue({ id: "u3", role: "superadmin" });
    render(<AdminAIAssistant />);
    hold();
    expect(screen.getByTestId("harvest-composer")).toBeDefined();
  });
});
