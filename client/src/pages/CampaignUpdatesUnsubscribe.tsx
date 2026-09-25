/**
 * /campaign-updates/unsubscribe?token=... : the "Stop these emails" link on
 * every list letter Rye sends from admin Outbound to campaign email
 * followers and the crowdpool waitlist.
 *
 * Nothing happens on load. The person picks one of two buttons, so a mail
 * scanner that opens links cannot unsubscribe anyone. The server answers
 * { ok: true } for any token, so this page never learns (or shows) whether
 * the token matched.
 */
import { useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CheckCircle, Loader2, MailX } from "lucide-react";

export function readUnsubscribeToken(search: string): string | null {
  const token = new URLSearchParams(search).get("token")?.trim() ?? "";
  return token.length === 32 ? token : null;
}

/**
 * Which letter the link came from (server/lib/outboundAudience.ts
 * listUnsubscribeUrl). "all": a letter to everyone following a campaign by
 * email, where stopping one campaign would leave the person on that list, so
 * only "stop all" is offered. "waitlist": the crowdpool waitlist.
 */
export function readUnsubscribeList(search: string): "all" | "waitlist" | "campaign" {
  const list = new URLSearchParams(search).get("list");
  return list === "all" ? "all" : list === "waitlist" ? "waitlist" : "campaign";
}

export default function CampaignUpdatesUnsubscribe() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const token = readUnsubscribeToken(search);
  const listKind = readUnsubscribeList(search);
  const { isAuthenticated } = useAuth();
  const unsubscribe = trpc.campaigns.unsubscribeEmailFollow.useMutation();
  const [state, setState] = useState<"choose" | "done" | "error">(token ? "choose" : "error");

  const stop = async (scope: "this" | "all") => {
    if (!token) return;
    try {
      await unsubscribe.mutateAsync({ token, scope });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-[70vh] px-4 py-16">
      <SEO title="Stop campaign emails" description="Stop emails about ReGen Civics campaigns." url="/campaign-updates/unsubscribe" noIndex />
      <div className="max-w-xl mx-auto bg-white text-[#1a472a] rounded-2xl p-6 sm:p-8 shadow-xl light-form-island">
        {state === "choose" && (
          <>
            <MailX className="w-8 h-8 text-[#4a7c59] mb-3" />
            <h1 className="text-2xl font-bold mb-2">Stop campaign emails</h1>
            <p className="text-[#1a472a]/85 mb-6">
              {listKind === "all"
                ? "This letter went to everyone following a campaign by email. You can follow a campaign again any time from its page."
                : "Choose what to stop. You can follow a campaign again any time from its page."}
            </p>
            <div className="flex flex-col gap-3">
              {listKind !== "all" && (
                <Button
                  onClick={() => stop("this")}
                  disabled={unsubscribe.isPending}
                  className="w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white"
                >
                  {unsubscribe.isPending && unsubscribe.variables?.scope === "this"
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : null}
                  {listKind === "waitlist" ? "Take me off the waitlist" : "Stop emails about this campaign"}
                </Button>
              )}
              <Button
                variant={listKind === "all" ? "default" : "outline"}
                onClick={() => stop("all")}
                disabled={unsubscribe.isPending}
                className={listKind === "all" ? "w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white" : "w-full border-[#4a7c59] text-[#1a472a]"}
              >
                {unsubscribe.isPending && unsubscribe.variables?.scope === "all"
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : null}
                Stop all campaign emails
              </Button>
            </div>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle className="w-8 h-8 text-[#4a7c59] mb-3" />
            <h1 className="text-2xl font-bold mb-2">Done. You won't get these emails anymore.</h1>
            {!isAuthenticated && (
              <p className="text-[#1a472a]/85 mb-6">
                Want to keep up another way? Make a free account and follow projects from your notifications.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {!isAuthenticated && (
                <Link href="/sign-in?returnTo=%2Fcampaigns">
                  <Button className="bg-[#4a7c59] hover:bg-[#1a472a] text-white">Make your account</Button>
                </Link>
              )}
              <Link href="/campaigns">
                <Button variant="outline" className="border-[#4a7c59] text-[#1a472a]">See live campaigns</Button>
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <MailX className="w-8 h-8 text-[#4a7c59] mb-3" />
            <h1 className="text-2xl font-bold mb-2">That link didn't work.</h1>
            <p className="text-[#1a472a]/85 mb-6">
              Open the "Stop these emails" link from the email again, or write to the ReGen Civics team and we'll take you off the list.
            </p>
            <Link href="/campaigns">
              <Button variant="outline" className="border-[#4a7c59] text-[#1a472a]">See live campaigns</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
