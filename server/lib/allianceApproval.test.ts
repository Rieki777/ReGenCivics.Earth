import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake database: selects resolve to queued results in order, updates report
// queued affectedRows, inserts are recorded and return an insertId.
const selects: unknown[][] = [];
const updates: number[] = [];
const inserts: unknown[] = [];
let executes = 0;

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
  insert: () => ({ values: (v: unknown) => { inserts.push(v); return Promise.resolve([{ insertId: 55 }]); } }),
  // The organisations insert is raw SQL (see ensureOrganisation).
  execute: () => { executes += 1; return Promise.resolve([{ insertId: 55 }]); },
};

const app = {
  id: 9,
  userId: 90,
  contactEmail: "Ana@Seed.org",
  contactName: "Ana",
  organizationName: "Seed <Commons>",
  organizationUrl: "https://seed.org",
  roles: '["Funding"]',
  supportDescription: "We fund land projects.",
  toolRepoUrl: "https://github.com/seed/tool",
  status: "approved",
  organisationId: null,
};

const sendEmail = vi.fn();
const addCircleSignups = vi.fn();

vi.mock("../db", () => ({
  getDb: async () => fakeDb,
  logAdminAction: vi.fn(async () => undefined),
}));
vi.mock("../_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  toAbsoluteUrl: (path: string) => `https://regencivics.earth${path}`,
}));
vi.mock("../_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));
vi.mock("./memberBadges", () => ({ clearBadgeCache: vi.fn() }));
vi.mock("./toolLibrary", () => ({ applicationTools: vi.fn(async () => []), approveApplicationTools: vi.fn(async () => []) }));
// approvalHandoff is imported for real (its labels and transition rule); its
// own heavy imports are stubbed.
vi.mock("./seasonSchedule", () => ({
  moveFooterHtml: async () => "",
  seasonEpisodeRows: async () => [],
  sessionWhen: (d: Date) => d.toISOString(),
  stillRunning: () => true,
}));
vi.mock("./team-user", () => ({ getOrCreateTeamUserId: async () => 1, LAND_PROJECTS_CATEGORY_SLUG: "land-projects" }));
vi.mock("./interopCircle", () => ({
  addCircleSignups: (...args: unknown[]) => addCircleSignups(...args),
  circleWhen: (d: Date) => d.toISOString(),
  resolveCircleState: async () => ({ slot: "wed" }),
  syncInteropCircle: async () => null,
  unsubscribeLink: async () => "https://regencivics.earth/interop-sessions?leave=t",
  upcomingCircleRows: async () => [{ id: 301, status: "upcoming", startTime: new Date("2026-10-14T23:00:00Z") }],
}));
vi.mock("./approvalHandoff", async () => {
  const actual = await vi.importActual<typeof import("./approvalHandoff")>("./approvalHandoff");
  return {
    ...actual,
    idsWithInvite: vi.fn(async (_t: string, _k: string, ids: number[]) => (invited ? new Set(ids) : new Set())),
    inviteLogState: vi.fn(),
  };
});
let invited = false;

const { circleInviteEmail, setAllianceApplicationStatus, CIRCLE_INVITE_TEMPLATE } = await import("./allianceApproval");

beforeEach(() => {
  selects.length = 0;
  updates.length = 0;
  inserts.length = 0;
  executes = 0;
  invited = false;
  sendEmail.mockReset().mockResolvedValue({ id: "e1", status: "sent" });
  addCircleSignups.mockReset().mockResolvedValue(undefined);
});

describe("setAllianceApplicationStatus", () => {
  it("on approval registers the organization, joins the Circle, files the tool and emails the invite", async () => {
    // status read, app read, organisation lookup, register-by-email lookup
    selects.push([{ status: "submitted" }], [{ ...app }], [], []);
    const res = await setAllianceApplicationStatus({ id: 9, status: "approved", adminUserId: 1 });
    expect(res.changed).toBe(true);
    expect(res.handoff).toEqual({ organisation: "created", circle: "joined", tools: 0, invite: "sent" });
    expect(addCircleSignups).toHaveBeenCalledWith(fakeDb, [301], [{ email: "ana@seed.org", name: "Ana" }]);
    expect(executes).toBe(1);
    expect(inserts).toContainEqual(expect.objectContaining({ email: "ana@seed.org", repoUrl: "https://github.com/seed/tool" }));
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.template).toBe(CIRCLE_INVITE_TEMPLATE);
    expect(mail.inquiryType).toBe("alliance_application");
    expect(mail.inquiryId).toBe(9);
  });

  it("re-approval sends no second invite and makes no second registry row", async () => {
    invited = true;
    selects.push([{ status: "rejected" }], [{ ...app, organisationId: 55 }], [{ id: 55 }], [{ id: 3 }]);
    const res = await setAllianceApplicationStatus({ id: 9, status: "approved", adminUserId: 1 });
    expect(res.handoff).toEqual({ organisation: "exists", circle: "joined", tools: 0, invite: "already_sent" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(executes).toBe(0);
  });

  it("does nothing when another admin moved the status first", async () => {
    selects.push([{ status: "submitted" }]);
    updates.push(0);
    const res = await setAllianceApplicationStatus({ id: 9, status: "approved", adminUserId: 1 });
    expect(res).toEqual({ previous: "submitted", changed: false, handoff: null });
    expect(addCircleSignups).not.toHaveBeenCalled();
  });

  it("a quiet approval still joins the Circle but sends no email", async () => {
    selects.push([{ status: "submitted" }], [{ ...app }], [], []);
    const res = await setAllianceApplicationStatus({ id: 9, status: "approved", adminUserId: 1, notify: false });
    expect(res.handoff?.invite).toBe("not_requested");
    expect(res.handoff?.circle).toBe("joined");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("moving between approved and active is not a new approval", async () => {
    selects.push([{ status: "approved" }], [{ ...app, status: "active" }]);
    const res = await setAllianceApplicationStatus({ id: 9, status: "active", adminUserId: 1 });
    expect(res.handoff).toBeNull();
    expect(addCircleSignups).not.toHaveBeenCalled();
  });
});

describe("circleInviteEmail", () => {
  const base = {
    recipientName: "Ana",
    organizationName: "Seed <Commons>",
    slotLabel: "Wednesdays, 4pm PT",
    next: new Date("2026-10-14T23:00:00Z"),
    footerHtml: "<p>footer</p>",
  };

  it("links the Circle vote, the calendar and the status page, and escapes the name", () => {
    const { subject, html } = circleInviteEmail(base);
    expect(subject).toContain("vote for the Circle's call time");
    expect(html).toContain("/interop-sessions");
    expect(html).toContain("/calendar/interop-circle.ics");
    expect(html).toContain("/apply/alliance/status");
    expect(html).toContain("Wednesdays, 4pm PT");
    expect(html).toContain("Seed &lt;Commons&gt;");
    expect(html).not.toContain("<Commons>");
  });

  it("still reads when no Circle week is on the calendar", () => {
    const { html } = circleInviteEmail({ ...base, slotLabel: null, next: null });
    expect(html).toContain("being set now");
  });

  it("uses no em dash", () => {
    const { subject, html } = circleInviteEmail(base);
    expect(subject + html).not.toContain(String.fromCharCode(0x2014));
  });
});
