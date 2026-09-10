/**
 * Signed email preference tokens + audience filter for community mail.
 *
 * Same JWT model as newsletter confirm (jose HS256, cookieSecret).
 * Prefs URLs do not require login. Investor mail does not use this module.
 */
import { SignJWT, jwtVerify } from "jose";
import {
  EMAIL_TOPIC_KEYS,
  isEmailTopicKey,
  MARKETING_PAUSE_DAYS,
  type EmailTopicKey,
} from "../../shared/emailPrefs";
import { getNewsletterSubscriberByEmail, getSubscribersForTopic, updateNewsletterPrefs } from "../db/newsletter";
import { ENV } from "../_core/env";

const PREFS_PURPOSE = "newsletter-prefs";
const PREFS_TTL = "365d";

function secret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function buildPrefsToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: PREFS_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(PREFS_TTL)
    .sign(secret());
}

const LEGACY_UNSUB_PURPOSE = "newsletter-unsubscribe";

export async function verifyPrefsToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const purpose = payload.purpose;
    const purposeOk = purpose === PREFS_PURPOSE || purpose === LEGACY_UNSUB_PURPOSE;
    if (!purposeOk || typeof payload.email !== "string") return null;
    return payload.email;
  } catch {
    return null;
  }
}

export function previewManagePreferencesUrl(opts?: { mute?: EmailTopicKey }): string {
  const url = new URL("/email-preferences", ENV.appUrl);
  if (opts?.mute) url.searchParams.set("mute", opts.mute);
  return url.toString();
}

export async function managePreferencesUrl(
  email: string,
  opts?: { mute?: EmailTopicKey },
): Promise<string> {
  const token = await buildPrefsToken(email);
  const url = new URL("/email-preferences", ENV.appUrl);
  url.searchParams.set("token", token);
  if (opts?.mute && isEmailTopicKey(opts.mute)) url.searchParams.set("mute", opts.mute);
  return url.toString();
}

/** Recipients for a tagged community blast. Investor mail does not use this. */
export async function audienceForTopic(topic: EmailTopicKey) {
  return getSubscribersForTopic(topic);
}

export type PublicPrefs = {
  email: string;
  isActive: boolean;
  pausedUntil: string | null;
  topics: Record<EmailTopicKey, boolean>;
};

export async function loadPrefsForToken(token: string): Promise<PublicPrefs | null> {
  const email = await verifyPrefsToken(token);
  if (!email) return null;
  const sub = await getNewsletterSubscriberByEmail(email);
  if (!sub) return null;
  return serializePrefs(sub);
}

function serializePrefs(sub: {
  email: string;
  isActive: number;
  marketingPausedUntil: Date | null;
  prefSeasonal: number;
  prefOpenAccess: number;
  prefSeason2: number;
  prefEvents: number;
  notifyRecordings: number;
}): PublicPrefs {
  return {
    email: sub.email,
    isActive: sub.isActive === 1,
    pausedUntil: sub.marketingPausedUntil ? sub.marketingPausedUntil.toISOString() : null,
    topics: {
      seasonal: sub.prefSeasonal === 1,
      open_access: sub.prefOpenAccess === 1,
      season2: sub.prefSeason2 === 1,
      events: sub.prefEvents === 1,
      recordings: sub.notifyRecordings === 1,
    },
  };
}

export async function saveTopicPrefs(
  email: string,
  topics: Record<EmailTopicKey, boolean>,
): Promise<PublicPrefs | null> {
  await updateNewsletterPrefs(email, {
    prefSeasonal: topics.seasonal ? 1 : 0,
    prefOpenAccess: topics.open_access ? 1 : 0,
    prefSeason2: topics.season2 ? 1 : 0,
    prefEvents: topics.events ? 1 : 0,
    notifyRecordings: topics.recordings ? 1 : 0,
  });
  const sub = await getNewsletterSubscriberByEmail(email);
  return sub ? serializePrefs(sub) : null;
}

export async function muteTopic(email: string, topic: EmailTopicKey): Promise<PublicPrefs | null> {
  const patch: Parameters<typeof updateNewsletterPrefs>[1] = {};
  if (topic === "seasonal") patch.prefSeasonal = 0;
  if (topic === "open_access") patch.prefOpenAccess = 0;
  if (topic === "season2") patch.prefSeason2 = 0;
  if (topic === "events") patch.prefEvents = 0;
  if (topic === "recordings") patch.notifyRecordings = 0;
  await updateNewsletterPrefs(email, patch);
  const sub = await getNewsletterSubscriberByEmail(email);
  return sub ? serializePrefs(sub) : null;
}

export async function pauseCommunityMail(email: string, days: number): Promise<PublicPrefs | null> {
  const until = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  await updateNewsletterPrefs(email, { marketingPausedUntil: until });
  const sub = await getNewsletterSubscriberByEmail(email);
  return sub ? serializePrefs(sub) : null;
}

export async function unsubscribeAllCommunity(email: string): Promise<PublicPrefs | null> {
  await updateNewsletterPrefs(email, { isActive: 0 });
  const sub = await getNewsletterSubscriberByEmail(email);
  return sub ? serializePrefs(sub) : null;
}

export async function resubscribeCommunity(email: string): Promise<PublicPrefs | null> {
  await updateNewsletterPrefs(email, { isActive: 1, marketingPausedUntil: null });
  const sub = await getNewsletterSubscriberByEmail(email);
  return sub ? serializePrefs(sub) : null;
}

export const PREFS_TOPIC_KEYS = EMAIL_TOPIC_KEYS;
export const PREFS_PAUSE_DAYS = MARKETING_PAUSE_DAYS;
