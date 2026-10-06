/**
 * One person per human on a week's board. Guests, accounts, schedule rows
 * and inquiries join by identity. Nothing on the board is rewritten.
 * Raw voter keys never leave this module's inputs.
 */
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { boardKeyTagFor, guestLabel, parseBoardKeyTag } from "@shared/boardIdentityLink";
import { boardSignupSource, interestFromRole } from "@shared/boardSignup";
import {
  BOARD_OFFERS,
  boardMoment,
  boardStages,
  normalizeBoardState,
  sessionMinutes,
  type BoardMoment,
  type BoardState,
} from "@shared/sessionBoard";
import {
  applications,
  contactTags,
  generalInquiries,
  seasonScheduleVotes,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  users,
} from "../../drizzle/schema";
import { findBoard, type Db } from "./sessionBoard";

export type PeopleInquiry = {
  id: number;
  email: string;
  fullName: string | null;
  roleInterest: string | null;
  additionalNotes: string | null;
  userId: number | null;
  createdAt: Date | number | string | null;
  referralSource: string | null;
};

export type PeopleTag = { contactType: string; contactId: number; tag: string };

export type CollateInput = {
  week: number;
  now: number;
  plannedMs: number;
  state: BoardState;
  items: Array<{
    id: number;
    kind: string;
    text: string;
    projectId: number | null;
    authorKey: string | null;
    displayName: string | null;
    createdAt: Date | number | string | null;
  }>;
  projects: Array<{
    id: number;
    name: string;
    url: string | null;
    nextMove: string | null;
    applicationId: number | null;
    authorKey: string | null;
    displayName: string | null;
    createdAt: Date | number | string | null;
    updatedAt?: Date | number | string | null;
  }>;
  votes: Array<{ target: string; voterKey: string; createdAt: Date | number | string | null }>;
  inquiries: PeopleInquiry[];
  tags: PeopleTag[];
  users: Array<{ id: number; name: string | null; email: string | null }>;
  schedule: Array<{ voterKey: string; displayName: string | null; projectName: string | null; projectUrl: string | null }>;
  applications: Array<{ id: number; userId: number; projectName: string }>;
  elsewhere: Array<{ id: number; email: string; fullName: string | null; pathType: string }>;
};

export type PersonInput = {
  stage: string;
  text: string;
  project: string | null;
  timing: BoardMoment;
  at: number;
};

export type BoardPerson = {
  name: string;
  email: string | null;
  userId: number | null;
  guestId: string | null;
  signedIn: boolean;
  badges: string[];
  projects: string[];
  arrivalWords: string[];
  closingWords: string[];
  notesCount: number;
  votes: number;
  weekHands: number[];
  offers: string[];
  schedule: { project: string | null; url: string | null } | null;
  application: { id: number; projectName: string } | null;
  firstSeen: number | null;
  lastSeen: number | null;
  inputs: PersonInput[];
  elsewhere: Array<{ id: number; label: string }>;
};

export type CollateResult = {
  week: number;
  people: BoardPerson[];
  totals: {
    people: number;
    withEmail: number;
    signedIn: number;
    guestsWithoutEmail: number;
    before: number;
    live: number;
    after: number;
  };
};

function atMs(value: Date | number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(n) ? n : null;
}

function emailNode(email: string): string {
  return `em:${email.trim().toLowerCase()}`;
}

function idNode(identity: string): string {
  return `id:${identity}`;
}

function stageName(week: number, kind: string): string {
  return boardStages(week).find((stage) => stage.kind === kind)?.name ?? kind;
}

function offerLabel(key: string): string {
  return BOARD_OFFERS.find((offer) => offer.key === key)?.label ?? key;
}

