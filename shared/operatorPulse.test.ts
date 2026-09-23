import { describe, expect, it } from "vitest";
import {
  buildOperatorPulseItems,
  eventHasWatchPath,
  formatOperatorPulsePingMessage,
  isApplicationWaitingReview,
  isInvestorNeedsActionStatus,
  isOpenOrOverdueCallTask,
  isOutboundFailedOrStuck,
  operatorPulseMorningDue,
  recordingNeedsCut,
  OUTBOUND_STUCK_SENDING_MS,
} from "./operatorPulse";

describe("eventHasWatchPath", () => {
  it("accepts any of the watch sources", () => {
    expect(eventHasWatchPath({ eventYoutubeUrl: "https://youtu.be/x" })).toBe(true);
    expect(eventHasWatchPath({ youtubeUrl: "https://youtu.be/x" })).toBe(true);
    expect(eventHasWatchPath({ editedYoutubeUrl: "https://youtu.be/x" })).toBe(true);
    expect(eventHasWatchPath({ riversideUrl: "https://riverside.fm/x" })).toBe(true);
  });

  it("rejects empty / whitespace / missing", () => {
    expect(eventHasWatchPath({})).toBe(false);
    expect(eventHasWatchPath({ eventYoutubeUrl: "  ", recordingId: 9 })).toBe(false);
  });
});

describe("recordingNeedsCut", () => {
  it("needs cut when edited URL empty", () => {
    expect(recordingNeedsCut({ editedYoutubeUrl: null })).toBe(true);
    expect(recordingNeedsCut({ editedYoutubeUrl: "" })).toBe(true);
    expect(recordingNeedsCut({ editedYoutubeUrl: "https://youtu.be/cut" })).toBe(false);
  });
});

describe("status helpers", () => {
  it("applications waiting review", () => {
    expect(isApplicationWaitingReview("submitted")).toBe(true);
    expect(isApplicationWaitingReview("pending")).toBe(true);
    expect(isApplicationWaitingReview("under_review")).toBe(true);
    expect(isApplicationWaitingReview("approved")).toBe(false);
  });

  it("investors needs action mirrors triage", () => {
    expect(isInvestorNeedsActionStatus("new")).toBe(true);
    expect(isInvestorNeedsActionStatus(null)).toBe(true);
    expect(isInvestorNeedsActionStatus("pending")).toBe(true);
    expect(isInvestorNeedsActionStatus("archived")).toBe(false);
    expect(isInvestorNeedsActionStatus("contacted")).toBe(false);
  });
});

describe("isOutboundFailedOrStuck", () => {
  const now = Date.parse("2026-09-16T20:00:00.000Z");

  it("flags failed and partial sent", () => {
    expect(isOutboundFailedOrStuck({ status: "failed" }, now)).toBe(true);
    expect(isOutboundFailedOrStuck({ status: "sent", failedCount: 2 }, now)).toBe(true);
    expect(isOutboundFailedOrStuck({ status: "sent", failedCount: 0 }, now)).toBe(false);
  });

  it("flags sending older than stuck threshold", () => {
    const fresh = new Date(now - OUTBOUND_STUCK_SENDING_MS / 2).toISOString();
    const stale = new Date(now - OUTBOUND_STUCK_SENDING_MS - 1000).toISOString();
    expect(isOutboundFailedOrStuck({ status: "sending", updatedAt: fresh }, now)).toBe(false);
    expect(isOutboundFailedOrStuck({ status: "sending", updatedAt: stale }, now)).toBe(true);
  });
});

