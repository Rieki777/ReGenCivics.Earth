import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOutboundHistory } from "./AdminOutboundHistory";

const historyRow = {
  id: 7,
  subject: "**Subject:** Spring letter",
  subjectDisplay: "Spring letter",
  status: "sent",
  statusLabel: "Sent",
  audienceSummary: "All active subscribers",
  layout: "announcement",
  audience: { sources: [], activeOnly: true },
  recipientCount: 2,
  sentCount: 2,
  failedCount: 0,
  sentAt: "2026-09-08T20:00:00.000Z",
  scheduledFor: null,
  createdAt: "2026-09-08T19:00:00.000Z",
  when: "2026-09-08T20:00:00.000Z",
  stats: {
    delivered: 2,
    opened: 1,
    clicked: 0,
    bounced: 0,
    complained: 0,
    failed: 0,
    total: 2,
    openPercent: 50,
    clickPercent: 0,
    bounceFailCount: 0,
  },
};

const detail = {
  ...historyRow,
  body: "Hello from the field.",
  html: "<p>Hello from the field.</p>",
  timeline: [
    { at: "2026-09-08T19:00:00.000Z", label: "Created" },
    { at: "2026-09-08T20:00:00.000Z", label: "Sent" },
  ],
  recipients: [
    { email: "ada@example.org", name: "Ada", status: "sent", statusLabel: "Delivered", opened: true, clicked: false, error: null },
    { email: "bea@example.org", name: "", status: "sent", statusLabel: "Delivered", opened: false, clicked: false, error: null },
  ],
};

const fetchDetail = vi.fn().mockResolvedValue(detail);

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      outbound: { getHistoryDetail: { fetch: fetchDetail } },
    }),
    outbound: {
      listHistory: { useQuery: () => ({ data: [historyRow], isLoading: false }) },
      getHistoryDetail: {
        useQuery: (_input: { issueId: number }, opts?: { enabled?: boolean }) => ({
          data: opts?.enabled === false ? undefined : detail,
          isLoading: false,
        }),
      },
    },
  },
}));

describe("AdminOutboundHistory", () => {
  beforeEach(() => {
    fetchDetail.mockClear();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
  });
  it("shows a cleaned subject, audience, rates, and no issues label", () => {
    render(<AdminOutboundHistory onDuplicate={vi.fn()} onWrite={vi.fn()} />);
    expect(screen.getByText("Spring letter")).toBeDefined();
    expect(screen.queryByText("**Subject:** Spring letter")).toBeNull();
    expect(screen.getByText(/All active subscribers/)).toBeDefined();
    expect(screen.getByText(/50% open/)).toBeDefined();
    expect(screen.getByText(/n\/a click|0% click/)).toBeDefined();
    expect(screen.queryByText(/Sent issues/i)).toBeNull();
    expect(screen.getByText("History")).toBeDefined();
  });

  it("opens a detail drawer on row click and duplicates into Write", async () => {
    const onDuplicate = vi.fn();
    render(<AdminOutboundHistory onDuplicate={onDuplicate} onWrite={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Spring letter/ }));
    expect(screen.getByTitle("Letter preview")).toBeDefined();
    expect(screen.getByText("ada@example.org")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opened" })).toBeDefined();
    expect(screen.getByText("Timeline")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Duplicate into Write" }));
    expect(onDuplicate).toHaveBeenCalledWith({
      subject: "Spring letter",
      body: "Hello from the field.",
      layout: "announcement",
      source: "all",
    });
  });

  it("exports a recipient CSV from the list row", async () => {
    render(<AdminOutboundHistory onDuplicate={vi.fn()} onWrite={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(fetchDetail).toHaveBeenCalledWith({ issueId: 7 });
  });
});
