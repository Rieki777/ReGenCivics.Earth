/**
 * One campaign in the gallery on /campaigns (build spec 2026-09-25, section
 * 17 lane 5; research R02). Top to bottom: photo, title, place, one line of
 * description, "Still open" with up to three open needs, the two-line bar
 * (compact: in-kind first, then money, then the close date), one state tag,
 * and a contributor count only near or after the close. No percentage
 * headline, no countdown, no "almost there" nudge.
 *
 * The whole card is one link to the project page: the title's link stretches
 * over the card (an ::after overlay), so there is exactly one <a> per card.
 * Share is a separate 44px button that sits above the overlay and opens a
 * sheet built on the base DialogContent (a bottom sheet on a phone, focus
 * trapped, Escape closes), in place of the old hand-rolled fixed overlay.
 *
 * Every figure and line comes from the campaign's progress summary
 * (shared/campaignProgress.ts), the one reading every surface uses.
 */
import { useRef, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, Copy, MapPin, MessageCircle, Share2, Twitter } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TwoLineBar } from "@/components/crowdpool/TwoLineBar";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { copyToClipboard } from "@/lib/clipboard";
import { makeCurrencyFormatter } from "@/lib/needDisplay";
import { cdnImg } from "@/lib/utils";
import { progressLines, shareLine, type CampaignProgressSummary } from "@shared/campaignProgress";
import { GALLERY } from "@shared/crowdpoolCopy";
import { decodeBasicEntities } from "@shared/htmlText";
import { campaignRedirectTarget } from "@shared/projectKey";

const SITE = "https://regencivics.earth";

/** How many days before the close a card starts showing its contributor count. */
export const CONTRIBUTOR_COUNT_WINDOW_DAYS = 21;

/** What a gallery card renders, mapped from a campaigns.list row by toGalleryCampaign. */
export interface GalleryCampaign {
  id: number;
  /** The campaign's title, or the project's name when it has none. */
  name: string;
  /** The land project's name, for the share line. */
  projectName: string;
  location: string | null;
  description: string;
  currency: string;
  image: string;
  /** The campaign's current phase, for the gallery's phase filter. */
  tags: string[];
  status: string;
  isDemo: boolean;
  createdAtMs: number;
  /** The project page focused on this campaign. */
  path: string;
  progress: CampaignProgressSummary;
  /** Distinct contributors, when the row carries it. */
  contributorsCount?: number;
}

/** The fields of a campaigns.list row the gallery reads. */
export type GalleryRow = {
  id: number;
  title: string | null;
  projectName: string | null;
  applicationId: number | null;
  location: string | null;
  description: string | null;
  currency: string | null;
  coverImage?: { url?: string | null } | null;
  projectImageUrl?: string | null;
  generatedImageUrl?: string | null;
  currentPhase?: string | null;
  status: string;
  isDemo: number | boolean | null;
  createdAt: Date | string | null;
  progress: CampaignProgressSummary;
  contributorsCount?: number;
};

/** The first sentence of a description, for the card's one line. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(flat);
  return (m ? m[1] : flat).trim();
}

export function toGalleryCampaign(row: GalleryRow): GalleryCampaign {
  const title = decodeBasicEntities(row.title || row.projectName || "");
  const projectName = decodeBasicEntities((row.projectName && row.projectName.trim()) || row.title || "");
  const rawImage = row.coverImage?.url || row.projectImageUrl || row.generatedImageUrl || "";
  const created = row.createdAt ? new Date(row.createdAt).getTime() : 0;
  return {
    id: row.id,
    name: title,
    projectName,
    location: row.location ? decodeBasicEntities(row.location) : null,
    description: decodeBasicEntities(row.description || ""),
    currency: row.currency || "USD",
    image: rawImage ? cdnImg(rawImage, 800) : "",
    tags: row.currentPhase ? [row.currentPhase] : [],
    status: row.status,
    isDemo: row.isDemo === true || (typeof row.isDemo === "number" && row.isDemo !== 0),
    createdAtMs: Number.isFinite(created) ? created : 0,
    path: campaignRedirectTarget(
      { id: row.id, applicationId: row.applicationId, projectName: row.projectName, title: row.title || "" },
      "",
      "",
    ),
    progress: row.progress,
    contributorsCount: typeof row.contributorsCount === "number" ? row.contributorsCount : undefined,
  };
}

/**
 * Show the contributor count only once it means something: after the close,
 * or within 21 days of it. Never on an example.
 */
