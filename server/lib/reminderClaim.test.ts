import { describe, expect, it, vi } from "vitest";
import { reminderClaimAction, settleReminderRecipients } from "./reminderClaim";

describe("reminderClaimAction", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("treats a missing row as a new partial claim", () => {
    expect(reminderClaimAction(null, now)).toBe("insert_partial");
  });

  it("does not treat a partial row as finished", () => {
    const fresh = new Date(now.getTime() - 60_000);
    expect(reminderClaimAction({ status: "partial", sentAt: fresh }, now)).toBe("skip_inflight");
    const stale = new Date(now.getTime() - 5 * 60_000);
    expect(reminderClaimAction({ status: "partial", sentAt: stale }, now)).toBe("takeover_stale");
  });

  it("skips a complete claim", () => {
    expect(reminderClaimAction({ status: "complete", sentAt: now }, now)).toBe("skip_complete");
  });
});

describe("settleReminderRecipients", () => {
  it("stops on a rate limit and a second pass skips addresses already delivered", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ id: "msg_ada", status: "sent" })
      .mockResolvedValueOnce({ id: null, status: "rate_limited" });
    const first = await settleReminderRecipients({
      recipients: [
        { email: "ada@example.com" },
        { email: "bob@example.com" },
        { email: "cam@example.com" },
      ],
      alreadyDelivered: [],
      send,
    });
    expect(first.delivered).toEqual(["ada@example.com"]);
    expect(first.dropped).toEqual(["bob@example.com", "cam@example.com"]);
    expect(first.complete).toBe(false);
    expect(send).toHaveBeenCalledTimes(2);

    send.mockReset();
    send.mockResolvedValue({ id: "msg_rest", status: "sent" });
    const second = await settleReminderRecipients({
      recipients: [
        { email: "ada@example.com" },
        { email: "bob@example.com" },
        { email: "cam@example.com" },
      ],
      alreadyDelivered: first.delivered,
      send,
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(second.complete).toBe(true);
    expect(second.dropped).toEqual([]);
  });
});
