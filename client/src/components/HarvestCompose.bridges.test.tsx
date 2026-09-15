import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicationReview } from "./HarvestCompose";
import { BROADCAST_FILL_STORAGE_KEY } from "@/lib/broadcastFill";

const noopMutation = {
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

let reviewData: {
  publication: { id: number; title: string; status: string };
  targets: Array<Record<string, unknown>>;
  items: Array<{ id: number; body: string | null; status: string }>;
  images: unknown[];
  article: unknown;
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      harvest: {
        publicationReview: { invalidate: vi.fn() },
        listFeed: { invalidate: vi.fn() },
      },
    }),
    harvest: {
      publicationReview: {
        useQuery: () => ({ data: reviewData, isLoading: false }),
      },
      generateImages: { useMutation: () => noopMutation },
      chooseImage: { useMutation: () => noopMutation },
      unpublishArticle: { useMutation: () => noopMutation },
      unapproveTarget: { useMutation: () => noopMutation },
      editItem: { useMutation: () => noopMutation },
      approveTarget: { useMutation: () => noopMutation },
      publishTarget: { useMutation: () => noopMutation },
      verifyTarget: { useMutation: () => noopMutation },
      updateTargetFields: { useMutation: () => noopMutation },
      sendPreview: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          isError: false,
          error: null,
        }),
      },
      confirmSend: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          isError: false,
          error: null,
        }),
      },
    },
  },
}));

function baseReview() {
  return {
    publication: { id: 1, title: "Why we chose a VC structure", status: "draft" },
    targets: [
      {
        id: 1, publicationId: 1, surface: "linkedin", itemId: 11, status: "draft",
        externalUrl: null, verificationStatus: "passed", verificationFlags: [],
        firstComment: null, weeklyNote: null,
      },
      {
        id: 2, publicationId: 1, surface: "email", itemId: 15, status: "draft",
        externalUrl: null, verificationStatus: "unverified", verificationFlags: null,
        firstComment: null, weeklyNote: null,
      },
      {
        id: 3, publicationId: 1, surface: "site", itemId: 14, status: "approved",
        externalUrl: null, verificationStatus: "passed", verificationFlags: [],
        firstComment: null, weeklyNote: null,
      },
    ],
    items: [
      { id: 11, status: "ready", body: "Soil first. Governance second." },
      { id: 15, status: "ready", body: "Subject line\n\nThe letter body." },
      { id: 14, status: "ready", body: "# Why we chose a VC structure\n\nThe short answer is legibility." },
    ],
    images: [],
    article: null,
  };
}

describe("PublicationReview Harvest → Outbound bridges", () => {
  beforeEach(() => {
    reviewData = baseReview();
  });

  it("does not mount email send until the newsletter item is edited", () => {
    render(<PublicationReview publicationId={1} />);
    expect(screen.queryByRole("button", { name: /Preview email send/ })).toBeNull();
    expect(screen.getByText(/Save an edit first/)).toBeDefined();
  });

  it("mounts the existing email send panel on an edited newsletter target", () => {
    reviewData.items[1] = { id: 15, status: "edited", body: "Subject line\n\nThe letter body." };
    render(<PublicationReview publicationId={1} />);
    expect(screen.getByRole("button", { name: /Preview email send/ })).toBeDefined();
    expect(screen.queryByText(/Save an edit first/)).toBeNull();
  });

  it("hands a social draft to Outbound Social via sessionStorage, without posting", async () => {
    const user = userEvent.setup();
    render(<PublicationReview publicationId={1} />);
    const link = screen.getByRole("link", { name: /Open in Outbound Social/ });
    expect(link.getAttribute("href")).toBe("/admin?tab=outbound&surface=social");
    link.addEventListener("click", (e) => e.preventDefault());
    await user.click(link);
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBe("Soil first. Governance second.");
    expect(screen.queryByPlaceholderText("Buffer profile id for this channel")).toBeNull();
  });

  it("does not offer the social handoff on site or email targets", () => {
    reviewData.targets = reviewData.targets.filter((t) => t.surface !== "linkedin");
    reviewData.items[1] = { id: 15, status: "edited", body: "Subject line\n\nThe letter body." };
    render(<PublicationReview publicationId={1} />);
    expect(screen.queryByRole("link", { name: /Open in Outbound Social/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Publish/ })).toBeDefined();
  });
});
