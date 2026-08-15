/**
 * /ship/fleet - The ReGen Fleet vision, the RV DAO / token model, the Regatta,
 * and the "raise your flag" application for RV owners to join.
 *
 * Raise-your-flag is conversation-first: the Flagkeeper (a FormCompanion
 * persona) draws out the owner's story, why regeneration matters to them,
 * their vision for the fleet, what they'd give and what they hope to receive,
 * and streams it into the visible form below. She never submits; the person
 * reviews and raises the flag themselves. The plain form stays as the typed
 * path and the no-LLM fallback.
 */
import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Anchor, Coins, Flag, Sprout, Tent, HandCoins } from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";
import FormCompanion from "@/components/companion/FormCompanion";

type Turn = { role: "user" | "assistant"; content: string };

export default function ShipFleet() {
  const m = trpc.ship.applyFleet.useMutation();

  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [rvYearMakeModel, setRvYearMakeModel] = useState("");
  const [location, setLocation] = useState("");
  const [whyRegeneration, setWhyRegeneration] = useState("");
  const [fleetVision, setFleetVision] = useState("");
  const [offersText, setOffersText] = useState("");
  const [needsText, setNeedsText] = useState("");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState<Turn[]>([]);

  const setters: Record<string, (v: string) => void> = {
    ownerName: setOwnerName,
    email: setEmail,
    rvYearMakeModel: setRvYearMakeModel,
    location: setLocation,
    whyRegeneration: setWhyRegeneration,
    fleetVision: setFleetVision,
    offersText: setOffersText,
    needsText: setNeedsText,
    message: setMessage,
  };

  function resetForm() {
    setOwnerName("");
    setEmail("");
    setRvYearMakeModel("");
    setLocation("");
    setWhyRegeneration("");
    setFleetVision("");
    setOffersText("");
    setNeedsText("");
    setMessage("");
    setTranscript([]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ownerName.trim().length < 2) {
      toast.error("Please add your name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please add an email so we can reach you.");
      return;
    }
    try {
      await m.mutateAsync({
        ownerName: ownerName.trim(),
        email: email.trim(),
        rvYearMakeModel: rvYearMakeModel.trim() || undefined,
        location: location.trim() || undefined,
        whyRegeneration: whyRegeneration.trim() || undefined,
        fleetVision: fleetVision.trim() || undefined,
        offersText: offersText.trim() || undefined,
        needsText: needsText.trim() || undefined,
        message: message.trim() || undefined,
        companionTranscript: transcript.length > 0 ? JSON.stringify(transcript).slice(0, 60_000) : undefined,
      });
      toast.success("Flag raised. We'll be in touch about the fleet.");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <PageWrapper>
      <SEO
        title="The ReGen Fleet"
        description="A traveling festival of ships that moves from land project to land project, building homes, planting food forests, and healing waterways."
        url="/ship/fleet"
      />

      <ShipNavRow current="/ship/fleet" />

      {/* The vision */}
      <ShipSection>
        <ShipEyebrow>The fleet</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-6">A traveling festival that heals the land it visits</h1>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div data-reveal="left" className="space-y-4 text-foreground/85">
            <p>
              Picture where we want this to go. A caravan of ships that moves from land project to land project, and
              where it lands, it builds natural homes, plants food forests, heals waterways, and turns pine plantations
              back into the abundance they once were.
            </p>
            <p>
              Imagine the music festivals, the dances, the campfires, and all the other ways it brings community and
              love together. Then it packs up, moves on, and does it again at the next project down the road.
            </p>
            <p>
              The model draws from the large RV caravans that travel New Zealand together, a rolling community that
              shows up, sets up, and shares a place for a while. We want to point that same spirit at regeneration and
              at the beauty we can bring while living our best lives.
            </p>
          </div>
          <div data-reveal="right" className="aspect-[4/3]">
            <ShipImage
              name="ship-fleet-caravan.jpg"
              alt="A caravan of ships parked together at a land project."
              className="h-full"
            />
          </div>
        </div>
      </ShipSection>

      {/* The RV DAO / token model */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>How the fleet owns itself</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">The RV DAO and the token model</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div data-reveal className="flex flex-col gap-2">
            <Anchor className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
            <h3 className="font-semibold text-lg">One DAO per ship</h3>
            <p className="text-foreground/80">
              Each ship has its own DAO that reflects total ownership of the asset. The DAO is the ship, held in common
              by the people who sail her and fund her.
            </p>
          </div>
          <div data-reveal data-reveal-delay="60" className="flex flex-col gap-2">
            <Coins className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
            <h3 className="font-semibold text-lg">10% of every voyage</h3>
            <p className="text-foreground/80">
              Ten percent of every voyage buys RV tokens. Those tokens are fractional shares that buy the asset into
              community ownership over time, voyage by voyage.
            </p>
          </div>
          <div data-reveal data-reveal-delay="120" className="flex flex-col gap-2">
            <Sprout className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
            <h3 className="font-semibold text-lg">A model that replicates</h3>
            <p className="text-foreground/80">
              The same structure repeats for every future ship. Each one funds its own path into community hands, so the
              fleet grows without leaving ownership behind.
            </p>
          </div>
          <div data-reveal data-reveal-delay="180" className="flex flex-col gap-2">
            <HandCoins className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
            <h3 className="font-semibold text-lg">The owner, made whole</h3>
            <p className="text-foreground/80">
              As a ship joins the fleet, that 10% buys out the owner and existing token holders through open purchases
              on the open market. The owner is the dominant token holder, so the owner effectively sets the market
              rate. Community ownership grows by buying in at a fair price, voyage by voyage.
            </p>
          </div>
        </div>
      </ShipSection>

      {/* The Regatta */}
      <ShipSection>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div data-reveal="left" className="aspect-[4/3] order-last md:order-first overflow-hidden rounded-2xl group">
            <ShipImage
              name="ship-regatta.jpg"
              alt="Ships and people gathered at a land project for a fleet festival."
              className="h-full transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div data-reveal="right">
            <ShipEyebrow>Looking ahead</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <Tent className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
              The Regatta, name to come
            </h2>
            <p className="text-foreground/85">
              One day, when the fleet is large enough, the whole fleet will gather at one land project for a yearly
              festival. We will name it together and co-create it together. It will be hosted at a land project to
              substantially grow that community and its capabilities: a homecoming, a work party, and a celebration all
              at once. We will be in touch as it takes shape.
            </p>
          </div>
        </div>
      </ShipSection>

      {/* Raise your flag */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>Own an RV?</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Flag className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
          Raise your flag
        </h2>
        <p className="max-w-2xl text-foreground/85 mb-8">
          If you own an RV and want to travel with the fleet, this is your invitation. The Flagkeeper sews a flag for
          every ship that joins, and she likes to hear the story behind it first. Talk it out with her, or fill in the
          form below, and we'll be in touch.
        </p>

        <FormCompanion
          formId="fleet-application"
          className="max-w-xl"
          collected={{
            ownerName,
            email,
            rvYearMakeModel,
            location,
            whyRegeneration,
            fleetVision,
            offersText,
            needsText,
            message,
          }}
          onField={(key, value) => setters[key]?.(value)}
          onTranscript={setTranscript}
        />

        <form onSubmit={onSubmit} className="max-w-xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ownerName">Your name</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rvYearMakeModel">Your RV, year, make, and model (optional)</Label>
            <Input
              id="rvYearMakeModel"
              value={rvYearMakeModel}
              onChange={(e) => setRvYearMakeModel(e.target.value)}
              placeholder="2006 Fleetwood Revolution LE"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Where are you based? (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, region"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyRegeneration">Why does the regeneration movement matter to you?</Label>
            <Textarea
              id="whyRegeneration"
              value={whyRegeneration}
              onChange={(e) => setWhyRegeneration(e.target.value)}
              placeholder="What first pulled you toward this work?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fleetVision">What do you see yourself and your ship doing with the fleet?</Label>
            <Textarea
              id="fleetVision"
              value={fleetVision}
              onChange={(e) => setFleetVision(e.target.value)}
              placeholder="Paint us the picture: the places, the work, the life aboard."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offersText">What would you want to give? (optional)</Label>
            <Textarea
              id="offersText"
              value={offersText}
              onChange={(e) => setOffersText(e.target.value)}
              placeholder="Skills, builds, hosting, teaching, the ship herself."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="needsText">What do you hope to receive? (optional)</Label>
            <Textarea
              id="needsText"
              value={needsText}
              onChange={(e) => setNeedsText(e.target.value)}
              placeholder="Community, purpose, income from voyages. Honest answers help us place you well."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Anything else? (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what draws you to the fleet."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={m.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
            {m.isPending ? "Raising..." : "Raise your flag"}
          </Button>
        </form>
      </ShipSection>
    </PageWrapper>
  );
}
