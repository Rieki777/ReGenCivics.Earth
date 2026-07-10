/**
 * /ship/winter - Winter Anchorage. Off-season, the ship becomes stationary
 * sanctuary housing at a host land project. Hard freeze-protection requirement,
 * income share for the host.
 */
import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Snowflake, Home, HandCoins, AlertTriangle } from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";

export default function ShipWinter() {
  const m = trpc.ship.applyWinterHost.useMutation();

  const [projectName, setProjectName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [powerHookup, setPowerHookup] = useState(false);
  const [freezeProtectionPlan, setFreezeProtectionPlan] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [proposedShare, setProposedShare] = useState("");

  function resetForm() {
    setProjectName("");
    setContactName("");
    setEmail("");
    setLocation("");
    setPowerHookup(false);
    setFreezeProtectionPlan("");
    setSiteDescription("");
    setProposedShare("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (projectName.trim().length < 2) {
      toast.error("Please add your land project's name.");
      return;
    }
    if (contactName.trim().length < 2) {
      toast.error("Please add a contact name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please add an email so we can reach you.");
      return;
    }
    try {
      await m.mutateAsync({
        projectName: projectName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        location: location.trim() || undefined,
        powerHookup,
        freezeProtectionPlan: freezeProtectionPlan.trim() || undefined,
        siteDescription: siteDescription.trim() || undefined,
        proposedShare: proposedShare.trim() || undefined,
      });
      toast.success("Application received. We'll talk through your site with you.");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <PageWrapper>
      <SEO
        title="Winter Anchorage"
        description="Off-season, the ReGen Ship becomes stationary sanctuary housing at a host land project. Host it, earn a share."
        url="/ship/winter"
      />

      <ShipNavRow />

      <ShipSection>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <ShipEyebrow>The off-season</ShipEyebrow>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
              <Snowflake className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
              Winter Anchorage
            </h1>
            <p className="text-foreground/85 mb-3">
              When the voyages stop for the season, the ship doesn't have to sit idle. She becomes a stationary
              sanctuary, extra housing parked at a host land project through the cold months.
            </p>
            <p className="text-foreground/85">
              The host gets more room to house people. The ship earns through the dead months instead of costing them.
              Everyone's warmer for it.
            </p>
          </div>
          <div className="aspect-[4/3]">
            <ShipImage
              name="ship-winter-anchorage.jpg"
              alt="The ship anchored for winter at a snowy land project."
              className="h-full"
            />
          </div>
        </div>
      </ShipSection>

      {/* The freeze requirement, stated prominently */}
      <ShipSection className="pt-0">
        <div className="rounded-2xl border-2 border-[#d4a574] bg-[#d4a574]/12 p-6">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-[#b8862f] shrink-0" aria-hidden="true" />
            The freeze requirement, first
          </h2>
          <p className="text-foreground/85 mb-3">
            This one is not negotiable. The ship must never sit below freezing for more than 30 to 60 minutes. Her wet
            bay, plumbing, and tanks are the vital components, and a hard freeze can crack them.
          </p>
          <p className="text-foreground/85">
            To host her through winter you must provide one of two things: heated or sheltered parking, or reliable
            powered heaters that keep the vital components above freezing. Either way, you need a plan for what happens if
            the power fails. If you can't guarantee that, this isn't the right fit, and that's alright.
          </p>
        </div>
      </ShipSection>

      {/* Income share */}
      <ShipSection className="bg-[#4a7c59]/8 pt-14">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <Home className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-lg mb-1">Extra housing for your project</h3>
              <p className="text-foreground/80">
                Through the off-season the ship is a warm, well-built place to house someone: a caretaker, a resident, a
                guest, whoever your project needs sheltered.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <HandCoins className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-lg mb-1">An income share for hosting</h3>
              <p className="text-foreground/80">
                The host receives a share of winter residency revenue. A suggested starting point is 20 to 30 percent.
                The church council sets the exact share per agreement with each host.
              </p>
            </div>
          </div>
        </div>
      </ShipSection>

      {/* Application */}
      <ShipSection>
        <ShipEyebrow>Host the ship</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">Apply to be a winter host</h2>
        <form onSubmit={onSubmit} className="max-w-xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="projectName">Land project name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="The name of your project"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input
              id="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name"
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
            <Label htmlFor="location">Where is the site? (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, region"
            />
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="powerHookup"
              checked={powerHookup}
              onCheckedChange={(v) => setPowerHookup(Boolean(v))}
            />
            <Label htmlFor="powerHookup" className="font-normal leading-snug">
              We can provide a power hookup
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="freezeProtectionPlan">Your freeze-protection plan (optional)</Label>
            <Textarea
              id="freezeProtectionPlan"
              value={freezeProtectionPlan}
              onChange={(e) => setFreezeProtectionPlan(e.target.value)}
              placeholder="How you keep the wet bay, plumbing, and tanks above freezing, and what happens if the power fails."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteDescription">Describe the site (optional)</Label>
            <Textarea
              id="siteDescription"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="The parking spot, shelter, access, and who might live aboard."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposedShare">Proposed income share (optional)</Label>
            <Input
              id="proposedShare"
              value={proposedShare}
              onChange={(e) => setProposedShare(e.target.value)}
              placeholder="e.g. 25%"
            />
          </div>

          <Button type="submit" disabled={m.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
            {m.isPending ? "Sending..." : "Apply to host"}
          </Button>
        </form>
      </ShipSection>
    </PageWrapper>
  );
}
