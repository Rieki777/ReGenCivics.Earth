/**
 * Tokenized community email preference center.
 * No login. Unsubscribe-from-all lives here. /unsubscribe stays as the
 * email-entry fallback for people without a link.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Mail, Pause, Shield } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import {
  EMAIL_TOPIC_KEYS,
  EMAIL_TOPICS,
  PREFS_ACCOUNT_MAIL_COPY,
  PREFS_PAUSE_COPY,
  PREFS_UNSUB_ALL_COPY,
  isEmailTopicKey,
  type EmailTopicKey,
} from "@shared/emailPrefs";

type TopicMap = Record<EmailTopicKey, boolean>;

function readSearch(): { token: string; mute: EmailTopicKey | null } {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const rawMute = params.get("mute");
  return { token, mute: isEmailTopicKey(rawMute) ? rawMute : null };
}

export default function EmailPreferences() {
  const { token, mute } = useMemo(readSearch, []);
  const [topics, setTopics] = useState<TopicMap | null>(null);
  const [mutedLabel, setMutedLabel] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmUnsub, setConfirmUnsub] = useState(false);
  const muteOnce = useRef(false);

  const prefsQuery = trpc.newsletter.getPreferences.useQuery(
    { token },
    { enabled: token.length > 16, retry: false },
  );

  useEffect(() => {
    if (!prefsQuery.data) return;
    setTopics(prefsQuery.data.topics);
  }, [prefsQuery.data]);

  const saveMutation = trpc.newsletter.savePreferences.useMutation({
    onSuccess: (data) => {
      setTopics(data.topics);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    },
  });
  const muteMutation = trpc.newsletter.muteTopic.useMutation({
    onSuccess: (data) => {
      setTopics(data.topics);
      if (mute) setMutedLabel(EMAIL_TOPICS[mute].label);
    },
  });
  const pauseMutation = trpc.newsletter.pauseMarketing.useMutation({
    onSuccess: () => prefsQuery.refetch(),
  });
  const unsubMutation = trpc.newsletter.unsubscribeAll.useMutation({
    onSuccess: () => prefsQuery.refetch(),
  });
  const resubMutation = trpc.newsletter.resubscribe.useMutation({
    onSuccess: () => {
      setConfirmUnsub(false);
      prefsQuery.refetch();
    },
  });

  useEffect(() => {
    if (!token || !mute || muteOnce.current) return;
    if (!prefsQuery.data) return;
    muteOnce.current = true;
    muteMutation.mutate({ token, topic: mute });
  }, [token, mute, prefsQuery.data]);

  function toggle(key: EmailTopicKey) {
    if (!topics || !token) return;
    const next = { ...topics, [key]: !topics[key] };
    setTopics(next);
    saveMutation.mutate({ token, topics: next });
  }

  const prefs = prefsQuery.data;
  const pausedUntil = prefs?.pausedUntil ? new Date(prefs.pausedUntil) : null;
  const isPaused = Boolean(pausedUntil && pausedUntil.getTime() > Date.now());
  const loading = prefsQuery.isLoading || muteMutation.isPending;
  const error = !token
    ? "This page needs a link from an email we sent you."
    : prefsQuery.error?.message || saveMutation.error?.message || muteMutation.error?.message;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#1e3a2a] to-[#0d2818]">
      <SEO
        title="Manage email preferences"
        description="Choose which ReGen Civics community emails you receive."
        noIndex
      />

      <div className="container max-w-lg mx-auto px-4 pt-24 pb-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-8 transition-colors"
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
            {prefs?.email && (
              <p className="text-white/80 text-sm">{prefs.email}</p>
            )}
          </div>

          {loading && !topics && (
            <p className="text-white/70 text-sm text-center flex items-center justify-center gap-2">
              <SeedOfLifeIcon className="w-5 h-5 animate-spin" size={20} />
              Loading your choices...
            </p>
          )}

          {error && !prefs && (
            <div className="text-center space-y-4">
              <p className="text-white/80 text-sm leading-relaxed">{error}</p>
              <p className="text-white/60 text-sm leading-relaxed">
                You can still leave the community list by entering your email.
              </p>
              <Link href="/unsubscribe">
                <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-xl">
                  Open the email-entry page
                </Button>
              </Link>
            </div>
          )}

          {prefs && topics && prefs.isActive && (
            <div className="space-y-6">
              {mutedLabel && (
                <div className="rounded-xl border border-[#7dd87d]/30 bg-[#7dd87d]/10 p-4">
                  <p className="text-white text-sm font-medium">{mutedLabel} is now off.</p>
                  <p className="text-white/70 text-xs mt-1">You can turn it back on below.</p>
                </div>
              )}

              {savedFlash && (
                <p className="text-[#7dd87d] text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved.
                </p>
              )}

              {isPaused && pausedUntil && (
                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <p className="text-white text-sm font-medium">Community mail is paused.</p>
                  <p className="text-white/70 text-xs mt-1">
                    It resumes {pausedUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                  </p>
                </div>
              )}

              <fieldset className="space-y-3">
                <legend className="text-white font-medium text-sm mb-2">Community topics</legend>
                {EMAIL_TOPIC_KEYS.map((key) => {
                  const meta = EMAIL_TOPICS[key];
                  const on = topics[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={on}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-left min-h-12"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-white">{meta.label}</span>
                        <span className="block text-white/70 text-xs mt-0.5">{meta.description}</span>
                      </span>
                      <span
                        className={`w-10 h-6 rounded-full flex-shrink-0 relative transition-colors ${
                          on ? "bg-[#7dd87d]" : "bg-white/20"
                        }`}
                        aria-hidden="true"
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            on ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </fieldset>

              <p className="text-white/70 text-xs leading-relaxed">{PREFS_ACCOUNT_MAIL_COPY}</p>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <p className="text-white/70 text-xs leading-relaxed">{PREFS_PAUSE_COPY}</p>
                {isPaused ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => pauseMutation.mutate({ token, days: 0 as const })}
                    disabled={pauseMutation.isPending}
                    className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent rounded-xl min-h-12"
                  >
                    Resume community mail
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => pauseMutation.mutate({ token, days: 30 as const })}
                    disabled={pauseMutation.isPending}
                    className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent rounded-xl min-h-12"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause all community mail for 30 days
                  </Button>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <p className="text-white/70 text-xs leading-relaxed">{PREFS_UNSUB_ALL_COPY}</p>
                {!confirmUnsub ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmUnsub(true)}
                    className="w-full border-red-400/40 text-red-200 hover:bg-red-500/10 bg-transparent rounded-xl min-h-12"
                  >
                    Unsubscribe from all
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-white text-sm">Stop all community mail for this address?</p>
                    <Button
                      type="button"
                      onClick={() => unsubMutation.mutate({ token })}
                      disabled={unsubMutation.isPending}
                      className="w-full bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl min-h-12"
                    >
                      Yes, unsubscribe from all
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmUnsub(false)}
                      className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent rounded-xl"
                    >
                      Keep my topics
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {prefs && !prefs.isActive && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-10 h-10 text-[#7dd87d] mx-auto" />
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                Community mail is off
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">{PREFS_ACCOUNT_MAIL_COPY}</p>
              <Button
                type="button"
                onClick={() => resubMutation.mutate({ token })}
                disabled={resubMutation.isPending}
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-xl min-h-12"
              >
                Turn community mail back on
              </Button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#7dd87d]/80 flex-shrink-0 mt-0.5" />
              <p className="text-white/60 text-xs leading-relaxed">
                This page is tied to the email that received the link. Investor and funder mail is a separate list and is not managed here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
