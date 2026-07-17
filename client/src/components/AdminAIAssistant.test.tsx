/**
 * The FAB capture gesture (CLAUDE_CODE_PROMPT_2026-07-16_FAB_CAPTURE_GESTURE.md).
 * What matters here is the discrimination: a single click must never be eaten by
 * the double-click detector, a double must never also fire the single, and a
 * non-admin must see no trace of the gesture at all.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
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

/** Click the FAB n times inside the double-click window. */
function clickFab(times: number) {
  const fab = screen.getByTestId("admin-fab");
  for (let i = 0; i < times; i++) {
    act(() => {
      fab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }
}

/** Let the deferred single-click action fire. */
function runOutClickWindow() {
  act(() => {
    vi.advanceTimersByTime(400);
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
    expect(screen.getByTestId("admin-fab").getAttribute("title")).toBe("Open AI Assistant");
  });

  it("opens the assistant immediately for a non-admin, with no double-click delay", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    render(<AdminAIAssistant />);

    clickFab(1);
    // No timer advance: today's behavior is preserved exactly.
    expect(screen.getByText("ReGen AI Assistant")).toBeDefined();
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("opens the assistant on a single click for an admin", () => {
    render(<AdminAIAssistant />);

    clickFab(1);
    runOutClickWindow();

    expect(screen.getByText("ReGen AI Assistant")).toBeDefined();
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("opens the composer on a double click and does not also open the assistant", () => {
    render(<AdminAIAssistant />);

    clickFab(2);
    runOutClickWindow();

    expect(screen.getByTestId("harvest-composer")).toBeDefined();
    expect(screen.getByText("Add note")).toBeDefined();
    expect(screen.queryByText("ReGen AI Assistant")).toBeNull();
  });

  it("offers the double-click hint to admins", () => {
    render(<AdminAIAssistant />);

    expect(screen.getByTestId("admin-fab-hint").textContent).toContain("Double-click to add a note");
    expect(screen.getByTestId("admin-fab").getAttribute("title")).toContain("double-click");
  });

  it("suppresses double-tap zoom on the gesture target for admins", () => {
    render(<AdminAIAssistant />);
    expect(screen.getByTestId("admin-fab").style.touchAction).toBe("manipulation");
  });

  it("treats superadmin as capture-capable", () => {
    mockUser.mockReturnValue({ id: "u3", role: "superadmin" });
    render(<AdminAIAssistant />);

    clickFab(2);
    runOutClickWindow();

    expect(screen.getByTestId("harvest-composer")).toBeDefined();
  });
});
