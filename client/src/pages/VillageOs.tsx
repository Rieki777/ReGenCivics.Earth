/**
 * Get your Village OS (/village-os, ADR-69).
 *
 * A start screen: the village mark, the four core modules, three gates,
 * the forge, the tools that integrate, the hosting quest, the field guide,
 * and weekly support from CORE.
 *
 * Every word comes from shared/villageOsOffer.ts. Two switches arrive from
 * villageOs.offer and both start off: the code link, the setup guide and the
 * starter kit wait for the Village OS repo's security cleanup
 * (VILLAGE_OS_SHOW_REPO), and the membership sentence
 * and button wait for the Legal session (VILLAGE_OS_MEMBERSHIP_URL). The page renders
 * whole with both off, which is also how it looks while the query loads.
 * No money moves anywhere on this page. Donate reads churchDonations.zeffyEnabled
 * and opens the Zeffy form page, or CORE's donate page when that query is empty.
 */

import { useId, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, ClipboardCopy, Code2, Download, ExternalLink } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { AnimatedSection } from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { JOIN_URL } from "@shared/sessionLinks";
import {
  AMORA_VILLAGE_URL,
  CORE_DONATE_PAGE_URL,
  VILLAGE_OS_HOST_PATH,
  VILLAGE_OS_OFFER,
  zeffyFormPageUrl,
  type OfferCard,
} from "@shared/villageOsOffer";

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
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 rounded-xl font-semibold text-sm";
const BUTTON_GREEN = `${BUTTON_BASE} bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]`;
const BUTTON_QUIET = `${BUTTON_BASE} bg-white/10 hover:bg-white/20 text-white border border-white/20`;
const BUTTON_SAND = `${BUTTON_BASE} bg-[#d4a574] hover:bg-[#e3bd93] text-[#1a2818]`;

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
      <p className="text-[#f0ebe3]/90 text-sm">{o.selfGuideHint}</p>
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
      <p role="status" aria-live="polite" className={`text-sm min-h-5 ${copy === "failed" ? "text-[#f0ebe3]" : "text-[#7dd87d]"}`}>
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

function VillageSeal() {
  return (
    <div
      className="relative mx-auto h-52 w-52 shrink-0 rounded-full border border-[#7dd87d]/40 bg-[radial-gradient(circle_at_50%_50%,rgba(125,216,125,0.18),transparent_46%)]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <circle cx="78" cy="100" r="46" fill="none" stroke="#7dd87d" strokeWidth="2" />
        <circle cx="122" cy="100" r="46" fill="none" stroke="#d4a574" strokeWidth="2" />
        <circle cx="100" cy="78" r="28" fill="none" stroke="#f0ebe3" strokeWidth="1.5" opacity="0.7" />
      </svg>
      <p className="absolute inset-0 grid place-items-center text-center font-bold text-white" style={display}>
        <span className="rounded-full bg-[#0d2818]/90 px-3 py-2 text-sm">Your village</span>
      </p>
    </div>
  );
}