export function showContributorCount(
  p: Pick<CampaignProgressSummary, "isExample" | "state" | "endsAt">,
  count: number | undefined,
  now: Date = new Date(),
): boolean {
  if (p.isExample || typeof count !== "number" || count <= 0) return false;
  if (p.state === "complete") return true;
  if (p.state === "draft" || p.state === "cancelled" || !p.endsAt) return false;
  const ends = new Date(p.endsAt).getTime();
  if (!Number.isFinite(ends)) return false;
  return ends - now.getTime() <= CONTRIBUTOR_COUNT_WINDOW_DAYS * 86_400_000;
}

// ── Sorting the gallery ─────────────────────────────────────────────────────

export type GallerySort = "needs-hand" | "newest" | "closing-soonest" | "closest-to-complete";

export const GALLERY_SORTS: Array<{ key: GallerySort; label: string }> = [
  { key: "needs-hand", label: GALLERY.sort.needsHand },
  { key: "newest", label: GALLERY.sort.newest },
  { key: "closing-soonest", label: GALLERY.sort.closingSoonest },
  { key: "closest-to-complete", label: GALLERY.sort.closestToComplete },
];

/**
 * How close a campaign is to complete, from both halves' confirmed share:
 * the smaller half, since complete needs both. A campaign that asks for no
 * money reads its in-kind half alone.
 */
export function completeShare(p: Pick<CampaignProgressSummary, "inKind" | "money">): number {
  return p.money.asksNone ? p.inKind.pct : Math.min(p.inKind.pct, p.money.pct);
}

