import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * The preferred giving experience: an embedded Zeffy form. Zeffy takes zero
 * platform fees from nonprofits (they fund themselves through an optional
 * donor tip at checkout), so 100% of the gift reaches the church. The form
 * itself (amounts, one-time/monthly toggle) is built once in the Zeffy
 * dashboard; here we just embed it and note the fee-free framing honestly.
 *
 * Renders nothing if Zeffy is not configured, so the parent (Donate.tsx) can
 * fall back to the Stripe form or a coming-soon state.
 */
export default function ZeffyDonate() {
  const enabledQuery = trpc.churchDonations.zeffyEnabled.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [loaded, setLoaded] = useState(false);

  if (enabledQuery.isLoading) {
    return (
      <div className="card zeffy-embed" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--forest-moss)" }}>Preparing the giving form...</p>
      </div>
    );
  }

  const embedUrl = enabledQuery.data?.embedUrl;
  if (!enabledQuery.data?.enabled || !embedUrl) return null;

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto", padding: 0, overflow: "hidden" }}>
      <div className="zeffy-embed" style={{ position: "relative" }}>
        {!loaded && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--parchment-whisper)" }}>
            <p style={{ margin: 0, color: "var(--forest-moss)" }}>Loading the giving form...</p>
          </div>
        )}
        <iframe
          title="Give to the Church of the Regenerative Earth (via Zeffy)"
          src={embedUrl}
          onLoad={() => setLoaded(true)}
          style={{ width: "100%", minHeight: 720, border: 0, display: "block" }}
          allow="payment"
        />
      </div>
      <p style={{ padding: "16px 20px", margin: 0, fontSize: ".85rem", color: "var(--forest-sage)", textAlign: "center" }}>
        Given through Zeffy, which charges the church no platform fees. Your full gift reaches the work.
        {" "}
        <a href={embedUrl} target="_blank" rel="noopener noreferrer">Open in a new tab</a> if the form
        above does not load.
      </p>
    </div>
  );
}
