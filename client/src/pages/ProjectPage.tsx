/**
 * /project/:key: the public page for one land project (shared/projectKey.ts).
 *
 * Visitors see the project's name and place and the campaign fields a
 * campaign already publishes. The project's stewards also see the campaign
 * tools (StewardTools), and every one of those tools is enforced on the
 * server by server/lib/project-steward.ts. The old /campaign/:id/manage page
 * redirects here and keeps its #anchor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronDown, ExternalLink, Leaf, ShieldCheck } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { SEO } from "@/components/SEO";
import { decodeBasicEntities } from "@shared/htmlText";
import { canonicalRedirectTarget } from "@shared/projectKey";
import { buildStewardQueue } from "@shared/stewardQueue";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectCampaignFront } from "@/components/project/ProjectCampaignFront";
import { CancelledCampaignNotice } from "@/components/project/CancelledCampaignNotice";
import { YourContributions } from "@/components/project/YourContributions";
import { CampaignUpdatesList } from "@/components/project/CampaignUpdatesList";
import { PastCampaigns } from "@/components/project/PastCampaigns";
import { StewardTools, type ProjectFront } from "@/components/project/StewardTools";

const CANCEL_UPDATE_TITLE = "This campaign has been cancelled";

/** A campaign's status in plain words, for the steward's campaign switcher. */
function campaignStatusWords(status: string): string {
  switch (status) {
    case "active": return "Live";
    case "draft": return "Draft";
    case "pending_review": return "In review";
    case "rejected": return "Sent back";
    case "cancelled": return "Cancelled";
    default: return "Complete";
  }
}

/**
 * Scroll to the URL's #anchor once it exists. Sections mount as their data
 * arrives, so retry briefly.
 *
 * `ready` is false while the page still shows the PREVIOUS campaign's or
 * project's data (placeholderData). A link to another campaign's anchor (a
 * bell notice, the switcher: ?campaign=B#review) used to scroll against that
 * old layout, which then changed height when B's data landed, so the anchor
 * ended up hundreds of pixels off. The scroll now waits for the real data.
 */
function useScrollToHash(ready: boolean) {
  const done = useRef<string | null>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const goRef = useRef<() => void>(() => {});
  useEffect(() => {
    let timer: number | undefined;
    const go = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2 || done.current === hash) return;
      const id = decodeURIComponent(hash.slice(1));
      let tries = 0;
      if (timer) window.clearTimeout(timer);
      const attempt = () => {
        const el = readyRef.current ? document.getElementById(id) : null;
        if (el) {
          done.current = hash;
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (tries++ < 20) timer = window.setTimeout(attempt, 150);
      };
      // Let a navigation render first, so readyRef reflects the new URL.
      timer = window.setTimeout(attempt, 0);
    };
    goRef.current = go;
    go();
    // A link to another anchor on this page (a notification, the steward
    // digest) changes only the hash. The bell navigates with wouter, which
    // uses history.pushState: that never fires 'hashchange', so listen for
    // wouter's own pushState/replaceState events too. A pushState is an
    // explicit tap, so it scrolls even to the anchor already handled; a
    // replaceState (the canonical-path fix-up) scrolls only to a new one.
    const onNav = () => { done.current = null; go(); };
    const onReplace = () => { if (window.location.hash !== done.current) { done.current = null; go(); } };
    window.addEventListener("hashchange", onNav);
    window.addEventListener("pushState", onNav);
    window.addEventListener("replaceState", onReplace);
    return () => {
      window.removeEventListener("hashchange", onNav);
      window.removeEventListener("pushState", onNav);
      window.removeEventListener("replaceState", onReplace);
      if (timer) window.clearTimeout(timer);
    };
  }, []);
  // The data a pending anchor waits for has landed.
  useEffect(() => {
    if (ready) goRef.current();
  }, [ready]);
}

