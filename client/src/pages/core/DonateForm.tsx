import { useState } from "react";
import { trpc } from "@/lib/trpc";

const PRESETS_CENTS = [1500, 3000, 6000, 12000, 24000];

function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/**
 * The giving form. Amount presets, a custom amount, and a one-time / monthly
 * toggle. Calls churchDonations.createCheckoutSession and redirects to hosted
 * Stripe Checkout. Until Stripe is live on the server it shows a gentle
 * coming-soon state with the always-available ReGen Civics giving link.
 */
export default function DonateForm() {
  const enabledQuery = trpc.churchDonations.donationsEnabled.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const [selected, setSelected] = useState<number>(3000);
  const [custom, setCustom] = useState<string>("");
  const [interval, setInterval] = useState<"one_time" | "monthly">("one_time");
  const [error, setError] = useState<string | null>(null);

  const checkout = trpc.churchDonations.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
      else setError("Something went wrong opening the giving page. Please try again.");
    },
    onError: (err) => setError(err.message || "Something went wrong. Please try again."),
  });

  const customCents = custom.trim() ? Math.round(parseFloat(custom) * 100) : 0;
  const amountCents = customCents > 0 ? customCents : selected;
  const enabled = enabledQuery.data?.enabled === true;
  const busy = checkout.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amountCents || amountCents < 100) {
      setError("Please choose an amount of at least $1.");
      return;
    }
    checkout.mutate({ amountCents, interval });
  }

  if (enabledQuery.isLoading) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--forest-moss)" }}>Preparing the giving form...</p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <span className="coming">Coming soon</span>
        <h3>Giving opens here soon</h3>
        <p>
          We are preparing a way to give directly to the church. For now, you can give through our home
          at ReGen Civics, alongside the fund and the wider movement.
        </p>
        <a className="btn btn-primary" href="https://regencivics.earth">Give through ReGen Civics</a>
      </div>
    );
  }

  return (
    <form className="card" style={{ maxWidth: 520, margin: "0 auto" }} onSubmit={submit}>
      <h3 style={{ textAlign: "center" }}>Plant a seed</h3>

      <div className="interval-toggle" role="group" aria-label="Giving frequency" style={{ margin: "0 auto 20px", display: "flex", justifyContent: "center" }}>
        <button type="button" className={interval === "one_time" ? "active" : ""} onClick={() => setInterval("one_time")} aria-pressed={interval === "one_time"}>
          One time
        </button>
        <button type="button" className={interval === "monthly" ? "active" : ""} onClick={() => setInterval("monthly")} aria-pressed={interval === "monthly"}>
          Monthly
        </button>
      </div>

      <div className="amount-grid" role="group" aria-label="Amount">
        {PRESETS_CENTS.map((c) => (
          <button
            type="button"
            key={c}
            className={`amount-opt${customCents === 0 && selected === c ? " selected" : ""}`}
            onClick={() => { setSelected(c); setCustom(""); }}
            aria-pressed={customCents === 0 && selected === c}
          >
            {formatUsd(c)}
          </button>
        ))}
        <div className="custom-amount">
          <span aria-hidden="true">$</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            placeholder="Other"
            aria-label="Custom amount in dollars"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--coral)", marginTop: 16, marginBottom: 0 }}>{error}</p>
      )}

      <div className="center" style={{ marginTop: 22 }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Opening..." : interval === "monthly" ? `Give ${formatUsd(amountCents)} monthly` : `Give ${formatUsd(amountCents)}`}
        </button>
      </div>
      <p style={{ marginTop: 16, marginBottom: 0, fontSize: ".85rem", color: "var(--forest-sage)", textAlign: "center" }}>
        Secure giving through Stripe. The Church of the Regenerative Earth is a 508(c)(1)(a) faith ministry.
      </p>
    </form>
  );
}
