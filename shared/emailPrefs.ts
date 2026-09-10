/**
 * Community / newsletter email preference topics.
 *
 * Investor and funder mail is a separate list and never appears here.
 * Transactional mail (application status, claims, magic links) is not a topic
 * and is never filtered by these flags.
 */

export const EMAIL_TOPIC_KEYS = [
  "seasonal",
  "open_access",
  "season2",
  "events",
  "recordings",
] as const;

export type EmailTopicKey = (typeof EMAIL_TOPIC_KEYS)[number];

export function isEmailTopicKey(value: unknown): value is EmailTopicKey {
  return typeof value === "string" && (EMAIL_TOPIC_KEYS as readonly string[]).includes(value);
}

/** Blast type -> topic key. Outbound, Harvest, digest, OA, S2, events, recordings. */
export const BLAST_TOPIC = {
  harvest: "seasonal",
  digest: "seasonal",
  outbound: "seasonal",
  openAccess: "open_access",
  season2: "season2",
  events: "events",
  recordings: "recordings",
} as const satisfies Record<string, EmailTopicKey>;

export const MARKETING_PAUSE_DAYS = 30;

export const EMAIL_TOPICS: Record<
  EmailTopicKey,
  { label: string; description: string; column: "prefSeasonal" | "prefOpenAccess" | "prefSeason2" | "prefEvents" | "notifyRecordings" }
> = {
  seasonal: {
    label: "Seasonal / community updates",
    description: "Newsletters and Harvest announcements.",
    column: "prefSeasonal",
  },
  open_access: {
    label: "Open Access invitations",
    description: "Monthly Open Access invitations and reminders.",
    column: "prefOpenAccess",
  },
  season2: {
    label: "Season 2 session reminders",
    description: "Weekly Season 2 session reminders. You can mute these even if you are Season 2 approved.",
    column: "prefSeason2",
  },
  events: {
    label: "Event reminders",
    description: "Reminders for other events you care about.",
    column: "prefEvents",
  },
  recordings: {
    label: "Recording summaries",
    description: "An email when a session recording is ready to watch.",
    column: "notifyRecordings",
  },
};

export const PREFS_ACCOUNT_MAIL_COPY =
  "Application status, magic sign-in links, and claim updates always go through. Those are account mail.";

export const PREFS_UNSUB_ALL_COPY =
  "This stops seasonal updates, Open Access invitations, session reminders, event reminders, and recording summaries. Account mail keeps going.";

export const PREFS_PAUSE_COPY =
  "Pause community mail for 30 days. After that, your topic choices resume on their own.";

export type SubscriberTopicFlags = {
  isActive: number;
  marketingPausedUntil: Date | string | null;
  prefSeasonal: number;
  prefOpenAccess: number;
  prefSeason2: number;
  prefEvents: number;
  notifyRecordings: number;
};

export function topicFlag(sub: SubscriberTopicFlags, topic: EmailTopicKey): number {
  switch (topic) {
    case "seasonal":
      return sub.prefSeasonal;
    case "open_access":
      return sub.prefOpenAccess;
    case "season2":
      return sub.prefSeason2;
    case "events":
      return sub.prefEvents;
    case "recordings":
      return sub.notifyRecordings;
  }
}

export function subscriberAllowsTopic(
  sub: SubscriberTopicFlags,
  topic: EmailTopicKey,
  now = new Date(),
): boolean {
  if (sub.isActive !== 1) return false;
  const pausedUntil = sub.marketingPausedUntil ? new Date(sub.marketingPausedUntil) : null;
  if (pausedUntil && !Number.isNaN(pausedUntil.getTime()) && pausedUntil.getTime() > now.getTime()) {
    return false;
  }
  return topicFlag(sub, topic) === 1;
}
