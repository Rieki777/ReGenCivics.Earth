import { describe, expect, it } from "vitest";
import { sendPacedEmails } from "./pacedEmail";

describe("sendPacedEmails", () => {
  it("retries a rate-limited recipient, then sends the next person once", async () => {
    const calls: string[] = [];
    let limited = 0;
    const result = await sendPacedEmails({
      recipients: ["a@example.com", "b@example.com"],
      delayMs: 0,
      maxAttempts: 3,
      sleep: async () => {},
      sendOne: async (email) => {
        calls.push(email);
        if (email === "a@example.com" && limited < 2) {
          limited += 1;
          return { id: null, status: "rate_limited" };
        }
        return { id: `msg-${email}`, status: "sent" };
      },
    });
    expect(result.dropped).toBe(0);
    expect(result.accepted).toBe(2);
    expect(calls.filter((email) => email === "a@example.com")).toHaveLength(3);
    expect(calls.filter((email) => email === "b@example.com")).toHaveLength(1);
    expect(result.outcomes.map((row) => row.status)).toEqual(["sent", "sent"]);
  });

  it("does not send again to someone already accepted", async () => {
    const calls: string[] = [];
    const result = await sendPacedEmails({
      recipients: ["a@example.com", "B@example.com"],
      alreadyAccepted: new Set(["b@example.com"]),
      delayMs: 0,
      sleep: async () => {},
      sendOne: async (email) => {
        calls.push(email);
        return { id: "msg", status: "sent" };
      },
    });
    expect(calls).toEqual(["a@example.com"]);
    expect(result.outcomes).toEqual([
      { email: "a@example.com", status: "sent" },
      { email: "B@example.com", status: "skipped" },
    ]);
    expect(result.dropped).toBe(0);
  });

  it("records a lasting rate limit and leaves the rest unsent", async () => {
    const calls: string[] = [];
    const result = await sendPacedEmails({
      recipients: ["a@example.com", "b@example.com", "c@example.com"],
      delayMs: 0,
      maxAttempts: 2,
      sleep: async () => {},
      sendOne: async (email) => {
        calls.push(email);
        return { id: null, status: "rate_limited" };
      },
    });
    expect(calls).toEqual(["a@example.com", "a@example.com"]);
    expect(result.outcomes.map((row) => row.status)).toEqual([
      "rate_limited",
      "deferred",
      "deferred",
    ]);
    expect(result.dropped).toBe(3);
    expect(result.accepted).toBe(0);
  });

  it("keeps going after one provider failure", async () => {
    const result = await sendPacedEmails({
      recipients: ["bad@example.com", "ok@example.com"],
      delayMs: 0,
      sleep: async () => {},
      sendOne: async (email) => {
        if (email.startsWith("bad")) return { id: null, status: "provider_error" };
        return { id: "msg-ok", status: "sent" };
      },
    });
    expect(result.outcomes.map((row) => row.status)).toEqual(["failed", "sent"]);
    expect(result.accepted).toBe(1);
    expect(result.dropped).toBe(1);
  });
});
