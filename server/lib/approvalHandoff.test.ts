import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake database: every select resolves to the next queued result, every
// update reports the queued affectedRows, inserts are recorded.
const selects: unknown[][] = [];
const updates: number[] = [];
const inserts: unknown[] = [];

function chain(result: () => unknown) {
  const node: Record<string, unknown> = {};
  for (const m of ["from", "where", "leftJoin", "orderBy", "limit", "set"]) node[m] = () => node;
  node.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    try { return Promise.resolve(result()).then(resolve, reject); } catch (e) { return reject(e); }
  };
  return node;
}

const fakeDb = {
  select: () => chain(() => selects.shift() ?? []),
  update: () => chain(() => [{ affectedRows: updates.shift() ?? 1 }]),
  insert: () => ({ values: (v: unknown) => { inserts.push(v); return Promise.resolve(); } }),
};

const app = {
  id: 7,
  userId: 70,
  status: "approved",
  projectName: "Riverbend <Farm>",
  location: "Oregon",
  contactEmail: "steward@example.com",
  contactName: "Sam",
  projectType: "mature",
  landStatus: "owned",
  vision: "v",
  regenerativePractices: "r",
  governanceApproach: "g",
  communityEngagement: "c",
  teamDescription: "t",
  teamSize: 3,
  fundingNeeds: "f",
};

const sendEmail = vi.fn();
const createForumPost = vi.fn();

vi.mock("../db", () => ({
  getDb: async () => fakeDb,
  getApplicationById: vi.fn(async () => ({ ...app })),
  logAdminAction: vi.fn(async () => undefined),
  listForumCategories: vi.fn(async () => [{ id: 3, slug: "land-projects", name: "Land Projects" }]),
  createForumCategory: vi.fn(async () => 3),
  createForumPost: (...args: unknown[]) => createForumPost(...args),
}));
vi.mock("../_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  toAbsoluteUrl: (path: string) => `https://regencivics.earth${path}`,
}));
vi.mock("../_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));
vi.mock("./team-user", () => ({ getOrCreateTeamUserId: async () => 1, LAND_PROJECTS_CATEGORY_SLUG: "land-projects" }));
vi.mock("./tierDetector", () => ({ detectTierProgression: vi.fn(async () => undefined) }));
vi.mock("./seasonSchedule", () => ({
  moveFooterHtml: async () => "<p>footer</p>",
  seasonEpisodeRows: async () => [],
  sessionWhen: (d: Date) => d.toISOString(),
  stillRunning: () => true,
}));

const {
  isApprovalTransition,
  setApplicationStatus,
  voteInviteEmail,
  voteInviteOutcomeLabel,
} = await import("./approvalHandoff");

beforeEach(() => {
  selects.length = 0;
  updates.length = 0;
  inserts.length = 0;
  sendEmail.mockReset().mockResolvedValue({ id: "e1", status: "sent" });
  createForumPost.mockReset().mockResolvedValue(1);
});

describe("isApprovalTransition", () => {
  it("is an approval only when the project moves into approved or active from outside", () => {
    expect(isApprovalTransition("submitted", "approved")).toBe(true);
    expect(isApprovalTransition("under_review", "active")).toBe(true);
    expect(isApprovalTransition("approved", "active")).toBe(false);
    expect(isApprovalTransition("active", "approved")).toBe(false);
    expect(isApprovalTransition("approved", "rejected")).toBe(false);
    expect(isApprovalTransition(null, "approved")).toBe(true);
  });
});

describe("setApplicationStatus", () => {
  it("runs the handoff once on approval: thread created, invite sent", async () => {
    selects.push([{ status: "submitted" }], [], []); // status read, invite lookup, thread lookup
    const res = await setApplicationStatus({ id: 7, status: "approved", adminUserId: 1 });
    expect(res.changed).toBe(true);
    expect(res.handoff).toEqual({ thread: "created", invite: "sent" });
    expect(createForumPost).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.template).toBe("land_project_vote_invite");
    expect(mail.inquiryType).toBe("application");
    expect(mail.inquiryId).toBe(7);
  });

  it("does nothing when the status is already the one asked for", async () => {
    selects.push([{ status: "approved" }]);
    const res = await setApplicationStatus({ id: 7, status: "approved", adminUserId: 1 });
    expect(res).toEqual({ previous: "approved", changed: false, handoff: null });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips the handoff when another admin moved the status first", async () => {
    selects.push([{ status: "submitted" }]);
    updates.push(0);
    const res = await setApplicationStatus({ id: 7, status: "approved", adminUserId: 1 });
    expect(res.changed).toBe(false);
    expect(res.handoff).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(createForumPost).not.toHaveBeenCalled();
  });

  it("re-approval after an Undo sends no second invite and makes no second thread", async () => {
    // Thread lookup finds the existing thread; email_logs finds the sent invite.
    selects.push([{ status: "submitted" }], [{ id: 1 }], [{ id: 7 }]);
    const res = await setApplicationStatus({ id: 7, status: "approved", adminUserId: 1 });
    expect(res.handoff).toEqual({ thread: "exists", invite: "already_sent" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(createForumPost).not.toHaveBeenCalled();
  });

  it("a quiet approval sends no email and says so on the timeline", async () => {
    selects.push([{ status: "submitted" }], []);
    const res = await setApplicationStatus({ id: 7, status: "approved", adminUserId: 1, notify: false });
    expect(res.handoff?.invite).toBe("not_requested");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(inserts).toContainEqual(expect.objectContaining({ description: "Approved without the vote invite email" }));
  });

  it("carries a rate limit back to the admin instead of claiming the invite went out", async () => {
    sendEmail.mockResolvedValue({ id: null, status: "rate_limited" });
    selects.push([{ status: "submitted" }], [], []);
    const res = await setApplicationStatus({ id: 7, status: "approved", adminUserId: 1 });
    expect(res.handoff?.invite).toBe("rate_limited");
    expect(inserts).toContainEqual(expect.objectContaining({ eventType: "admin_action", description: voteInviteOutcomeLabel("rate_limited") }));
  });
});

describe("voteInviteEmail", () => {
  const base = {
    recipientName: "Sam",
    projectName: "Riverbend <Farm>",
    seasonName: "Season Two",
    running: true,
    next: { title: "Week 4", start: new Date("2026-10-20T21:00:00Z") },
    footerHtml: "<p>footer</p>",
  };

  it("links the vote, the schedule and the status page, and escapes the project name", () => {
    const { subject, html } = voteInviteEmail(base);
    expect(subject).toContain("vote for your call time");
    expect(html).toContain("/season-schedule");
    expect(html).toContain("/schedule");
    expect(html).toContain("/apply/status");
    expect(html).toContain("Week 4");
    expect(html).toContain("Riverbend &lt;Farm&gt;");
    expect(html).not.toContain("<Farm>");
  });

  it("points to the next Season when this one has finished", () => {
    const { html } = voteInviteEmail({ ...base, running: false, next: null });
    expect(html).toContain("has held its last session");
    expect(html).not.toContain("Vote for a call time");
  });

  it("follows the writing rules: no em dashes", () => {
    for (const running of [true, false]) {
      const { subject, html } = voteInviteEmail({ ...base, running });
      expect(subject + html).not.toMatch(/—/);
    }
  });
});
