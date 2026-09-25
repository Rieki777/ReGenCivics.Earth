/**
 * Money routes, as a project's stewards manage them (build spec 2026-09-25,
 * sections 7 and 14.1). A route is the project's own page on Ma Earth (gifts)
 * or Steward (loans). A steward adds one here; a ReGen Civics admin checks it
 * in the review dialog; only verified routes, and example routes on example
 * campaigns, reach the public page's "Putting money in" block. Money through
 * a route never passes through ReGen Civics.
 *
 * Every action calls a campaigns.* procedure that checks the steward on the
 * server (server/lib/project-steward.ts): addPartnerLink, removePartnerLink,
 * getPartnerLinksForSteward. The link check here is the server's own
 * (server/lib/partner-links.ts validateRouteUrl), run early so a mistyped
 * link is caught before sending; the server checks it again.
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Wallet } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EligibilityQuiz, partnerForRecommendation } from "@/components/crowdpool/EligibilityQuiz";
import { MONEY_ROUTES_CARD, ROUTE_LABELS } from "@shared/crowdpoolCopy";
import { decodeBasicEntities } from "@shared/htmlText";
import { validateProofUrl, validateRouteUrl, type RoutePartner } from "../../../../server/lib/partner-links";

export type StewardRoute = {
  id: number;
  partner: string;
  label?: string | null;
  url: string;
  status: string;
  reviewNote?: string | null;
};

function routeLabel(r: StewardRoute): string {
  if (r.partner === "maearth" || r.partner === "gosteward") return ROUTE_LABELS[r.partner];
  return decodeBasicEntities(r.label ?? r.partner);
}

function statusLine(r: StewardRoute): string {
  switch (r.status) {
    case "verified": return MONEY_ROUTES_CARD.status.verified;
    case "rejected": return MONEY_ROUTES_CARD.status.rejected(decodeBasicEntities(r.reviewNote ?? "").trim());
    case "example": return MONEY_ROUTES_CARD.status.example;
    default: return MONEY_ROUTES_CARD.status.pending;
  }
}

export function MoneyRoutesCard({
  campaignId,
  isExample,
  closed,
  isAdmin = false,
  currencySymbol = "$",
}: {
  campaignId: number;
  isExample: boolean;
  closed: boolean;
  /** Admins may remove example routes; stewards may not. */
  isAdmin?: boolean;
  currencySymbol?: string;
}) {
  const utils = trpc.useUtils();
  const { data: routes, isLoading, error } = trpc.campaigns.getPartnerLinksForSteward.useQuery(
    { campaignId },
    { retry: false },
  );
  const { data: settings } = trpc.campaigns.crowdpoolSettings.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const loanRoutesOpen = settings?.loanRoutesOpen ?? false;

  const [partner, setPartner] = useState<RoutePartner>("maearth");
  const [url, setUrl] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const refresh = () => utils.campaigns.getPartnerLinksForSteward.invalidate({ campaignId });

  const add = trpc.campaigns.addPartnerLink.useMutation({
    onSuccess: () => {
      toast.success(MONEY_ROUTES_CARD.sent);
      setUrl("");
      setProofUrl("");
      refresh();
    },
    onError: (err) => {
      setUrlError(err.message || "That didn't go through. Try again.");
      toast.error(err.message || "That didn't go through. Try again.");
    },
  });
  const remove = trpc.campaigns.removePartnerLink.useMutation({
    onSuccess: () => {
      toast.success(MONEY_ROUTES_CARD.removed);
      refresh();
    },
    onError: (err) => toast.error(err.message || "That didn't go through. Try again."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    setProofError(null);
    const checked = validateRouteUrl(partner, url);
    if (!checked.ok) {
      setUrlError(checked.message);
      urlRef.current?.focus();
      return;
    }
    let proof: string | undefined;
    if (proofUrl.trim()) {
      const p = validateProofUrl(proofUrl);
      if (!p.ok) {
        setProofError(p.message);
        return;
      }
      proof = p.url;
    }
    add.mutate({ campaignId, partner, url: checked.url, proofUrl: proof });
  };

  const canAdd = !isExample && !closed;

  return (
    <section id="money-routes" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <Wallet className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
        {MONEY_ROUTES_CARD.title}
      </h2>
      <p className="text-sm text-[#1a472a]/80 mb-4">{MONEY_ROUTES_CARD.intro}</p>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-[#1a472a]/80 py-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading routes...
        </p>
      ) : error ? (
        <p className="text-sm text-red-700 py-2">{error.message || "Couldn't load the routes."}</p>
      ) : !routes || routes.length === 0 ? (
        <p className="text-sm text-[#1a472a]/80 py-2">{MONEY_ROUTES_CARD.none}</p>
      ) : (
        <ul className="space-y-3">
          {routes.map((r) => {
            const example = r.status === "example";
            const canRemove = !example || isAdmin;
            return (
              <li key={r.id} className="rounded-2xl border border-[#1a472a]/10 bg-[#f0f7f0] p-3 sm:p-4 min-w-0">
                <p className="font-semibold text-[#1a472a]">{routeLabel(r)}</p>
                {!example && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-[#4a7c59] underline underline-offset-2 break-all min-h-11"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {r.url}
                  </a>
                )}
                <p className="text-sm text-[#1a472a]/85 mt-1 break-words">{statusLine(r)}</p>
                {canRemove && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 min-h-11 border-[#1a472a]/30 text-[#1a472a]"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ linkId: r.id })}
                    aria-label={`${MONEY_ROUTES_CARD.remove}: ${routeLabel(r)}`}
                  >
                    {MONEY_ROUTES_CARD.remove}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isExample ? (
        <p className="mt-4 text-sm text-[#1a472a]/80">{MONEY_ROUTES_CARD.exampleCampaign}</p>
      ) : closed ? (
        <p className="mt-4 text-sm text-[#1a472a]/80">{MONEY_ROUTES_CARD.closedCampaign}</p>
      ) : null}

      {canAdd && (
        <form onSubmit={submit} noValidate className="mt-5 border-t border-[#1a472a]/10 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`route-partner-${campaignId}`}>{MONEY_ROUTES_CARD.partnerLabel}</Label>
            <select
              id={`route-partner-${campaignId}`}
              value={partner}
              onChange={(e) => { setPartner(e.target.value as RoutePartner); setUrlError(null); }}
              className="w-full min-h-11 rounded-md border border-[#1a472a]/20 bg-white px-3 text-base md:text-sm text-[#1a472a]"
            >
              <option value="maearth">{MONEY_ROUTES_CARD.partnerOptions.maearth}</option>
              <option value="gosteward">{MONEY_ROUTES_CARD.partnerOptions.gosteward}</option>
            </select>
            {partner === "gosteward" && !loanRoutesOpen && (
              <p className="text-sm text-[#1a472a]/80">{MONEY_ROUTES_CARD.loanRoutesWait}</p>
            )}
          </div>

          <details className="rounded-2xl border border-[#1a472a]/10 bg-white p-3">
            <summary className="cursor-pointer min-h-11 flex items-center text-sm font-semibold text-[#4a7c59]">
              {MONEY_ROUTES_CARD.notSure}
            </summary>
            <div className="mt-3">
              <EligibilityQuiz
                embedded
                idPrefix={`route-quiz-${campaignId}`}
                currencySymbol={currencySymbol}
                onResult={(rec) => {
                  setPartner(partnerForRecommendation(rec));
                  setUrlError(null);
                }}
              />
            </div>
          </details>

          <div className="space-y-1.5">
            <Label htmlFor={`route-url-${campaignId}`}>{MONEY_ROUTES_CARD.urlLabel}</Label>
            <Input
              ref={urlRef}
              id={`route-url-${campaignId}`}
              type="url"
              inputMode="url"
              autoComplete="off"
              maxLength={512}
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
              placeholder={partner === "maearth" ? "https://maearth.com/..." : "https://gosteward.com/..."}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? `route-url-${campaignId}-error` : undefined}
              className="min-h-11 text-base md:text-sm"
            />
            {urlError && (
              <p id={`route-url-${campaignId}-error`} role="alert" className="text-sm text-red-700">{urlError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`route-proof-${campaignId}`}>{MONEY_ROUTES_CARD.proofLabel}</Label>
            <Input
              id={`route-proof-${campaignId}`}
              type="url"
              inputMode="url"
              autoComplete="off"
              maxLength={512}
              value={proofUrl}
              onChange={(e) => { setProofUrl(e.target.value); setProofError(null); }}
              aria-invalid={!!proofError}
              aria-describedby={`route-proof-${campaignId}-help`}
              className="min-h-11 text-base md:text-sm"
            />
            <p id={`route-proof-${campaignId}-help`} className="text-sm text-[#1a472a]/75">{MONEY_ROUTES_CARD.proofHelper}</p>
            {proofError && <p role="alert" className="text-sm text-red-700">{proofError}</p>}
          </div>

          <Button type="submit" disabled={add.isPending} className="min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
            {add.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {MONEY_ROUTES_CARD.send}
          </Button>

        </form>
      )}
    </section>
  );
}
