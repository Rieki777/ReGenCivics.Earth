import { describe, expect, it } from "vitest";
import {
  attachHistoryStats,
  audienceToWriteSource,
  buildHistoryTimeline,
  buildRecipientRows,
  cleanLetterSubject,
  formatPacificDateTime,
  formatPercent,
  historyCsvFilename,
  historyRecipientsCsv,
  historyStatusLabel,
  pickHistoryBanner,
  ratePercent,
  rollupDeliveryStats,
  summarizeAudience,
  type HistoryListItem,
} from "./outboundHistory";

describe("cleanLetterSubject", () => {
  it("strips a markdown Subject prefix", () => {
    expect(cleanLetterSubject("**Subject:** Spring letter")).toBe("Spring letter");
  });

  it("strips a plain Subject: prefix and wrapping bold", () => {
    expect(cleanLetterSubject("Subject: **Season two**")).toBe("Season two");
  });

  it("leaves a clean subject alone", () => {
    expect(cleanLetterSubject("Harvest update")).toBe("Harvest update");
  });

  it("trims leftover quotes and empty input", () => {
    expect(cleanLetterSubject('  "**Subject:**  Hello"  ')).toBe("Hello");
    expect(cleanLetterSubject("")).toBe("");
    expect(cleanLetterSubject(null)).toBe("");
  });
});

describe("summarizeAudience", () => {
  it("names all active subscribers when sources are empty", () => {
    expect(summarizeAudience({ sources: [], activeOnly: true })).toBe("All active subscribers");
    expect(summarizeAudience(null)).toBe("All active subscribers");
  });

  it("names a single source without calling it an issue", () => {
    expect(summarizeAudience({ sources: ["exit_intent"], activeOnly: true })).toBe(
      "Active exit intent subscribers",
    );
  });

  it("maps a single source into Write, and many sources to all", () => {
    expect(audienceToWriteSource({ sources: ["footer"] })).toBe("footer");
    expect(audienceToWriteSource({ sources: ["footer", "homepage"] })).toBe("all");
  });
});

describe("rollupDeliveryStats", () => {
  it("rolls open and click rates from delivered, and bounce/fail from logs plus send failures", () => {
    const stats = rollupDeliveryStats(
      [
        { id: 1, status: "delivered", openedAt: "2026-09-01T00:00:00.000Z", clickedAt: "2026-09-01T01:00:00.000Z" },
        { id: 2, status: "delivered", openedAt: "2026-09-01T00:00:00.000Z", clickedAt: null },
        { id: 3, status: "delivered", openedAt: null, clickedAt: null },
        { id: 4, status: "bounced", openedAt: null, clickedAt: null, bounceReason: "mailbox missing" },
        { id: 5, status: "failed", openedAt: null, clickedAt: null, bounceReason: "Complaint: spam" },
      ],
      { recipientTotal: 6, sendFailedCount: 1 },
    );
    expect(stats).toMatchObject({
      delivered: 3,
      opened: 2,
      clicked: 1,
      bounced: 1,
      complained: 1,
      failed: 0,
      total: 6,
      bounceFailCount: 3,
    });
    expect(stats.openPercent).toBe(66.7);
    expect(stats.clickPercent).toBe(33.3);
  });

  it("returns n/a rates when nothing has been delivered yet", () => {
    const stats = rollupDeliveryStats([
      { id: 1, status: "sent", openedAt: null, clickedAt: null },
    ]);
    expect(stats.openPercent).toBeNull();
    expect(formatPercent(stats.openPercent)).toBe("n/a");
    expect(ratePercent(0, 0)).toBeNull();
  });
});

describe("attachHistoryStats", () => {
  it("cleans subjects, skips drafts, and attaches per-letter stats", () => {
    const rows = attachHistoryStats(
      [
        {
          id: 1,
          subject: "**Subject:** Spring letter",
          status: "sent",
          audience: { sources: ["footer"], activeOnly: true },
          recipientCount: 2,
          sentCount: 2,
          failedCount: 0,
          sentAt: "2026-09-08T20:00:00.000Z",
          scheduledFor: null,
          createdAt: "2026-09-08T19:00:00.000Z",
        },
        {
          id: 2,
          subject: "Draft only",
          status: "draft",
          audience: { sources: [], activeOnly: true },
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
          sentAt: null,
          scheduledFor: null,
          createdAt: "2026-09-09T00:00:00.000Z",
        },
      ],
      [
        { issueId: 1, emailLogId: 11, status: "sent" },
        { issueId: 1, emailLogId: 12, status: "sent" },
      ],
      [
        { id: 11, status: "delivered", openedAt: "2026-09-08T21:00:00.000Z", clickedAt: null },
        { id: 12, status: "delivered", openedAt: null, clickedAt: null },
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].subjectDisplay).toBe("Spring letter");
    expect(rows[0].audienceSummary).toBe("Active footer subscribers");
    expect(rows[0].statusLabel).toBe("Sent");
    expect(rows[0].stats).toMatchObject({ delivered: 2, opened: 1, openPercent: 50 });
  });

  it("labels a sent letter with failures as Partial", () => {
    expect(historyStatusLabel("sent", 2)).toBe("Partial");
    expect(historyStatusLabel("failed", 2)).toBe("Failed");
  });
});

