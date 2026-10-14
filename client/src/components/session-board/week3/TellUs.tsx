/**
 * Stage 15's feedback box: the Season Schedule's own feedback (the existing
 * `seasonSchedule.sendFeedback`, no server change), brought onto the board.
 * The topic files under the next session that hasn't started, so its title
 * names that week from the schedule (Week 4 on Wednesday; later for someone
 * going at their own pace). Shared topics show on that week's Welcome as
 * "You asked us to cover". Facilitation feedback is always private.
 */
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { TELL_US_COPY, fillCopy } from "@shared/sessionBoard";
import { SEASON_FACILITATION_MAX, SEASON_TOPIC_MAX } from "@shared/seasonSchedule";
import { trpc } from "@/lib/trpc";
import { useSeasonSchedule } from "@/hooks/useSeasonSchedule";
import type { StageProps } from "../stages";
import { BoardMic } from "./parts";

/** The week of the next session that hasn't started, or null when the schedule names none. */
export function nextSessionWeek(sessions: readonly { week: number; start: Date; status: string }[], now: number): number | null {
  const next = sessions
    .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.start.getTime() > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  return next?.week ?? null;
}

function SpokenArea({ value, onChange, label, max, describedBy }: { value: string; onChange: (v: string) => void; label: string; max: number; describedBy?: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  return (
    <div className="sb-dictate">
      <textarea ref={ref} className="sb-field" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} aria-describedby={describedBy} maxLength={max} rows={3} />
      <BoardMic label={`Speak into ${label}`} value={value} onChange={onChange} targetRef={ref} />
    </div>
  );
}

export function TellUs({ props }: { props: StageProps }) {
  const { board, myProject, displayName } = props;
  const schedule = useSeasonSchedule();
  const nextWeek = useMemo(
    () => (schedule.ready ? nextSessionWeek(schedule.sessions, Date.now()) : null),
    [schedule.ready, schedule.sessions],
  );
  const [topic, setTopic] = useState("");
  const [facilitation, setFacilitation] = useState("");
  const [share, setShare] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const send = trpc.seasonSchedule.sendFeedback.useMutation();
  const hintId = useId();
  const topicTitle = nextWeek != null ? fillCopy(TELL_US_COPY.topic, { week: nextWeek }) : TELL_US_COPY.topicNext;
  const projectName = myProject?.kind === "project"
    ? board.projects.find((p) => p.id === myProject.cardId)?.name ?? myProject.name
    : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if ((!topic.trim() && !facilitation.trim()) || send.isPending) return;
    send.mutate(
      {
        topic: topic.trim() || undefined,
        facilitation: facilitation.trim() || undefined,
        isPublic: share,
        displayName: displayName.trim() || undefined,
        projectName: projectName || undefined,
      },
      {
        onSuccess: (r) => {
          setTopic("");
          setFacilitation("");
          setShare(false);
          setSent(r.week != null ? fillCopy(TELL_US_COPY.sent, { week: r.week }) : TELL_US_COPY.sentNext);
        },
      },
    );
  };

  return (
    <form className="sb-panel sb-feedback" onSubmit={submit}>
      <p className="sb-hint">{TELL_US_COPY.where}</p>
      <div className="sb-q">
        <h3 className="sb-q-t">{topicTitle}</h3>
        <SpokenArea value={topic} onChange={(v) => { setTopic(v); setSent(null); }} label={topicTitle} max={SEASON_TOPIC_MAX} />
        <label className="sb-check">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span>{TELL_US_COPY.share}</span>
        </label>
      </div>
      <div className="sb-q">
        <h3 className="sb-q-t">{TELL_US_COPY.facilitation}</h3>
        <p id={hintId} className="sb-hint">{TELL_US_COPY.facilitationHint}</p>
        <SpokenArea value={facilitation} onChange={(v) => { setFacilitation(v); setSent(null); }} label={TELL_US_COPY.facilitation} max={SEASON_FACILITATION_MAX} describedBy={hintId} />
      </div>
      <div className="sb-row">
        <button type="submit" className="sb-btn sb-primary" disabled={send.isPending || (!topic.trim() && !facilitation.trim())}>
          {send.isPending ? "Sending..." : TELL_US_COPY.send}
        </button>
        {sent ? <p className="sb-saved" role="status">{sent}</p> : null}
        {send.isError ? <p className="sb-error" role="alert">{send.error.message}</p> : null}
      </div>
    </form>
  );
}
