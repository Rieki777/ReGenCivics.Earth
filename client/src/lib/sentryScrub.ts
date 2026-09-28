/**
 * Keep URL fragments out of everything the browser sends to Sentry
 * (security review 2026-09-28).
 *
 * The offer status link carries a private token in its fragment
 * (/offer#<token>, client/src/lib/offerStatusToken.ts). App.tsx takes it out
 * of the address before Sentry starts, but a second link opened in a tab
 * already on /offer is a fragment change with no reload: Sentry's history
 * instrumentation records a navigation breadcrumb whose `from` and `to` hold
 * the full URL, fragment and all, before the page's hashchange handler runs.
 * Any error captured later in that session then shipped a 180-day bearer
 * token to anyone with Sentry access.
 *
 * Fragments are never needed to debug this app, so every one is dropped:
 * from breadcrumb data (navigation from/to, fetch and xhr urls), from the
 * breadcrumb message, and from an event's request URL and transaction name.
 * Wired into Sentry.init in client/src/main.tsx as beforeBreadcrumb,
 * beforeSend and beforeSendTransaction.
 */

/** "/offer#abc" -> "/offer". Anything that isn't a string comes back as it was. */
export function stripFragment<T>(value: T): T {
  if (typeof value !== "string") return value;
  const i = value.indexOf("#");
  return (i === -1 ? value : value.slice(0, i)) as T;
}

/** Any "#fragment" inside a longer string, such as a breadcrumb message ("Navigated to /offer#abc"). */
function stripFragmentsInText(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/#[^\s"'<>]*/g, "");
}

type Crumb = { category?: string; message?: string; data?: Record<string, unknown> | undefined };

const URL_KEYS = ["from", "to", "url"] as const;

/** A breadcrumb with every URL fragment removed. Never drops the breadcrumb itself. */
export function scrubBreadcrumb<B extends Crumb>(crumb: B): B {
  if (!crumb) return crumb;
  const out = { ...crumb };
  if (out.data) {
    const data = { ...out.data };
    for (const k of URL_KEYS) if (k in data) data[k] = stripFragment(data[k]);
    out.data = data;
  }
  if (typeof out.message === "string") out.message = stripFragmentsInText(out.message) as string;
  return out;
}

type SentryLikeEvent = {
  request?: { url?: string; headers?: Record<string, string> } | undefined;
  transaction?: string;
  breadcrumbs?: Crumb[];
  tags?: Record<string, unknown>;
};

/** An event (error or transaction) with every URL fragment removed. */
export function scrubEvent<E extends SentryLikeEvent>(event: E): E {
  if (!event) return event;
  const out = { ...event };
  if (out.request) {
    const request = { ...out.request };
    if (typeof request.url === "string") request.url = stripFragment(request.url);
    if (request.headers && typeof request.headers.Referer === "string") {
      request.headers = { ...request.headers, Referer: stripFragment(request.headers.Referer) };
    }
    out.request = request;
  }
  if (typeof out.transaction === "string") out.transaction = stripFragment(out.transaction);
  if (Array.isArray(out.breadcrumbs)) out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb);
  if (out.tags && typeof out.tags.url === "string") out.tags = { ...out.tags, url: stripFragment(out.tags.url) };
  return out;
}

/** The hooks main.tsx spreads into Sentry.init, so the test runs exactly what ships. */
export function sentryPrivacyOptions() {
  return {
    beforeBreadcrumb: <B extends Crumb>(crumb: B) => scrubBreadcrumb(crumb),
    beforeSend: <E extends SentryLikeEvent>(event: E) => scrubEvent(event),
    beforeSendTransaction: <E extends SentryLikeEvent>(event: E) => scrubEvent(event),
  };
}