describe("isOpenOrOverdueCallTask", () => {
  const now = Date.parse("2026-09-16T20:00:00.000Z");

  it("counts open call_task statuses", () => {
    expect(isOpenOrOverdueCallTask({ sourceType: "call_task", workStatus: "proposed" }, now)).toBe(true);
    expect(isOpenOrOverdueCallTask({ sourceType: "call_task", workStatus: "in_review" }, now)).toBe(true);
    expect(isOpenOrOverdueCallTask({ sourceType: "contribution", workStatus: "open" }, now)).toBe(false);
    expect(isOpenOrOverdueCallTask({ sourceType: "call_task", workStatus: "completed" }, now)).toBe(false);
  });

  it("counts expired non-terminal", () => {
    expect(
      isOpenOrOverdueCallTask(
        {
          sourceType: "call_task",
          workStatus: "claimed",
          expiresAt: new Date(now - 1000).toISOString(),
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("buildOperatorPulseItems", () => {
  it("omits zero counts and sorts high severity first", () => {
    const items = buildOperatorPulseItems({
      pastEventsNoWatch: 3,
      recordingsNeedCut: 0,
      investorsNeedsAction: 2,
      applicationsWaitingReview: 1,
      outboundFailedOrStuck: 4,
      callTasksOpenOrOverdue: 0,
    });
    expect(items.map((i) => i.id)).toEqual([
      "outbound-failed",
      "applications",
      "investors",
      "past-events-no-watch",
    ]);
    expect(items[0].href).toContain("surface=history");
    expect(items.find((i) => i.id === "investors")?.href).toContain("filter=needs_action");
  });

  it("returns empty when clear", () => {
    expect(
      buildOperatorPulseItems({
        pastEventsNoWatch: 0,
        recordingsNeedCut: 0,
        investorsNeedsAction: 0,
        applicationsWaitingReview: 0,
        outboundFailedOrStuck: 0,
        callTasksOpenOrOverdue: 0,
      }),
    ).toEqual([]);
  });

  it("deep-links call tasks to Stuck + Unassigned morning filter", () => {
    const items = buildOperatorPulseItems({
      pastEventsNoWatch: 0,
      recordingsNeedCut: 0,
      investorsNeedsAction: 0,
      applicationsWaitingReview: 0,
      outboundFailedOrStuck: 0,
      callTasksOpenOrOverdue: 5,
    });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("call-tasks");
    expect(items[0].href).toBe("/admin?tab=call-tasks&filter=needs_people");
  });
});

describe("operatorPulseMorningDue", () => {
  const utc = (iso: string) => new Date(iso);

  it("does not fire before 08:00 Pacific", () => {
    expect(operatorPulseMorningDue(utc("2026-08-31T14:00:00Z"), null)).toBe(false);
  });

  it("fires on the first tick at or after 08:00 Pacific", () => {
    expect(operatorPulseMorningDue(utc("2026-08-31T15:00:00Z"), null)).toBe(true);
  });

  it("fires only once on the same Pacific day", () => {
    expect(operatorPulseMorningDue(utc("2026-08-31T16:00:00Z"), "2026-08-31")).toBe(false);
    expect(operatorPulseMorningDue(utc("2026-09-01T02:00:00Z"), "2026-08-31")).toBe(false);
  });

  it("fires again the next Pacific morning", () => {
    expect(operatorPulseMorningDue(utc("2026-09-01T15:00:00Z"), "2026-08-31")).toBe(true);
  });
});

describe("formatOperatorPulsePingMessage", () => {
  it("includes counts and deep links", () => {
    const { title, body } = formatOperatorPulsePingMessage(
      [
        {
          id: "outbound-failed",
          label: "Failed or stuck Outbound sends",
          count: 2,
          href: "/admin?tab=outbound&surface=history",
          severity: "high",
        },
        {
          id: "investors",
          label: "Investors need action",
          count: 1,
          href: "/admin?tab=investors&filter=needs_action",
          severity: "medium",
        },
      ],
      "https://regencivics.earth/",
    );
    expect(title).toContain("2 items");
    expect(title).toContain("(3)");
    expect(body).toContain("2 Failed or stuck Outbound sends");
    expect(body).toContain("https://regencivics.earth/admin?tab=outbound&surface=history");
    expect(body).toContain("https://regencivics.earth/admin?tab=investors&filter=needs_action");
    expect(body).toContain("Overview: https://regencivics.earth/admin");
  });
});
