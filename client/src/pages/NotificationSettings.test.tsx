/**
 * The campaign email setting names follows (review 2026-09-28).
 *
 * campaign_opened ("Crowdpooling is open at X") and campaign_final_stretch
 * reach people who only follow a project. Both are campaign notification
 * types, so the campaignsEmail setting carries them into the daily summary.
 * Labelled "Campaigns you're part of", a follower looking for the switch
 * behind those emails wouldn't recognise it.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { PREFS } = vi.hoisted(() => ({
  PREFS: {
    mentionsEmail: "immediate",
    repliesEmail: "immediate",
    gratitudeEmail: "daily",
    campaignsEmail: "immediate",
    emailDigestFrequency: "weekly",
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, email: "ada@example.org" }, loading: false }),
}));
vi.mock("@/components/BackButton", () => ({ BackButton: () => null }));
vi.mock("@/components/PageTransition", () => ({ PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/pushManager", () => ({
  isPushSupported: () => false,
  isIosBrowserContext: () => false,
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  hasLocalSubscription: () => Promise.resolve(false),
}));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    trpc: {
      useUtils: () => ({}),
      notifications: {
        prefs: { get: { useQuery: () => ({ data: PREFS }) }, set: { useMutation: mutation } },
        mutes: { listMine: { useQuery: () => ({ data: [] }) }, remove: { useMutation: mutation } },
        subscriptions: { listMine: { useQuery: () => ({ data: [] }) }, set: { useMutation: mutation } },
        push: {
          publicKey: { useQuery: () => ({ data: { enabled: false } }) },
          subscribe: { useMutation: mutation },
          unsubscribe: { useMutation: mutation },
        },
      },
    },
  };
});

import NotificationSettings from "./NotificationSettings";

describe("the campaign email setting", () => {
  it("is labelled for campaigns you're part of or follow, and its radio group carries that name", () => {
    render(<NotificationSettings />);
    expect(screen.getByText("Campaigns you're part of or follow")).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "Campaigns you're part of or follow" })).toBeDefined();
  });

  it("says openings and closing-soon notices for followed projects come in the daily summary", () => {
    render(<NotificationSettings />);
    expect(
      screen.getByText(
        "Offers, answers, deliveries and thank-yous can come right away. Campaign updates, roles filling or opening up, campaigns ending, and projects you follow opening or closing soon come in the daily summary.",
      ),
    ).toBeDefined();
  });
});
