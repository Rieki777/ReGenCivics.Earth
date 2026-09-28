/**
 * Track, stage, cycle and deadline for one funder row (funding engine
 * Phase 1). Only the stages of the row's track are offered
 * (shared/fundingStages.ts); the server checks again and sets the coarse
 * status from the stage. Deadlines are entered and shown in Pacific time.
 */
import { useEffect, useState } from "react";
import { FUNDING_TRACKS, TRACK_LABELS, stagesFor, type FundingTrack } from "@shared/fundingStages";
import { FIELD_CLASS, SELECT_CLASS, ymd } from "./fieldClass";
import { pacificInputToIso, pacificParts } from "./deadlineFormat";

type Row = {
  id: number;
  name: string;
  track: FundingTrack | null;
  stage: string | null;
  cycle: string | null;
  deadlineAt: string | Date | null;
  reapplyAt: string | Date | null;
};

const LABEL = "block text-xs font-bold text-[#1a472a]/80 mb-1";

export function StageFields({ row, onField }: { row: Row; onField: (id: number, patch: Record<string, unknown>) => void }) {
  const [date, setDate] = useState(pacificParts(row.deadlineAt)?.date ?? "");
  const [time, setTime] = useState(pacificParts(row.deadlineAt)?.time ?? "");
  const [cycle, setCycle] = useState(row.cycle ?? "");

  useEffect(() => {
    const p = pacificParts(row.deadlineAt);
    setDate(p?.date ?? "");
    setTime(p?.time ?? "");
  }, [row.deadlineAt]);
  useEffect(() => setCycle(row.cycle ?? ""), [row.cycle]);

  const saveDeadline = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      if (row.deadlineAt) onField(row.id, { deadlineAt: null });
      return;
    }
    const iso = pacificInputToIso(nextDate, nextTime);
    if (!iso) return;
    const current = row.deadlineAt ? new Date(row.deadlineAt).toISOString() : null;
    if (iso !== current) onField(row.id, { deadlineAt: iso });
  };

  const stages = row.track ? stagesFor(row.track) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <label className="block">
        <span className={LABEL}>Track</span>
        <select
          value={row.track ?? ""}
          // A new track clears the stage in the same write, so the server never
          // holds a stage the new track does not have.
          onChange={(e) => onField(row.id, { track: e.target.value || null, stage: null })}
          className={SELECT_CLASS}
          aria-label={`Track for ${row.name}`}
        >
          <option value="">Not set</option>
          {FUNDING_TRACKS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>Stage</span>
        <select
          value={row.stage ?? ""}
          onChange={(e) => onField(row.id, { stage: e.target.value || null })}
          disabled={!row.track}
          className={SELECT_CLASS}
          aria-label={`Stage for ${row.name}`}
          title={row.track ? undefined : "Set a track first: stages differ by track"}
        >
          <option value="">{row.track ? "Not set" : "Set a track first"}</option>
          {stages.map((s) => (
            <option key={s.stage} value={s.stage}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>Cycle</span>
        <input
          value={cycle}
          onChange={(e) => setCycle(e.target.value)}
          onBlur={() => {
            if (cycle.trim() !== (row.cycle ?? "")) onField(row.id, { cycle: cycle.trim() || null });
          }}
          placeholder="W27, Batch 37"
          className={FIELD_CLASS}
        />
      </label>

      <div>
        <span className={LABEL}>Deadline (Pacific)</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => saveDeadline(date, time)}
            className={FIELD_CLASS}
            aria-label={`Deadline date for ${row.name}, Pacific time`}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onBlur={() => saveDeadline(date, time)}
            className={FIELD_CLASS}
            aria-label={`Deadline time for ${row.name}, Pacific time`}
          />
        </div>
      </div>

      {row.track === "accelerator" && (
        <label className="block">
          <span className={LABEL}>Apply again on</span>
          <input
            type="date"
            defaultValue={ymd(row.reapplyAt)}
            key={ymd(row.reapplyAt)}
            onBlur={(e) => {
              if (e.target.value !== ymd(row.reapplyAt)) onField(row.id, { reapplyAt: e.target.value || null });
            }}
            className={FIELD_CLASS}
          />
        </label>
      )}
    </div>
  );
}
