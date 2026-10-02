/**
 * Test database guard.
 *
 * The vitest global setup, the global teardown and cleanupTestData all reach
 * whatever DATABASE_URL says, and the teardown deletes broadly (every
 * contribution with an @example email or a title containing test, Volunteer
 * or Tractor, every campaign titled with test, Accept or Reject, and more).
 * .env's DATABASE_URL is Railway production, and several DB suites skip only
 * when DATABASE_URL is unset, so one shell that loaded .env would write
 * fixtures to production and then sweep it.
 *
 * This guard lets a test run touch a database only when its host is local
 * (127.0.0.1, localhost or ::1) or listed in TEST_DB_HOSTS. CI's integration
 * job uses 127.0.0.1; its unit job has no DATABASE_URL at all.
 *
 * The refusal names the host and never the URL, which carries the password.
 */

/** Hosts a test run may write to and clean up, beyond any in TEST_DB_HOSTS. */
export const LOCAL_TEST_DB_HOSTS = ["127.0.0.1", "localhost", "::1", "[::1]"] as const;

/** TEST_DB_HOSTS, comma-separated, trimmed and lowercased; empty entries dropped. */
export function allowedTestDbHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.TEST_DB_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
}

/** The hostname of a mysql:// URL, lowercased, or null when it does not parse. Never returns credentials. */
export function testDbHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host.length > 0 ? host : null;
  } catch {
    return null;
  }
}

/** True when the URL's host is local or listed in TEST_DB_HOSTS. */
export function isTestDbUrl(url: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const host = testDbHost(url);
  if (!host) return false;
  if ((LOCAL_TEST_DB_HOSTS as readonly string[]).includes(host)) return true;
  return allowedTestDbHosts(env).includes(host);
}

export class TestDbRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestDbRefusal";
  }
}

/** Throws TestDbRefusal unless isTestDbUrl. Does nothing when url is empty (no database, nothing to protect). */
export function assertTestDbUrl(
  url: string | undefined,
  label: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!url || url.trim() === "") return;
  if (isTestDbUrl(url, env)) return;
  const host = testDbHost(url) ?? "unknown";
  throw new TestDbRefusal(
    `[${label}] Refusing to run against the database at "${host}". Tests and their cleanup only run against a local database (127.0.0.1, localhost or ::1) or a host listed in TEST_DB_HOSTS. .env points at Railway production. Export the scratch DATABASE_URL and run again.`,
  );
}
