import { describe, expect, it } from "vitest";
import {
  adminMayOperateIssue,
  buildPostSessionLetter,
  pickPostSessionCta,
  postSessionLetterIdempotencyKey,
} from "./postSessionLetter";
import { SITE_ORIGIN } from "./siteContext";

describe("pickPostSessionCta", () => {
  it("maps episode / season 2 to /season2", () => {
    expect(pickPostSessionCta({ type: "episode" }).path).toBe("/season2");
    expect(pickPostSessionCta({ season: "Season 2" }).url).toBe(`${SITE_ORIGIN}/season2`);
  });

  it("maps open access to schedule", () => {
    expect(pickPostSessionCta({ type: "open" }).path).toBe("/schedule");
  });

  it("defaults to connect", () => {
    expect(pickPostSessionCta({ type: "special" }).path).toBe("/connect");
  });
});

describe("buildPostSessionLetter", () => {
  it("builds markdown with overview, follow-ups, watch, CTA", () => {
    const letter = buildPostSessionLetter({
      recordingId: 42,
      title: "Open Access September",
      sessionDate: "2026-09-10T17:00:00.000Z",
      overview: "We talked about land projects and SEEDS.",
      actionItems: [{ owner: "Rieki", item: "Send LOI template" }],
      chapters: [{ tSeconds: 90, title: "Welcome" }],
      watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      event: { type: "open" },
    });
    expect(letter.templateKey).toBe(postSessionLetterIdempotencyKey(42));
    expect(letter.subject).toContain("Open Access September");
    expect(letter.body).toContain("What we covered");
    expect(letter.body).toContain("We talked about land projects");
    expect(letter.body).toContain("**Rieki:** Send LOI template");
    expect(letter.body).toContain("Watch the session");
    expect(letter.body).toContain("See upcoming sessions");
    expect(letter.body).toContain(`${SITE_ORIGIN}/schedule`);
    expect(letter.body).toContain("https://youtu.be/dQw4w9WgXcQ?t=90");
    expect(letter.body).toContain("1:30 Welcome");
    expect(letter.body).not.toContain("—");
    expect(letter.layout).toBe("announcement");
  });

  it("leaves placeholder when overview missing", () => {
    const letter = buildPostSessionLetter({
      recordingId: 1,
      title: "TBD",
      event: { type: "episode" },
    });
    expect(letter.body).toMatch(/Summary landing after processing/i);
    expect(letter.body).toContain(`${SITE_ORIGIN}/season2`);
  });
});

describe("adminMayOperateIssue", () => {
  const key = postSessionLetterIdempotencyKey(9);

  it("keeps a hand-written draft with its author", () => {
    expect(adminMayOperateIssue({ createdBy: 1, templateKey: null, idempotencyKey: null }, 7)).toBe(false);
    expect(adminMayOperateIssue({ createdBy: 7, templateKey: "announcement", idempotencyKey: null }, 7)).toBe(true);
  });

  it("lets any admin operate an auto-drafted wrap-up, including after the send key replaces idempotencyKey", () => {
    expect(adminMayOperateIssue({ createdBy: 1, templateKey: key, idempotencyKey: key }, 7)).toBe(true);
    expect(adminMayOperateIssue({ createdBy: 1, templateKey: key, idempotencyKey: "confirm-send-key" }, 7)).toBe(true);
    expect(adminMayOperateIssue({ createdBy: 1, templateKey: null, idempotencyKey: key }, 7)).toBe(true);
  });
});