function Notes({ title, lines }: { title: string; lines: readonly string[] }) {
  const o = VILLAGE_OS_OFFER;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="md:col-span-2">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#0d2818]/40 px-3 text-left text-sm font-bold text-[#f0ebe3]"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          {open ? o.notesClose : o.notesOpen}
          <span className="sr-only"> for {title}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#7dd87d] motion-safe:transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id={panelId} role="region" aria-label={title} hidden={!open} className={open ? "pt-3" : undefined}>
        {open ? (
          <ul className="space-y-2.5 text-[15px] leading-relaxed text-[#f0ebe3]/90">
            {lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7dd87d]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function GateArt({ kind }: { kind: OfferCard["key"] }) {
  if (kind === "hosted") {
    return (
      <svg viewBox="0 0 68 68" className="h-14 w-14" aria-hidden="true">
        <circle cx="34" cy="36" r="8" fill="#7dd87d" />
        <circle cx="18" cy="26" r="7" fill="none" stroke="#9de89d" strokeWidth="2" />
        <circle cx="50" cy="26" r="7" fill="none" stroke="#d4a574" strokeWidth="2" />
        <path d="M24 32l6 4M44 32l-6 4" stroke="#7dd87d" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "custom") {
    return (
      <svg viewBox="0 0 68 68" className="h-14 w-14" aria-hidden="true">
        <rect x="16" y="16" width="30" height="36" rx="3" fill="#d4a574" />
        <path d="M22 26h16M22 32h16M22 38h10" stroke="#1a2818" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 68 68" className="h-14 w-14" aria-hidden="true">
      <rect x="14" y="30" width="40" height="22" rx="4" fill="#1a472a" stroke="#7dd87d" strokeWidth="2" />
      <path d="M34 42V16" stroke="#7dd87d" strokeWidth="2" />
      <circle cx="34" cy="14" r="6" fill="#7dd87d" />
    </svg>
  );
}

const GATE_FRAME: Record<OfferCard["key"], string> = {
  self: "border-white/15 bg-white/5",
  hosted: "border-[#7dd87d]/50 bg-[#7dd87d]/10",
  custom: "border-[#d4a574]/50 bg-gradient-to-r from-[#d4a574]/16 to-[#0d2818]/30",
};

function DonateControl() {
  const o = VILLAGE_OS_OFFER;
  const zeffy = trpc.churchDonations.zeffyEnabled.useQuery(undefined, { staleTime: 5 * 60_000 });
  const formPage = zeffy.data?.enabled ? zeffyFormPageUrl(zeffy.data.embedUrl) : null;
  return (
    <a href={formPage ?? CORE_DONATE_PAGE_URL} target="_blank" rel="noopener noreferrer" className={BUTTON_SAND}>
      {o.circle.donateButton}
      {NEW_TAB}
      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
    </a>
  );
}

export default function VillageOs() {
  const offerQuery = trpc.villageOs.offer.useQuery(undefined, { staleTime: 5 * 60_000 });
  const offer = offerQuery.data ?? OFFER_CLOSED;
  const repoUrl = offer.showRepo ? httpsOnly(offer.repoUrl) : null;
  const membershipUrl = httpsOnly(offer.membershipUrl);
  const o = VILLAGE_OS_OFFER;
  const [guideOpen, setGuideOpen] = useState(false);
  const guideId = useId();

  return (
    <PageWrapper>
      <SEO
        title="Start your own game | ReGen Civics"
        description="Village OS is an open-source foundation for a village's Game, with an open library of modules. Run it yourself, or ask the team to host it, free for accepted Season 2 projects."
        url="https://regencivics.earth/village-os"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#14301f] to-[#0d2818]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-14">
          <AnimatedSection>
            <header className="grid items-center gap-6 md:grid-cols-[220px_1fr] md:gap-10">
              <VillageSeal />
              <div>
                <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.2em] text-[#7dd87d]">Village OS</p>
                <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-6xl" style={display}>
                  {o.heroTitle}
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-[#f0ebe3]/90">{o.lede}</p>
                <a
                  href={AMORA_VILLAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-[#7dd87d] underline underline-offset-4 hover:text-[#9de89d]"
                >
                  {o.amoraLine}
                  {NEW_TAB}
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </header>
          </AnimatedSection>

          <AnimatedSection>
            <section className="mt-10" aria-labelledby="standard-modules">
              <h2 id="standard-modules" className="mb-4 text-2xl font-bold text-white md:text-3xl" style={display}>
                {o.standardLabel}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {o.standardModules.map((mod) => (
                  <li key={mod.name} className="rounded-2xl border border-white/12 bg-white/5 p-4">
                    <p className="font-bold text-white" style={display}>{mod.name}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#f0ebe3]/85">{mod.line}</p>
                  </li>
                ))}
              </ul>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <section className="mt-12" aria-label="Three gates">
              <h2 className="mb-4 text-3xl font-bold text-white" style={display}>Three gates</h2>
              <div className="grid gap-3">
                {([o.self, o.hosted, o.custom] as OfferCard[]).map((card) => (
                  <article
                    key={card.key}
                    className={`grid gap-4 rounded-3xl border p-4 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 md:grid-cols-[84px_1fr] md:p-5 ${GATE_FRAME[card.key]}`}
                  >
                    <div className="grid h-[84px] w-[84px] place-items-center rounded-[22px] border border-white/12 bg-[#0d2818]/50">
                      <GateArt kind={card.key} />
                    </div>
                    <div>
                      <p className={`text-[13px] font-bold uppercase tracking-[0.16em] ${card.key === "custom" ? "text-[#e3bd93]" : "text-[#7dd87d]"}`}>
                        {card.gate} · {card.path}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-white" style={display}>{card.title}</h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#f0ebe3]/90">{card.blurb}</p>
                      <p className="mt-3">
                        <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-[13px] font-extrabold ${card.key === "custom" ? "bg-[#d4a574] text-[#1a2818]" : "bg-[#7dd87d] text-[#1a472a]"}`}>
                          {card.priceBadge ?? card.tag}
                        </span>
                      </p>
                      <div className="mt-3">
                        {card.key === "self" && (
                          repoUrl ? (
                            <SelfHostActions
                              repoUrl={repoUrl}
                              starterKitUrl={httpsOnly(offer.starterKitUrl)}
                              guideUrl={httpsOnly(offer.guideUrl)}
                              setupPromptUrl={httpsOnly(offer.setupPromptUrl)}
                            />
                          ) : (
                            <p className="text-[15px] text-[#f0ebe3]/85">{o.selfPending}</p>
                          )
                        )}
                        {card.key === "hosted" && (
                          <Link href={VILLAGE_OS_HOST_PATH} className={BUTTON_GREEN}>
                            {o.hostedButton}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                        {card.key === "custom" && (
                          <Link href="/custom-games" className={BUTTON_SAND}>
                            {o.customButton}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <Notes title={card.title} lines={card.lines} />
                  </article>
                ))}
              </div>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <section className="mt-12 rounded-3xl border-2 border-[#7dd87d]/45 bg-[#7dd87d]/10 p-5 md:p-8">
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#7dd87d]">{o.forge.kicker}</p>
              <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl" style={display}>{o.forge.title}</h2>
              <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#f0ebe3]/90">{o.forge.body}</p>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <section className="mt-12" aria-labelledby="tools-heading">
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#7dd87d]">{o.tools.kicker}</p>
              <h2 id="tools-heading" className="mt-2 text-3xl font-bold text-white" style={display}>{o.tools.title}</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {o.tools.items.map((tool) => {
                  const href = httpsOnly(tool.url);
                  const inner = (
                    <>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1a472a] text-sm font-extrabold text-[#7dd87d]" aria-hidden="true">
                        {tool.name.slice(0, 1)}
                      </span>
                      <span>
                        <span className="block font-bold text-white" style={display}>{tool.name}</span>
                        <span className="mt-1 block text-[15px] leading-relaxed text-[#f0ebe3]/85">{tool.line}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={tool.name}>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-full gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 hover:border-[#7dd87d]/50">
                          {inner}
                          {NEW_TAB}
                        </a>
                      ) : (
                        <div className="flex h-full gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 rounded-3xl border border-[#d4a574]/40 bg-[#d4a574]/10 p-5 md:p-6">
                <h3 className="text-2xl font-bold text-white" style={display}>{o.tools.integrateTitle}</h3>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#f0ebe3]/90">{o.tools.integrateBody}</p>
                <Link href={o.tools.integrateHref} className={`${BUTTON_GREEN} mt-4`}>
                  {o.tools.integrateButton}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <section className="mt-12" aria-labelledby="quest-heading">
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#7dd87d]">Quest line</p>
              <h2 id="quest-heading" className="mt-2 text-3xl font-bold text-white" style={display}>{o.questTitle}</h2>
              <ol className="mt-4 grid gap-3">
                {o.howHostingWorks.map((step, i) => (
                  <li key={step.title} className="rounded-r-2xl border-l-[3px] border-[#7dd87d] bg-white/5 p-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#7dd87d] text-sm font-extrabold text-[#1a472a]" aria-hidden="true">
                      {i + 1}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-white" style={display}>
                      <span className="sr-only">Level {i + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#f0ebe3]/85">{step.body}</p>
                  </li>
                ))}
              </ol>
              <Link href={VILLAGE_OS_HOST_PATH} className={`${BUTTON_GREEN} mt-4`}>
                {o.hostedButton}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <section className="mt-12 rounded-3xl border border-white/12 bg-white/5 p-5 md:p-6">
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#e3ac4f]">{o.fieldGuide.kicker}</p>
              <h2 className="mt-2 text-2xl font-bold text-white" style={display}>{o.fieldGuide.title}</h2>
              <button
                type="button"
                className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#0d2818]/40 px-3 text-left text-sm font-bold text-[#f0ebe3]"
                aria-expanded={guideOpen}
                aria-controls={guideId}
                onClick={() => setGuideOpen((v) => !v)}
              >
                <span>{guideOpen ? o.fieldGuide.close : o.fieldGuide.open}</span>
                <ChevronDown className={`h-4 w-4 text-[#e3ac4f] motion-safe:transition-transform ${guideOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <div id={guideId} role="region" aria-label={o.fieldGuide.title} hidden={!guideOpen} className={guideOpen ? "pt-3" : undefined}>
                {guideOpen ? (
                  <ul className="space-y-2.5 text-[15px] leading-relaxed text-[#f0ebe3]/90">
                    {o.facts.map((fact) => (
                      <li key={fact} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e3ac4f]" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <section id="support" className="mt-12 mb-8 rounded-3xl border-2 border-[#d4a574]/50 bg-gradient-to-br from-[#d4a574]/16 via-[#0d2818]/70 to-[#0d2818]/90 p-5 md:p-8">
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#e3bd93]">{o.circle.kicker}</p>
              <h2 className="mt-2 text-3xl font-bold text-white" style={display}>{o.circle.title}</h2>
              <div className="mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-[#f0ebe3]/90">
                {o.circle.lines
                  .filter((_line, i) => i !== 1 || membershipUrl !== null)
                  .map((line) => (
                    <p key={line}>{line}</p>
                  ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <DonateControl />
                <a href={JOIN_URL} className={BUTTON_GREEN}>{o.circle.joinButton}</a>
                {membershipUrl ? (
                  <a href={membershipUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_SAND}>
                    {o.circle.button}
                    {NEW_TAB}
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </section>
          </AnimatedSection>
        </div>
      </div>
    </PageWrapper>
  );
}
