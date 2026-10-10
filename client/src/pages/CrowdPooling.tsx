/**
 * Map your Character Gifts.
 * The crowd pooling tool, on the Village OS character sheet.
 * /crowd-pooling, /crowdpool, and ?project= keep working.
 *
 * A contributor's page (build spec 2026-10-01, section 16): how helping a
 * land project works sits under the lede, and the Ready to crowdpool list
 * lives on the creator front door at READINESS_HREF, with one quiet line here
 * for a land project that wandered in.
 */

import { useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import CrowdPoolingTool from "@/components/CrowdPoolingTool";
import ProfileCharacter from "@/components/character/ProfileCharacter";
import {
  GiftPoolDiagram,
  HowHelpingWorks,
  LockedMatch,
  PathChoices,
  ProjectLine,
  QuestLine,
} from "@/components/character/GiftMapChrome";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";

export default function CrowdPooling() {
  // Old #ready links to this page forward to READINESS_HREF (links already
  // sent in emails). A hash never reaches the server, so the forward runs
  // here; replace, so Back never returns to the old address.
  const [, navigate] = useLocation();
  const forward = typeof window !== "undefined" && window.location.hash === "#ready";
  useLayoutEffect(() => {
    if (forward) navigate(READINESS_HREF, { replace: true });
  }, [forward, navigate]);
  if (forward) return null;

  return (
    <div className="sheet-night min-h-screen">
      <SEO
        {...pageSEO.crowdPooling}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Crowd Pooling", url: "/crowd-pooling" }]}
      />
      <main className="container max-w-3xl py-6 md:py-10">
        <BackButton />
        <CrowdPoolingTool
          embedded
          aboveRecord={(ctx) => (
            <>
              <p className="sheet-kicker">Crowd pooling</p>
              <h1 className="sheet-display sheet-h1">Map your Character Gifts</h1>
              <p className="sheet-lede">
                Name the gifts you bring, and see them sit on your character sheet.
              </p>
              <HowHelpingWorks />
              <PathChoices path={ctx.path} onChange={ctx.setPath} />
              <GiftPoolDiagram />
              <QuestLine />
              <div className="sheet-section">
                <ProfileCharacter standing={{
                  brings: ctx.snap.brings,
                  gifts: ctx.snap.gifts,
                  roles: ctx.snap.roles,
                }} />
              </div>
            </>
          )}
          belowForm={
            <>
              <LockedMatch />
              <ProjectLine />
            </>
          }
        />
      </main>
    </div>
  );
}