describe("buildRecipientRows and timeline", () => {
  it("maps delivery, opens, clicks, and bounce errors", () => {
    const rows = buildRecipientRows(
      [
        { email: "ada@example.org", name: "Ada", status: "sent", emailLogId: 1 },
        { email: "bea@example.org", name: null, status: "sent", emailLogId: 2 },
        { email: "cam@example.org", status: "failed", emailLogId: null },
      ],
      [
        { id: 1, status: "delivered", openedAt: "2026-09-01T00:00:00.000Z", clickedAt: "2026-09-01T01:00:00.000Z" },
        { id: 2, status: "bounced", openedAt: null, clickedAt: null, bounceReason: "user unknown" },
      ],
    );
    expect(rows[0]).toMatchObject({ name: "Ada", statusLabel: "Delivered", opened: true, clicked: true, error: null });
    expect(rows[1]).toMatchObject({ name: "", statusLabel: "Bounced", opened: false, error: "user unknown" });
    expect(rows[2]).toMatchObject({ statusLabel: "Failed", error: "Send failed" });
  });

  it("orders created, scheduled, sent, then first engagement", () => {
    const events = buildHistoryTimeline(
      {
        createdAt: "2026-09-01T00:00:00.000Z",
        scheduledFor: "2026-09-02T17:00:00.000Z",
        sentAt: "2026-09-02T17:05:00.000Z",
      },
      [
        { id: 1, status: "delivered", openedAt: "2026-09-02T18:00:00.000Z", clickedAt: "2026-09-02T18:30:00.000Z", deliveredAt: "2026-09-02T17:10:00.000Z" },
      ],
    );
    expect(events.map((e) => e.label)).toEqual([
      "Created",
      "Scheduled",
      "Sent",
      "First delivery",
      "First open",
      "First click",
    ]);
  });
});

describe("Pacific time", () => {
  it("formats sent time in America/Los_Angeles", () => {
    const formatted = formatPacificDateTime("2026-09-10T20:00:00.000Z");
    expect(formatted).toMatch(/Sep 10, 2026/);
    expect(formatted).toMatch(/1:00\sPM/);
    expect(formatted).toMatch(/PDT|GMT-7|UTC-7/);
  });
});

function item(partial: Partial<HistoryListItem> & Pick<HistoryListItem, "id" | "status">): HistoryListItem {
  return {
    subject: "Letter",
    subjectDisplay: "Letter",
    audienceSummary: "All active subscribers",
    statusLabel: "Sent",
    layout: "announcement",
    audience: { sources: [], activeOnly: true },
    recipientCount: 1,
    sentCount: 1,
    failedCount: 0,
    sentAt: "2026-09-01T00:00:00.000Z",
    scheduledFor: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    when: "2026-09-01T00:00:00.000Z",
    stats: {
      delivered: 1,
      opened: 1,
      clicked: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
      total: 1,
      openPercent: 100,
      clickPercent: 0,
      bounceFailCount: 0,
    },
    ...partial,
  };
}

describe("pickHistoryBanner", () => {
  const now = Date.parse("2026-09-10T17:00:00.000Z");

  it("prefers recent delivery problems over upcoming sends", () => {
    const banner = pickHistoryBanner([
      item({
        id: 1,
        status: "failed",
        statusLabel: "Failed",
        sentAt: "2026-09-09T00:00:00.000Z",
        failedCount: 4,
        stats: { ...item({ id: 1, status: "failed" }).stats, bounceFailCount: 4 },
      }),
      item({
        id: 2,
        status: "scheduled",
        statusLabel: "Scheduled",
        sentAt: null,
        scheduledFor: "2026-09-12T17:00:00.000Z",
      }),
    ], now);
    expect(banner).toEqual({ kind: "problems", count: 1 });
  });

  it("shows the next scheduled send when nothing failed recently", () => {
    const banner = pickHistoryBanner([
      item({
        id: 2,
        status: "scheduled",
        statusLabel: "Scheduled",
        sentAt: null,
        scheduledFor: "2026-09-12T17:00:00.000Z",
      }),
    ], now);
    expect(banner).toEqual({ kind: "upcoming", at: "2026-09-12T17:00:00.000Z" });
  });

  it("falls back to last send and open rate", () => {
    const banner = pickHistoryBanner([
      item({ id: 3, status: "sent", sentAt: "2026-09-08T20:00:00.000Z", subjectDisplay: "Spring letter" }),
    ], now);
    expect(banner).toEqual({
      kind: "last",
      at: "2026-09-08T20:00:00.000Z",
      openPercent: 100,
      subject: "Spring letter",
    });
  });

  it("returns empty when there is nothing to report", () => {
    expect(pickHistoryBanner([], now)).toEqual({ kind: "empty" });
  });
});

describe("historyRecipientsCsv", () => {
  it("exports email, name, status, opened, clicked, and error", () => {
    const csv = historyRecipientsCsv([
      { email: "ada@example.org", name: "Ada, Weaver", status: "sent", statusLabel: "Delivered", opened: true, clicked: true, error: null },
      { email: "bea@example.org", name: "", status: "sent", statusLabel: "Bounced", opened: false, clicked: false, error: "user unknown" },
    ]);
    expect(csv).toBe(
      [
        "Email,Name,Status,Opened,Clicked,Error",
        'ada@example.org,"Ada, Weaver",Delivered,yes,yes,',
        "bea@example.org,,Bounced,no,no,user unknown",
      ].join("\n"),
    );
  });

  it("builds a letter filename from the cleaned subject", () => {
    expect(historyCsvFilename(7, "**Subject:** Spring letter", new Date("2026-09-10T00:00:00.000Z")))
      .toBe("letter-7-spring-letter-2026-09-10.csv");
  });
});
