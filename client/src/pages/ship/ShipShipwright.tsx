/**
 * /ship/shipwright - Ask the Shipwright on its own page, for anyone signed in
 * (SHIP_UNIFIED_GAME_PLAN.md decision 12). Pirates reach it from their village,
 * renters still find it in the Captain's Book.
 *
 * ship.shipwright.ask is a protectedProcedure that already checks case
 * ownership, so this page only adds the sign-in gate. Asking while signed out
 * would trip the global login redirect, so the box only mounts once signed in.
 */
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { AskShipwright } from "@/components/ship/AskShipwright";
import { ShipEyebrow, ShipNavRow, ShipSection } from "./shipShared";

export default function ShipShipwright() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <PageWrapper>
      <SEO
        title="Ask the Shipwright"
        description="Repair and running help for the ReGen Ship, grounded in her manuals and the tools aboard."
        url="/ship/shipwright"
      />

      <ShipNavRow current="/ship/shipwright" />

      <ShipSection>
        <ShipEyebrow>The ship's helper</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Ask the Shipwright</h1>
        <p className="text-foreground/85 mb-2 max-w-2xl">
          Slides, jacks, water, power, Starlink: ask how anything aboard works or what to do when it doesn't. The
          Shipwright knows her manuals and every tool she carries.
        </p>
        <p className="text-foreground/75 mb-8 max-w-2xl text-sm">
          See what she carries in the <Link href="/ship/inventory" className="underline underline-offset-2">ship's inventory</Link>.
        </p>

        {loading ? null : isAuthenticated ? (
          <div className="max-w-3xl"><AskShipwright /></div>
        ) : (
          <div className="max-w-xl rounded-2xl ring-1 ring-black/10 p-6">
            <p className="text-foreground/85 mb-4">Sign in to ask. Your questions stay with your account so you can pick a case back up.</p>
            <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]">
              <a href={getLoginUrl("/ship/shipwright")}>Sign in</a>
            </Button>
          </div>
        )}
      </ShipSection>
    </PageWrapper>
  );
}
