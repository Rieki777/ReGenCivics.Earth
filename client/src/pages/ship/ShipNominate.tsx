/**
 * /ship/nominate - Nominate someone (or yourself) for a bonus crew slot.
 * The church council selects one nominee to join a voyage as a resource
 * for the bioregion they tour.
 */
import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";
import { ShipField, ShipCheckField } from "@/components/ship/ShipFields";

/**
 * The nomination form. It owns the answers, so a keystroke re-renders this
 * form (and only the field typed in), not the page.
 */
function NominationForm() {
  const m = trpc.ship.nominate.useMutation();

  const [nomineeName, setNomineeName] = useState("");
  const [nomineeContact, setNomineeContact] = useState("");
  const [reason, setReason] = useState("");
  const [isSelfNomination, setIsSelfNomination] = useState(false);

  function resetForm() {
    setNomineeName("");
    setNomineeContact("");
    setReason("");
    setIsSelfNomination(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nomineeName.trim().length < 2) {
      toast.error("Please add the name of the person you're nominating.");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Please tell us a little more about why (at least 10 characters).");
      return;
    }
    try {
      await m.mutateAsync({
        nomineeName: nomineeName.trim(),
        nomineeContact: nomineeContact.trim() || undefined,
        reason: reason.trim(),
        isSelfNomination,
      });
      toast.success("Nomination received. The council reads every one.");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6">
      <ShipField id="nomineeName" label="Who are you nominating?" value={nomineeName} onValue={setNomineeName} placeholder="Full name" required />
      <ShipField
        id="nomineeContact"
        label="How can we reach them? (optional)"
        value={nomineeContact}
        onValue={setNomineeContact}
        placeholder="Email, phone, or a link"
      />
      <ShipField
        id="reason"
        label="Why them?"
        value={reason}
        onValue={setReason}
        placeholder="What would they bring to the crew and the land they tour?"
        rows={5}
        required
        hint="A few sentences is plenty."
      />
      <ShipCheckField id="isSelfNomination" label="This is a self-nomination" checked={isSelfNomination} onChecked={setIsSelfNomination} />

      <Button type="submit" disabled={m.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
        {m.isPending ? "Sending..." : "Send nomination"}
      </Button>
    </form>
  );
}

export default function ShipNominate() {
  return (
    <PageWrapper>
      <SEO
        title="Nominate a crew member"
        description="Nominate someone, or yourself, for a bonus crew slot on a ReGen Ship voyage."
        url="/ship/nominate"
      />

      <ShipNavRow />

      <ShipSection>
        <ShipEyebrow>A bonus crew slot</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
          Nominate a crew member
        </h1>
        <div className="max-w-3xl space-y-4 text-foreground/85">
          <p>
            Anyone can nominate anyone, including themselves. We're looking for people who would be a real resource
            touring a bioregion: builders, mediators, food forest designers, storytellers, the folks whose hands and
            stories make a place better while they pass through.
          </p>
          <p>
            If you're nominated and approved by the ReGen Civics and CORE teams, you're in the draw, no quest required.
            Tell us who they are and why they'd add something to the land and the crew.
          </p>
        </div>
      </ShipSection>

      <ShipSection className="pt-0">
        <NominationForm />
      </ShipSection>
    </PageWrapper>
  );
}
