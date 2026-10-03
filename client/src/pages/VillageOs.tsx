/**
 * Get your Village OS (/village-os, ADR-69).
 *
 * One front door with three ways in: run it yourself (free and open source),
 * we host it (free for accepted Season 2 projects), or a paid custom build
 * with the core team. Below them sit how hosting works, the plain facts, and
 * the weekly founders circle CORE is starting.
 *
 * Every word comes from shared/villageOsOffer.ts. Two switches arrive from
 * villageOs.offer and both start off: the code link, the setup guide and the
 * starter kit wait for the Village OS repo's security cleanup
 * (VILLAGE_OS_SHOW_REPO), and the membership sentence
 * and button wait for the Legal session (VILLAGE_OS_MEMBERSHIP_URL). The page renders
 * whole with both off, which is also how it looks while the query loads.
 * No money moves anywhere on this page.
 */

import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, ClipboardCopy, Code2, Download, ExternalLink, Hammer, Heart, Info, Server, Sprout } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { AnimatedSection } from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { AMORA_VILLAGE_URL, VILLAGE_OS_HOST_PATH, VILLAGE_OS_OFFER } from "@shared/villageOsOffer";

const display = { fontFamily: "var(--font-display)" } as const;

/** Both switches off: what the page shows while loading and until each one opens. */
const OFFER_CLOSED = {
  showRepo: false,
  repoUrl: null,
  starterKitUrl: null,
  guideUrl: null,
  setupPromptUrl: null,
  membershipUrl: null,
} as const;

