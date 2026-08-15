import Link from "next/link";
import { GlassCard } from "./GlassCard";
import { TierBadge } from "./TierBadge";
import { CapitalFormChip } from "./CapitalFormChip";

interface Contributor {
  id: number;
  displayName: string;
  description?: string | null;
  whatsAlive?: string | null;
  finalTier?: string | null;
  suggestedTier?: string | null;
  formsOfCapital?: { form: string; example?: string }[];
  claimType?: string;
}

export function ContributorCard({ contributor }: { contributor: Contributor }) {
  const tier = contributor.finalTier ?? contributor.suggestedTier;
  const forms = Array.isArray(contributor.formsOfCapital) ? contributor.formsOfCapital : [];
  const excerpt = (contributor.description ?? "").split(/[.!?]/).slice(0, 2).join(". ").trim();
  return (
    <Link href={`/game/contributors/${contributor.id}`}>
      <GlassCard className="cursor-pointer h-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="text-white font-semibold">{contributor.displayName}</div>
            {contributor.claimType === "organization" && (
              <div className="text-white/60 text-xs">Organization</div>
            )}
          </div>
          {tier && <TierBadge tier={tier} />}
        </div>
        {excerpt && <p className="text-white/70 text-sm mb-3 line-clamp-3">{excerpt}</p>}
        {contributor.whatsAlive && (
          <p className="text-[#7dd87d]/85 text-xs italic mb-3 line-clamp-2">"{contributor.whatsAlive}"</p>
        )}
        {forms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {forms.slice(0, 5).map((f) => (
              <CapitalFormChip key={f.form} form={f.form} />
            ))}
          </div>
        )}
      </GlassCard>
    </Link>
  );
}
