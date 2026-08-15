/**
 * Connection Hub (formerly Marketplace)
 * A space for members to share what they can offer and what they need help with.
 * Route: /marketplace
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PageWrapper } from "@/components/PageWrapper";
import { resolveAssetUrl } from "@/lib/utils";
import { SEO } from "@/components/SEO";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "skill", label: "Skills" },
  { value: "resource", label: "Resources" },
  { value: "time", label: "Time" },
  { value: "knowledge", label: "Knowledge" },
  { value: "land", label: "Land" },
  { value: "capital", label: "Capital" },
];

const COLLAB_FILTERS = [
  { value: "", label: "Any status" },
  { value: "seeking_collaborators", label: "Seeking collaborators" },
  { value: "looking_to_join", label: "Looking to join a project" },
];

const CATEGORY_COLORS: Record<string, string> = {
  skill: "bg-[#7dd87d]/15 text-[#7dd87d] border-[#7dd87d]/30",
  resource: "bg-[#d4a574]/15 text-[#b8843d] border-[#d4a574]/30",
  time: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  knowledge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  land: "bg-emerald-600/15 text-emerald-400 border-emerald-600/30",
  capital: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

export default function Marketplace() {
  const [category, setCategory] = useState("");
  const [collabStatus, setCollabStatus] = useState("");

  const { data, isLoading } = trpc.marketplace.list.useQuery(
    { category: category || undefined, collaborationStatus: collabStatus || undefined },
    { staleTime: 30_000 }
  );

  const items = data?.items ?? [];

  if (isLoading) return <TaoSpinner fullPage size={72} />;

  return (
    <PageWrapper>
    <SEO
      title="Connection Hub | ReGen Civics"
      description="Share what you can offer the community and find help with what you need. A space for regenerators to connect."
      url="/marketplace"
    />
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Connection Hub
          </h1>
          <p className="text-white/60 text-base max-w-2xl mx-auto">
            Share what you can offer the community and what you could use help with. This is how regenerators find each other.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            <Link href="/profile">
              <Button
                size="sm"
                className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30"
              >
                Share what you offer
              </Button>
            </Link>
            <a href="https://localscale.org" target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                variant="outline"
                className="text-white/60 border-white/20 hover:text-white hover:border-white/40"
              >
                Exchange on LocalScale.org
              </Button>
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/40"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value} className="bg-[#1a472a]">
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={collabStatus}
            onChange={e => setCollabStatus(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/40"
          >
            {COLLAB_FILTERS.map(f => (
              <option key={f.value} value={f.value} className="bg-[#1a472a]">
                {f.label}
              </option>
            ))}
          </select>
          {(category || collabStatus) && (
            <button
              onClick={() => { setCategory(""); setCollabStatus(""); }}
              className="text-white/60 hover:text-white/70 text-sm underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-20 border border-white/8 rounded-2xl bg-white/2">
            <p className="text-white/70 text-lg mb-2">No entries yet</p>
            <p className="text-white/60 text-sm mb-6">
              Be the first to share what you can offer and what you could use help with.
            </p>
            <Link href="/profile">
              <Button className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30">
                Share what you offer in your profile
              </Button>
            </Link>
          </div>
        )}

        {/* Member cards */}
        <div className="space-y-4">
          {items.map(item => (
            <div
              key={item.userId}
              className="border border-white/10 rounded-2xl bg-white/3 p-5 sm:p-6 hover:border-white/20 transition-colors"
            >
              {/* Member header */}
              <div className="flex items-start gap-4 mb-4">
                {item.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(item.avatarUrl)}
                    alt={item.displayName}
                    width="44"
                    height="44"
                    className="w-11 h-11 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/8 border border-white/10 flex-shrink-0 flex items-center justify-center text-white/60 font-bold text-lg">
                    {item.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{item.displayName}</span>
                    {item.collaborationStatus === "seeking_collaborators" && (
                      <Badge className="bg-[#d4a574]/15 text-[#b8843d] border-[#d4a574]/30 text-[10px]">
                        Seeking collaborators
                      </Badge>
                    )}
                    {item.collaborationStatus === "looking_to_join" && (
                      <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">
                        Looking to join a project
                      </Badge>
                    )}
                  </div>
                  {item.location && (
                    <p className="text-white/60 text-xs mt-0.5">{item.location}</p>
                  )}
                  {item.dreamingOf && (
                    <p className="text-white/70 text-sm mt-1 italic">"{item.dreamingOf}"</p>
                  )}
                </div>
              </div>

              {/* Gifts */}
              {item.gifts.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7dd87d]/70 mb-2">
                    What I can offer
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.gifts.map(g => (
                      <div
                        key={g.id}
                        className="flex items-start gap-1.5 bg-white/3 border border-white/8 rounded-xl px-3 py-2 max-w-full"
                      >
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[g.type] ?? "bg-white/10 text-white/60 border-white/15"}`}>
                          {g.type}
                        </span>
                        <span className="text-white/75 text-sm">{g.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Needs */}
              {item.needs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#d4a574]/70 mb-2">
                    What I'm looking for help with
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.needs.map(n => (
                      <div
                        key={n.id}
                        className="flex items-start gap-1.5 bg-white/3 border border-white/8 rounded-xl px-3 py-2 max-w-full"
                      >
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[n.type] ?? "bg-white/10 text-white/60 border-white/15"}`}>
                          {n.type}
                        </span>
                        <span className="text-white/75 text-sm">{n.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <p className="text-center text-white/70 text-xs mt-8">
            {items.length} member{items.length !== 1 ? "s" : ""} in the connection hub
          </p>
        )}
      </div>
    </div>
    </PageWrapper>
  );
}