function AboutThisLand({ front }: { front: ProjectFront }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const rows: Array<[string, string | null | undefined]> = [
    ["Vision", front.vision],
    ["Regenerative practices", front.regenerativePractices],
    ["Governance", front.governanceModel],
    ["Community", front.communityEngagement],
    ["Team", front.teamDescription],
    ["Land", [front.landSize, front.landStatus].filter(Boolean).join(", ") || null],
    ["Current phase", front.currentPhase],
  ];
  const visible = rows.filter(([, v]) => v && String(v).trim());
  const links = [
    front.websiteUrl ? { href: front.websiteUrl, label: "Website" } : null,
    front.videoUrl ? { href: front.videoUrl, label: "Video" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;
  if (visible.length === 0 && links.length === 0) return null;

  return (
    <section id="about" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="about-body"
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Leaf className="w-5 h-5 text-[#4a7c59]" />
          About this land
        </h2>
        <ChevronDown className={`w-5 h-5 text-[#4a7c59] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="about-body" className="mt-4 space-y-4">
          {visible.map(([label, value]) => (
            <div key={label}>
              <h3 className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">{label}</h3>
              <p className="text-sm text-[#1a472a]/85 leading-relaxed whitespace-pre-line break-words">{decodeBasicEntities(String(value))}</p>
            </div>
          ))}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#4a7c59] text-[#4a7c59]">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {l.label}
                  </Button>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur rounded-3xl light-form-island p-6 shadow-xl text-center">
        <h1 className="text-xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: "var(--font-display)" }}>
          We couldn't find that project.
        </h1>
        <p className="text-sm text-[#1a472a]/80 mb-4">
          It may not have a public page yet, or the link may be off by a little.
        </p>
        <Link href="/campaigns">
          <Button className="w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white">Browse live campaigns</Button>
        </Link>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const { key } = useParams<{ key: string }>();
  const [location, navigate] = useLocation();
  // ?campaign={id}: which of the project's campaigns the page leads with.
  // Every campaign notice, digest and manage link carries it.
  const search = useSearch();
  const focusCampaign = useMemo(() => {
    const n = Number(new URLSearchParams(search).get("campaign"));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }, [search]);
  const { isAuthenticated } = useAuth();
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isPlaceholderData } = trpc.projects.getPublic.useQuery(
    { key: key ?? "", ...(focusCampaign ? { campaign: focusCampaign } : {}) },
    { enabled: !!key, retry: false, placeholderData: (prev) => prev },
  );
  const front = data?.front ?? null;
  const isSteward = !!data?.isSteward;

  // The slug is decoration. When the server's canonical path differs (an
  // old slug, a campaign key for a project with an application), move to it
  // in place and keep the #anchor.
  //
  // Never while the query shows the PREVIOUS project's data (placeholderData
  // keeps it on screen while a new key loads): moving from project A to B
  // would otherwise send the visitor straight back to A.
  useEffect(() => {
    const target = canonicalRedirectTarget({ location, canonicalPath: data?.canonicalPath, isPlaceholderData });
    if (target) navigate(`${target}${window.location.search}${window.location.hash}`, { replace: true });
  }, [data?.canonicalPath, location, isPlaceholderData]);

  const { data: updates, refetch: refetchUpdates } = trpc.campaigns.listUpdates.useQuery(
    { campaignId: front?.id ?? 0 },
    { enabled: !!front },
  );

  // The steward bar's count shares its query with the tools below.
  const { data: ownerContributions } = trpc.campaigns.getContributionsForOwner.useQuery(
    { campaignId: front?.id ?? 0 },
    { enabled: !!front && isSteward, retry: false },
  );
  const waitingCount = useMemo(() => {
    if (!front || !ownerContributions) return 0;
    return buildStewardQueue({ contributions: ownerContributions, items: front.items, campaignStatus: front.status }).total;
  }, [front, ownerContributions]);

  const utils = trpc.useUtils();
  const refreshAll = useCallback(() => {
    refetch();
    refetchUpdates();
    utils.campaigns.myContributions.invalidate();
    if (front) utils.campaigns.getContributionsForOwner.invalidate({ campaignId: front.id });
  }, [refetch, refetchUpdates, utils, front?.id]);

  useScrollToHash(!!data && !isPlaceholderData);

  if (isLoading && !data) return <TaoSpinner fullPage size={72} />;
  if (error || !data) return <NotFound />;

  const name = decodeBasicEntities(data.project.name || front?.title || "Land project");
  const cancelledMessage = front?.status === "cancelled" && updates && updates[0]
    && decodeBasicEntities(updates[0].title) === CANCEL_UPDATE_TITLE
    ? updates[0].body
    : null;
  const others = data.campaigns.filter((c) => c.id !== front?.id);
  const campaignIds = data.campaigns.map((c) => c.id);
  const campaignTitles = Object.fromEntries(data.campaigns.map((c) => [c.id, c.title]));
  const coverUrl = front?.coverImage?.url ?? front?.generatedImageUrl ?? front?.projectImageUrl ?? null;
  const shareText = front?.description ? decodeBasicEntities(front.description).slice(0, 200) : `${name} on ReGen Civics`;

  return (
    <>
      <SEO
        title={`${name} | ReGen Civics`}
        description={shareText}
        url={data.canonicalPath}
        type="website"
      />
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] pt-24 pb-12 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 space-y-6">
          <ProjectHeader
            name={name}
            location={data.project.location ? decodeBasicEntities(data.project.location) : null}
            country={data.project.country}
            isDemo={data.project.isDemo}
            canonicalPath={data.canonicalPath}
            coverUrl={coverUrl}
            followCampaignId={front && front.status !== "cancelled" ? front.id : null}
            initiallyFollowing={!!front?.isFollowing}
            shareText={shareText}
          />

          {isSteward && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0f2d1a]/80 border border-[#7dd87d]/30 px-4 py-3 text-white">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-[#7dd87d]" />
                You steward this project
              </span>
              {front && (
                <a
                  href="#steward-tools"
                  onClick={(e) => { e.preventDefault(); document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="inline-flex items-center min-h-11 text-sm font-semibold rounded-full px-4 py-2 bg-[#7dd87d] text-[#1a472a] hover:bg-white"
                >
                  {waitingCount} waiting on you
                </a>
              )}
            </div>
          )}
          {isSteward && data.campaigns.length > 1 && (
            <nav aria-label="Your campaigns" className="rounded-2xl bg-[#0f2d1a]/80 border border-[#7dd87d]/30 px-4 py-3 text-white">
              <p className="text-sm font-medium mb-2">This project's campaigns</p>
              <ul className="flex flex-col gap-1">
                {data.campaigns.map((c) => {
                  const waiting = data.stewardWaiting?.[c.id] ?? 0;
                  const current = c.id === front?.id;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`${data.canonicalPath}?campaign=${c.id}#steward-tools`}
                        aria-current={current ? "page" : undefined}
                        className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${current ? "bg-white/15 font-semibold" : "hover:bg-white/10"}`}
                      >
                        <span className="break-words">{decodeBasicEntities(c.title)}</span>
                        <span className="shrink-0 text-xs text-[#7dd87d]">
                          {waiting > 0 ? `${waiting} waiting on you` : campaignStatusWords(c.status)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          {cancelNotice && (
            <p className="rounded-2xl bg-white/95 p-4 text-sm text-[#1a472a] shadow" role="status">{cancelNotice}</p>
          )}

          {front?.status === "cancelled" && (
            <CancelledCampaignNotice message={cancelledMessage} suggestions={data.suggestions} />
          )}

          {front ? (
            // Keyed by campaign: moving to another project or campaign (back
            // button, a suggestion link) starts a fresh sheet, so an open
            // sheet or practice receipt never carries over onto the next one.
            <ProjectCampaignFront key={front.id} front={front} onContributed={refreshAll} needsAnchor={!isSteward} />
          ) : (
            <section className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl">
              <p className="text-[#1a472a]/85">This project has no campaign running right now.</p>
              {isSteward ? (
                <>
                  <p className="text-sm text-[#1a472a]/80 mt-2">
                    You steward this project. Start a campaign to ask for the land, tools, roles and resources it needs.
                  </p>
                  <Link href="/create-campaign">
                    <Button className="mt-3 bg-[#4a7c59] hover:bg-[#1a472a] text-white">Start a campaign</Button>
                  </Link>
                </>
              ) : (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <Link href="/campaigns#get-notified" className="inline-flex items-center min-h-11 text-sm font-semibold text-[#4a7c59] hover:underline">
                    Hear when crowdpooling opens
                  </Link>
                  <Link href="/campaigns" className="inline-flex items-center min-h-11 text-sm font-semibold text-[#4a7c59] hover:underline">
                    Browse live campaigns
                  </Link>
                </div>
              )}
            </section>
          )}

          {isAuthenticated && (
            <YourContributions campaignIds={campaignIds} campaignTitles={campaignTitles} items={front?.items ?? []} />
          )}

          {front && <CampaignUpdatesList id="updates" updates={updates} />}

          <PastCampaigns campaigns={others} />

          {front && <AboutThisLand front={front} />}

          {isSteward && front && (
            <StewardTools
              front={front}
              onChanged={refreshAll}
              onCancelled={(msg) => { setCancelNotice(msg); refreshAll(); }}
            />
          )}
        </div>
      </div>
    </>
  );
}
