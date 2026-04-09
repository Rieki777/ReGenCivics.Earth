/**
 * Unsubscribe / Email Preferences Page
 * Allows users to unsubscribe from newsletters by entering their email.
 * GDPR-compliant with clear confirmation messaging.
 * Mobile-first, enchanted forest theme.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Shield, Leaf } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";

type UnsubState = "idle" | "loading" | "success" | "error";

export default function Unsubscribe() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<UnsubState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const unsubscribeMutation = trpc.newsletter.unsubscribe.useMutation({
    onSuccess: () => {
      setState("success");
    },
    onError: (err) => {
      setState("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");
    setErrorMsg("");
    unsubscribeMutation.mutate({ email: email.trim().toLowerCase() });
  };

  const handleReset = () => {
    setEmail("");
    setState("idle");
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#1e3a2a] to-[#0d2818]">
      <SEO
        title="Email Preferences | ReGen Civics"
        description="Manage your email subscription preferences for ReGen Civics communications."
      />

      <div className="container max-w-lg mx-auto px-4 pt-24 pb-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-[#1a472a]/60 backdrop-blur-sm border border-[#7dd87d]/20 rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#7dd87d]/15 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-[#7dd87d]" />
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Email Preferences
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Manage your newsletter subscription. We respect your inbox and your right to choose what you receive.
            </p>
          </div>

          {/* Success State */}
          {state === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#7dd87d]" />
              </div>
              <h2
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                You've been unsubscribed
              </h2>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                <strong className="text-white/80">{email}</strong> has been removed from our mailing list.
                You will no longer receive newsletter emails from ReGen Civics.
              </p>
              <p className="text-white/60 text-xs mb-6">
                Changed your mind? You can always re-subscribe from our homepage or any form on the site.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent rounded-xl"
                >
                  Unsubscribe Another Email
                </Button>
                <Link href="/">
                  <Button className="bg-[#7dd87d] hover:bg-[#6cc86c] text-[#1a472a] font-bold rounded-xl w-full sm:w-auto">
                    Return Home
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Error State */}
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
                onClick={handleReset}
                className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent rounded-xl"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Form State */}
          {(state === "idle" || state === "loading") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="unsub-email"
                  className="block text-white/70 text-sm font-medium mb-2"
                >
                  Email Address
                </label>
                <Input
                  id="unsub-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50 focus:ring-[#7dd87d]/20 rounded-xl h-12"
                  disabled={state === "loading"}
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                disabled={state === "loading" || !email.trim()}
                className="w-full bg-[#7dd87d] hover:bg-[#6cc86c] text-[#1a472a] font-bold rounded-xl h-12 text-base disabled:opacity-50"
              >
                {state === "loading" ? (
                  <span className="flex items-center gap-2">
                    <SeedOfLifeIcon className="w-5 h-5 animate-spin" size={20} />
                    Processing...
                  </span>
                ) : (
                  "Unsubscribe"
                )}
              </Button>
            </form>
          )}

          {/* Privacy note */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#7dd87d]/60 flex-shrink-0 mt-0.5" />
              <p className="text-white/60 text-xs leading-relaxed">
                Your privacy matters. We process unsubscribe requests immediately and do not share your email with third parties.
                For questions, reach out through our{" "}
                <a
                  href="https://discord.gg/8aTzTxH3Qe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7dd87d]/60 underline hover:text-[#7dd87d]"
                >
                  Discord
                </a>{" "}
                or{" "}
                <a
                  href="https://chat.whatsapp.com/KArQzEs0UQuLsGaLTvbp34"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7dd87d]/60 underline hover:text-[#7dd87d]"
                >
                  WhatsApp
                </a>{" "}
                community channels. Direct email responses are not provided.
              </p>
            </div>
          </div>

          {/* Additional links */}
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-white/55">
            <Link href="/privacy-policy" className="hover:text-white/50 transition-colors">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="/terms-of-use" className="hover:text-white/50 transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
