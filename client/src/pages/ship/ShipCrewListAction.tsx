/**
 * /ship/crew-list/confirm and /ship/crew-list/unsubscribe — the double-opt-in
 * landing pages for the crew list (SHIP_V5_FLYWHEEL §4). Reads ?token and calls
 * the matching mutation once, then shows a friendly in-world message.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ShipSection, ShipEyebrow } from "./shipShared";

export default function ShipCrewListAction({ mode }: { mode: "confirm" | "unsubscribe" }) {
  const confirm = trpc.ship.crewList.confirm.useMutation();
  const unsubscribe = trpc.ship.crewList.unsubscribe.useMutation();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) { setState("error"); return; }
    const run = mode === "confirm" ? confirm.mutateAsync({ token }) : unsubscribe.mutateAsync({ token });
    run.then(() => setState("done")).catch(() => setState("error"));
  }, [mode]);

  const copy = {
    confirm: {
      working: "Confirming your spot…",
      done: { title: "You're on the crew list.", body: "We'll send word the moment a matching week opens. Fair winds." },
      error: { title: "That link didn't work.", body: "It may have expired. Join again from the booking page and we'll send a fresh one." },
    },
    unsubscribe: {
      working: "Taking you off the list…",
      done: { title: "You're off the crew list.", body: "No more crew-list notes. You're always welcome back aboard." },
      error: { title: "We couldn't find that link.", body: "You may already be off the list. Nothing more to do." },
    },
  }[mode];

  return (
    <PageWrapper>
      <SEO title={mode === "confirm" ? "Confirm your crew list spot" : "Unsubscribe"} description="ReGen Ship crew list." url={`/ship/crew-list/${mode}`} />
      <ShipSection>
        <ShipEyebrow>The crew list</ShipEyebrow>
        {state === "working" ? (
          <p className="text-foreground/80">{copy.working}</p>
        ) : (
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold mb-2">{copy[state].title}</h1>
            <p className="text-foreground/80 mb-4">{copy[state].body}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/ship"><Button className="bg-[#2f5d3a] hover:bg-[#264a2f]">Back to the ship</Button></Link>
              <Link href="/ship/book"><Button variant="outline">See open weeks</Button></Link>
            </div>
          </div>
        )}
      </ShipSection>
    </PageWrapper>
  );
}
