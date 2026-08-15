/**
 * The global capture sheet. It is what the radial menu's "Add note" item opens,
 * from any page. What matters: it opens on the window event for an admin, stays
 * shut (and renders nothing) for everyone else, and hosts the Phase 1 composer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { HarvestCaptureModal, HARVEST_CAPTURE_EVENT } from "./HarvestCaptureModal";

const mockUser = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), loading: false, isAuthenticated: true }),
}));

vi.mock("./HarvestNoteComposer", () => ({
  HarvestNoteComposer: ({ voiceEnabled }: { voiceEnabled: boolean }) => (
    <div data-testid="harvest-composer" data-voice={String(voiceEnabled)} />
  ),
}));

const statusData = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    quickNotes: {
      status: { useQuery: () => ({ data: statusData() }) },
    },
  },
}));

function fireCaptureEvent() {
  act(() => {
    window.dispatchEvent(new Event(HARVEST_CAPTURE_EVENT));
  });
}

describe("HarvestCaptureModal", () => {
  beforeEach(() => {
    mockUser.mockReturnValue({ id: "u1", role: "admin" });
    statusData.mockReturnValue({ ready: true, voice: true });
  });
  afterEach(() => vi.clearAllMocks());

  it("renders nothing for a non-admin, and ignores the open event", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    const { container } = render(<HarvestCaptureModal />);
    expect(container.firstChild).toBeNull();
    fireCaptureEvent();
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("stays closed until the event fires (admin)", () => {
    render(<HarvestCaptureModal />);
    expect(screen.queryByTestId("harvest-composer")).toBeNull();
  });

  it("opens the composer when the capture event fires (admin)", () => {
    render(<HarvestCaptureModal />);
    fireCaptureEvent();
    expect(screen.getByTestId("harvest-composer")).toBeDefined();
    expect(screen.getByText("Add note")).toBeDefined();
  });

  it("passes the voice flag from status into the composer", () => {
    statusData.mockReturnValue({ ready: true, voice: false });
    render(<HarvestCaptureModal />);
    fireCaptureEvent();
    expect(screen.getByTestId("harvest-composer").getAttribute("data-voice")).toBe("false");
  });

  it("treats superadmin as capture-capable", () => {
    mockUser.mockReturnValue({ id: "u3", role: "superadmin" });
    render(<HarvestCaptureModal />);
    fireCaptureEvent();
    expect(screen.getByTestId("harvest-composer")).toBeDefined();
  });
});
