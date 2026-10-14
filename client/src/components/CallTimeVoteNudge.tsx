/**
 * "You haven't voted for a call time yet" on the status pages (ADR-72).
 *
 * Opening the status page signed in also attaches this browser's earlier vote
 * to the account (linkMyVote), which is how a vote cast as a guest comes to
 * carry the voter's badge. The vote pages keep their key in localStorage under
 * the names below; they are read here, never written.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Vote } from "lucide-react";
import { ACTIVE_SEASON } from "@shared/seasonSchedule";
import { MEMBER_BADGE_LABEL, type MemberBadge } from "@shared/memberBadges";

/** The localStorage keys InteropSessions.tsx and SeasonSchedule.tsx keep their voter key under. */
export const INTEROP_VOTER_KEY_STORAGE = "interop-voter-key";
export const SEASON_VOTER_KEY_STORAGE = "season-voter-key";

function storedKey(name: string): string | undefined {
  try {
    const v = window.localStorage.getItem(name);
    return v && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

function Nudge({ voted, href, label, votedLine }: { voted: boolean | null; href: string; label: string; votedLine: string }) {
  if (voted === null) return null;
  if (voted) {
    return (
      <p className="mb-3 flex items-center gap-2 text-sm text-white/90">
        <CheckCircle2 className="h-4 w-4 text-[#7dd87d]" aria-hidden="true" /> {votedLine}
      </p>
    );
  }
  return (
    <div className="mb-3 rounded-lg bg-[#7dd87d]/15 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Vote className="h-4 w-4 text-[#7dd87d]" aria-hidden="true" /> You haven't voted for a call time yet.
      </p>
      <Link href={href} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-white underline decoration-[#7dd87d] decoration-2 underline-offset-4 hover:decoration-white">
        {label} &rarr;
      </Link>
    </div>
  );
}

/** For accepted land projects: the Season Schedule vote. */
export function SeasonVoteNudge() {
  const [voted, setVoted] = useState<boolean | null>(null);
  const link = trpc.seasonSchedule.linkMyVote.useMutation({
    onSuccess: (r) => setVoted(r.voted),
    onError: () => setVoted(null),
  });
  useEffect(() => {
    link.mutate({ season: ACTIVE_SEASON, voterKey: storedKey(SEASON_VOTER_KEY_STORAGE) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Nudge voted={voted} href="/season-schedule" label="Vote for your Season's call time" votedLine="You have voted for your Season's call time. Change your picks any week." />;
}

/** For Alliance Partners: the Interoperability Circle vote. */
export function CircleVoteNudge() {
  const [voted, setVoted] = useState<boolean | null>(null);
  const link = trpc.interopSessions.linkMyVote.useMutation({
    onSuccess: (r) => setVoted(r.voted),
    onError: () => setVoted(null),
  });
  useEffect(() => {
    link.mutate({ voterKey: storedKey(INTEROP_VOTER_KEY_STORAGE) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Nudge voted={voted} href="/interop-sessions" label="Vote for the Circle's call time" votedLine="You have voted for the Circle's call time. Change your picks any week." />;
}

/** The small chips beside a voter's name or project. */
export function MemberBadgeChips({ badges, tone = "dark" }: { badges?: readonly MemberBadge[]; tone?: "dark" | "light" }) {
  if (!badges?.length) return null;
  const cls = tone === "dark"
    ? "bg-[#7dd87d]/20 text-[#c9f2c9] border-[#7dd87d]/40"
    : "bg-[#7dd87d]/20 text-[#1a472a] border-[#4a7c59]/40";
  return (
    <>
      {badges.map((b) => (
        <span key={b} className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
          {MEMBER_BADGE_LABEL[b]}
        </span>
      ))}
    </>
  );
}
