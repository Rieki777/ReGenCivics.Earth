/**
 * The tool library's fetch guard (ADR-73): the submit form's prefill must
 * never let a caller point the server at its own network.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getDb: async () => null }));
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => {
    if (host === "internal.example") return [{ address: "10.0.0.5", family: 4 }];
    if (host === "rebind.example") return [{ address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  }),
}));

const { assertPublicHttpUrl, isPrivateAddress } = await import("./toolLibrary");

describe("isPrivateAddress", () => {
  it("blocks loopback, private, link-local, carrier-grade NAT, metadata and multicast", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["93.184.216.34", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});

describe("assertPublicHttpUrl", () => {
  it("accepts a public site", async () => {
    await expect(assertPublicHttpUrl("example.org/tool")).resolves.toBeInstanceOf(URL);
  });
  it("refuses internal hosts, private addresses, odd ports, credentials and other schemes", async () => {
    await expect(assertPublicHttpUrl("http://localhost:3000")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
    await expect(assertPublicHttpUrl("https://internal.example")).rejects.toThrow(/public internet/);
    await expect(assertPublicHttpUrl("https://rebind.example")).rejects.toThrow(/public internet/);
    await expect(assertPublicHttpUrl("https://example.org:8080")).rejects.toThrow(/port/);
    await expect(assertPublicHttpUrl("https://user:pw@example.org")).rejects.toThrow(/password/);
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://railway.internal")).rejects.toThrow();
  });
});
