/**
 * Auto-scheduled event reminders: offsets, audience modes, and the mapping
 * from event kind (Season 2 episode / Open Access / custom) to a default
 * audience. Shared by the admin UI and the cron job so they cannot drift.
 */

export const AUTO_REMINDER_OFFSETS = [
  { minutes: 7 * 24 * 60, label: "7 days before", shortLabel: "7d", lead: "Starting in 7 days" },
  { minutes: 3 * 24 * 60, label: "3 days before", shortLabel: "3d", lead: "Starting in 3 days" },
  { minutes: 24 * 60, label: "24 hours before", shortLabel: "24h", lead: "Starting in about 24 hours" },
  { minutes: 60, label: "1 hour before", shortLabel: "1h", lead: "Starting in about an hour" },
] as const;

export type AutoReminderOffsetMinutes = (typeof AUTO_REMINDER_OFFSETS)[number]["minutes"];

export const ALLOWED_AUTO_REMINDER_OFFSETS: readonly number[] = AUTO_REMINDER_OFFSETS.map(
  (o) => o.minutes,
);

/** Defaults match the existing 24h blast plus the event-blast T-1 week and T-1 hour drumbeat. */
export const DEFAULT_AUTO_REMINDER_OFFSETS: AutoReminderOffsetMinutes[] = [
  7 * 24 * 60,
  24 * 60,
  60,
];

export const AUTO_REMINDER_AUDIENCE_MODES = [
  "season2_approved",
  "open_access",
  "custom",
] as const;

export type AutoReminderAudienceMode = (typeof AUTO_REMINDER_AUDIENCE_MODES)[number];

export const NEWSLETTER_AUDIENCE_SOURCES = [
  "homepage",
  "investor_form",
  "connect_form",
  "apply_form",
  "footer",
  "exit_intent",
  "other",
] as const;

export type NewsletterAudienceSource = (typeof NEWSLETTER_AUDIENCE_SOURCES)[number];

export const CUSTOM_APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "active",
  "rejected",
  "changes_requested",
] as const;

export type CustomApplicationStatus = (typeof CUSTOM_APPLICATION_STATUSES)[number];

export type CustomAudienceConfig = {
  newsletterSources?: NewsletterAudienceSource[];
  includeInvestors?: boolean;
  includeLoi?: boolean;
  includeEventSignups?: boolean;
  applicationStatuses?: CustomApplicationStatus[];
};

export type EventKindForReminders = {
  type: "open" | "episode" | "special" | string;
  season?: string | null;
};

/**
 * Season 2 incubator episodes default to approved/active land projects.
 * Open sessions (including catalog Open Access) default to the broad list.
 * Special / custom events have no safe default and must be chosen in admin.
 */
export function defaultAudienceMode(event: EventKindForReminders): AutoReminderAudienceMode {
  if (event.type === "episode" || event.season === "Season 2") return "season2_approved";
  if (event.type === "open") return "open_access";
  return "custom";
}

export function audienceModeLabel(mode: AutoReminderAudienceMode): string {
  if (mode === "season2_approved") return "Season 2 approved projects";
  if (mode === "open_access") return "Everyone (newsletter + this event's signups)";
  return "Custom selection";
}

export function audienceModeHelp(mode: AutoReminderAudienceMode): string {
  if (mode === "season2_approved") {
    return "Land projects with application status approved or active. Not the full newsletter.";
  }
  if (mode === "open_access") {
    return "Active newsletter subscribers, plus anyone who signed up for a reminder on this event.";
  }
  return "Pick at least one list. This event has no default audience.";
}

export function customAudienceIsSelected(config: CustomAudienceConfig | null | undefined): boolean {
  if (!config) return false;
  return (
    (config.newsletterSources?.length ?? 0) > 0 ||
    !!config.includeInvestors ||
    !!config.includeLoi ||
    !!config.includeEventSignups ||
    (config.applicationStatuses?.length ?? 0) > 0
  );
}

export function canEnableAutoReminders(
  mode: AutoReminderAudienceMode,
  config: CustomAudienceConfig | null | undefined,
): boolean {
  if (mode !== "custom") return true;
  return customAudienceIsSelected(config);
}

const ALLOWED_OFFSET_SET = new Set(ALLOWED_AUTO_REMINDER_OFFSETS);

export function parseOffsetMinutes(raw: unknown): number[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const item of value) {
    const n = typeof item === "number" ? item : Number(item);
    if (!Number.isInteger(n) || !ALLOWED_OFFSET_SET.has(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.sort((a, b) => b - a);
}

export function parseAudienceConfig(raw: unknown): CustomAudienceConfig {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const sourceSet = new Set<string>(NEWSLETTER_AUDIENCE_SOURCES);
  const statusSet = new Set<string>(CUSTOM_APPLICATION_STATUSES);
  const newsletterSources = Array.isArray(obj.newsletterSources)
    ? obj.newsletterSources.filter((s): s is NewsletterAudienceSource =>
        typeof s === "string" && sourceSet.has(s),
      )
    : undefined;
  const applicationStatuses = Array.isArray(obj.applicationStatuses)
    ? obj.applicationStatuses.filter((s): s is CustomApplicationStatus =>
        typeof s === "string" && statusSet.has(s),
      )
    : undefined;
  return {
    newsletterSources,
    includeInvestors: obj.includeInvestors === true,
    includeLoi: obj.includeLoi === true,
    includeEventSignups: obj.includeEventSignups === true,
    applicationStatuses,
  };
}

export function offsetLead(minutes: number): string {
  return AUTO_REMINDER_OFFSETS.find((o) => o.minutes === minutes)?.lead ?? "Upcoming session";
}

export function offsetSubject(title: string, minutes: number): string {
  if (minutes === 7 * 24 * 60) return `In 7 days: ${title}`;
  if (minutes === 3 * 24 * 60) return `In 3 days: ${title}`;
  if (minutes === 24 * 60) return `Reminder: ${title} is tomorrow`;
  if (minutes === 60) return `Starting soon: ${title}`;
  return `Reminder: ${title}`;
}

/**
 * Offsets that should fire now: due (now >= start - offset) and not yet sent,
 * and only while the event has not started.
 */
export function dueOffsets(opts: {
  startTime: Date;
  now: Date;
  offsetsMinutes: number[];
  alreadySent: Iterable<number>;
}): number[] {
  const startMs = opts.startTime.getTime();
  const nowMs = opts.now.getTime();
  if (!Number.isFinite(startMs) || nowMs >= startMs) return [];
  const sent = new Set(opts.alreadySent);
  return opts.offsetsMinutes.filter((minutes) => {
    if (sent.has(minutes)) return false;
    const dueAt = startMs - minutes * 60 * 1000;
    return nowMs >= dueAt;
  });
}

export type ReminderRecipient = {
  email: string;
  name: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mergeRecipients(groups: Array<Array<{ email?: string | null; name?: string | null }>>): ReminderRecipient[] {
  const seen = new Set<string>();
  const out: ReminderRecipient[] = [];
  for (const group of groups) {
    for (const row of group) {
      const email = (row.email ?? "").trim().toLowerCase();
      if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
      seen.add(email);
      const name = (row.name ?? "").trim() || email.split("@")[0] || "Friend";
      out.push({ email, name });
    }
  }
  return out;
}

export function isDuplicateKeyError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "ER_DUP_ENTRY";
}
