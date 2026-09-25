/**
 * /project/:key: the public page for one land project (shared/projectKey.ts),
 * and the campaign page: /campaign/:id lands here as ?campaign=:id.
 *
 * Phone order at 375px (build spec 2026-09-25, section 8.1): the example
 * banner, the title card, the steward bar, the cancel notice, the campaign
 * card with the two-line bar, What can you bring?, the needs, putting money
 * in, what has happened, About this land (collapsed), more campaigns, and the
 * steward tools. The page adds no fixed or sticky element.
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
import { ShieldCheck } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { SEO } from "@/components/SEO";
import { decodeBasicEntities } from "@shared/htmlText";
import { canonicalRedirectTarget } from "@shared/projectKey";
import { progressLines } from "@shared/campaignProgress";
import { EXAMPLE_BANNER } from "@shared/crowdpoolCopy";
import { buildStewardQueue } from "@shared/stewardQueue";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectCampaignFront } from "@/components/project/ProjectCampaignFront";
import { CancelledCampaignNotice } from "@/components/project/CancelledCampaignNotice";
import { WhatHasHappened } from "@/components/project/WhatHasHappened";
import { AboutThisLand } from "@/components/project/AboutThisLand";
import { MoreCampaigns } from "@/components/project/MoreCampaigns";
import { PastCampaigns } from "@/components/project/PastCampaigns";
import { makeCurrencyFormatter } from "@/lib/needDisplay";
import { campaignViewInput } from "@/lib/campaignTracking";
import { keepAnchorInPlace } from "@/lib/keepAnchorInPlace";
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
    // Sections above an anchor (the money routes, More campaigns) load
    // after it and push it down; keepAnchorInPlace follows it until the
    // layout settles or the reader starts to scroll.
    let release: (() => void) | undefined;
    const go = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2 || done.current === hash) return;
      const id = decodeURIComponent(hash.slice(1));
      let tries = 0;
      if (timer) window.clearTimeout(timer);
      release?.();
      const attempt = () => {
        const el = readyRef.current ? document.getElementById(id) : null;
        if (el) {
          done.current = hash;
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          release = keepAnchorInPlace(el);
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
      release?.();
    };
  }, []);
  // The data a pending anchor waits for has landed.
  useEffect(() => {
    if (ready) goRef.current();
  }, [ready]);
}

/** The first sentence of a description, for the title card's one line. */
function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(flat);
  return (m ? m[1] : flat).trim();
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

  // A visit, for /campaign/:id/analytics: once per front campaign per page
  // load, never for the previous campaign's placeholder data.
  const trackView = trpc.campaigns.trackView.useMutation();
  const tracked = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!front || isPlaceholderData || tracked.current.has(front.id)) return;
    tracked.current.add(front.id);
    trackView.mutate(campaignViewInput(front.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.id, isPlaceholderData]);

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
  const description = front?.description ? decodeBasicEntities(front.description) : "";
  const shareText = description ? description.slice(0, 200) : `${name} on ReGen Civics`;
  const openLine = front ? progressLines(front.progress, makeCurrencyFormatter(front.currency)).open : null;
  const seoDescription = ([openLine, description].filter(Boolean).join(" ") || `${name} on ReGen Civics`).slice(0, 160);
  const sharePath = front ? `${data.canonicalPath}?campaign=${front.id}` : data.canonicalPath;

  return (
    <>
      <SEO
        title={`Contribute to ${name} | ReGen Civics`}
        description={seoDescription}
        url={data.canonicalPath}
        type="website"
      />
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] pt-24 pb-12 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 space-y-6">
          {!!front?.isDemo && (
            <p className="rounded-3xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-medium text-amber-950 shadow-xl">
              {EXAMPLE_BANNER}
            </p>
          )}
          <ProjectHeader
            name={name}
            location={data.project.location ? decodeBasicEntities(data.project.location) : null}
            country={data.project.country}
            isDemo={data.project.isDemo}
            sharePath={sharePath}
            tagline={description ? firstSentence(description) : null}
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
            <ProjectCampaignFront
              key={front.id}
              front={front}
              onContributed={refreshAll}
              needsAnchor={!isSteward}
              projectName={name}
              canonicalPath={data.canonicalPath}
            />
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

          {front && (
            <WhatHasHappened
              campaign={{
                id: front.id,
                status: front.status,
                isDemo: front.isDemo,
                startedAt: front.startedAt,
                completedAt: front.completedAt,
                updatedAt: front.updatedAt,
              }}
              progress={front.progress}
              updates={updates}
              yourContributions={isAuthenticated ? { campaignIds, campaignTitles, items: front.items } : undefined}
            />
          )}

          {front && <AboutThisLand front={front} />}

          <div id="more-campaigns" className="scroll-mt-24">
            <PastCampaigns campaigns={others} projectName={name} />
            <MoreCampaigns excludeIds={campaignIds} applicationId={data.project.applicationId} />
          </div>

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
