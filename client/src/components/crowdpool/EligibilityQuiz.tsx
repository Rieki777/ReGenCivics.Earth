import { useState } from "react";
import { Gift, Landmark, Compass, RotateCcw } from "lucide-react";

/**
 * Funder eligibility quiz (Phase 4). Three deterministic questions route a
 * project toward the funders we recommend: Ma Earth for gifts and matching with
 * a wide base of supporters, Steward for a loan on an established project that
 * needs larger capital, or both. This is a recommendation only. We arrange no
 * financing and hold no money; people choose and fund on the funder's own site.
 */

type Lean = "ma" | "gs";

interface QuizQuestion {
  key: string;
  prompt: string;
  options: { label: string; lean: Lean }[];
}

const QUESTIONS: QuizQuestion[] = [
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
    prompt: "Who do you expect to fund it?",
    options: [
      { label: "Many people each giving a little", lean: "ma" },
      { label: "A smaller number of larger backers", lean: "gs" },
    ],
  },
  {
    key: "size",
    prompt: "How much capital does this need?",
    options: [
      { label: "Under $100k", lean: "ma" },
      { label: "$100k or more", lean: "gs" },
    ],
  },
];

type Recommendation = "ma" | "gs" | "both";

const RESULTS: Record<Recommendation, { icons: typeof Gift[]; title: string; body: string }> = {
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

export function EligibilityQuiz() {
  const [answers, setAnswers] = useState<(Lean | null)[]>([null, null, null]);

  const answered = answers.every((a) => a !== null);
  const maScore = answers.filter((a) => a === "ma").length;
  const gsScore = answers.filter((a) => a === "gs").length;
  const rec: Recommendation = maScore === 3 ? "ma" : gsScore === 3 ? "gs" : "both";
  const result = RESULTS[rec];

  const pick = (qIdx: number, lean: Lean) =>
    setAnswers((prev) => prev.map((a, i) => (i === qIdx ? lean : a)));

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
      <h2
        className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Compass className="w-5 h-5 text-[#4a7c59]" />
        Find the funder that fits
      </h2>
      <p className="text-sm text-[#1a472a]/75 mb-6">
        Three quick questions. We recommend a funder, and you finish on their own site.
      </p>

      <div className="space-y-5">
        {QUESTIONS.map((q, qIdx) => (
          <div key={q.key}>
            <p className="text-sm font-semibold text-[#1a472a] mb-2">
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
                    className={`text-left text-sm rounded-xl border px-4 py-3 pointer-coarse:min-h-11 transition-colors ${
                      selected
                        ? "bg-[#4a7c59] text-white border-[#4a7c59]"
                        : "bg-white text-[#1a472a]/80 border-[#1a472a]/15 hover:border-[#4a7c59]/60"
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
        <div className="mt-6 rounded-2xl bg-[#f0f7f0] border border-[#1a472a]/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            {result.icons.map((Icon, i) => (
              <Icon key={i} className="w-5 h-5 text-[#4a7c59]" />
            ))}
            <h3 className="font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              {result.title}
            </h3>
          </div>
          <p className="text-sm text-[#1a472a]/80">{result.body}</p>
          <p className="text-xs text-[#1a472a]/75 mt-3">
            A recommendation, not an introduction. See the funder cards below to give or lend on their site.
          </p>
          <button
            type="button"
            onClick={() => setAnswers([null, null, null])}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#4a7c59] font-medium pointer-coarse:min-h-11"
          >
            <RotateCcw className="w-4 h-4" /> Start over
          </button>
        </div>
      )}
    </div>
  );
}
