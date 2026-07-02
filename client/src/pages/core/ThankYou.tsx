import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCoreSeo } from "./useCoreSeo";

function useSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("session_id");
}

export default function ThankYou() {
  useCoreSeo({
    title: "Thank you - CORE",
    description: "Thank you for your gift to the Church of the Regenerative Earth.",
    path: "/donate/thank-you",
  });

  const sessionId = useSessionId();
  const status = trpc.churchDonations.getDonationStatus.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId, retry: 2 },
  );

  const amount = status.data
    ? (status.data.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: (status.data.currency || "usd").toUpperCase() })
    : null;
  const monthly = status.data?.giftInterval === "monthly";

  return (
    <section className="hero" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="wrap">
        <p className="eyebrow">Giving is worship</p>
        <h1>Thank you</h1>
        {amount ? (
          <p className="lead center">
            Your {monthly ? "monthly gift" : "gift"} of {amount} has been received. A receipt is on its
            way to your email. Your seed joins many others.
          </p>
        ) : (
          <p className="lead center">
            Your gift has been received, and a receipt is on its way to your email. Your seed joins many
            others.
          </p>
        )}
        <div className="btn-row">
          <a className="btn btn-primary" href="https://regencivics.earth">Come gather with us</a>
          <Link href="/" className="btn btn-ghost">Back to the church</Link>
        </div>
      </div>
    </section>
  );
}
