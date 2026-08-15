/**
 * The admin FAB, after every capture gesture was abandoned (double-tap zoomed on
 * iOS, long-press selected text). The FAB is now a plain single-tap that opens
 * the assistant — no gesture, no hint. Capture moved to the mobile radial menu's
 * "Add note" item (see WizardRadialMenu + HarvestCaptureModal). What remains to
 * verify here: the tap opens the assistant for everyone, and admins still get the
 * in-panel note toggle once the panel is open.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const fab = () => screen.getByTestId("admin-fab");

describe("AdminAIAssistant FAB", () => {
  beforeEach(() => mockUser.mockReturnValue({ id: "u1", role: "admin" }));
  afterEach(() => vi.clearAllMocks());

  it("has no capture gesture affordance or hint", () => {
    render(<AdminAIAssistant />);
    expect(screen.queryByTestId("admin-fab-hint")).toBeNull();
    expect(screen.queryByTestId("admin-fab-press")).toBeNull();
    expect(fab().getAttribute("title")).toBe("Open AI Assistant");
  });

  it("opens the assistant on a single tap (admin)", () => {
    render(<AdminAIAssistant />);
    fireEvent.click(fab());
    expect(screen.getByText("ReGen AI Assistant")).toBeDefined();
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("opens the assistant on a single tap (non-admin), exactly as before", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    render(<AdminAIAssistant />);
    fireEvent.click(fab());
    expect(screen.getByText("ReGen AI Assistant")).toBeDefined();
  });

  it("still offers admins the in-panel note toggle once open", () => {
    render(<AdminAIAssistant />);
    fireEvent.click(fab());
    const toggle = screen.getByLabelText("Add a note");
    fireEvent.click(toggle);
    expect(screen.getByTestId("harvest-composer")).toBeDefined();
    expect(screen.getByText("Add note")).toBeDefined();
  });

  it("hides the in-panel note toggle from non-admins", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    render(<AdminAIAssistant />);
    fireEvent.click(fab());
    expect(screen.queryByLabelText("Add a note")).toBeNull();
  });
});
