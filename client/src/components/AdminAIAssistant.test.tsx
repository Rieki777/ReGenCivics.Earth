/**
 * The admin FAB, after every capture gesture was abandoned (double-tap zoomed on
 * iOS, long-press selected text). The FAB is now a plain single-tap that opens
 * the assistant — no gesture, no hint. Capture moved to the mobile radial menu's
 * "Add note" item (see WizardRadialMenu + HarvestCaptureModal). What remains to
 * verify here: the tap opens the assistant for everyone, and admins still get the
 * in-panel note toggle once the panel is open.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminAIAssistant } from "./AdminAIAssistant";

const mockUser = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), loading: false, isAuthenticated: true }),
}));

vi.mock("./HarvestNoteComposer", () => ({
  HarvestNoteComposer: () => <div data-testid="harvest-composer" />,
}));

const chatMutateAsync = vi.fn();
const noopMutation = () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    adminAI: { chat: { useMutation: () => ({ mutateAsync: chatMutateAsync, isPending: false }) } },
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
  beforeEach(() => {
    mockUser.mockReturnValue({ id: "u1", role: "admin" });
    chatMutateAsync.mockReset();
  });
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

  it("offers the shared dictation mic on the chat input", () => {
    render(<AdminAIAssistant />);
    fireEvent.click(fab());
    expect(screen.getByTestId("dictation-button")).toBeTruthy();
    expect(screen.getByLabelText("Dictate message")).toBeTruthy();
  });

  it("offers Harvest draft starters when viewing Broadcast", () => {
    render(<AdminAIAssistant context={{ activeTab: "broadcast" }} />);
    fireEvent.click(fab());
    expect(screen.getByText(/You're on Social/)).toBeDefined();
    expect(screen.getByText("Draft a post from the ripest Harvest idea")).toBeDefined();
    expect(screen.queryByText("Who needs follow-up today?")).toBeNull();
  });

  it("offers Harvest draft starters on Outbound Social", () => {
    render(<AdminAIAssistant context={{ activeTab: "outbound", outboundSurface: "social" }} />);
    fireEvent.click(fab());
    expect(screen.getByText(/You're on Social/)).toBeDefined();
    expect(screen.getByText("Draft a post from the ripest Harvest idea")).toBeDefined();
    expect(screen.queryByText("Who needs follow-up today?")).toBeNull();
  });

  it("keeps pipeline starters on Outbound People", () => {
    render(<AdminAIAssistant context={{ activeTab: "outbound", outboundSurface: "people" }} />);
    fireEvent.click(fab());
    expect(screen.getByText("Who needs follow-up today?")).toBeDefined();
    expect(screen.queryByText("Draft a post from the ripest Harvest idea")).toBeNull();
    expect(screen.queryByText("Draft a letter into Write about this week's Harvest.")).toBeNull();
  });

  it("offers Write compose starters on Outbound Write", () => {
    render(<AdminAIAssistant context={{ activeTab: "outbound", outboundSurface: "write" }} />);
    fireEvent.click(fab());
    expect(screen.getByText(/You're on Write/)).toBeDefined();
    expect(screen.getByText("Draft a letter into Write about this week's Harvest.")).toBeDefined();
    expect(screen.getByText("Fill the Write composer with a short announcement.")).toBeDefined();
    expect(screen.queryByText("Who needs follow-up today?")).toBeNull();
    expect(screen.queryByText("Draft a post from the ripest Harvest idea")).toBeNull();
  });

  it("auto-applies a Write compose action into the parent fill handler", async () => {
    const onAction = vi.fn();
    chatMutateAsync.mockResolvedValue({
      content: `Here is a letter.\n<action>{"type":"compose","tab":"outbound","surface":"write","subject":"Season update","body":"Friends, hello.","layout":"announcement","label":"Use this in Write"}</action>`,
    });
    render(
      <AdminAIAssistant
        context={{ activeTab: "outbound", outboundSurface: "write" }}
        onAction={onAction}
      />,
    );
    fireEvent.click(fab());
    fireEvent.click(screen.getByText("Draft a letter into Write about this week's Harvest."));
    await waitFor(() => expect(chatMutateAsync).toHaveBeenCalled());
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "compose",
        tab: "outbound",
        surface: "write",
        subject: "Season update",
        body: "Friends, hello.",
        layout: "announcement",
      }),
    );
  });
});
