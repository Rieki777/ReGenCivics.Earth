/**
 * CookieConsent Banner Component
 * GDPR-compliant cookie consent banner with Accept/Decline options.
 * Stores preference in localStorage. Shows on first visit only.
 * Supports "Manage Cookies" re-trigger via custom event.
 * Styled to match the enchanted forest theme.
 */

import { useState, useEffect, useCallback } from "react";
import { Cookie, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CONSENT_KEY = "rc_cookie_consent";
const CONSENT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
const MANAGE_COOKIES_EVENT = "regen-manage-cookies";

type ConsentStatus = "accepted" | "declined" | null;

function getStoredConsent(): ConsentStatus {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (!val) return null;
    const ts = parseInt(val.split(":")[0], 10);
    const status = val.split(":")[1] as "accepted" | "declined";
    if (!ts || !status) return null;
    if (Date.now() - ts > CONSENT_EXPIRY_MS) return null; // re-prompt after 1 year
    return status;
  } catch {
    return null;
  }
}

function storeConsent(status: "accepted" | "declined") {
  try {
    localStorage.setItem(CONSENT_KEY, `${Date.now()}:${status}`);
  } catch {
    // localStorage unavailable, silently fail
  }
}

/**
 * Call this to re-show the cookie consent banner (e.g. from a "Manage Cookies" link).
 * Clears stored consent and dispatches an event to re-open the banner.
 */
export function resetCookieConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(MANAGE_COOKIES_EVENT));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const showBanner = useCallback(() => {
    setVisible(true);
    requestAnimationFrame(() => setAnimating(true));
  }, []);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = getStoredConsent();
    if (consent === null) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(showBanner, 1500);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  // Listen for "Manage Cookies" event
  useEffect(() => {
    const handleManageCookies = () => showBanner();
    window.addEventListener(MANAGE_COOKIES_EVENT, handleManageCookies);
    return () => window.removeEventListener(MANAGE_COOKIES_EVENT, handleManageCookies);
  }, [showBanner]);

  const handleAccept = () => {
    storeConsent("accepted");
    dismiss();
    // Dispatch storage event so useCookieConsent updates in other components
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY }));
  };

  const handleDecline = () => {
    storeConsent("declined");
    dismiss();
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY }));
  };

  const dismiss = () => {
    setAnimating(false);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-16 md:bottom-0 left-0 right-0 z-[9999] p-3 md:p-4 transition-all duration-300 ease-out ${
        animating
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      }`}
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="max-w-lg mx-auto bg-[#1a472a]/95 backdrop-blur-md border border-[#7dd87d]/30 rounded-2xl shadow-2xl shadow-black/30 p-4 md:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-[#7dd87d]" />
          </div>
          <div className="flex-1">
            <h3
              className="text-white font-bold text-sm md:text-base mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cookie Preferences
            </h3>
            <p className="text-white/70 text-xs md:text-sm leading-relaxed">
              We use cookies for essential site functionality and analytics to improve your experience.
              No personal data is sold to third parties.{" "}
              <Link
                href="/privacy-policy"
                className="text-[#7dd87d] underline hover:text-[#7dd87d]/80 inline-flex items-center gap-0.5"
              >
                <Shield className="w-3 h-3" />
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        {/* Action buttons - mobile-first stacked layout */}
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent text-xs md:text-sm h-10 sm:h-9 rounded-xl"
          >
            Essential Only
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="bg-[#7dd87d] hover:bg-[#6cc86c] text-[#1a472a] font-bold text-xs md:text-sm h-10 sm:h-9 rounded-xl"
          >
            Accept All Cookies
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper hook to check if analytics cookies are accepted.
 * Use this to conditionally load analytics scripts.
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>(() => getStoredConsent());

  useEffect(() => {
    // Listen for storage changes (same tab via custom dispatch, other tabs via native)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY || e.key === null) {
        setConsent(getStoredConsent());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    hasConsented: consent === "accepted",
    hasDeclined: consent === "declined",
    isPending: consent === null,
  };
}
