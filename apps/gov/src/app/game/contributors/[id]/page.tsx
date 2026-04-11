"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { TierBadge } from "@/components/TierBadge";
import { CapitalFormChip } from "@/components/CapitalFormChip";
import { fetchFromMainSite } from "@/lib/api";

export default function ContributorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [contributor, setContributor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchFromMainSite<any>("claims.getContributor", { id })
      .then((c) => setContributor(c))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-white/55 text-sm">Loading...</div>;
  if (!contributor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <GlassCard className="text-center py-12 text-white/65">Contributor not found.</GlassCard>
      </div>
    );
  }

  const forms = Array.isArray(contributor.formsOfCapital) ? contributor.formsOfCapital : [];
  const outputs = Array.isArray(contributor.tangibleOutputs) ? contributor.tangibleOutputs : [];
  const evidence = Array.isArray(contributor.evidenceLinks) ? contributor.evidenceLinks : [];
  const tools = Array.isArray(contributor.tools) ? contributor.tools : [];
  const tier = contributor.finalTier ?? contributor.suggestedTier;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5">
      <Link href="/game/contributors" className="inline-flex items-center gap-1.5 text-white/55 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> All contributors
      </Link>

      <GlassCard className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{contributor.displayName}</h1>
            {contributor.claimType === "organization" && <div className="text-white/55 text-xs">Organization</div>}
          </div>
          {tier && <TierBadge tier={tier} />}
        </div>
        {contributor.orgDescription && <p className="text-white/70 text-sm mb-4">{contributor.orgDescription}</p>}
        {contributor.whatsAlive && (
          <div className="rounded-xl border border-[#7dd87d]/25 bg-[#7dd87d]/5 p-4 mb-4">
            <div className="text-[#7dd87d] text-xs uppercase tracking-wide mb-1">What I'm bringing forward</div>
            <p className="text-white/85 text-sm italic">"{contributor.whatsAlive}"</p>
          </div>
        )}
        {contributor.description && (
          <div className="mb-4">
            <h2 className="text-white font-semibold text-sm mb-2">The story</h2>
            <p className="text-white/75 text-sm whitespace-pre-wrap">{contributor.description}</p>
          </div>
        )}
      </GlassCard>

      {forms.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-white font-semibold mb-3">Forms of capital</h2>
          <div className="space-y-2">
            {forms.map((f: any) => (
              <div key={f.form} className="flex items-start gap-3">
                <CapitalFormChip form={f.form} />
                {f.example && <div className="text-white/70 text-sm">{f.example}</div>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {(tools.length > 0 || outputs.length > 0) && (
        <GlassCard className="p-6">
          <h2 className="text-white font-semibold mb-3">Tools and outputs</h2>
          <div className="space-y-3">
            {(tools.length > 0 ? tools : outputs).map((t: any, i: number) => (
              <div key={i} className="border-l-2 border-[#7dd87d]/40 pl-3">
                <div className="text-white font-semibold text-sm">{t.toolName ?? t.name}</div>
                <div className="text-white/65 text-xs">{t.toolDescription ?? t.description}</div>
                {t.accessLink && (
                  <a href={t.accessLink} target="_blank" rel="noreferrer" className="text-[#7dd87d] text-xs inline-flex items-center gap-1 mt-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {evidence.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-white font-semibold mb-3">Links</h2>
          <ul className="space-y-1.5">
            {evidence.map((link: string, i: number) => (
              <li key={i}>
                <a href={link} target="_blank" rel="noreferrer" className="text-[#7dd87d] text-sm hover:underline inline-flex items-center gap-1">
                  {link} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
