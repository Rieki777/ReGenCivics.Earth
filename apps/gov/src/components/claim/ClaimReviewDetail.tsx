"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { TierBadge } from "@/components/TierBadge";
import { CapitalFormChip } from "@/components/CapitalFormChip";
import { fetchFromMainSite } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { individualTiers, orgTiers } from "@/lib/tierConfig";

export function ClaimReviewDetail({ id }: { id: number }) {
  const { getAccessToken } = useAuth();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<"confirmed" | "adjusted" | "flagged">("confirmed");
  const [note, setNote] = useState("");
  const [adjustedTier, setAdjustedTier] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const c = await fetchFromMainSite<any>("claims.getClaim", { id }, token ?? undefined);
        setClaim(c);
        setAdjustedTier(c?.suggestedTier ?? "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getAccessToken]);

  const submit = async () => {
    setSaving(true);
    try {
      const token = await getAccessToken();
      const input: any = { claimId: id, decision, note };
      if (decision === "adjusted") {
        const tiers = [...individualTiers, ...orgTiers];
        const td = tiers.find((t) => t.tier === adjustedTier);
        if (td) {
          input.adjustedTier = td.tier;
          input.adjustedTierUsd = td.usd;
          input.adjustedTierTokens = td.tokens;
        }
      }
      await fetchFromMainSite("claims.reviewClaim", input, token ?? undefined);
      const refreshed = await fetchFromMainSite<any>("claims.getClaim", { id }, token ?? undefined);
      setClaim(refreshed);
    } catch (err) {
      console.error(err);
      alert("Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!confirm("Publish this claim to the Contributors page?")) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      await fetchFromMainSite("claims.publishClaim", { id }, token ?? undefined);
      const refreshed = await fetchFromMainSite<any>("claims.getClaim", { id }, token ?? undefined);
      setClaim(refreshed);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white/55 text-sm">Loading...</div>;
  if (!claim) return <GlassCard className="text-center py-8 text-white/65">Claim not found.</GlassCard>;

  const forms = Array.isArray(claim.formsOfCapital) ? claim.formsOfCapital : [];
  const outputs = Array.isArray(claim.tangibleOutputs) ? claim.tangibleOutputs : [];
  const evidence = Array.isArray(claim.evidenceLinks) ? claim.evidenceLinks : [];
  const tierOptions = claim.claimType === "organization" ? orgTiers : individualTiers;

  return (
    <div className="space-y-4">
      <Link href="/game/admin/review" className="inline-flex items-center gap-1.5 text-white/55 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> All claims
      </Link>

      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{claim.displayName}</h1>
            <div className="text-white/55 text-xs">
              {claim.claimType} · {claim.author?.email} · status: {claim.status}
            </div>
          </div>
          {claim.suggestedTier && <TierBadge tier={claim.suggestedTier} />}
        </div>

        {claim.contributorOverride && claim.contributorOverride !== "accept" && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 mb-3">
            <div className="text-amber-300 text-xs uppercase tracking-wide mb-1">Contributor said tier felt {claim.contributorOverride}</div>
            {claim.overrideReason && <div className="text-white/75 text-sm">{claim.overrideReason}</div>}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-white font-semibold mb-3">Forms of capital</h2>
        <div className="space-y-2">
          {forms.map((f: any) => (
            <div key={f.form} className="flex items-start gap-3">
              <CapitalFormChip form={f.form} />
              <div className="text-white/75 text-sm">{f.example}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-sm">
          <div><div className="text-white/60 text-xs uppercase">Duration</div><div className="text-white">{claim.duration}</div></div>
          <div><div className="text-white/60 text-xs uppercase">Reach</div><div className="text-white">{claim.reach}</div></div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-white font-semibold mb-2">Story</h2>
        <p className="text-white/75 text-sm whitespace-pre-wrap">{claim.description}</p>
        {claim.whatsAlive && (
          <>
            <h3 className="text-white font-semibold mt-4 mb-1 text-sm">What's alive</h3>
            <p className="text-white/70 text-sm italic">"{claim.whatsAlive}"</p>
          </>
        )}
      </GlassCard>

      {outputs.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-white font-semibold mb-3">Tangible outputs</h2>
          <div className="space-y-3">
            {outputs.map((o: any, i: number) => (
              <div key={i} className="border-l-2 border-[#7dd87d]/40 pl-3">
                <div className="text-white font-semibold text-sm">{o.name} <span className="text-white/60 text-xs font-normal">({o.type})</span></div>
                <div className="text-white/65 text-xs">{o.description}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {evidence.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-white font-semibold mb-2">Evidence links</h2>
          <ul className="space-y-1">
            {evidence.map((l: string, i: number) => (
              <li key={i}><a href={l} target="_blank" rel="noreferrer" className="text-[#7dd87d] text-sm hover:underline">{l}</a></li>
            ))}
          </ul>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <h2 className="text-white font-semibold mb-3">Review decision</h2>
        <div className="space-y-2 mb-4">
          {(["confirmed", "adjusted", "flagged"] as const).map((d) => (
            <label key={d} className="flex items-center gap-2 text-white/80 text-sm">
              <input type="radio" checked={decision === d} onChange={() => setDecision(d)} className="accent-[#7dd87d]" />
              <span className="capitalize">{d}</span>
            </label>
          ))}
        </div>
        {decision === "adjusted" && (
          <select
            value={adjustedTier}
            onChange={(e) => setAdjustedTier(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm mb-3"
          >
            {tierOptions.map((t) => (
              <option key={t.tier} value={t.tier} className="bg-[#1a472a]">{t.label} — ${t.usd.toLocaleString()}</option>
            ))}
          </select>
        )}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Review note (optional)"
          rows={3}
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm mb-4"
        />
        <div className="flex gap-3">
          <PillButton onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save review"}</PillButton>
          {claim.status === "ratified" && (
            <PillButton variant="secondary" onClick={publish} disabled={saving}>Publish to contributors</PillButton>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
