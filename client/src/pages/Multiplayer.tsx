/**
 * Multiplayer Mode: the crew quest surface (Phase A).
 *
 * Lists the live multiplayer quests, shows forming crews by bioregion
 * (aggregate counts only), and takes signups: pick a quest, pick your
 * bioregion, add an optional note. When enough players in a bioregion sign
 * up for the same quest, the assembly cron forms a crew, opens its crew
 * chat thread, and emails everyone.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Apple,
  CheckCircle2,
  ChevronDown,
  Compass,
  Droplets,
  MessageSquare,
  Sprout,
  TreeDeciduous,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { BioregionSelect } from "@/components/BioregionSelect";
import { getLoginUrl } from "@/const";

const QUEST_ICONS: Record<string, LucideIcon> = {
  Droplets,
  Sprout,
  Apple,
  TreeDeciduous,
  MessageSquare,
  Users,
};

export default function Multiplayer() {
  const { user, isAuthenticated } = useAuth();
  const questsQuery = trpc.questCrews.quests.useQuery();
  const mySignupsQuery = trpc.questCrews.mySignups.useQuery(undefined, { enabled: isAuthenticated });
  const myCrewsQuery = trpc.questCrews.myCrews.useQuery(undefined, { enabled: isAuthenticated });

  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [bioregionId, setBioregionId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const signupMutation = trpc.questCrews.signup.useMutation({
    onSuccess: () => {
      setFormMessage("You're aboard. When enough players in your bioregion sign up, your crew forms and you'll get an email.");
      setNote("");
      setSelectedQuestId(null);
      mySignupsQuery.refetch();
      questsQuery.refetch();
    },
    onError: (err) => setFormMessage(err.message),
  });
  const cancelMutation = trpc.questCrews.cancelSignup.useMutation({
    onSuccess: () => {
      mySignupsQuery.refetch();
      questsQuery.refetch();
    },
  });
  const activateMutation = trpc.questCrews.activateCrew.useMutation({
    onSuccess: () => myCrewsQuery.refetch(),
  });
  const leaveMutation = trpc.questCrews.leaveCrew.useMutation({
    onSuccess: () => myCrewsQuery.refetch(),
  });
  const completeMutation = trpc.quests.complete.useMutation({
    onSuccess: () => myCrewsQuery.refetch(),
  });
  const attestMutation = trpc.questCrews.attestCompletion.useMutation({
    onSuccess: () => myCrewsQuery.refetch(),
  });

  const quests = questsQuery.data?.quests ?? [];
  const aggregates = questsQuery.data?.aggregates ?? [];
  const questById = useMemo(() => new Map(quests.map((q) => [q.questId, q])), [quests]);
  const mySignupQuestIds = useMemo(
    () => new Set((mySignupsQuery.data ?? []).map((s) => s.questId)),
    [mySignupsQuery.data],
  );

  const handleSignup = () => {
    setFormMessage(null);
    if (!selectedQuestId || !bioregionId) {
      setFormMessage("Pick a quest and your bioregion first.");
      return;
    }
    signupMutation.mutate({
      questId: selectedQuestId,
      bioregionId,
      note: note.trim() ? note.trim() : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Multiplayer Mode | ReGen Civics"
        description="Crews of 3 to 7 players form around a quest in a bioregion and complete it together. Sign up, get crewed, meet your people."
      />

      {/* Hero */}
      <section className="relative pt-24 pb-10 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#7dd87d] rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#d4a574] rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
            <Users className="w-4 h-4 text-[#7dd87d]" />
            <span className="text-[#7dd87d] text-sm font-medium" style={{ fontFamily: "var(--font-accent)" }}>
              Multiplayer Mode
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Some quests take a crew
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto" style={{ fontFamily: "var(--font-body)" }}>
            Crews of 3 to 7 players form around a quest in a bioregion and complete it together. Pick a quest,
            name your bioregion, and when enough players near you sign up, you'll be crewed, connected, and off.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-24 space-y-10">
        {/* My crews */}
        {isAuthenticated && (myCrewsQuery.data?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Your crews
            </h2>
            <div className="space-y-4">
              {(myCrewsQuery.data ?? []).map((crew) => {
                const quest = questById.get(crew.questId);
                const title = quest?.title ?? crew.questId;
                return (
                  <div key={crew.id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-white font-bold">{title}</div>
                        <div className="text-white/60 text-sm">
                          {crew.bioregionName} · {crew.members.length} of {crew.crewSize} aboard · {crew.status}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {crew.forumThreadId && (
                          <Link href={`/community/post/${crew.forumThreadId}`}>
                            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-4">
                              Crew chat
                            </Button>
                          </Link>
                        )}
                        {(crew.status === "forming" || crew.status === "ready") && (
                          <Button
                            onClick={() => activateMutation.mutate({ crewId: crew.id })}
                            disabled={activateMutation.isPending}
                            className="bg-white/10 text-white hover:bg-white/20 rounded-full px-4"
                          >
                            We've started
                          </Button>
                        )}
                        {crew.status === "active" && crew.myStatus === "joined" && quest && (
                          <Button
                            onClick={() => completeMutation.mutate({ questId: quest.questId, questTitle: quest.title })}
                            disabled={completeMutation.isPending}
                            className="bg-[#d4a574] text-[#1a472a] hover:bg-[#e4b584] font-bold rounded-full px-4"
                          >
                            Log my completion
                          </Button>
                        )}
                        {crew.myStatus === "completed" && (
                          <span className="inline-flex items-center gap-1 text-[#7dd87d] text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        )}
                        {crew.status !== "complete" && crew.myStatus === "joined" && (
                          <Button
                            onClick={() => leaveMutation.mutate({ crewId: crew.id })}
                            disabled={leaveMutation.isPending}
                            className="bg-transparent text-white/60 hover:text-white hover:bg-white/10 rounded-full px-4"
                          >
                            Leave
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-white/60 text-sm">
                      <span>Crew:</span>
                      {crew.members.map((m) => (
                        <span
                          key={m.userId}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
                        >
                          {m.name}
                          {m.status === "completed" && m.attested && (
                            <span className="inline-flex items-center gap-0.5 text-[#7dd87d] text-xs">
                              <CheckCircle2 className="w-3 h-3" /> attested
                            </span>
                          )}
                          {/* Rung 2 of the verification ladder: a crewmate vouches
                              that the completion really happened. */}
                          {m.status === "completed" && !m.attested && m.userId !== user?.id && (
                            <button
                              onClick={() => attestMutation.mutate({ crewId: crew.id, memberUserId: m.userId })}
                              disabled={attestMutation.isPending}
                              className="text-[#d4a574] text-xs hover:text-[#e4b584] underline underline-offset-2"
                              title="Vouch that this crewmate's completion really happened"
                            >
                              attest
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* My open signups */}
        {isAuthenticated && (mySignupsQuery.data?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Waiting for crewmates
            </h2>
            <div className="space-y-3">
              {(mySignupsQuery.data ?? []).map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  <div className="text-white/80 text-sm">
                    <span className="font-medium text-white">
                      {questById.get(signup.questId)?.title ?? signup.questId}
                    </span>{" "}
                    in {signup.bioregionName}
                  </div>
                  <Button
                    onClick={() => cancelMutation.mutate({ signupId: signup.id })}
                    disabled={cancelMutation.isPending}
                    className="bg-transparent text-white/60 hover:text-white hover:bg-white/10 rounded-full px-3 text-sm"
                  >
                    Withdraw
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quest list */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Open multiplayer quests
          </h2>
          {questsQuery.isLoading ? (
            <div className="text-white/60">Loading quests…</div>
          ) : quests.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
              <Compass className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" />
              <p className="text-white/80 font-medium mb-1">The first crew quests are being ratified.</p>
              <p className="text-white/60 text-sm">
                Five multiplayer quests are on their way: a river cleanup, a seed swap, a community meal, a land
                project work party, and a bioregion story harvest. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quests.map((quest) => {
                const Icon = QUEST_ICONS[quest.icon] ?? Users;
                const questAggregates = aggregates.filter((a) => a.questId === quest.questId);
                const expanded = expandedQuestId === quest.questId;
                return (
                  <div key={quest.questId} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-11 h-11 rounded-xl bg-[#7dd87d]/20 border border-[#7dd87d]/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#7dd87d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-white font-bold">{quest.title}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/30 text-[#d4a574] text-xs font-medium">
                            <Users className="w-3 h-3" /> {quest.crewSizeMin} to {quest.crewSizeMax} players
                          </span>
                          <span className="text-[#7dd87d] text-xs font-medium">
                            +{quest.reward.regen} $ReGen · +{quest.reward.rvoice} RGVoice
                          </span>
                        </div>
                        <p className="text-white/60 text-sm mt-1">{quest.subtitle}</p>
                        <p className="text-white/75 text-sm mt-2">{quest.description}</p>

                        {/* Live counts per bioregion */}
                        {questAggregates.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {questAggregates.map((agg) => {
                              const formingCrew = agg.crews.find((c) => c.status === "forming");
                              const label = formingCrew
                                ? `${formingCrew.memberCount} of ${formingCrew.crewSize} aboard in ${agg.bioregionName}`
                                : agg.openSignups > 0
                                  ? `${agg.openSignups} signed up in ${agg.bioregionName}`
                                  : `Crew underway in ${agg.bioregionName}`;
                              return (
                                <span
                                  key={`${agg.questId}-${agg.bioregionId}`}
                                  className="px-2 py-1 rounded-full bg-white/10 text-white/70 text-xs"
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedQuestId(expanded ? null : quest.questId)}
                          className="mt-3 inline-flex items-center gap-1 text-[#7dd87d] text-sm hover:text-[#9de89d]"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          {expanded ? "Hide details" : "Roles, steps, and what done means"}
                        </button>

                        {expanded && (
                          <div className="mt-4 space-y-4 text-sm">
                            <p className="text-white/70 italic">{quest.storyCard}</p>
                            <div>
                              <div className="text-white font-medium mb-1">The parts to claim</div>
                              <ul className="space-y-1 text-white/70">
                                {quest.crewRoles.map((role) => (
                                  <li key={role.name}>
                                    <span className="text-[#d4a574] font-medium">{role.name}:</span> {role.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-white font-medium mb-1">The steps</div>
                              <ol className="space-y-1 text-white/70 list-decimal list-inside">
                                {quest.steps.map((step) => (
                                  <li key={step.title}>
                                    <span className="text-white/90">{step.title}.</span> {step.description}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div>
                              <div className="text-white font-medium mb-1">Done means</div>
                              <p className="text-white/70">{quest.definitionOfDone}</p>
                            </div>
                            <div className="text-white/60">
                              Deliverable: {quest.deliverable} · Time: {quest.estimatedTime}
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          {mySignupQuestIds.has(quest.questId) ? (
                            <span className="text-[#7dd87d] text-sm font-medium">You're signed up for this one.</span>
                          ) : (
                            <Button
                              onClick={() => {
                                setSelectedQuestId(quest.questId);
                                setFormMessage(null);
                                document.getElementById("crew-signup-form")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-5"
                            >
                              Crew up
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Signup form */}
        {quests.length > 0 && (
          <section id="crew-signup-form" className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Sign up for a crew
            </h2>
            <p className="text-white/60 text-sm mb-5">
              One signup per quest. When enough players in your bioregion pick the same quest, your crew forms
              and you'll get an email with your crew chat.
            </p>

            {isAuthenticated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Quest</label>
                  <select
                    value={selectedQuestId ?? ""}
                    onChange={(e) => setSelectedQuestId(e.target.value || null)}
                    className="w-full rounded-xl border bg-white/5 border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
                  >
                    <option value="" className="bg-[#1a472a]">
                      Pick a quest…
                    </option>
                    {quests
                      .filter((q) => !mySignupQuestIds.has(q.questId))
                      .map((q) => (
                        <option key={q.questId} value={q.questId} className="bg-[#1a472a]">
                          {q.title}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Your bioregion</label>
                  <BioregionSelect value={bioregionId} onChange={setBioregionId} variant="dark" />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Note for your crew (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 500))}
                    rows={2}
                    placeholder="Skills, tools, or times that work for you"
                    className="w-full rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
                  />
                </div>
                {formMessage && <p className="text-[#d4a574] text-sm">{formMessage}</p>}
                <Button
                  onClick={handleSignup}
                  disabled={signupMutation.isPending}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-6 py-2"
                >
                  {signupMutation.isPending ? "Signing up…" : "Join the crew list"}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-white/70 text-sm mb-3">
                  Crews need names. Sign in to join one, and your crewmates will know who's aboard.
                </p>
                <Button
                  onClick={() => {
                    window.location.href = getLoginUrl();
                  }}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-5"
                >
                  Sign in / Create account
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
