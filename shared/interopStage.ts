/**
 * The journey a tool takes to become part of the shared system.
 *
 * The library shows tools in classes rather than as one flat list, because
 * the classes are the point: you can see what has joined the foundation, what
 * is on its way, and what has not started. One definition here so the badge on
 * /tools and the badge on /interop-sessions cannot drift apart.
 *
 * "Not assessed" is the absence of a sheet, so it is derived rather than
 * stored. Only the last transition is a judgement, and only it is kept.
 */

export type InteropStage = "not_assessed" | "pending" | "interoperable" | "declined";

/** The order tools move through, for grouping the library. */
export const INTEROP_STAGE_ORDER: InteropStage[] = [
  "interoperable",
  "pending",
  "not_assessed",
  "declined",
];

export interface StageStyle {
  /** On the badge itself. */
  label: string;
  /** What the badge means, for a tooltip or the group heading. */
  description: string;
  /** Plural heading when the library groups by class. */
  heading: string;
  /** Tailwind classes. Kept here so both pages render the same badge. */
  className: string;
  /** Whether this class is worth shouting about. The interoperable badge is larger. */
  prominent: boolean;
}

export const INTEROP_STAGE: Record<InteropStage, StageStyle> = {
  interoperable: {
    label: "Interoperable",
    description:
      "Works with the shared foundation. The group has confirmed this tool's protocols, formats and identity model line up with the rest of the system.",
    heading: "Part of the shared system",
    className: "bg-[#7dd87d] text-[#0d2818] border-[#7dd87d]",
    prominent: true,
  },
  pending: {
    label: "Interoperability pending",
    description:
      "Came in through the interoperability intake and has told us what it speaks. The group has not yet confirmed the pieces line up.",
    heading: "On the way in",
    className: "bg-[#e3ac4f]/20 text-[#e3ac4f] border-[#e3ac4f]/50",
    prominent: false,
  },
  not_assessed: {
    label: "Not yet assessed",
    description:
      "In the library, but has not been through the interoperability intake, so we do not know what it speaks or whether it can connect to anything else.",
    heading: "Not yet assessed",
    className: "bg-white/10 text-white/60 border-white/20",
    prominent: false,
  },
  declined: {
    label: "Not interoperable yet",
    description:
      "Looked at, and the pieces do not line up today. Kept rather than removed, so the reason is on the record and can change.",
    heading: "Not lining up yet",
    className: "bg-white/5 text-white/40 border-white/10",
    prominent: false,
  },
};

/**
 * A tool's class, from its sheet (or the lack of one).
 *
 * Takes the sheet's stored stage rather than a boolean so an unknown value
 * from the database degrades to "not assessed" instead of throwing on a public
 * page.
 */
export function interopStageOf(sheetStage: string | null | undefined): InteropStage {
  if (sheetStage === "interoperable") return "interoperable";
  if (sheetStage === "pending") return "pending";
  if (sheetStage === "declined") return "declined";
  return "not_assessed";
}

/** Group tools by class, in journey order, dropping empty classes. */
export function groupByStage<T>(
  items: readonly T[],
  stageOf: (item: T) => InteropStage,
): { stage: InteropStage; style: StageStyle; items: T[] }[] {
  const byStage = new Map<InteropStage, T[]>();
  for (const item of items) {
    const stage = stageOf(item);
    const bucket = byStage.get(stage);
    if (bucket) bucket.push(item);
    else byStage.set(stage, [item]);
  }
  return INTEROP_STAGE_ORDER.filter((s) => (byStage.get(s)?.length ?? 0) > 0).map((stage) => ({
    stage,
    style: INTEROP_STAGE[stage],
    items: byStage.get(stage)!,
  }));
}

/**
 * How far along the whole library is, for a line on the page.
 * Counting tools, not sheets, so a tool with no sheet is still counted.
 */
export function stageCounts(stages: readonly InteropStage[]): Record<InteropStage, number> {
  const counts: Record<InteropStage, number> = {
    interoperable: 0,
    pending: 0,
    not_assessed: 0,
    declined: 0,
  };
  for (const s of stages) counts[s] += 1;
  return counts;
}
