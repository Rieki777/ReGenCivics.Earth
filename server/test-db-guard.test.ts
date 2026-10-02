/**
 * The test database guard (server/test-db-guard.ts). Pure: no database.
 *
 * The vitest global setup, the global teardown and cleanupTestData call
 * assertTestDbUrl before touching a database, so a shell that loaded .env
 * (Railway production) can neither write fixtures there nor sweep it.
 */
import { describe, expect, it } from "vitest";
import {
  LOCAL_TEST_DB_HOSTS,
  TestDbRefusal,
  allowedTestDbHosts,
  assertTestDbUrl,
  isTestDbUrl,
  testDbHost,
} from "./test-db-guard";

const NO_EXTRA = {} as NodeJS.ProcessEnv;
const SECRET = "s3cretPassw0rd";
const RAILWAY = `mysql://root:${SECRET}@roundhouse.proxy.rlwy.net:41234/railway`;

describe("local hosts pass", () => {
  it.each([
    ["127.0.0.1", "mysql://root:pw@127.0.0.1:3307/regen_scratch"],
    ["localhost", "mysql://root:pw@localhost:3306/regen"],
    ["LOCALHOST in capitals", "mysql://root:pw@LocalHost:3306/regen"],
    ["[::1]", "mysql://root:pw@[::1]:3306/regen"],
  ])("%s", (_label, url) => {
    expect(isTestDbUrl(url, NO_EXTRA)).toBe(true);
    expect(() => assertTestDbUrl(url, "Test setup", NO_EXTRA)).not.toThrow();
  });

  it("lists ::1 in both spellings", () => {
    expect(LOCAL_TEST_DB_HOSTS).toContain("::1");
    expect(LOCAL_TEST_DB_HOSTS).toContain("[::1]");
  });

  it("CI's integration URL passes", () => {
    expect(isTestDbUrl("mysql://root:ci@127.0.0.1:3306/regen_ci", NO_EXTRA)).toBe(true);
  });
});

describe("a remote host is refused", () => {
  it("refuses a Railway-style host", () => {
    expect(isTestDbUrl(RAILWAY, NO_EXTRA)).toBe(false);
    expect(() => assertTestDbUrl(RAILWAY, "Test teardown", NO_EXTRA)).toThrow(TestDbRefusal);
  });

  it("names the host and the label, and never the password or the user", () => {
    let message = "";
    try {
      assertTestDbUrl(RAILWAY, "Test teardown", NO_EXTRA);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('"roundhouse.proxy.rlwy.net"');
    expect(message).toContain("[Test teardown]");
    expect(message).toContain("TEST_DB_HOSTS");
    expect(message).not.toContain(SECRET);
    expect(message).not.toContain("root:");
    expect(message).not.toContain("41234");
  });

  it("does not let a local-looking user name or path fool it", () => {
    expect(isTestDbUrl("mysql://localhost:pw@db.example.net:3306/localhost", NO_EXTRA)).toBe(false);
    expect(isTestDbUrl("mysql://root:pw@127.0.0.1.evil.net:3306/x", NO_EXTRA)).toBe(false);
  });
});

describe("TEST_DB_HOSTS", () => {
  const env = { TEST_DB_HOSTS: " Foo.internal , ,bar " } as NodeJS.ProcessEnv;

  it("is split on commas, trimmed and lowercased, with empty entries dropped", () => {
    expect(allowedTestDbHosts(env)).toEqual(["foo.internal", "bar"]);
    expect(allowedTestDbHosts(NO_EXTRA)).toEqual([]);
    expect(allowedTestDbHosts({ TEST_DB_HOSTS: "" } as NodeJS.ProcessEnv)).toEqual([]);
  });

  it("admits a listed host", () => {
    expect(isTestDbUrl("mysql://root:pw@foo.internal:3306/regen", env)).toBe(true);
    expect(() => assertTestDbUrl("mysql://root:pw@FOO.internal:3306/regen", "Test setup", env)).not.toThrow();
  });

  it("still refuses a host that is not listed", () => {
    expect(isTestDbUrl(RAILWAY, env)).toBe(false);
  });
});

describe("edge cases", () => {
  it("an unparseable URL reads as host unknown and is refused", () => {
    expect(testDbHost("not a url at all")).toBeNull();
    expect(isTestDbUrl("not a url at all", NO_EXTRA)).toBe(false);
    expect(() => assertTestDbUrl("not a url at all", "Test cleanup", NO_EXTRA)).toThrow(
      /\[Test cleanup\] Refusing to run against the database at "unknown"/,
    );
  });

  it("an empty URL does not throw: no database, nothing to protect", () => {
    expect(() => assertTestDbUrl(undefined, "Test setup", NO_EXTRA)).not.toThrow();
    expect(() => assertTestDbUrl("", "Test setup", NO_EXTRA)).not.toThrow();
    expect(() => assertTestDbUrl("   ", "Test setup", NO_EXTRA)).not.toThrow();
  });

  it("testDbHost never returns credentials", () => {
    expect(testDbHost(RAILWAY)).toBe("roundhouse.proxy.rlwy.net");
    expect(testDbHost(undefined)).toBeNull();
  });
});
