/**
 * /ship/guide - The voyage guide. Static, structured sections with placeholder
 * blocks for Rye's video walkthrough. No data calls.
 */
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { Video, Compass } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";

/** Empty-state slot for a captain's video walkthrough still to come. */
function WalkthroughPlaceholder() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[#4a7c59]/40 bg-[#4a7c59]/5 flex flex-col items-center justify-center text-center p-8">
      <Video className="w-8 h-8 text-[#4a7c59]/70 dark:text-[#7dd87d]/70 mb-2" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Captain's walkthrough coming aboard soon</p>
    </div>
  );
}

type Section = { id: string; title: string; body: React.ReactNode; walkthrough?: boolean };

const SECTIONS: Section[] = [
  {
    id: "before-you-arrive",
    title: "Before you arrive",
    walkthrough: true,
    body: (
      <>
        <p>
          Pack light and pack clean. The ship stocks her own soaps, cleaning materials, linens, towels, and cookware, so
          you can leave most of that at home. Bring your clothes, your food plan, and an open week.
        </p>
        <p>
          Read the water doctrine below before you pack a single toiletry. It shapes what you can and can't bring aboard.
        </p>
      </>
    ),
  },
  {
    id: "orientation",
    title: "The two-hour orientation",
    walkthrough: true,
    body: (
      <p>
        Every first-time crew starts with a two-hour orientation with the Ship Keeper. You'll walk the whole ship, learn
        her systems hands-on, and cover the water doctrine, driving, and turnover. Nothing here is hard. The orientation
        is how it becomes second nature before you pull away.
      </p>
    ),
  },
  {
    id: "driving",
    title: "Driving the 40-foot ship",
    walkthrough: true,
    body: (
      <>
        <p>
          She's 40 feet with three slide-outs. Driving her is calm once you respect her size: wide turns, slow into
          camp, and eyes on your mirrors and clearances. Your driver must be 25 or older, hold a valid license, and be
          verified before the voyage.
        </p>
        <p>The orientation covers setup and breakdown of the slide-outs, leveling, and hitching the tow gear.</p>
      </>
    ),
  },
  {
    id: "spring-water",
    title: "Spring water collection",
    walkthrough: true,
    body: (
      <p>
        The ship carries an intake pump that fills your tanks straight from a living spring up to 50 feet away. Your
        treasure map marks springs along the route. The orientation shows you how to run the pump, keep the intake
        clean, and top off your tanks so you can sail off-grid for days.
      </p>
    ),
  },
  {
    id: "water-doctrine",
    title: "The water doctrine",
    walkthrough: true,
    body: (
      <>
        <p>
          The ship drinks from living springs and her greywater returns to living land. That means what goes down her
          drains matters more than almost anything else aboard. The doctrine is simple and firm:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use only the soaps and cleaning materials that are aboard. They're chosen to be safe for spring water and soil.</li>
          <li>Bring no chemical body products. No conventional shampoo, soap, lotion, sunscreen, or perfume.</li>
          <li>Inputs stay vegan-diet-only. What you cook and wash aboard follows that line.</li>
          <li>No chemical cleaners and no toxins of any kind come aboard.</li>
        </ul>
        <p>
          Every part of this keeps the springs drinkable and the land downstream healthy for the next crew.
        </p>
      </>
    ),
  },
  {
    id: "seed-chest",
    title: "The seed chest and the healing hole",
    walkthrough: true,
    body: (
      <>
        <p>
          Aboard is a chest of seeds chosen to turn pine plantations back into food forests. Everywhere you go, you
          plant. Eat local fruit, save the seeds, and add them to the chest.
        </p>
        <p>
          When you sail home to her anchorage, plant your harvest in the healing hole and watch a food forest grow from
          every crew that ever sailed. The chest is a relay. You receive it full and you leave it fuller.
        </p>
      </>
    ),
  },
  {
    id: "log-passport",
    title: "Your log and passport",
    walkthrough: true,
    body: (
      <p>
        Keep a daily log as you sail: where you landed, what you planted, what you saw. Collect passport stamps at the
        springs, waterfalls, food forests, and land projects along your map. Your log posts to the public voyage log and
        becomes part of the fleet's ongoing story.
      </p>
    ),
  },
  {
    id: "turnover",
    title: "Turnover and reset",
    walkthrough: true,
    body: (
      <p>
        At the end of your voyage you hand the ship back the way you'd want to receive her. The Ship Keeper handles the
        deep clean and full reset, and your job is to leave her tidy, empty of your food, and honest about anything that
        needs a look. Add your seeds to the chest, file your log, and pass her on.
      </p>
    ),
  },
];

export default function ShipGuide() {
  return (
    <PageWrapper>
      <SEO
        title="The Voyage Guide"
        description="How to prepare for, drive, and care for the ReGen Ship: orientation, the water doctrine, spring water, the seed chest, and turnover."
        url="/ship/guide"
      />

      <ShipNavRow />

      <ShipSection>
        <ShipEyebrow>The voyage guide</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
          <Compass className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
          Everything you need to sail her well
        </h1>
        <div className="max-w-3xl rounded-2xl border border-[#d4a574]/50 bg-[#d4a574]/10 p-5">
          <p className="text-sm text-foreground/80">
            The full video walkthrough and article are coming. Below is the written guide. Each section will grow a
            captain's walkthrough video as we film them.
          </p>
        </div>
      </ShipSection>

      <ShipSection className="pt-0">
        <div className="space-y-12 max-w-3xl">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="text-2xl font-bold mb-3">{s.title}</h2>
              <div className="text-foreground/85 space-y-3">{s.body}</div>
              {s.walkthrough ? <WalkthroughPlaceholder /> : null}
            </section>
          ))}
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
