/**
 * useReferralAttribute - Ties a stored referral to the signed-in user.
 *
 * Reads the same ref off sessionStorage that useReferralCapture writes
 * and posts it to sharing.attributeSignup once auth completes. The
 * server stamps referredUserId + signedUpAt on the most recent
 * matching open referral row so "people you've brought in" lights up
 * on the referrer's profile. Marks the attempt in sessionStorage so we
 * never re-fire on subsequent renders within the same session.
 */
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const ATTEMPTED_KEY = "regen_ref_attributed";

export function useReferralAttribute() {
  const { user } = useAuth();
  const attribute = trpc.sharing.attributeSignup.useMutation();

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(ATTEMPTED_KEY)) return;

    let ref: string | null = null;
    try {
      const raw = sessionStorage.getItem("regen-referral");
      if (raw) {
        const parsed = JSON.parse(raw) as { ref?: string };
        ref = parsed?.ref ?? null;
      }
      if (!ref) {
        const params = new URLSearchParams(window.location.search);
        ref = params.get("ref");
      }
    } catch {
      // sessionStorage parse error: nothing to attribute.
    }
    if (!ref) return;

    sessionStorage.setItem(ATTEMPTED_KEY, "1");
    attribute.mutate({ ref });
    // attribute is a stable mutation reference; including it in deps
    // would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}
