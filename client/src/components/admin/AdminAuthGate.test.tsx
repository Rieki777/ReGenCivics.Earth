import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminAuthGate } from "./AdminAuthGate";

const mockAuth = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockAuth(),
}));

vi.mock("@/components/TaoSpinner", () => ({
  TaoSpinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/const", () => ({
  getLoginUrl: (returnTo?: string) => `/api/oauth/google?returnTo=${encodeURIComponent(returnTo || "")}`,
}));

describe("AdminAuthGate", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("shows a spinner while auth is loading", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(
      <AdminAuthGate>
        <div>secret</div>
      </AdminAuthGate>,
    );
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("asks an unsigned visitor to continue with OAuth, not a password", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(
      <AdminAuthGate>
        <div>secret</div>
      </AdminAuthGate>,
    );
    expect(screen.getByRole("heading", { name: "Admin sign in" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue with OAuth" })).toBeDefined();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("denies a signed-in player", () => {
    mockAuth.mockReturnValue({ user: { id: 9, role: "user" }, loading: false });
    render(
      <AdminAuthGate>
        <div>secret</div>
      </AdminAuthGate>,
    );
    expect(screen.getByRole("heading", { name: "Admin access required" })).toBeDefined();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("denies lookalike privileged roles", () => {
    mockAuth.mockReturnValue({ user: { id: 9, role: "Admin" }, loading: false });
    render(
      <AdminAuthGate>
        <div>secret</div>
      </AdminAuthGate>,
    );
    expect(screen.getByRole("heading", { name: "Admin access required" })).toBeDefined();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children for admin and superadmin", () => {
    mockAuth.mockReturnValue({ user: { id: 1, role: "admin" }, loading: false });
    const { rerender } = render(
      <AdminAuthGate>
        <div>secret</div>
      </AdminAuthGate>,
    );
    expect(screen.getByText("secret")).toBeDefined();

    mockAuth.mockReturnValue({ user: { id: 2, role: "superadmin" }, loading: false });
    rerender(
      <AdminAuthGate>
        <div>secret</div>
      </AdminAuthGate>,
    );
    expect(screen.getByText("secret")).toBeDefined();
  });
});