/** The server already vets these; this keeps a bad value from ever becoming a link. */
function httpsOnly(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 rounded-xl font-semibold transition-colors text-sm";
const BUTTON_GREEN = `${BUTTON_BASE} bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]`;
const BUTTON_QUIET = `${BUTTON_BASE} bg-white/10 hover:bg-white/20 text-white border border-white/20`;
const BUTTON_SAND = `${BUTTON_BASE} bg-[#d4a574] hover:bg-[#e3bd93] text-[#1a2818]`;

type CardCopy = { kicker: string; title: string; tag: string; lines: readonly string[] };

function OfferCardView({
  card,
  icon,
  accent,
  frame,
  children,
}: {
  card: CardCopy;
  icon: ReactNode;
  /** Text color for the kicker and the tag. */
  accent: string;
  /** Border and background classes for the card. */
  frame: string;
  children: ReactNode;
}) {
  return (
    <article className={`flex flex-col rounded-2xl border p-6 md:p-7 backdrop-blur-sm ${frame}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${accent}`}>{card.kicker}</p>
      </div>
      <h2 className="text-2xl font-bold text-white leading-tight mb-2" style={display}>
        {card.title}
      </h2>
      <p className={`text-sm font-semibold mb-4 ${accent}`}>{card.tag}</p>
      <ul className="space-y-3 text-white/75 text-[15px] leading-relaxed mb-6">
        {card.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${accent}`} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-3">{children}</div>
    </article>
  );
}

const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

/**
 * The "Run it yourself" card once the repo switch is on: copy the setup prompt
 * for your own AI assistant, download the starter kit, read the guide, see the
 * code. The prompt is fetched by the server ahead of the click so copying
 * stays inside the click; when it cannot be read or copied, the page links to
 * the guide's own page instead.
 */
export function SelfHostActions({
  repoUrl,
  starterKitUrl,
  guideUrl,
  setupPromptUrl,
}: {
  repoUrl: string;
  starterKitUrl: string | null;
  guideUrl: string | null;
  setupPromptUrl: string | null;
}) {
  const o = VILLAGE_OS_OFFER;
  const prompt = trpc.villageOs.setupPrompt.useQuery(undefined, { staleTime: 60 * 60_000, refetchOnWindowFocus: false });
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const text = prompt.data?.text ?? null;
  const canCopy = !!text && typeof navigator !== "undefined" && !!navigator.clipboard;

  const copyPrompt = () => {
    if (!text || !navigator.clipboard) {
      setCopy("failed");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => setCopy("copied"),
      () => setCopy("failed"),
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-white/70 text-sm">{o.selfGuideHint}</p>
      <div className="flex flex-wrap gap-2">
        {canCopy ? (
          <button type="button" onClick={copyPrompt} className={BUTTON_GREEN}>
            <ClipboardCopy className="w-4 h-4" aria-hidden="true" />
            {o.selfCopyGuide}
          </button>
        ) : setupPromptUrl && !prompt.isLoading ? (
          <a href={setupPromptUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_GREEN}>
            {o.selfOpenGuidePrompt}
            {NEW_TAB}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        ) : null}
        {starterKitUrl ? (
          <a href={starterKitUrl} className={BUTTON_QUIET}>
            <Download className="w-4 h-4" aria-hidden="true" />
            {o.selfStarterKit}
          </a>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className={`text-sm min-h-5 ${copy === "failed" ? "text-white/80" : "text-[#7dd87d]"}`}>
        {copy === "copied" ? o.selfCopied : null}
        {copy === "failed" ? (
          <>
            {o.selfCopyFailed}{" "}
            {setupPromptUrl ? (
              <a href={setupPromptUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {o.selfOpenGuidePrompt}
                {NEW_TAB}
              </a>
            ) : null}
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {guideUrl ? (
          <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-4">
            {o.selfReadGuide}
            {NEW_TAB}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        ) : null}
        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-4">
          <Code2 className="w-4 h-4" aria-hidden="true" />
          {o.selfButton}
          {NEW_TAB}
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export default function VillageOs() {
  const offerQuery = trpc.villageOs.offer.useQuery(undefined, { staleTime: 5 * 60_000 });
  const offer = offerQuery.data ?? OFFER_CLOSED;
  const repoUrl = offer.showRepo ? httpsOnly(offer.repoUrl) : null;
  const membershipUrl = httpsOnly(offer.membershipUrl);
  const o = VILLAGE_OS_OFFER;

  return (
    <PageWrapper>
      <SEO
        title="Get your Village OS | ReGen Civics"
        description="Village OS runs a village's Game: its circles, roles, quests and gratitude. Run it yourself, free and open source, or ask the ReGen Civics team to host it, free for accepted Season 2 projects."
        url="https://regencivics.earth/village-os"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#14301f] to-[#0d2818]">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
          {/* Hero */}
          <AnimatedSection>
            <header className="mt-6 mb-12 max-w-3xl">
              <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase mb-3">Village OS</p>
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4" style={display}>
                {o.title}
              </h1>
              <p className="text-white/75 text-lg mb-4">{o.lede}</p>
              <a
                href={AMORA_VILLAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-11 text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-4"
              >
                {o.amoraLine}
                <span className="sr-only"> (opens in a new tab)</span>
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              </a>
            </header>
          </AnimatedSection>

          {/* The three ways in */}
          <AnimatedSection>
            <section aria-label="Ways to get Village OS" className="grid gap-5 lg:grid-cols-3 mb-12">
              <OfferCardView
                card={o.self}
                icon={<Code2 className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />}
                accent="text-[#7dd87d]"
                frame="bg-white/5 border-white/15"
              >
                {repoUrl ? (
                  <SelfHostActions
                    repoUrl={repoUrl}
                    starterKitUrl={httpsOnly(offer.starterKitUrl)}
                    guideUrl={httpsOnly(offer.guideUrl)}
                    setupPromptUrl={httpsOnly(offer.setupPromptUrl)}
                  />
                ) : (
                  <p className="text-white/60 text-sm">{o.selfPending}</p>
                )}
              </OfferCardView>

              <OfferCardView
                card={o.hosted}
                icon={<Server className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />}
                accent="text-[#7dd87d]"
                frame="bg-[#7dd87d]/10 border-[#7dd87d]/50"
              >
                <Link href={VILLAGE_OS_HOST_PATH} className={BUTTON_GREEN}>
                  {o.hostedButton}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </OfferCardView>

              <OfferCardView
                card={o.custom}
                icon={<Hammer className="w-5 h-5 text-[#d4a574]" aria-hidden="true" />}
                accent="text-[#d4a574]"
                frame="bg-gradient-to-br from-[#d4a574]/15 to-[#0d2818]/60 border-[#d4a574]/45"
              >
                <Link href="/custom-games" className={BUTTON_SAND}>
                  {o.customButton}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </OfferCardView>
            </section>
          </AnimatedSection>

          {/* How hosting works */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Sprout className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">{o.hosted.title}</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">How hosting works</h2>
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {o.howHostingWorks.map((step, i) => (
                  <li key={step.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold text-sm mb-3"
                    >
                      {i + 1}
                    </span>
                    <h3 className="text-white font-bold text-lg mb-1">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed">{step.body}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <Link href={VILLAGE_OS_HOST_PATH} className={BUTTON_GREEN}>
                  {o.hostedButton}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          </AnimatedSection>

          {/* The plain facts */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-[#e3ac4f]" aria-hidden="true" />
                <h2 className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Good to know</h2>
              </div>
              <ul className="space-y-2 text-white/75">
                {o.facts.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e3ac4f]" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </section>
          </AnimatedSection>

          {/* The founders circle */}
          <AnimatedSection>
            <section
              id="founders-circle"
              className="relative overflow-hidden rounded-2xl border-2 border-[#d4a574]/45 bg-gradient-to-br from-[#d4a574]/15 via-[#0d2818]/70 to-[#0d2818]/90 p-6 md:p-10 mb-8"
            >
              <div className="flex items-center gap-3 mb-3">
                <Heart className="w-5 h-5 text-[#d4a574]" aria-hidden="true" />
                <p className="text-[#d4a574] text-xs font-semibold tracking-[0.2em] uppercase">{o.circle.kicker}</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={display}>
                {o.circle.title}
              </h2>
              <div className="space-y-3 text-white/75 max-w-3xl mb-6">
                {/* lines[1], the membership sentence, waits for the Legal ruling with the button. */}
                {o.circle.lines
                  .filter((_line, i) => i !== 1 || membershipUrl !== null)
                  .map((line) => (
                    <p key={line}>{line}</p>
                  ))}
              </div>
              {membershipUrl ? (
                <a href={membershipUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_SAND}>
                  <Heart className="w-4 h-4" aria-hidden="true" />
                  {o.circle.button}
                  <span className="sr-only"> (opens in a new tab)</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              ) : (
                <p className="text-white/60 text-sm">{o.circle.pending}</p>
              )}
            </section>
          </AnimatedSection>
        </div>
      </div>
    </PageWrapper>
  );
}
