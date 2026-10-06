/**
 * Map your Character Gifts.
 * The crowd pooling tool, on the Village OS character sheet.
 * /crowd-pooling, /crowdpool, and ?project= keep working.
 */

import { Link } from "wouter";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import CrowdPoolingTool from "@/components/CrowdPoolingTool";
import { CrowdpoolReadiness } from "@/components/CrowdpoolReadiness";
import ProfileCharacter from "@/components/character/ProfileCharacter";
import { GiftPoolDiagram, LockedMatch, PathChoices, QuestLine } from "@/components/character/GiftMapChrome";
export default function CrowdPooling() {
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
              <p className="sheet-quiet">
                <Link href="/campaigns" className="sheet-link">Browse land project campaigns</Link>
              </p>
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
              <div className="sheet-section sheet-island">
                <CrowdpoolReadiness id="ready" storageKey="page" />
              </div>
            </>
          }
        />
      </main>
    </div>
  );
}