function endsAtMs(p: Pick<CampaignProgressSummary, "endsAt">): number {
  const t = p.endsAt ? new Date(p.endsAt).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

/**
 * The gallery's order. "Needs a hand" (the default) puts the campaigns with
 * the most open needs no one has offered on first (counts from the Needs tab
 * read, when it has loaded), then the most open needs. No popularity sort.
 */
export function sortGallery(
  list: readonly GalleryCampaign[],
  sort: GallerySort,
  noOfferCounts: ReadonlyMap<number, number> = new Map(),
): GalleryCampaign[] {
  const newest = (a: GalleryCampaign, b: GalleryCampaign) => b.createdAtMs - a.createdAtMs || a.id - b.id;
  return [...list].sort((a, b) => {
    switch (sort) {
      case "newest":
        return newest(a, b);
      case "closing-soonest": {
        const d = endsAtMs(a.progress) - endsAtMs(b.progress);
        return Number.isNaN(d) || d === 0 ? newest(a, b) : d;
      }
      case "closest-to-complete": {
        const d = completeShare(b.progress) - completeShare(a.progress);
        if (d !== 0) return d;
        const mean = (p: GalleryCampaign["progress"]) => (p.money.asksNone ? p.inKind.pct : (p.inKind.pct + p.money.pct) / 2);
        return mean(b.progress) - mean(a.progress) || newest(a, b);
      }
      case "needs-hand":
      default:
        return (
          (noOfferCounts.get(b.id) ?? 0) - (noOfferCounts.get(a.id) ?? 0) ||
          b.progress.open.count - a.progress.open.count ||
          newest(a, b)
        );
    }
  });
}

const tagClass = (tag: string) =>
  tag === "Example"
    ? "bg-amber-100 text-amber-900 border-amber-300"
    : tag === "Complete"
      ? "bg-[#1a472a] text-white border-[#1a472a]"
      : "bg-[#f0f7f0] text-[#1a472a] border-[#4a7c59]/40";

/** The share sheet: the device's own share when it has one, otherwise three ways out. */
export function CampaignShareSheet({ campaign }: { campaign: GalleryCampaign }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // The sheet opens from this button without a DialogTrigger (the device share
  // comes first), so focus is handed back to it by hand when the sheet closes.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const url = `${SITE}${campaign.path}`;
  const line = shareLine(campaign.projectName || campaign.name, campaign.progress);
  const shareText = `${line} ${url}`;

  const handleCopy = () => {
    void copyToClipboard(url).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleShare = () => {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && typeof nav.share === "function") {
      nav.share({ title: campaign.name, text: line, url }).catch(() => {
        /* The person closed the share sheet; nothing to do. */
      });
      return;
    }
    setOpen(true);
  };

  const rowClass =
    "flex items-center gap-3 w-full min-h-11 rounded-xl border border-[#1a472a]/10 bg-[#f0f7f0] px-3 py-2 text-[#1a472a] font-medium hover:border-[#4a7c59]/60 transition-colors";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleShare}
        aria-label={GALLERY.shareLabel(campaign.name)}
        className="relative z-10 inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 pointer-coarse:min-h-11 rounded-full border border-[#4a7c59]/50 bg-white px-3 text-sm font-semibold text-[#1a472a] hover:border-[#4a7c59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4a7c59]"
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
        {GALLERY.share}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="light-form-island bg-white text-[#1a472a]"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            buttonRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{GALLERY.shareTitle(campaign.name)}</DialogTitle>
            <DialogDescription>{line}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
            >
              <Twitter className="w-4 h-4 text-sky-600" aria-hidden="true" />
              {GALLERY.shareOnX}
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
            >
              <MessageCircle className="w-4 h-4 text-green-700" aria-hidden="true" />
              {GALLERY.shareOnWhatsApp}
            </a>
            <button type="button" onClick={handleCopy} className={rowClass}>
              {copied ? (
                <CheckCircle className="w-4 h-4 text-[#4a7c59]" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4 text-[#1a472a]/70" aria-hidden="true" />
              )}
              <span>{copied ? GALLERY.linkCopied : GALLERY.copyLink}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GalleryCard({ campaign, now }: { campaign: GalleryCampaign; now?: Date }) {
  const { progress } = campaign;
  const fmt = makeCurrencyFormatter(campaign.currency);
  const lines = progressLines(progress, fmt);
  const closed = progress.state === "complete" || progress.state === "cancelled";
  const stillOpen = closed ? [] : progress.topOpen.slice(0, 3);
  const line = campaign.description ? firstSentence(campaign.description) : "";
  const showCount = showContributorCount(progress, campaign.contributorsCount, now);

  return (
    <article
      data-testid="gallery-card"
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white/95 light-form-island shadow-xl border border-white/40 transition-shadow hover:shadow-2xl"
    >
      <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-[#1a472a] to-[#2d5a3d]">
        {campaign.image ? (
          <img
            src={campaign.image}
            alt=""
            width="400"
            height="192"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <SeedOfLifeIcon className="w-14 h-14 text-white/70" size={56} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#1a472a] break-words" style={{ fontFamily: "var(--font-display)" }}>
            <Link
              href={campaign.path}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#4a7c59] focus-visible:after:ring-offset-2"
            >
              {campaign.name}
            </Link>
          </h3>
          {campaign.location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-[#1a472a]/80 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{campaign.location}</span>
            </p>
          )}
          {line && <p className="mt-2 text-sm text-[#1a472a]/85 line-clamp-2 break-words">{line}</p>}
        </div>

        {stillOpen.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4a7c59]">{GALLERY.stillOpen}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-[#1a472a]">
              {stillOpen.map((o) => (
                <li key={o.id} className="break-words">
                  {decodeBasicEntities(o.line)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <TwoLineBar progress={progress} formatCurrency={fmt} variant="compact" />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tagClass(lines.stateTag)}`}>
              {lines.stateTag}
            </span>
            {showCount && (
              <span className="text-xs text-[#1a472a]/75">{GALLERY.contributors(campaign.contributorsCount as number)}</span>
            )}
          </div>
          <CampaignShareSheet campaign={campaign} />
        </div>
      </div>
    </article>
  );
}
