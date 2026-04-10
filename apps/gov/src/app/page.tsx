import { WelcomeModal } from "@/components/WelcomeModal";
import { AttentionInbox } from "@/components/AttentionInbox";
import { BioregionCard } from "@/components/BioregionCard";
import { MovementPulse } from "@/components/MovementPulse";

export default function HomePage() {
  return (
    <>
      <WelcomeModal />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Mobile: single column. Desktop: center + right sidebar. */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Center column */}
          <div className="flex-1 space-y-6">
            <AttentionInbox />
            <BioregionCard userBioregion={null} />
          </div>

          {/* Right sidebar (desktop only) */}
          <div className="lg:w-[320px] space-y-6">
            <MovementPulse />
          </div>
        </div>
      </div>
    </>
  );
}
