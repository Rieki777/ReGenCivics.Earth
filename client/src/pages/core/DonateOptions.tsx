import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ZeffyDonate from "./ZeffyDonate";
import DonateForm from "./DonateForm";

/**
 * Composes the two giving paths. Zeffy (zero platform fees) is preferred and
 * shown first when configured; the Stripe form becomes a secondary, clearly
 * labeled fallback the giver can open if they prefer. If Zeffy is not
 * configured, the Stripe form is the primary (and only) experience, unchanged
 * from before Zeffy existed, so nothing regresses while Zeffy is being set up.
 */
export default function DonateOptions() {
  const zeffy = trpc.churchDonations.zeffyEnabled.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const stripe = trpc.churchDonations.donationsEnabled.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [showStripe, setShowStripe] = useState(false);

  if (zeffy.isLoading) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--forest-moss)" }}>Preparing the giving form...</p>
      </div>
    );
  }

  if (!zeffy.data?.enabled) {
    // Zeffy not set up yet: Stripe (or its own coming-soon state) is primary.
    return <DonateForm />;
  }

  return (
    <div>
      <ZeffyDonate />
      {/* Only offer the card fallback when the Stripe form is actually live;
          otherwise it just leads to a dead "coming soon" state. */}
      {stripe.data?.enabled && (
        <div className="center" style={{ marginTop: 24 }}>
          {!showStripe ? (
            <button type="button" className="btn btn-ghost" onClick={() => setShowStripe(true)}>
              Prefer to give by card directly?
            </button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: ".9rem", color: "var(--forest-sage)", marginBottom: 16 }}>
                Zeffy carries no platform fees, so it is the kindest way to give. If you would rather use
                this form, it works too.
              </p>
              <DonateForm />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
