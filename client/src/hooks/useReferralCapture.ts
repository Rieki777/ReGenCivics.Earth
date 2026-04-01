/**
 * useReferralCapture - Captures referral URL params on page load.
 * Looks for ?ref=xxx&src=platform&ctx=context and sends to server.
 * Stores in sessionStorage to avoid duplicate submissions.
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function useReferralCapture() {
  const recordReferral = trpc.sharing.recordReferral.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    // Don't re-submit if already captured this session
    const key = `regen_ref_${ref}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    recordReferral.mutate({
      ref,
      source: params.get("src") ?? undefined,
      context: params.get("ctx") ?? undefined,
      landingUrl: window.location.pathname,
    });

    // Clean ref params from URL without reload
    params.delete("ref");
    params.delete("src");
    params.delete("ctx");
    const clean = params.toString();
    const newUrl = window.location.pathname + (clean ? `?${clean}` : "");
    window.history.replaceState({}, "", newUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
