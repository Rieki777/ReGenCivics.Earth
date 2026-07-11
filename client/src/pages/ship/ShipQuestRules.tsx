/**
 * /ship/quest/rules - Official contest rules for the Maiden Voyage Quest.
 * Static content, no data calls. Plain-language summary, counsel review pending.
 */
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { ScrollText } from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";

const RULES: Array<{ heading: string; body: React.ReactNode }> = [
  {
    heading: "1. Sponsor",
    body: (
      <p>
        The Maiden Voyage Quest is sponsored and administered by the Church of the Regenerative Earth. The church runs
        the quest, verifies proofs, and holds the draws that award the free voyages.
      </p>
    ),
  },
  {
    heading: "2. How you enter, and how voyages are awarded",
    body: (
      <p>
        To enter the draw you complete the quest: a set of real regenerative actions that are verified. That part is
        skill, not chance, and no purchase is ever required. Among everyone who completes the quest, each free voyage is
        then awarded by a random draw. The quest is built to take at least a week to complete, so no one has to rush.
      </p>
    ),
  },
  {
    heading: "3. Eligibility",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>You must be 18 or older to enter.</li>
        <li>One entry per person. Duplicate or coordinated entries can be removed.</li>
        <li>Church staff and council members who administer the quest cannot win the prize.</li>
      </ul>
    ),
  },
  {
    heading: "4. Driving the ship",
    body: (
      <>
        <p className="mb-2">
          The prize is a voyage on a 40-foot coach. A winner who drives must meet the driver requirements below. A winner
          who cannot or does not want to drive may bring a qualified driver, or gift the winning slot to someone who
          meets the requirements.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Any driver must be 25 or older.</li>
          <li>Any driver must hold a valid, current driver license.</li>
          <li>The driver is verified by the platform before the voyage begins.</li>
          <li>The driver must be capable of driving a 40-foot vehicle on the route of your choosing.</li>
          <li>It is highly advisable to stay on the main roads and use the bikes to get around towns.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "5. Dates and draws",
    body: (
      <>
        <p className="mb-2">
          The quest opens at announcement and stays open through the first sailing year. You stay in the draw once you
          have completed it. The maiden voyage is drawn at launch. After that, one more free voyage is drawn for every
          20% of the first year that gets booked, up to six free voyages total at a fully booked year.
        </p>
        <p>
          Each draw is held among everyone who has completed the quest and has not already won. A crew can win once.
        </p>
      </>
    ),
  },
  {
    heading: "6. Ties, selection, and disputes",
    body: (
      <p>
        Every free voyage is selected at random from the crews who have completed the quest. Ties are settled at random,
        because selection is random to begin with. The church reviews every disputed proof, and its decision is final.
      </p>
    ),
  },
  {
    heading: "7. The prizes",
    body: (
      <p>
        Each prize is one free 7-night voyage on the ReGen Ship. Approximate retail value, the anchor value, is about
        $4,200 per voyage. Up to six voyages are given away in the first year, starting with the maiden voyage and
        adding one for every 20% of the year booked. A prize covers the voyage rental. Personal costs during the voyage,
        such as fuel, food, and travel to and from the ship, are the winner's own.
      </p>
    ),
  },
  {
    heading: "8. Fair play",
    body: (
      <p>
        The church may disqualify any entry with gamed, faked, or dishonest proofs. Quest tasks are meant to be done
        honestly. Proofs that are staged, copied, or manipulated are removed, and the entry with them.
      </p>
    ),
  },
];

export default function ShipQuestRules() {
  return (
    <PageWrapper>
      <SEO
        title="Maiden Voyage Quest Rules"
        description="Official rules for the ReGen Ship Maiden Voyage Quest. Complete the quest to enter the draw. Up to six free voyages, awarded at random as bookings grow."
        url="/ship/quest/rules"
      />

      <ShipNavRow current="/ship/quest" />

      <ShipSection>
        <div className="aspect-[21/9] mb-8">
          <ShipImage
            name="ship-art-arrival-welcome.webp"
            alt="Storybook painting of the ship arriving into a regenerative village, community waving and children running alongside orchards in golden evening light."
            className="h-full"
          />
        </div>
        <ShipEyebrow>Official rules</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
          Maiden Voyage Quest rules
        </h1>
        <p className="text-foreground/80 max-w-3xl">
          This is a plain-language summary of how the quest works, who can enter, and how the prize is awarded. Read it
          before you enter so the terms are clear.
        </p>
      </ShipSection>

      <ShipSection className="pt-0">
        <div className="space-y-8 max-w-3xl">
          {RULES.map((r) => (
            <div key={r.heading}>
              <h2 className="text-xl font-semibold mb-2">{r.heading}</h2>
              <div className="text-foreground/85 space-y-2">{r.body}</div>
            </div>
          ))}
        </div>
      </ShipSection>

      <ShipSection className="pt-0">
        <div className="max-w-3xl rounded-2xl border border-[#d4a574]/50 bg-[#d4a574]/10 p-5">
          <p className="text-sm text-foreground/80">
            <strong>Note.</strong> This is a plain-language summary. Final terms are reviewed by counsel before launch.
          </p>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
