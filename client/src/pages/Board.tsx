/**
 * Needs and Offers board (Phase B2): the practical coordination surface.
 * Post a need or an offer (signed in), browse and filter by bioregion and
 * tags. Matching runs deterministically in the background; when a need meets
 * an offer, both parties get an introduction email.
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { useState } from "react";
import { Handshake, MapPin, Plus, Tag, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { BioregionSelect } from "@/components/BioregionSelect";
import { getLoginUrl } from "@/const";

type BoardKind = "needs" | "offers";

export default function Board() {
  const { isAuthenticated } = useAuth();
  const [kind, setKind] = useState<BoardKind>("needs");
  const [filterBioregionId, setFilterBioregionId] = useState<number | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [showForm, setShowForm] = useState(false);

  const listQuery = trpc.needsOffers.list.useQuery({
    kind,
    bioregionId: filterBioregionId ?? undefined,
    tag: filterTag.trim() || undefined,
  });
  const myPostsQuery = trpc.needsOffers.myPosts.useQuery(undefined, { enabled: isAuthenticated });

  // Post form state
  const [formKind, setFormKind] = useState<"need" | "offer">("need");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [bioregionId, setBioregionId] = useState<number | null>(null);
  const [timeWindow, setTimeWindow] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setTagsText("");
    setTimeWindow("");
    setFormMessage(null);
  };
  const onPosted = () => {
    resetForm();
    setShowForm(false);
    listQuery.refetch();
    myPostsQuery.refetch();
  };
  const postNeed = trpc.needsOffers.postNeed.useMutation({ onSuccess: onPosted, onError: (e) => setFormMessage(e.message) });
  const postOffer = trpc.needsOffers.postOffer.useMutation({ onSuccess: onPosted, onError: (e) => setFormMessage(e.message) });
  const closeMutation = trpc.needsOffers.close.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      myPostsQuery.refetch();
    },
  });

  const submitPost = () => {
    setFormMessage(null);
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    if (title.trim().length < 3) return setFormMessage("Give it a short, clear title.");
    if (tags.length === 0) return setFormMessage("Add at least one tag (comma separated) so the board can match you.");
    const payload = {
      title: title.trim(),
      body: body.trim() || undefined,
      tags,
      bioregionId,
      timeWindow: timeWindow.trim() || undefined,
    };
    if (formKind === "need") postNeed.mutate(payload);
    else postOffer.mutate(payload);
  };

  const rows = listQuery.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Needs and Offers | ReGen Civics"
        description="Land projects post what they need, players post what they can give. When a need meets an offer, the board introduces you."
      />

      <section className="relative pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
            <Handshake className="w-4 h-4 text-[#7dd87d]" />
            <span className="text-[#7dd87d] text-sm font-medium" style={{ fontFamily: "var(--font-accent)" }}>
              Needs and Offers
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            The board where help finds work
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto" style={{ fontFamily: "var(--font-body)" }}>
            Land projects post what they need: a welder for two days, forty fruit trees, a grant writer. Players
            post what they can give. When a need meets an offer on shared tags in a shared bioregion, the board
            emails you both an introduction. The rest is human.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-24 space-y-8">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            {(["needs", "offers"] as BoardKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  kind === k ? "bg-[#7dd87d] text-[#1a472a]" : "text-white/70 hover:text-white"
                }`}
              >
                {k === "needs" ? "Needs" : "Offers"}
              </button>
            ))}
          </div>
          <div className="w-56">
            <BioregionSelect value={filterBioregionId} onChange={setFilterBioregionId} placeholder="Any bioregion" variant="dark" />
          </div>
          <input
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            placeholder="Filter by tag"
            className="rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40 w-40"
          />
          {isAuthenticated ? (
            <Button
              onClick={() => setShowForm((s) => !s)}
              className="ml-auto bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-5"
            >
              {showForm ? (
                <span className="inline-flex items-center gap-1"><X className="w-4 h-4" /> Cancel</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Post to the board</span>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="ml-auto bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-5"
            >
              Sign in to post
            </Button>
          )}
        </div>

        {/* Post form */}
        {showForm && isAuthenticated && (
          <section className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 w-fit">
              {(["need", "offer"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFormKind(k)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formKind === k ? "bg-[#d4a574] text-[#1a472a]" : "text-white/70 hover:text-white"
                  }`}
                >
                  {k === "need" ? "I need something" : "I can offer something"}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                placeholder={formKind === "need" ? "A welder for two days in September" : "Grant writing, two hours a week"}
                className="w-full rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-1">Details (optional)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 5000))}
                rows={3}
                className="w-full rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Tags (comma separated)</label>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="welding, fencing, water"
                  className="w-full rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Bioregion (optional)</label>
                <BioregionSelect value={bioregionId} onChange={setBioregionId} variant="dark" />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Time window (optional)</label>
                <input
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value.slice(0, 200))}
                  placeholder="September, weekends"
                  className="w-full rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
                />
              </div>
            </div>
            {formMessage && <p className="text-[#d4a574] text-sm">{formMessage}</p>}
            <Button
              onClick={submitPost}
              disabled={postNeed.isPending || postOffer.isPending}
              className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-6"
            >
              {postNeed.isPending || postOffer.isPending ? "Posting…" : "Post it"}
            </Button>
          </section>
        )}

        {/* My posts */}
        {isAuthenticated && myPostsQuery.data && (myPostsQuery.data.needs.length > 0 || myPostsQuery.data.offers.length > 0) && (
          <section>
            <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Your posts
            </h2>
            <div className="space-y-2">
              {[
                ...myPostsQuery.data.needs.map((p) => ({ ...p, kind: "need" as const })),
                ...myPostsQuery.data.offers.map((p) => ({ ...p, kind: "offer" as const })),
              ].map((post) => (
                <div key={`${post.kind}-${post.id}`} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="text-white/80 text-sm min-w-0">
                    <span className="px-2 py-0.5 mr-2 rounded-full bg-[#d4a574]/20 text-[#d4a574] text-xs">
                      {post.kind === "need" ? "Need" : "Offer"}
                    </span>
                    <span className="font-medium text-white">{post.title}</span>
                    <span className="text-white/60 ml-2 text-xs">{post.status}</span>
                  </div>
                  {post.status !== "closed" && (
                    <Button
                      onClick={() => closeMutation.mutate({ kind: post.kind, id: post.id })}
                      disabled={closeMutation.isPending}
                      className="bg-transparent text-white/60 hover:text-white hover:bg-white/10 rounded-full px-3 text-sm shrink-0"
                    >
                      Close
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Listing */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Open {kind}
          </h2>
          {listQuery.isLoading ? (
            <div className="text-white/60">Loading the board…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-white/60">
              Nothing here yet. Be the first to post {kind === "needs" ? "a need" : "an offer"}.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-white font-bold">{row.title}</h3>
                    {row.status === "matched" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] text-xs">matched, still open</span>
                    )}
                  </div>
                  {row.body && <p className="text-white/70 text-sm mt-2 whitespace-pre-line">{row.body}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-white/60">
                    {row.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        <Tag className="w-3 h-3" /> {t}
                      </span>
                    ))}
                    {row.bioregionName && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {row.bioregionName}
                      </span>
                    )}
                    {row.timeWindow && <span>{row.timeWindow}</span>}
                    {row.posterName && <span>by {row.posterName}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
