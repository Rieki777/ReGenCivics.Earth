/**
 * The radial menu's admin-only "Add note" item — the surviving capture path
 * after every FAB gesture failed on iOS. Verifies it renders only for admins,
 * sits closest to the trigger (first under the thumb), and dispatches the event
 * the global HarvestCaptureModal listens for.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WizardRadialMenu } from "./WizardRadialMenu";

const mockUser = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/community", vi.fn()],
  Link: ({ href, children, ...p }: { href?: string; children: React.ReactNode }) => (
    <a href={href} {...p}>{children}</a>
  ),
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, user: mockUser() }),
}));
vi.mock("@/hooks/useSeasonTint", () => ({ useSeasonTint: () => ({ primary: "#7dd87d" }) }));
vi.mock("@/contexts/AudioContext", () => ({ useAudio: () => ({ isPlaying: false, togglePlay: vi.fn() }) }));
vi.mock("@/hooks/usePageTools", () => ({ usePageTools: () => [] }));
vi.mock("@/components/SeedOfLifeIcon", () => ({ SeedOfLifeIcon: () => <svg data-testid="seed" /> }));
vi.mock("@/components/SmartBottomNav", () => ({ NavIcon: () => <svg /> }));

describe("WizardRadialMenu — Add note item", () => {
  beforeEach(() => mockUser.mockReturnValue({ id: "u1", role: "admin" }));
  afterEach(() => vi.clearAllMocks());

  it("shows Add note to an admin", () => {
    render(<WizardRadialMenu />);
    expect(screen.getByText("Add note")).toBeDefined();
  });

  it("hides Add note from a non-admin", () => {
    mockUser.mockReturnValue({ id: "u2", role: "member" });
    render(<WizardRadialMenu />);
    expect(screen.queryByText("Add note")).toBeNull();
  });

  it("hides Add note from a signed-out user", () => {
    mockUser.mockReturnValue(null);
    render(<WizardRadialMenu />);
    expect(screen.queryByText("Add note")).toBeNull();
  });

  it("sits closest to the trigger — last in the menu, nearest the thumb", () => {
    // The column grows upward from the trigger, so the LAST menuitem in DOM
    // order is the one visually nearest the thumb. (Query the DOM directly: the
    // menu is aria-hidden while closed, so role-based queries would skip it.)
    const { container } = render(<WizardRadialMenu />);
    const items = Array.from(container.querySelectorAll("[role=menuitem]"));
    expect(items.length).toBeGreaterThan(1);
    expect(items[items.length - 1].textContent).toContain("Add note");
  });

  it("dispatches open-harvest-capture when tapped", () => {
    const spy = vi.fn();
    window.addEventListener("open-harvest-capture", spy);
    render(<WizardRadialMenu />);
    fireEvent.click(screen.getByText("Add note"));
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("open-harvest-capture", spy);
  });

  it("treats superadmin as capture-capable", () => {
    mockUser.mockReturnValue({ id: "u3", role: "superadmin" });
    render(<WizardRadialMenu />);
    expect(screen.getByText("Add note")).toBeDefined();
  });
});

describe("WizardRadialMenu while a dialog is open", () => {
  beforeEach(() => mockUser.mockReturnValue({ id: "u2", role: "member" }));
  afterEach(() => {
    document.body.removeAttribute("data-scroll-locked");
    vi.clearAllMocks();
  });

  it("hides the shortcuts dock, so it never covers the sheet's send button", async () => {
    const { getByTestId } = render(<WizardRadialMenu />);
    const dock = getByTestId("shortcuts-dock");
    expect(dock.classList.contains("hidden")).toBe(false);
    // What Radix does to <body> while a modal dialog is open.
    await act(async () => { document.body.setAttribute("data-scroll-locked", "1"); });
    await waitFor(() => expect(dock.classList.contains("hidden")).toBe(true));
    await act(async () => { document.body.removeAttribute("data-scroll-locked"); });
    await waitFor(() => expect(dock.classList.contains("hidden")).toBe(false));
  });

  it("hides it for a real open dialog too", async () => {
    const { Dialog, DialogContent, DialogTitle, DialogDescription } = await import("@/components/ui/dialog");
    const { getByTestId } = render(
      <>
        <WizardRadialMenu />
        <Dialog open>
          <DialogContent>
            <DialogTitle>Offer Wood chipper</DialogTitle>
            <DialogDescription>Your offer goes to the stewards.</DialogDescription>
          </DialogContent>
        </Dialog>
      </>,
    );
    await waitFor(() => expect(getByTestId("shortcuts-dock").classList.contains("hidden")).toBe(true));
  });
});