export async function collatePeople(input: CollateInput): Promise<CollateResult> {
  const identities = new Set<string>();
  const addIdentity = (key: string | null | undefined) => {
    if (key && (key.startsWith("k:") || key.startsWith("u:"))) identities.add(key);
  };
  for (const item of input.items) addIdentity(item.authorKey);
  for (const project of input.projects) addIdentity(project.authorKey);
  for (const vote of input.votes) addIdentity(vote.voterKey);
  for (const user of input.users) identities.add(`u:${user.id}`);
  for (const inquiry of input.inquiries) {
    if (inquiry.userId) identities.add(`u:${inquiry.userId}`);
  }

  const hashOf = new Map<string, string>();
  await Promise.all([...identities].map(async (identity) => {
    hashOf.set(identity, (await boardKeyTagFor(identity)).slice("board-key:".length));
  }));
  const byHash = new Map<string, string[]>();
  for (const [identity, prefix] of hashOf) {
    const list = byHash.get(prefix) ?? [];
    list.push(identity);
    byHash.set(prefix, list);
  }

  const parent = new Map<string, string>();
  const find = (node: string): string => {
    const seen = parent.get(node);
    if (!seen) {
      parent.set(node, node);
      return node;
    }
    if (seen === node) return node;
    const root = find(seen);
    parent.set(node, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent.set(pa, pb);
  };

  for (const identity of identities) find(idNode(identity));
  for (const user of input.users) {
    if (user.email?.trim()) union(idNode(`u:${user.id}`), emailNode(user.email));
  }
  for (const inquiry of input.inquiries) {
    const node = emailNode(inquiry.email);
    find(node);
    if (inquiry.userId) union(idNode(`u:${inquiry.userId}`), node);
  }
  for (const tag of input.tags) {
    const prefix = parseBoardKeyTag(tag.tag);
    if (!prefix) continue;
    const linked = byHash.get(prefix) ?? [];
    if (tag.contactType === "inquiry") {
      const inquiry = input.inquiries.find((row) => row.id === tag.contactId);
      if (!inquiry) continue;
      for (const identity of linked) union(idNode(identity), emailNode(inquiry.email));
    } else if (tag.contactType === "user") {
      const userNode = idNode(`u:${tag.contactId}`);
      find(userNode);
      identities.add(`u:${tag.contactId}`);
      for (const identity of linked) union(idNode(identity), userNode);
    }
  }

  type Bucket = { root: string; ids: string[]; emails: string[] };
  const buckets = new Map<string, Bucket>();
  const take = (node: string): Bucket => {
    const root = find(node);
    let bucket = buckets.get(root);
    if (!bucket) {
      bucket = { root, ids: [], emails: [] };
      buckets.set(root, bucket);
    }
    return bucket;
  };
  for (const identity of identities) {
    const bucket = take(idNode(identity));
    if (!bucket.ids.includes(identity)) bucket.ids.push(identity);
  }
  for (const inquiry of input.inquiries) {
    const bucket = take(emailNode(inquiry.email));
    const email = inquiry.email.trim().toLowerCase();
    if (!bucket.emails.includes(email)) bucket.emails.push(email);
  }

  const projectName = new Map(input.projects.map((project) => [project.id, project.name]));
  const itemText = new Map(input.items.map((item) => [item.id, item.text]));
  const ahead = stageName(input.week, "ahead");
  const together = stageName(input.week, "together");
  const circle = stageName(input.week, "circle");
  const harvest = stageName(input.week, "harvest");

  const people: BoardPerson[] = [];
  for (const bucket of buckets.values()) {
    const idSet = new Set(bucket.ids);
    const emailSet = new Set(bucket.emails);
    const items = input.items.filter((item) => item.authorKey && idSet.has(item.authorKey));
    const projects = input.projects.filter((project) => project.authorKey && idSet.has(project.authorKey));
    const votes = input.votes.filter((vote) => idSet.has(vote.voterKey));
    const inquiries = input.inquiries.filter((inquiry) => emailSet.has(inquiry.email.trim().toLowerCase())
      || (inquiry.userId != null && idSet.has(`u:${inquiry.userId}`)));
    if (items.length + projects.length + votes.length + inquiries.length === 0) continue;

    const userIds = bucket.ids.filter((id) => id.startsWith("u:")).map((id) => Number(id.slice(2))).filter((id) => id > 0);
    const userId = userIds[0] ?? inquiries.find((inquiry) => inquiry.userId)?.userId ?? null;
    const account = input.users.find((user) => user.id === userId) ?? null;
    const email = bucket.emails[0] ?? account?.email?.trim().toLowerCase() ?? null;
    const guestIdentity = bucket.ids.filter((id) => id.startsWith("k:")).sort()[0] ?? null;
    const guestHash = guestIdentity ? hashOf.get(guestIdentity) ?? "" : "";
    const guestId = guestHash ? guestHash.slice(0, 6) : null;

    const displayNames = [
      ...inquiries.map((inquiry) => inquiry.fullName),
      account?.name ?? null,
      ...items.map((item) => item.displayName),
      ...projects.map((project) => project.displayName),
    ].map((name) => name?.trim() || "").filter(Boolean);

    const scheduleRow = input.schedule.find((row) => idSet.has(`k:${row.voterKey}`)) ?? null;
    if (scheduleRow?.displayName?.trim()) displayNames.push(scheduleRow.displayName.trim());

    const name = displayNames[0] || email || (guestHash ? guestLabel(guestHash) : "Guest");
    const signedIn = userId != null;

    const inputs: PersonInput[] = [];
    const push = (stage: string, text: string, project: string | null, at: number | null) => {
      if (at == null || !text) return;
      inputs.push({
        stage,
        text,
        project,
        timing: boardMoment(at, input.state, input.plannedMs),
        at,
      });
    };

    for (const item of items) {
      const at = atMs(item.createdAt);
      const project = item.projectId != null ? projectName.get(item.projectId) ?? null : null;
      const kindStage = item.kind === "arrive" ? "breath"
        : item.kind === "leave" ? "close"
        : item.kind === "game" ? "game"
        : item.kind === "opp" && item.projectId == null ? "harvest"
        : "circle";
      push(stageName(input.week, kindStage), item.text, project, at);
    }
    for (const project of projects) {
      push(circle, project.name, project.name, atMs(project.createdAt));
      if (project.nextMove) push(ahead, project.nextMove, project.name, atMs(project.updatedAt ?? project.createdAt));
    }
    for (const vote of votes) {
      const at = atMs(vote.createdAt);
      if (vote.target.startsWith("item:")) {
        const itemId = Number(vote.target.slice(5));
        push(harvest, itemText.get(itemId) ?? "Vote", projectName.get(
          input.items.find((item) => item.id === itemId)?.projectId ?? -1,
        ) ?? null, at);
      } else if (vote.target.startsWith("week:")) {
        push(ahead, `Week ${vote.target.slice(5)}`, null, at);
      } else if (vote.target.startsWith("offer:")) {
        push(together, offerLabel(vote.target.slice(6)), null, at);
      }
    }
    for (const inquiry of inquiries) {
      const interest = interestFromRole(inquiry.roleInterest);
      const text = interest ?? inquiry.additionalNotes ?? "Follow up";
      push(interest ? together : "Follow up", text, null, atMs(inquiry.createdAt));
    }

    const offers = new Set<string>();
    for (const vote of votes) {
      if (vote.target.startsWith("offer:")) offers.add(offerLabel(vote.target.slice(6)));
    }
    for (const inquiry of inquiries) {
      const interest = interestFromRole(inquiry.roleInterest);
      if (interest) offers.add(interest === "Coach" ? "Coach a village" : "Build a module");
    }

    const application = input.applications.find((app) => (
      projects.some((project) => project.applicationId === app.id) || (userId != null && app.userId === userId)
    )) ?? null;

    const seen = inputs.map((row) => row.at);
    const badges = [
      signedIn ? "Signed in" : "",
      scheduleRow ? "Schedule" : "",
      application ? "Application" : "",
      [...offers].some((offer) => offer.startsWith("Coach")) ? "Coach" : "",
      [...offers].some((offer) => offer.startsWith("Build")) ? "Builder" : "",
    ].filter(Boolean);

    const elsewhere = input.elsewhere
      .filter((row) => email != null && row.email.trim().toLowerCase() === email && !inquiries.some((inquiry) => inquiry.id === row.id))
      .map((row) => ({ id: row.id, label: row.fullName?.trim() || row.pathType }));

    people.push({
      name,
      email,
      userId,
      guestId,
      signedIn,
      badges,
      projects: projects.map((project) => project.name),
      arrivalWords: items.filter((item) => item.kind === "arrive").map((item) => item.text),
      closingWords: items.filter((item) => item.kind === "leave").map((item) => item.text),
      notesCount: items.filter((item) => item.kind === "pain" || item.kind === "opp" || item.kind === "game").length,
      votes: votes.filter((vote) => vote.target.startsWith("item:")).length,
      weekHands: votes.filter((vote) => vote.target.startsWith("week:")).map((vote) => Number(vote.target.slice(5))),
      offers: [...offers],
      schedule: scheduleRow ? { project: scheduleRow.projectName, url: scheduleRow.projectUrl } : null,
      application: application ? { id: application.id, projectName: application.projectName } : null,
      firstSeen: seen.length ? Math.min(...seen) : null,
      lastSeen: seen.length ? Math.max(...seen) : null,
      inputs: inputs.sort((a, b) => a.at - b.at),
      elsewhere,
    });
  }

  people.sort((a, b) => a.name.localeCompare(b.name));
  const countTiming = (timing: BoardMoment) => people.reduce((n, person) => n + person.inputs.filter((row) => row.timing === timing).length, 0);
  return {
    week: input.week,
    people,
    totals: {
      people: people.length,
      withEmail: people.filter((person) => person.email).length,
      signedIn: people.filter((person) => person.signedIn).length,
      guestsWithoutEmail: people.filter((person) => !person.email).length,
      before: countTiming("before"),
      live: countTiming("live"),
      after: countTiming("after"),
    },
  };
}

export async function loadBoardPeople(db: Db, season: string, week: number, now = Date.now()): Promise<CollateResult> {
  const board = await findBoard(db, season, week);
  const state = normalizeBoardState(board?.state ?? null, week);
  const plannedMs = sessionMinutes(state.plan, boardStages(week)) * 60_000;
  const source = boardSignupSource(week);

  const [items, projects, votes, inquiries] = await Promise.all([
    board ? db.select().from(sessionBoardItems).where(eq(sessionBoardItems.boardId, board.id)) : Promise.resolve([]),
    board ? db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.boardId, board.id)) : Promise.resolve([]),
    board ? db.select().from(sessionBoardVotes).where(eq(sessionBoardVotes.boardId, board.id)) : Promise.resolve([]),
    db.select().from(generalInquiries).where(eq(generalInquiries.referralSource, source)),
  ]);

  const inquiryIds = inquiries.map((row) => row.id);
  const known = new Set<string>();
  const consider = (key: string | null | undefined) => {
    if (key && (key.startsWith("k:") || key.startsWith("u:"))) known.add(key);
  };
  for (const item of items) consider(item.authorKey);
  for (const project of projects) consider(project.authorKey);
  for (const vote of votes) consider(vote.voterKey);
  for (const inquiry of inquiries) if (inquiry.userId) known.add(`u:${inquiry.userId}`);
  const knownHashes = new Set<string>();
  await Promise.all([...known].map(async (identity) => {
    knownHashes.add((await boardKeyTagFor(identity)).slice("board-key:".length));
  }));
  const keyTags = knownHashes.size || inquiryIds.length
    ? await db.select().from(contactTags).where(sql`${contactTags.tag} like 'board-key:%'`)
    : [];
  const inquiryTags = keyTags.filter((tag) => tag.contactType === "inquiry" && inquiryIds.includes(tag.contactId));
  const userKeyTags = keyTags.filter((tag) => {
    if (tag.contactType !== "user") return false;
    const prefix = parseBoardKeyTag(tag.tag);
    return prefix != null && knownHashes.has(prefix);
  });

  const userIds = new Set<number>();
  for (const identity of known) {
    if (!identity.startsWith("u:")) continue;
    const id = Number(identity.slice(2));
    if (id > 0) userIds.add(id);
  }
  for (const tag of userKeyTags) userIds.add(tag.contactId);

  const userRows = userIds.size
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, [...userIds]))
    : [];

  const rawKeys = [...new Set(
    [...items.map((item) => item.authorKey), ...projects.map((project) => project.authorKey), ...votes.map((vote) => vote.voterKey)]
      .filter((key): key is string => !!key && key.startsWith("k:"))
      .map((key) => key.slice(2)),
  )];
  const schedule = rawKeys.length
    ? await db.select({
      voterKey: seasonScheduleVotes.voterKey,
      displayName: seasonScheduleVotes.displayName,
      projectName: seasonScheduleVotes.projectName,
      projectUrl: seasonScheduleVotes.projectUrl,
    }).from(seasonScheduleVotes).where(and(
      eq(seasonScheduleVotes.season, season),
      inArray(seasonScheduleVotes.voterKey, rawKeys),
    ))
    : [];

  const appIds = projects.map((project) => project.applicationId).filter((id): id is number => id != null);
  const appMatch = [
    userIds.size ? inArray(applications.userId, [...userIds]) : null,
    appIds.length ? inArray(applications.id, appIds) : null,
  ].filter((clause): clause is NonNullable<typeof clause> => clause != null);
  const appRows = appMatch.length
    ? await db.select({
      id: applications.id,
      userId: applications.userId,
      projectName: applications.projectName,
      season: applications.season,
    }).from(applications).where(and(eq(applications.season, 2), or(...appMatch)))
    : [];

  const emails = [...new Set([
    ...inquiries.map((row) => row.email.trim().toLowerCase()),
    ...userRows.map((row) => row.email?.trim().toLowerCase() ?? ""),
  ].filter(Boolean))];
  const elsewhere = emails.length
    ? (await db.select({
      id: generalInquiries.id,
      email: generalInquiries.email,
      fullName: generalInquiries.fullName,
      pathType: generalInquiries.pathType,
      referralSource: generalInquiries.referralSource,
    }).from(generalInquiries).where(sql`lower(${generalInquiries.email}) in (${sql.join(emails.map((email) => sql`${email}`), sql`, `)})`))
      .filter((row) => row.referralSource !== source)
    : [];

  return collatePeople({
    week,
    now,
    plannedMs,
    state,
    items,
    projects,
    votes,
    inquiries,
    tags: [...inquiryTags, ...userKeyTags],
    users: userRows,
    schedule,
    applications: appRows.map((row) => ({ id: row.id, userId: row.userId, projectName: row.projectName })),
    elsewhere,
  });
}
