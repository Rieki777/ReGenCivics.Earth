import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mutateAsync = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaigns: {
      unsubscribeEmailFollow: { useMutation: () => ({ mutateAsync, isPending: false, variables: undefined }) },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));

import CampaignUpdatesUnsubscribe, { readUnsubscribeList, readUnsubscribeToken } from "./CampaignUpdatesUnsubscribe";

const TOKEN = "a".repeat(32);

describe("CampaignUpdatesUnsubscribe", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    window.history.replaceState({}, "", `/campaign-updates/unsubscribe?token=${TOKEN}`);
  });

  it("reads only a 32-character token", () => {
    expect(readUnsubscribeToken(`?token=${TOKEN}`)).toBe(TOKEN);
    expect(readUnsubscribeToken("?token=short")).toBeNull();
    expect(readUnsubscribeToken("")).toBeNull();
  });

  it("does nothing until the person picks a button", () => {
    render(<CampaignUpdatesUnsubscribe />);
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Stop emails about this campaign" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop all campaign emails" })).toBeInTheDocument();
  });

  it("stops this campaign's emails", async () => {
    render(<CampaignUpdatesUnsubscribe />);
    fireEvent.click(screen.getByRole("button", { name: "Stop emails about this campaign" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ token: TOKEN, scope: "this" }));
    expect(await screen.findByText("Done. You won't get these emails anymore.")).toBeInTheDocument();
    expect(screen.getByText(/Make a free account and follow projects from your notifications/)).toBeInTheDocument();
  });

  it("stops all campaign emails", async () => {
    render(<CampaignUpdatesUnsubscribe />);
    fireEvent.click(screen.getByRole("button", { name: "Stop all campaign emails" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ token: TOKEN, scope: "all" }));
  });

  it("offers only 'stop all' on a letter to everyone following a campaign", async () => {
    expect(readUnsubscribeList("?token=x&list=all")).toBe("all");
    expect(readUnsubscribeList("?token=x")).toBe("campaign");
    window.history.replaceState({}, "", `/campaign-updates/unsubscribe?token=${TOKEN}&list=all`);
    render(<CampaignUpdatesUnsubscribe />);
    expect(screen.queryByRole("button", { name: "Stop emails about this campaign" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Stop all campaign emails" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ token: TOKEN, scope: "all" }));
  });

  it("reads a waitlist link as the waitlist", () => {
    window.history.replaceState({}, "", `/campaign-updates/unsubscribe?token=${TOKEN}&list=waitlist`);
    render(<CampaignUpdatesUnsubscribe />);
    expect(screen.getByRole("button", { name: "Take me off the waitlist" })).toBeInTheDocument();
  });

  it("explains a link with no token and sends nothing", () => {
    window.history.replaceState({}, "", "/campaign-updates/unsubscribe");
    render(<CampaignUpdatesUnsubscribe />);
    expect(screen.getByText("That link didn't work.")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
