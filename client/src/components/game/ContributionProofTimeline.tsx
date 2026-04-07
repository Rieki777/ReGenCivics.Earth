/**
 * ContributionProofTimeline - Chronological feed merging quest completions
 * and player contributions with artifact support.
 * Lives on the player profile "Contributions" tab.
 */
import { useState, useMemo } from "react";
import { Compass, Leaf, Handshake, Lock, ChevronDown, Image, Link, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Types ────────────────────────────────────────────────────────────────

type EntryKind = "quest" | "contribution" | "endorsement";

interface Artifact {
  type: "photo" | "text" | "link";
  url?: string;
  thumbnailUrl?: string;
  excerpt?: string;
  title?: string;
}

interface TimelineEntry {
  id: string;
  kind: EntryKind;
  date: Date;
  title: string;
  capitalType?: string;
  points?: number;
  visibility?: string;
  artifact?: Artifact;
}

interface Props {
  userId: number;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const COLLAPSED_COUNT = 5;

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function kindIcon(kind: EntryKind) {
  switch (kind) {
    case "quest":
      return <Compass className="w-4 h-4" />;
    case "contribution":
      return <Leaf className="w-4 h-4" />;
    case "endorsement":
      return <Handshake className="w-4 h-4" />;
  }
}

function kindColor(kind: EntryKind): string {
  switch (kind) {
    case "quest":
      return "#7dd87d";
    case "contribution":
      return "#7c9a7e";
    case "endorsement":
      return "#e8a838";
  }
}

// ── Component ────────────────────────────────────────────────────────────

export function ContributionProofTimeline({ userId, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Fetch quest completions (gracefully handle missing endpoint)
  const completionsQuery = trpc.quests?.myCompletions?.useQuery
    ? trpc.quests.myCompletions.useQuery(
        undefined,
        { retry: false, refetchOnWindowFocus: false }
      )
    : { data: undefined, isLoading: false, isError: true };

  // Fetch player contributions (gracefully handle missing endpoint)
  const contributionsQuery = trpc.playerContributions?.list?.useQuery
    ? trpc.playerContributions.list.useQuery(
        { userId } as any,
        { retry: false, refetchOnWindowFocus: false }
      )
    : { data: undefined, isLoading: false, isError: true };

  const isLoading = completionsQuery.isLoading || contributionsQuery.isLoading;

  // Merge and sort entries
  const entries = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];

    // Map quest completions
    const completions = completionsQuery.data;
    if (Array.isArray(completions)) {
      for (const c of completions as any[]) {
        items.push({
          id: `quest-${c.id}`,
          kind: "quest",
          date: new Date(c.completedAt ?? c.createdAt ?? c.date),
          title: c.questTitle ?? c.questName ?? c.title ?? "Quest completed",
          capitalType: c.capitalType,
          points: c.points ?? c.pointsEarned,
          visibility: c.visibility ?? "public",
          artifact: parseArtifact(c),
        });
      }
    }

    // Map player contributions
    const contributions = contributionsQuery.data;
    if (Array.isArray(contributions)) {
      for (const c of contributions as any[]) {
        const kind: EntryKind = c.type === "endorsement" ? "endorsement" : "contribution";
        items.push({
          id: `contrib-${c.id}`,
          kind,
          date: new Date(c.createdAt ?? c.date),
          title: c.description ?? c.title ?? "Contribution logged",
          capitalType: c.capitalType,
          points: c.points ?? c.pointsEarned,
          visibility: c.visibility ?? "public",
          artifact: parseArtifact(c),
        });
      }
    }

    // Sort newest first
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [completionsQuery.data, contributionsQuery.data]);

  const visibleEntries = expanded ? entries : entries.slice(0, COLLAPSED_COUNT);
  const hasMore = entries.length > COLLAPSED_COUNT;

  // ── Empty state ──────────────────────────────────────────────────────

  if (!isLoading && entries.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Leaf className="w-8 h-8 mx-auto mb-3 text-white/20" />
        <p className="text-sm text-white/60 max-w-xs mx-auto leading-relaxed">
          Your contribution timeline grows as you complete quests and log contributions.
        </p>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-12 h-4 rounded bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded bg-white/5 w-3/4" />
              <div className="h-3 rounded bg-white/5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Timeline ─────────────────────────────────────────────────────────

  return (
    <div className={className}>
      <div className="relative">
        {/* Vertical connecting line */}
        <div
          className="absolute left-[23px] top-4 bottom-4 w-px"
          style={{ backgroundColor: "rgba(125, 216, 125, 0.3)" }}
        />

        <div className="space-y-4">
          {visibleEntries.map((entry) => (
            <TimelineEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>

      {/* Show more / Show less */}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mx-auto"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? "Show less" : `Show ${entries.length - COLLAPSED_COUNT} more`}
        </button>
      )}
    </div>
  );
}

// ── Timeline Entry Card ──────────────────────────────────────────────────

function TimelineEntryCard({ entry }: { entry: TimelineEntry }) {
  const color = kindColor(entry.kind);
  const isPrivate = entry.visibility && entry.visibility !== "public";

  return (
    <div className="flex gap-3 items-start">
      {/* Date badge + node */}
      <div className="flex flex-col items-center w-12 flex-shrink-0 pt-1">
        <span className="text-[10px] text-white/60 whitespace-nowrap leading-tight mb-1">
          {relativeTime(entry.date)}
        </span>
        {/* Circular node */}
        <div
          className="w-3 h-3 rounded-full border-2 flex-shrink-0"
          style={{
            borderColor: color,
            backgroundColor: `${color}30`,
          }}
        />
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-xl p-3 border transition-colors"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderColor: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-2">
          <span style={{ color }} className="mt-0.5 flex-shrink-0">
            {kindIcon(entry.kind)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/90 font-medium leading-snug truncate">
              {entry.title}
            </p>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {entry.capitalType && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {entry.capitalType}
                </span>
              )}
              {entry.points != null && entry.points > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                  +{entry.points} pts
                </span>
              )}
              {isPrivate && (
                <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  {entry.visibility}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Artifact section */}
        {entry.artifact && <ArtifactPreview artifact={entry.artifact} />}
      </div>
    </div>
  );
}

// ── Artifact Preview ─────────────────────────────────────────────────────

function ArtifactPreview({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case "photo":
      return (
        <div className="mt-2 flex items-center gap-2">
          {artifact.thumbnailUrl || artifact.url ? (
            <img
              src={artifact.thumbnailUrl ?? artifact.url}
              alt="Proof artifact"
              className="w-12 h-12 rounded-lg object-cover border border-white/10"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Image className="w-4 h-4 text-white/20" />
            </div>
          )}
          {artifact.excerpt && (
            <p className="text-xs text-white/60 line-clamp-2 flex-1">{artifact.excerpt}</p>
          )}
        </div>
      );

    case "text":
      return artifact.excerpt ? (
        <div className="mt-2 flex items-start gap-1.5">
          <FileText className="w-3.5 h-3.5 text-white/20 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/60 line-clamp-3 italic leading-relaxed">
            {artifact.excerpt}
          </p>
        </div>
      ) : null;

    case "link":
      return artifact.url ? (
        <a
          href={artifact.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1.5 text-xs text-[#7dd87d]/70 hover:text-[#7dd87d] transition-colors truncate"
        >
          <Link className="w-3.5 h-3.5 flex-shrink-0" />
          {artifact.title ?? artifact.url}
        </a>
      ) : null;

    default:
      return null;
  }
}

// ── Artifact Parser ──────────────────────────────────────────────────────

function parseArtifact(raw: any): Artifact | undefined {
  // If the record has an explicit artifact object, use it
  if (raw.artifact) {
    return raw.artifact as Artifact;
  }

  // Try to construct from common field patterns
  if (raw.imageUrl || raw.photoUrl || raw.thumbnailUrl) {
    return {
      type: "photo",
      url: raw.imageUrl ?? raw.photoUrl,
      thumbnailUrl: raw.thumbnailUrl,
      excerpt: raw.proofText ?? raw.excerpt,
    };
  }

  if (raw.proofUrl || raw.linkUrl) {
    return {
      type: "link",
      url: raw.proofUrl ?? raw.linkUrl,
      title: raw.proofTitle ?? raw.linkTitle,
    };
  }

  if (raw.proofText || raw.reflectionText) {
    return {
      type: "text",
      excerpt:
        (raw.proofText ?? raw.reflectionText ?? "").length > 200
          ? (raw.proofText ?? raw.reflectionText).slice(0, 200) + "..."
          : raw.proofText ?? raw.reflectionText,
    };
  }

  return undefined;
}
