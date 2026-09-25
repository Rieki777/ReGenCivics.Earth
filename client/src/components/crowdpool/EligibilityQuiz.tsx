import { useEffect, useRef, useState } from "react";
import { Gift, Landmark, Compass, RotateCcw } from "lucide-react";
import { ROUTE_QUIZ } from "@shared/crowdpoolCopy";

/**
 * The money route quiz. Three deterministic questions point a project toward
 * the route that fits: Ma Earth for gifts and matching with a wide base of
 * supporters, Steward for a loan on an established project that needs larger
 * capital, or both. A recommendation only: ReGen Civics arranges no
 * financing and holds no money, and people finish on the partner's own site.
 *
 * It sits where a project adds its routes (build spec 2026-09-25, section
 * 14.1): the campaign wizard's Money step and the steward's Money routes
 * card. It left the contributor page with CampaignDetail. `onResult` fires
 * once the third answer is in, so the caller can focus or preselect the
 * matching route field.
 */

type Lean = "ma" | "gs";

interface QuizQuestion {
  key: string;
  prompt: string;
  options: { label: string; lean: Lean }[];
}

function questions(currencySymbol: string): QuizQuestion[] {
  return [
    {
      key: "stage",
      prompt: "Where is the project right now?",
      options: [
        { label: "At the gift stage, raising to get going", lean: "ma" },
        { label: "Generating revenue and able to repay a loan", lean: "gs" },
      ],
    },
    {
      key: "breadth",
      prompt: "Who do you expect to put money in?",
      options: [
        { label: "Many people each giving a little", lean: "ma" },
        { label: "A smaller number of larger backers", lean: "gs" },
      ],
    },
    {
      key: "size",
      prompt: "How much money does this need?",
      options: [
        { label: ROUTE_QUIZ.sizeUnder(currencySymbol), lean: "ma" },
        { label: ROUTE_QUIZ.sizeOver(currencySymbol), lean: "gs" },
      ],
    },
  ];
}

export type RouteRecommendation = "ma" | "gs" | "both";

/** The route field a recommendation points at first. "Both" starts with Ma Earth. */
export function partnerForRecommendation(rec: RouteRecommendation): "maearth" | "gosteward" {
  return rec === "gs" ? "gosteward" : "maearth";
}

export function recommendationFor(answers: Lean[]): RouteRecommendation {
  const ma = answers.filter((a) => a === "ma").length;
  const gs = answers.filter((a) => a === "gs").length;
  return ma === 3 ? "ma" : gs === 3 ? "gs" : "both";
}

const RESULTS: Record<RouteRecommendation, { icons: typeof Gift[]; title: string; body: string }> = {
  ma: {
    icons: [Gift],
    title: "Ma Earth looks like the fit",
    body: "Ma Earth pools gifts and matches them with grant money, so a wide base of smaller supporters adds up. Good for the gift stage.",
  },
  gs: {
    icons: [Landmark],
    title: "Steward looks like the fit",
    body: "Steward arranges loans for projects with revenue that need larger capital, repaid with a return to the people who lend.",
  },
  both: {
    icons: [Gift, Landmark],
    title: "Both could fit",
    body: "Rally a wide base of gifts through Ma Earth, and cover the larger capital with a Steward loan. Many projects use both together.",
  },
};

export function EligibilityQuiz({
  currencySymbol = "$",
  onResult,
  embedded = false,
  idPrefix = "route-quiz",
}: {
  /** The campaign's currency symbol, for the size question. */
  currencySymbol?: string;
  /** Called once all three answers are in, with the recommendation. */
  onResult?: (rec: RouteRecommendation) => void;
  /** Drop the outer card when the quiz sits inside another card. */
  embedded?: boolean;
  idPrefix?: string;
}) {
  const [answers, setAnswers] = useState<(Lean | null)[]>([null, null, null]);
  const list = questions(currencySymbol);

  const answered = answers.every((a) => a !== null);
  const rec = recommendationFor(answers.filter((a): a is Lean => a !== null));
  const result = RESULTS[rec];

  const pick = (qIdx: number, lean: Lean) =>
    setAnswers((prev) => prev.map((a, i) => (i === qIdx ? lean : a)));

  // Tell the caller once the answers are complete, and again whenever a
  // complete set changes. The latest callback is read from a ref, so a new
  // inline function on each render never fires it twice.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const answerKey = answered ? answers.join(",") : "";
  useEffect(() => {
    if (answerKey) onResultRef.current?.(recommendationFor(answerKey.split(",") as Lean[]));
  }, [answerKey]);

  const Heading = embedded ? "h3" : "h2";
  const titleId = `${idPrefix}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className={embedded ? "" : "bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl"}
    >
      <Heading
        id={titleId}
        className={`${embedded ? "text-base" : "text-xl"} font-bold text-[#1a472a] mb-1 flex items-center gap-2`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Compass className="w-5 h-5 text-[#4a7c59] shrink-0" aria-hidden="true" />
        {ROUTE_QUIZ.title}
      </Heading>
      <p className="text-sm text-[#1a472a]/80 mb-4">{ROUTE_QUIZ.intro}</p>

      <div className="space-y-4">
        {list.map((q, qIdx) => (
          <div key={q.key} role="group" aria-labelledby={`${idPrefix}-${q.key}`}>
            <p id={`${idPrefix}-${q.key}`} className="text-sm font-semibold text-[#1a472a] mb-2">
              {qIdx + 1}. {q.prompt}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt) => {
                const selected = answers[qIdx] === opt.lean;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => pick(qIdx, opt.lean)}
                    className={`text-left text-sm rounded-xl border px-4 py-3 min-h-11 transition-colors ${
                      selected
                        ? "bg-[#4a7c59] text-white border-[#4a7c59]"
                        : "bg-white text-[#1a472a]/85 border-[#1a472a]/15 hover:border-[#4a7c59]/60"
                    }`}
                    aria-pressed={selected}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {answered && (
        <div className="mt-5 rounded-2xl bg-[#f0f7f0] border border-[#1a472a]/10 p-4" role="status">
          <div className="flex items-center gap-2 mb-2">
            {result.icons.map((Icon, i) => (
              <Icon key={i} className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
            ))}
            <p className="font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              {result.title}
            </p>
          </div>
          <p className="text-sm text-[#1a472a]/85">{result.body}</p>
          <p className="text-sm font-medium text-[#1a472a] mt-2">{ROUTE_QUIZ.resultFooter}</p>
          <button
            type="button"
            onClick={() => setAnswers([null, null, null])}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#4a7c59] font-medium min-h-11"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> {ROUTE_QUIZ.startOver}
          </button>
        </div>
      )}
    </section>
  );
}
