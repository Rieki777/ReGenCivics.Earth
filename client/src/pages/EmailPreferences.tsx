/**
 * Tokenized email preferences stub.
 * Outbound letters link here. Unsubscribe from all is on this page.
 * Topic toggles land in a follow-up prefs PR that upgrades this route.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { trpc } from "@/lib/trpc";

type PrefsState = "idle" | "loading" | "success" | "error";

export default function EmailPreferences() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
    [],
  );
  const [state, setState] = useState<PrefsState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const unsubscribeByToken = trpc.newsletter.unsubscribeByToken.useMutation({
    onSuccess: () => setState("success"),
    onError: (err) => {
      setState("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleUnsubscribeAll = () => {
    if (!token) return;
    setState("loading");
    setErrorMsg("");
    unsubscribeByToken.mutate({ token });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#1e3a2a] to-[#0d2818]">
      <SEO
        title="Email preferences | ReGen Civics"
        description="Manage your ReGen Civics newsletter subscription."
      />

      <div className="container max-w-lg mx-auto px-4 pt-24 pb-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/70 hover:text-white/80 text-sm mb-8 min-h-11"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-[#1a472a]/60 backdrop-blur-sm border border-[#7dd87d]/20 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#7dd87d]/15 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-[#7dd87d]" />
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Email preferences
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Topic controls for recordings, Harvest, and letters will show here next.
            </p>
          </div>

          {state === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#7dd87d]" />
              </div>
              <h2
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                You've been unsubscribed from all letters
              </h2>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                You will no longer receive ReGen Civics newsletter emails. Subscribe again from the homepage if you change your mind.
              </p>
              <Link href="/">
                <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-xl min-h-11">
                  Return Home
                </Button>
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-4 mb-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300 font-medium text-sm">Something went wrong</span>
                </div>
                <p className="text-red-300/70 text-xs">{errorMsg}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => { setState("idle"); setErrorMsg(""); }}
                className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent rounded-xl min-h-11"
              >
                Try again
              </Button>
            </div>
          )}

          {(state === "idle" || state === "loading") && (
            <div className="space-y-4">
              {token ? (
                <>
                  <p className="text-white/70 text-sm leading-relaxed text-center">
                    This stops every ReGen Civics newsletter letter. You can subscribe again later from the site.
                  </p>
                  <Button
                    type="button"
                    onClick={handleUnsubscribeAll}
                    disabled={state === "loading"}
                    className="w-full bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-xl min-h-11 text-base disabled:opacity-50"
                  >
                    {state === "loading" ? (
                      <span className="flex items-center gap-2">
                        <SeedOfLifeIcon className="w-5 h-5 animate-spin" size={20} />
                        Processing...
                      </span>
                    ) : (
                      "Unsubscribe from all"
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-white/70 text-sm leading-relaxed text-center">
                  Open this page from a letter we sent you. To leave by typing your address, use{" "}
                  <Link href="/unsubscribe" className="text-[#7dd87d] underline hover:text-[#9de89d]">
                    the unsubscribe form
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
