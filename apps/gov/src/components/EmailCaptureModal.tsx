"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PillButton } from "./PillButton";
import { fetchFromMainSite } from "@/lib/api";

const STORAGE_KEY = "regen-gov-email-prompt-dismissed";

/**
 * Shown once to users who authenticated via wallet only (no email or Google
 * account linked). Prompts them to add an email via Privy's linkEmail() flow
 * so we can reach them for quest updates, season news, and governance alerts.
 *
 * After the user links their email Privy updates `user.linkedAccounts` reactively.
 * We watch that array to detect the new email and sync it to the backend.
 */
export function EmailCaptureModal() {
  const { ready, authenticated, user, linkEmail, getAccessToken } = usePrivy();
  const [show, setShow] = useState(false);
  const [linking, setLinking] = useState(false);
  const [synced, setSynced] = useState(false);
  const prevAccountCount = useRef(0);

  // Determine whether this user needs the prompt
  const hasEmailOrGoogle =
    user?.linkedAccounts?.some(
      (a) => a.type === "email" || a.type === "google_oauth"
    ) ?? false;

  const dismissed =
    typeof window !== "undefined" &&
    !!localStorage.getItem(STORAGE_KEY);

  // Show once we know the user is wallet-only and hasn't dismissed before
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    if (hasEmailOrGoogle) return;
    if (dismissed) return;
    setShow(true);
  }, [ready, authenticated, user, hasEmailOrGoogle, dismissed]);

  // Watch linkedAccounts for a newly added email after linkEmail() is called
  useEffect(() => {
    if (!linking || !user?.linkedAccounts) return;

    const currentCount = user.linkedAccounts.length;
    if (currentCount <= prevAccountCount.current) return;

    // Find the newly added email account
    const emailAccount = user.linkedAccounts.find(
      (a) => a.type === "email" || a.type === "google_oauth"
    );
    if (!emailAccount) return;

    const address =
      emailAccount.type === "email"
        ? (emailAccount as { type: "email"; address: string }).address
        : (emailAccount as { type: "google_oauth"; email: string }).email;

    if (!address) return;

    // Sync the new email to the backend
    getAccessToken()
      .then((token) =>
        fetchFromMainSite<{ success: boolean }>(
          "auth.syncEmail",
          { json: { email: address } },
          token ?? undefined
        )
      )
      .then(() => {
        setSynced(true);
        setTimeout(() => setShow(false), 1800);
      })
      .catch((err) => {
        console.error("Failed to sync email to backend:", err);
        // Still close the modal — Privy has the email even if our DB sync blipped
        setShow(false);
      })
      .finally(() => setLinking(false));
  }, [user?.linkedAccounts, linking, getAccessToken]);

  const handleLink = () => {
    prevAccountCount.current = user?.linkedAccounts?.length ?? 0;
    setLinking(true);
    linkEmail();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      {/* Soft backdrop — less aggressive than WelcomeModal */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[6px]"
        onClick={handleSkip}
      />

      <div className="relative w-full max-w-[480px] rounded-2xl bg-[#0d2818] border border-[#7dd87d]/20 p-7 space-y-5 shadow-2xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#1a472a] border border-[#7dd87d]/30 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-[#7dd87d]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>

        {synced ? (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              You're in.
            </h2>
            <p className="text-white/70 text-sm">
              Email linked. We'll reach you when it matters.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                Add your email
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                You signed in with a wallet. Add an email so we can reach you
                for season updates, quest completions, and governance alerts.
                You can always do this later from your profile.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <PillButton onClick={handleLink} disabled={linking}>
                {linking ? "Opening..." : "Add email"}
              </PillButton>
              <button
                onClick={handleSkip}
                className="text-sm text-white/40 hover:text-white/70 transition-colors py-2 px-4"
              >
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
