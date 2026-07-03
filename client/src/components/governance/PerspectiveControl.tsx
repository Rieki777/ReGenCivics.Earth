/**
 * PerspectiveControl
 *
 * Lets a signed-in member set (and change) their governance perspective on a
 * thread while it is in Sensing or Proposal stage. Shows a calm weighted-tally
 * bar so the room's overall direction is visible at a glance.
 *
 * Single-choice, one perspective per person per thread. Changing it upserts
 * the row. Uses the same optimistic-update pattern as EmojiReactions.
 *
 * Styled for the light post card it renders on. A serious concern is the only
 * perspective that pauses promotion; the legend under the buttons says so.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Perspective = "support" | "can_live_with" | "see_differently" | "need_to_understand" | "serious_concern";

const PERSPECTIVE_META: Record<Perspective, { label: string; helper: string; color: string; barColor: string }> = {
  support: {
    label: "I support this",
    helper: "Ready to move forward",
    color: "bg-emerald-50 border-emerald-300 text-emerald-800",
    barColor: "bg-emerald-500",
  },
  can_live_with: {
    label: "I can live with this",
    helper: "Good enough for now, safe enough to try",
    color: "bg-[#7dd87d]/15 border-[#4a7c59]/40 text-[#1a472a]",
    barColor: "bg-[#7dd87d]",
  },
  see_differently: {
    label: "I see it differently",
    helper: "Different perspective worth exploring",
    color: "bg-amber-50 border-amber-300 text-amber-800",
    barColor: "bg-amber-400",
  },
  need_to_understand: {
    label: "I need to understand more",
    helper: "Questions remain before I can decide",
    color: "bg-blue-50 border-blue-300 text-blue-800",
    barColor: "bg-blue-400",
  },
  serious_concern: {
    label: "I have a serious concern",
    helper: "A concern that needs to be addressed before we proceed",
    color: "bg-red-50 border-red-300 text-red-800",
    barColor: "bg-red-400",
  },
};

const PERSPECTIVES: Perspective[] = [
  "support",
  "can_live_with",
  "see_differently",
  "need_to_understand",
  "serious_concern",
];

interface Props {
  threadId: number;
}

export function PerspectiveControl({ threadId }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.forum.perspectives.get.useQuery(
    { threadId },
    { staleTime: 30_000, refetchInterval: 60_000 }
  );

  const setPerspective = trpc.forum.perspectives.set.useMutation({
    onMutate: async ({ perspective }) => {
      await utils.forum.perspectives.get.cancel({ threadId });
      const prev = utils.forum.perspectives.get.getData({ threadId });
      utils.forum.perspectives.get.setData({ threadId }, (old) => {
        if (!old) return old;
        return { ...old, myPerspective: perspective };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.forum.perspectives.get.setData({ threadId }, ctx.prev);
    },
    onSettled: () => {
      utils.forum.perspectives.get.invalidate({ threadId });
    },
  });

  if (isLoading) return null;

  const tallies = data?.tallies ?? [];
  const myPerspective = data?.myPerspective as Perspective | null;
  const totalWeight = tallies.reduce((sum: number, t: any) => sum + (parseFloat(t.weightedTotal) || 0), 0);
  const hasBlock = tallies.some((t: any) => t.perspective === "serious_concern" && t.count > 0);

  const tallyFor = (p: Perspective) => tallies.find((t: any) => t.perspective === p);

  return (
    <div className="rounded-xl border border-[#e8e4de] bg-[#fbfaf7] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#1a472a] text-sm font-semibold">Where do you stand?</p>
        {hasBlock && (
          <span
            className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"
            title="A serious concern pauses promotion until it is addressed."
          >
            Block active
          </span>
        )}
      </div>

      {/* Weighted tally bar */}
      {totalWeight > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-4 gap-px">
          {PERSPECTIVES.map((p) => {
            const t = tallyFor(p);
            const w = parseFloat(t?.weightedTotal ?? "0");
            const pct = totalWeight > 0 ? (w / totalWeight) * 100 : 0;
            if (pct < 1) return null;
            return (
              <div
                key={p}
                className={`${PERSPECTIVE_META[p].barColor} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${PERSPECTIVE_META[p].label}: ${Math.round(pct)}%`}
              />
            );
          })}
        </div>
      )}

      {/* Perspective buttons */}
      <div className="flex flex-col gap-1.5">
        {PERSPECTIVES.map((p) => {
          const meta = PERSPECTIVE_META[p];
          const t = tallyFor(p);
          const count = t?.count ?? 0;
          const isActive = myPerspective === p;

          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (!user) { window.location.href = getLoginUrl(); return; }
                setPerspective.mutate({ threadId, perspective: p });
              }}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                isActive
                  ? meta.color
                  : "bg-white border-[#e8e4de] text-[#1a472a]/70 hover:bg-[#f0f7f0] hover:text-[#1a472a]"
              }`}
            >
              <span>
                <span className="text-sm font-medium block">{meta.label}</span>
                {isActive && (
                  <span className="text-[11px] opacity-70 block">{meta.helper}</span>
                )}
              </span>
              {count > 0 && (
                <span className="text-[11px] text-[#4a7c59] flex-shrink-0">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Concerns and blocks read differently by design */}
      <p className="text-[#4a7c59]/80 text-[11px] mt-3 leading-relaxed">
        A serious concern pauses promotion until it is addressed. Every other perspective guides the
        proposal while it moves.
      </p>

      {!user && (
        <p className="text-[#4a7c59] text-xs mt-2 text-center">
          <a href={getLoginUrl()} className="text-[#1a472a] font-semibold hover:underline">Sign in</a> to share your perspective.
        </p>
      )}
    </div>
  );
}
