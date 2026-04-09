/**
 * GovBackField
 * Route: /gov/:slug/backfield
 *
 * The Back Field: ideas resting until they're ready. Renamed from "parking lot"
 * per Rye, echoing fallow agricultural fields. Stewards review the backlog on
 * a quarterly cadence (governance.backfield.review_cadence_days game var).
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md improvement #6
 */
import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sprout, Plus, Clock } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  parked: "Parked",
  reviewing: "In review",
  promoted: "Promoted",
  retired: "Retired",
};

export default function GovBackField() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const tenantQuery = trpc.governance.getTenantBySlug.useQuery({ slug: slug ?? "" }, { enabled: !!slug });
  const tenantId = tenantQuery.data?.id;
  const listQuery = trpc.governance.listBackField.useQuery({ tenantId: tenantId ?? 0 }, { enabled: !!tenantId });
  const utils = trpc.useContext();
  const parkMutation = trpc.governance.parkInBackField.useMutation({
    onSuccess: () => {
      utils.governance.listBackField.invalidate({ tenantId: tenantId ?? 0 });
      setShowForm(false);
      setTitle("");
      setSummary("");
      setReason("");
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");

  if (!tenantQuery.data) {
    return <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center text-white/65">Loading...</div>;
  }

  const handleSubmit = () => {
    if (!tenantId) return;
    parkMutation.mutate({
      tenantId,
      title: title.trim(),
      summary: summary.trim(),
      reason: reason.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title={`Back Field | ${tenantQuery.data.displayName} | ReGen Civics`} description="Ideas resting until they're ready." />
      <BackButton />

      <section className="pt-20 pb-6 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Sprout className="w-7 h-7 text-[#7dd87d]" />
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Back Field
          </h1>
        </div>
        <p className="text-white/65 text-sm max-w-2xl">
          {tenantQuery.data.displayName}'s backlog of ideas resting until they're ready. Stewards review on a quarterly cadence and promote the ones whose time has come.
        </p>
      </section>

      {/* Add new idea */}
      {isAuthenticated && (
        <section className="px-4 max-w-3xl mx-auto mb-6">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Park an idea here
            </Button>
          ) : (
            <div className="bg-white/5 border border-[#7dd87d]/30 rounded-2xl p-5 space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={300} className="bg-white/10 border-white/15 text-white" />
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What's the idea?" rows={4} className="bg-white/10 border-white/15 text-white resize-none" />
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why park it for now? (optional)" maxLength={500} className="bg-white/10 border-white/15 text-white" />
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!title || !summary || parkMutation.isPending} className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold">
                  {parkMutation.isPending ? "Parking..." : "Park it"}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="border-white/20 text-white/75">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* List */}
      <section className="px-4 max-w-3xl mx-auto pb-16">
        {listQuery.isLoading ? (
          <p className="text-white/55 text-sm">Loading...</p>
        ) : (listQuery.data?.length ?? 0) === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/65 text-sm">The Back Field is empty. Park the first idea above.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(listQuery.data ?? []).map((item: any) => (
              <li key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-white font-bold text-base flex-1 min-w-0">{item.title}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/65 capitalize flex-shrink-0">
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{item.summary}</p>
                {item.reason && (
                  <p className="text-white/55 text-xs mt-2 italic">Why parked: {item.reason}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-white/45 mt-3">
                  <Clock className="w-3 h-3" />
                  <span>Parked {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
