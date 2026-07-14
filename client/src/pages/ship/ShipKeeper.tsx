/**
 * /ship/keeper - The Ship Keeper role: cleaning, turnover, upkeep, and running
 * the two-hour orientation for every first-time crew. Flat pay per turnover.
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
import { Sparkles, ClipboardCheck, Wrench, Coins } from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";

const DUTIES = [
  { icon: Sparkles, title: "Clean and turn over", body: "Between voyages you clean the ship top to bottom and get her ready for the next crew: linens, galley, baths, tanks, and a full reset." },
  { icon: ClipboardCheck, title: "Run the orientation", body: "You run the two-hour orientation with every first-time crew, walking them through the ship, the systems, and the water doctrine before they sail." },
  { icon: Wrench, title: "Keep her shipshape", body: "You handle upkeep and flag anything that needs a repair, so small things get caught before they become big ones." },
  { icon: Coins, title: "Flat pay", body: "Two hundred dollars flat per turnover. Clear and simple, paid for the work each time you do it." },
];

export default function ShipKeeper() {
  const m = trpc.ship.applyKeeper.useMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setLocation("");
    setExperience("");
    setAvailability("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Please add your name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please add an email so we can reach you.");
      return;
    }
    try {
      await m.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        location: location.trim() || undefined,
        experience: experience.trim() || undefined,
        availability: availability.trim() || undefined,
      });
      toast.success("Application received. We'll be in touch.");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <PageWrapper>
      <SEO
        title="Become a Ship Keeper"
        description="Clean, turn over, and run the orientation for the ReGen Ship. Flat pay per turnover."
        url="/ship/keeper"
      />

      <ShipNavRow />

      <ShipSection>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <ShipEyebrow>A paid role</ShipEyebrow>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Become a Ship Keeper</h1>
            <p className="text-foreground/85 mb-3">
              The Ship Keeper is the person who keeps the ship ready to sail. You clean, you do turnover, you handle
              upkeep, and you run the two-hour orientation with every first-time crew so they leave the dock knowing the
              ship.
            </p>
            <p className="text-foreground/85">
              It's flat pay, two hundred dollars per turnover, for someone who's careful, reliable, and glad to hand each
              crew a clean, well-kept ship.
            </p>
            <p className="mt-3">
              <a href="/blog/keeper-of-the-fleet" className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4">Read the full role: The Keeper of the Fleet <span aria-hidden="true">→</span></a>
            </p>
          </div>
          <div className="aspect-[4/3]">
            <ShipImage name="ship-keeper.jpg" alt="A Ship Keeper preparing the coach between voyages." className="h-full" />
          </div>
        </div>
      </ShipSection>

      <ShipSection className="bg-[#4a7c59]/8 pt-14">
        <ShipEyebrow>What the role holds</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-8">The work</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {DUTIES.map((d) => (
            <div key={d.title} className="flex gap-4">
              <d.icon className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-lg mb-1">{d.title}</h3>
                <p className="text-foreground/80">{d.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ShipSection>

      <ShipSection>
        <ShipEyebrow>Apply</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">Tell us about you</h2>
        <form onSubmit={onSubmit} className="max-w-xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
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
            <Label htmlFor="location">Where are you based? (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, region"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Relevant experience (optional)</Label>
            <Textarea
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Cleaning, hospitality, RV systems, hosting, anything that fits."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability">Your availability (optional)</Label>
            <Textarea
              id="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="Which days work, how much notice you need, how far you can travel."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={m.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
            {m.isPending ? "Sending..." : "Apply to keep the ship"}
          </Button>
        </form>
      </ShipSection>
    </PageWrapper>
  );
}
