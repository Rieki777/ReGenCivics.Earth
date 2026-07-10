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
        the quest, verifies proofs, and awards the prize.
      </p>
    ),
  },
  {
    heading: "2. A skill contest, no purchase, no chance",
    body: (
      <p>
        This is a skill-based contest. Winners are decided by completing quest tasks and having those tasks verified, in
        the order they finish. No purchase is needed to enter or to win, and nothing about winning is left to chance.
        Buying anything gives no advantage.
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
        </ul>
      </>
    ),
  },
  {
    heading: "5. Dates",
    body: (
      <p>
        The quest opens at announcement and stays open until three finishers complete it. There is no hard end date. Once
        three people finish and are verified, the quest closes.
      </p>
    ),
  },
  {
    heading: "6. Ties and verification disputes",
    body: (
      <p>
        Finish order is set by admin verification timestamps. When a task is verified, that timestamp governs the finish
        order, and it settles any tie or dispute. If two entries appear close, the earlier verified timestamp wins. The
        church reviews every disputed proof and its decision is final.
      </p>
    ),
  },
  {
    heading: "7. The prize",
    body: (
      <p>
        The prize is one free 7-night voyage on the ReGen Ship. Approximate retail value, the anchor value, is about
        $4,200. The prize covers the voyage rental. Personal costs during the voyage, such as fuel, food, and travel to
        and from the ship, are the winner's own.
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
        description="Official contest rules for the ReGen Ship Maiden Voyage Quest. A skill contest, no purchase, no chance."
        url="/ship/quest/rules"
      />

      <ShipNavRow current="/ship/quest" />

      <ShipSection>
        <div className="aspect-[21/9] mb-8">
          <ShipImage
            name="ship-quest-banner.jpg"
            alt="A treasure map banner for the Maiden Voyage Quest."
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
