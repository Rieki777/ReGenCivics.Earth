import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCoreSeo } from "./useCoreSeo";
import CoreImage from "./CoreImage";
import { isCoreAssetReady } from "./coreAssets";

function usd(cents: number, currency = "usd") {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });
}

/**
 * Stewards reconciliation view. Shows donations + recorded payouts and lets a
 * holder with the make-payments right record a payout (a ledger entry only;
 * it never moves money). Access is enforced server-side on every query and
 * mutation; this component just hides the UI from people who lack the rights.
 */
export default function Reconciliation() {
  useCoreSeo({
    title: "Reconciliation - CORE",
    description: "Church donations and payout ledger for the church's Stewards.",
    path: "/donate/reconciliation",
  });

  const roles = trpc.churchRoles.getMyChurchRoles.useQuery();
  const canAccept = roles.data?.canAcceptPayments === true;
  const canMake = roles.data?.canMakePayments === true;

  const recon = trpc.churchDonations.getReconciliation.useQuery(undefined, { enabled: canAccept });
  const utils = trpc.useUtils();
  const recordPayout = trpc.churchDonations.recordPayout.useMutation({
    onSuccess: () => {
      setAmount(""); setPurpose(""); setDest("");
      utils.churchDonations.getReconciliation.invalidate();
    },
  });

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dest, setDest] = useState("");

  if (roles.isLoading) {
    return (
      <section><div className="wrap"><p className="lead center">Loading...</p></div></section>
    );
  }

  if (!canAccept) {
    return (
      <section className="hero" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div className="wrap">
          <p className="eyebrow">Reconciliation</p>
          <h1>This page is for the church's Stewards</h1>
          <p className="lead center">
            Only Stewards with payment rights can view the ledger. If you are signed in and believe
            you should have access, reach out to the church.
          </p>
          <div className="btn-row"><Link href="/" className="btn btn-primary">Back to the church</Link></div>
        </div>
      </section>
    );
  }

  const t = recon.data?.totals;

  return (
    <>
      <section className={`hero${isCoreAssetReady("reconciliation-ledger-grove") ? " hero-image" : ""}`} style={{ padding: "64px 0 40px" }}>
        <div className="hero-media">
          <CoreImage id="reconciliation-ledger-grove" priority fallback={null} />
        </div>
        <div className="wrap">
          <p className="eyebrow">Reconciliation</p>
          <h1>The ledger, held in the open</h1>
          {t && (
            <p className="lead center">
              Received (succeeded): {usd(t.succeededCents)} &middot; Pending gifts: {t.pendingCount} &middot;
              Recorded payouts: {usd(t.payoutCents)}
            </p>
          )}
        </div>
      </section>

      {canMake && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap" style={{ maxWidth: 620 }}>
            <form
              className="card"
              onSubmit={(e) => {
                e.preventDefault();
                const cents = Math.round(parseFloat(amount) * 100);
                if (!cents || cents < 1 || !purpose.trim()) return;
                recordPayout.mutate({ amountCents: cents, purpose: purpose.trim(), destinationRef: dest.trim() || undefined });
              }}
            >
              <h3>Record a payout</h3>
              <p style={{ fontSize: ".9rem", color: "var(--forest-sage)" }}>
                This records intent and reconciliation only. It does not move money; the actual transfer
                is a human action through the church bank and Stripe balance.
              </p>
              <div className="custom-amount" style={{ marginBottom: 12 }}>
                <span aria-hidden="true">$</span>
                <input type="number" min="1" step="0.01" placeholder="Amount" aria-label="Payout amount in dollars" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <input
                type="text" placeholder="Purpose (required)" aria-label="Purpose" value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--core-radius)", border: "2px solid var(--parchment-soft)", marginBottom: 12, fontFamily: "var(--font-body)", fontSize: 16 }}
              />
              <input
                type="text" placeholder="Destination reference (optional)" aria-label="Destination reference" value={dest}
                onChange={(e) => setDest(e.target.value)}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--core-radius)", border: "2px solid var(--parchment-soft)", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 16 }}
              />
              <button className="btn btn-primary" type="submit" disabled={recordPayout.isPending}>
                {recordPayout.isPending ? "Recording..." : "Record payout"}
              </button>
              {recordPayout.error && <p role="alert" style={{ color: "var(--coral)" }}>{recordPayout.error.message}</p>}
            </form>
          </div>
        </section>
      )}

      <section style={{ paddingTop: canMake ? 40 : 0 }}>
        <div className="wrap">
          <h2 className="center">Donations</h2>
          <div className="facts" style={{ marginTop: 20 }}>
            {(recon.data?.donations ?? []).slice(0, 50).map((d) => (
              <div className="row" key={d.id}>
                <span className="k">{usd(d.amountCents, d.currency)} {d.giftInterval === "monthly" ? "/ mo" : ""}</span>
                <span className="v">
                  {d.provider === "zeffy" ? "Zeffy" : "Stripe"} · {d.status}{d.donorEmail ? ` · ${d.donorEmail}` : ""}
                </span>
              </div>
            ))}
            {(recon.data?.donations ?? []).length === 0 && <div className="row"><span className="v">No donations yet.</span></div>}
          </div>

          <h2 className="center" style={{ marginTop: 40 }}>Payouts</h2>
          <div className="facts" style={{ marginTop: 20 }}>
            {(recon.data?.payouts ?? []).slice(0, 50).map((p) => (
              <div className="row" key={p.id}>
                <span className="k">{usd(p.amountCents, p.currency)}</span>
                <span className="v">{p.purpose} · {p.status}</span>
              </div>
            ))}
            {(recon.data?.payouts ?? []).length === 0 && <div className="row"><span className="v">No payouts recorded yet.</span></div>}
          </div>
        </div>
      </section>
    </>
  );
}
