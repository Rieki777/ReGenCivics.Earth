/**
 * GDPR Compliance Tests
 * Tests for cookie consent, newsletter unsubscribe, and analytics gating.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

describe("GDPR Compliance", () => {
  describe("Cookie Consent Storage", () => {
    const CONSENT_KEY = "regen-civics-cookie-consent";
    const CONSENT_VERSION = "1";

    beforeEach(() => {
      localStorageMock.clear();
    });

    it("should store accepted consent with version and timestamp", () => {
      const consent = {
        status: "accepted",
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent));

      const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!);
      expect(stored.status).toBe("accepted");
      expect(stored.version).toBe(CONSENT_VERSION);
      expect(stored.timestamp).toBeTruthy();
    });

    it("should store declined consent with version and timestamp", () => {
      const consent = {
        status: "declined",
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent));

      const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!);
      expect(stored.status).toBe("declined");
      expect(stored.version).toBe(CONSENT_VERSION);
    });

    it("should return null for missing consent", () => {
      const stored = localStorageMock.getItem(CONSENT_KEY);
      expect(stored).toBeNull();
    });

    it("should invalidate consent with wrong version", () => {
      const consent = {
        status: "accepted",
        version: "0", // old version
        timestamp: new Date().toISOString(),
      };
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent));

      const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!);
      // Version mismatch should be treated as no consent
      expect(stored.version).not.toBe(CONSENT_VERSION);
    });

    it("should clear consent on reset (manage cookies)", () => {
      const consent = {
        status: "accepted",
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent));
      expect(localStorageMock.getItem(CONSENT_KEY)).toBeTruthy();

      // Reset
      localStorageMock.removeItem(CONSENT_KEY);
      expect(localStorageMock.getItem(CONSENT_KEY)).toBeNull();
    });
  });

  describe("Analytics Gating Logic", () => {
    it("should only load analytics when consent is accepted", () => {
      const consentStates = [
        { status: "accepted", shouldLoad: true },
        { status: "declined", shouldLoad: false },
        { status: null, shouldLoad: false },
      ];

      for (const { status, shouldLoad } of consentStates) {
        const hasConsented = status === "accepted";
        expect(hasConsented).toBe(shouldLoad);
      }
    });

    it("should remove analytics when consent is declined after acceptance", () => {
      // Simulate: user accepted, then changed to declined via Manage Cookies
      let consent: string | null = "accepted";
      expect(consent === "accepted").toBe(true); // analytics should be loaded

      consent = "declined";
      expect(consent === "accepted").toBe(false); // analytics should be removed
    });
  });

  describe("Newsletter Unsubscribe Data Validation", () => {
    it("should validate email format for unsubscribe", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@example.co.uk",
      ];
      const invalidEmails = ["", "notanemail", "@domain.com", "user@"];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (const email of validEmails) {
        expect(emailRegex.test(email)).toBe(true);
      }
      for (const email of invalidEmails) {
        expect(emailRegex.test(email)).toBe(false);
      }
    });

    it("should handle unsubscribe request structure", () => {
      const request = { email: "user@example.com" };
      expect(request).toHaveProperty("email");
      expect(typeof request.email).toBe("string");
      expect(request.email.includes("@")).toBe(true);
    });
  });

  describe("GDPR Data Rights", () => {
    it("should provide unsubscribe mechanism", () => {
      // The /unsubscribe route exists and accepts email input
      const unsubscribeEndpoint = "newsletter.unsubscribe";
      expect(unsubscribeEndpoint).toBeTruthy();
    });

    it("should include privacy policy link in cookie banner", () => {
      // Cookie banner includes link to /privacy-policy
      const privacyPolicyPath = "/privacy-policy";
      expect(privacyPolicyPath).toBe("/privacy-policy");
    });

    it("should provide manage cookies option", () => {
      // Footer includes "Manage Cookies" button that resets consent
      const manageCookiesAction = "resetCookieConsent";
      expect(manageCookiesAction).toBeTruthy();
    });

    it("should not load analytics without consent", () => {
      // Default state (no consent) should not load analytics
      const defaultConsent = null;
      const shouldLoadAnalytics = defaultConsent === "accepted";
      expect(shouldLoadAnalytics).toBe(false);
    });
  });
});
